import { File as FSFile, Directory, Paths } from 'expo-file-system';
import {
  getMediaRootUri,
  getParentDirUri,
  getAssetDirUri,
  buildAssetFilename,
  getAssetFileUri,
  ensureDir,
  saveAssetFile,
  deleteAssetFile,
  deleteAllAssetsForParent,
  deleteAllMedia,
  assetFileExists,
  moveAssetFile,
} from '../../src/utils/assetStorage';

describe('assetStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Path resolution ────────────────────────────────────────────────────────

  describe('getMediaRootUri', () => {
    it('returns document dir + media/', () => {
      expect(getMediaRootUri()).toBe(`${Paths.document.uri}media/`);
    });
  });

  describe('getParentDirUri', () => {
    it('builds path for word parent', () => {
      expect(getParentDirUri('word', 42)).toBe(
        `${Paths.document.uri}media/words/42/`,
      );
    });

    it('builds path for variant parent', () => {
      expect(getParentDirUri('variant', 7)).toBe(
        `${Paths.document.uri}media/variants/7/`,
      );
    });
  });

  describe('getAssetDirUri', () => {
    it('builds audio dir for word', () => {
      expect(getAssetDirUri('word', 1, 'audio')).toBe(
        `${Paths.document.uri}media/words/1/audio/`,
      );
    });

    it('builds photos dir for word', () => {
      expect(getAssetDirUri('word', 1, 'photo')).toBe(
        `${Paths.document.uri}media/words/1/photos/`,
      );
    });

    it('builds videos dir for word', () => {
      expect(getAssetDirUri('word', 1, 'video')).toBe(
        `${Paths.document.uri}media/words/1/videos/`,
      );
    });

    it('builds audio dir for variant', () => {
      expect(getAssetDirUri('variant', 5, 'audio')).toBe(
        `${Paths.document.uri}media/variants/5/audio/`,
      );
    });

    it('builds photos dir for variant', () => {
      expect(getAssetDirUri('variant', 5, 'photo')).toBe(
        `${Paths.document.uri}media/variants/5/photos/`,
      );
    });

    it('builds videos dir for variant', () => {
      expect(getAssetDirUri('variant', 5, 'video')).toBe(
        `${Paths.document.uri}media/variants/5/videos/`,
      );
    });
  });

  describe('buildAssetFilename', () => {
    it('builds filename with m4a extension', () => {
      expect(buildAssetFilename(1, 'audio/mp4')).toBe('asset_1.m4a');
    });

    it('builds filename with mp3 extension', () => {
      expect(buildAssetFilename(2, 'audio/mpeg')).toBe('asset_2.mp3');
    });

    it('builds filename with jpg extension', () => {
      expect(buildAssetFilename(3, 'image/jpeg')).toBe('asset_3.jpg');
    });

    it('builds filename with png extension', () => {
      expect(buildAssetFilename(4, 'image/png')).toBe('asset_4.png');
    });

    it('builds filename with mp4 extension', () => {
      expect(buildAssetFilename(5, 'video/mp4')).toBe('asset_5.mp4');
    });

    it('builds filename with mov extension', () => {
      expect(buildAssetFilename(6, 'video/quicktime')).toBe('asset_6.mov');
    });

    it('throws for unsupported MIME type', () => {
      expect(() => buildAssetFilename(7, 'text/plain')).toThrow(
        'Unsupported MIME type: text/plain',
      );
    });
  });

  describe('getAssetFileUri', () => {
    it('builds full file URI for word audio', () => {
      expect(getAssetFileUri('word', 1, 'audio', 'asset_10.m4a')).toBe(
        `${Paths.document.uri}media/words/1/audio/asset_10.m4a`,
      );
    });

    it('builds full file URI for variant photo', () => {
      expect(getAssetFileUri('variant', 3, 'photo', 'asset_20.jpg')).toBe(
        `${Paths.document.uri}media/variants/3/photos/asset_20.jpg`,
      );
    });

    it('builds full file URI for word video', () => {
      expect(getAssetFileUri('word', 2, 'video', 'asset_30.mp4')).toBe(
        `${Paths.document.uri}media/words/2/videos/asset_30.mp4`,
      );
    });
  });

  // ─── ensureDir ──────────────────────────────────────────────────────────────

  describe('ensureDir', () => {
    it('creates directory when it does not exist', () => {
      const mockCreate = jest.fn();
      (Directory as unknown as jest.Mock).mockReturnValueOnce({
        create: mockCreate,
        delete: jest.fn(),
        exists: false,
        uri: '',
      });

      ensureDir('file:///test/dir/');

      expect(Directory).toHaveBeenCalledWith('file:///test/dir/');
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('does not create directory when it already exists', () => {
      const mockCreate = jest.fn();
      (Directory as unknown as jest.Mock).mockReturnValueOnce({
        create: mockCreate,
        delete: jest.fn(),
        exists: true,
        uri: 'file:///test/dir/',
      });

      ensureDir('file:///test/dir/');

      expect(Directory).toHaveBeenCalledWith('file:///test/dir/');
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  // ─── saveAssetFile ──────────────────────────────────────────────────────────

  describe('saveAssetFile', () => {
    it('creates directory tree, copies source to destination, and returns dest URI', () => {
      // Make ensureDir calls work (Directory mock returns exists: false by default)
      const mockDirCreate = jest.fn();
      (Directory as unknown as jest.Mock).mockImplementation(() => ({
        create: mockDirCreate,
        delete: jest.fn(),
        exists: false,
        uri: '',
      }));

      const mockCopy = jest.fn();
      const destUri = `${Paths.document.uri}media/words/1/audio/asset_99.m4a`;
      let callCount = 0;
      (FSFile as unknown as jest.Mock).mockImplementation((uri: string) => {
        callCount++;
        // First call: source file; second call: dest file
        if (callCount === 1) {
          return { copy: mockCopy, delete: jest.fn(), exists: true, uri };
        }
        return { copy: jest.fn(), delete: jest.fn(), exists: true, uri: destUri };
      });

      const result = saveAssetFile(
        'file:///tmp/recording.m4a',
        'word', 1, 'audio', 99, 'audio/mp4',
      );

      expect(result).toBe(destUri);
      // ensureDir creates 4 directories in the tree
      expect(mockDirCreate).toHaveBeenCalledTimes(4);
      // source.copy(dest) is called once
      expect(mockCopy).toHaveBeenCalledTimes(1);
    });

    it('passes the dest File instance to source.copy()', () => {
      (Directory as unknown as jest.Mock).mockImplementation(() => ({
        create: jest.fn(),
        delete: jest.fn(),
        exists: false,
        uri: '',
      }));

      const mockCopy = jest.fn();
      const destFile = { copy: jest.fn(), delete: jest.fn(), exists: true, uri: 'dest-uri' };
      let isSource = true;
      (FSFile as unknown as jest.Mock).mockImplementation(() => {
        if (isSource) {
          isSource = false;
          return { copy: mockCopy, delete: jest.fn(), exists: true, uri: 'source-uri' };
        }
        return destFile;
      });

      saveAssetFile('file:///src', 'variant', 2, 'photo', 10, 'image/jpeg');

      expect(mockCopy).toHaveBeenCalledWith(destFile);
    });
  });

  // ─── deleteAssetFile ────────────────────────────────────────────────────────

  describe('deleteAssetFile', () => {
    it('deletes file when it exists', () => {
      const mockDelete = jest.fn();
      (FSFile as unknown as jest.Mock).mockReturnValueOnce({
        copy: jest.fn(),
        delete: mockDelete,
        exists: true,
        uri: 'file:///test',
      });

      deleteAssetFile('file:///test');

      expect(FSFile).toHaveBeenCalledWith('file:///test');
      expect(mockDelete).toHaveBeenCalledTimes(1);
    });

    it('does not delete when file does not exist', () => {
      const mockDelete = jest.fn();
      (FSFile as unknown as jest.Mock).mockReturnValueOnce({
        copy: jest.fn(),
        delete: mockDelete,
        exists: false,
        uri: 'file:///test',
      });

      deleteAssetFile('file:///test');

      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('swallows errors (best-effort)', () => {
      (FSFile as unknown as jest.Mock).mockImplementationOnce(() => {
        throw new Error('fs error');
      });

      expect(() => deleteAssetFile('file:///bad')).not.toThrow();
    });
  });

  // ─── deleteAllAssetsForParent ───────────────────────────────────────────────

  describe('deleteAllAssetsForParent', () => {
    it('deletes the parent directory when it exists', () => {
      const mockDelete = jest.fn();
      (Directory as unknown as jest.Mock).mockReturnValueOnce({
        create: jest.fn(),
        delete: mockDelete,
        exists: true,
        uri: 'file:///parent/dir/',
      });

      deleteAllAssetsForParent('word', 1);

      expect(Directory).toHaveBeenCalledWith(
        `${Paths.document.uri}media/words/1/`,
      );
      expect(mockDelete).toHaveBeenCalledTimes(1);
    });

    it('does not delete when the parent directory does not exist', () => {
      const mockDelete = jest.fn();
      (Directory as unknown as jest.Mock).mockReturnValueOnce({
        create: jest.fn(),
        delete: mockDelete,
        exists: false,
        uri: '',
      });

      deleteAllAssetsForParent('variant', 5);

      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('swallows errors (best-effort)', () => {
      (Directory as unknown as jest.Mock).mockImplementationOnce(() => {
        throw new Error('dir error');
      });

      expect(() => deleteAllAssetsForParent('word', 99)).not.toThrow();
    });
  });

  // ─── deleteAllMedia ─────────────────────────────────────────────────────────

  describe('deleteAllMedia', () => {
    it('deletes the media root directory when it exists', () => {
      const mockDelete = jest.fn();
      (Directory as unknown as jest.Mock).mockReturnValueOnce({
        create: jest.fn(),
        delete: mockDelete,
        exists: true,
        uri: `${Paths.document.uri}media/`,
      });

      deleteAllMedia();

      expect(Directory).toHaveBeenCalledWith(`${Paths.document.uri}media/`);
      expect(mockDelete).toHaveBeenCalledTimes(1);
    });

    it('does not delete when media root does not exist', () => {
      const mockDelete = jest.fn();
      (Directory as unknown as jest.Mock).mockReturnValueOnce({
        create: jest.fn(),
        delete: mockDelete,
        exists: false,
        uri: '',
      });

      deleteAllMedia();

      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('swallows errors (best-effort)', () => {
      (Directory as unknown as jest.Mock).mockImplementationOnce(() => {
        throw new Error('root dir error');
      });

      expect(() => deleteAllMedia()).not.toThrow();
    });
  });

  // ─── assetFileExists ────────────────────────────────────────────────────────

  describe('assetFileExists', () => {
    it('returns true when file exists', () => {
      (FSFile as unknown as jest.Mock).mockReturnValueOnce({
        copy: jest.fn(),
        delete: jest.fn(),
        exists: true,
        uri: 'file:///test',
      });

      expect(assetFileExists('file:///test')).toBe(true);
      expect(FSFile).toHaveBeenCalledWith('file:///test');
    });

    it('returns false when file does not exist', () => {
      (FSFile as unknown as jest.Mock).mockReturnValueOnce({
        copy: jest.fn(),
        delete: jest.fn(),
        exists: false,
        uri: 'file:///missing',
      });

      expect(assetFileExists('file:///missing')).toBe(false);
    });

    it('returns false when File constructor throws', () => {
      (FSFile as unknown as jest.Mock).mockImplementationOnce(() => {
        throw new Error('fs error');
      });

      expect(assetFileExists('file:///bad')).toBe(false);
    });
  });

  describe('moveAssetFile', () => {
    const mockFileSrc = { exists: true, copy: jest.fn(), delete: jest.fn(), uri: '' };
    const mockFileDest = { exists: false, copy: jest.fn(), delete: jest.fn(), uri: '' };
    const mockDirExists = { exists: true, create: jest.fn() };
    const mockDirNotExists = { exists: false, create: jest.fn() };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns early when same parent', () => {
      const uri = moveAssetFile('word', 1, 'word', 1, 'audio', 'asset_1.m4a');
      expect(uri).toContain('asset_1.m4a');
      expect(FSFile).not.toHaveBeenCalled();
    });

    it('copies file to new parent directory and deletes source', () => {
      (Directory as unknown as jest.Mock)
        .mockReturnValueOnce(mockDirExists) // media root
        .mockReturnValueOnce(mockDirExists) // parent type dir
        .mockReturnValueOnce(mockDirExists) // parent id dir
        .mockReturnValueOnce(mockDirExists); // asset type dir

      (FSFile as unknown as jest.Mock)
        .mockReturnValueOnce(mockFileSrc) // source file for copy
        .mockReturnValueOnce(mockFileDest) // dest file for copy
        .mockReturnValueOnce({ exists: true, delete: jest.fn() }); // source for delete

      const uri = moveAssetFile('word', 1, 'variant', 2, 'audio', 'asset_1.m4a');

      expect(mockFileSrc.copy).toHaveBeenCalledWith(mockFileDest);
      expect(uri).toContain('variants');
      expect(uri).toContain('asset_1.m4a');
    });

    it('returns new destination URI', () => {
      (Directory as unknown as jest.Mock)
        .mockReturnValue(mockDirExists);
      (FSFile as unknown as jest.Mock)
        .mockReturnValueOnce(mockFileSrc)
        .mockReturnValueOnce(mockFileDest)
        .mockReturnValueOnce({ exists: true, delete: jest.fn() });

      const uri = moveAssetFile('word', 1, 'variant', 2, 'audio', 'asset_1.m4a');
      expect(uri).toContain('variant');
      expect(uri).toContain('2');
      expect(uri).toContain('audio');
    });

    it('creates destination directory if it does not exist', () => {
      (Directory as unknown as jest.Mock)
        .mockReturnValueOnce(mockDirExists)
        .mockReturnValueOnce(mockDirExists)
        .mockReturnValueOnce(mockDirNotExists) // parent id dir does not exist
        .mockReturnValueOnce(mockDirNotExists); // asset type dir does not exist

      (FSFile as unknown as jest.Mock)
        .mockReturnValueOnce(mockFileSrc)
        .mockReturnValueOnce(mockFileDest)
        .mockReturnValueOnce({ exists: true, delete: jest.fn() });

      moveAssetFile('word', 1, 'variant', 99, 'audio', 'asset_1.m4a');
      expect(mockDirNotExists.create).toHaveBeenCalled();
    });
  });
});
