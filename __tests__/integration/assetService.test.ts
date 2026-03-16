import {
  saveAsset,
  removeAsset,
  removeAllAssetsForParent,
  removeAllMedia,
  getAssetsByParent,
  getAssetsByParentAndType,
} from '../../src/services/assetService';
import type { Asset, SaveAssetParams } from '../../src/services/assetService';
import {
  addAsset,
  deleteAsset,
  deleteAssetsByParent,
  updateAssetFilename,
  getAssetById,
} from '../../src/database/database';
import {
  saveAssetFile,
  deleteAssetFile,
  deleteAllAssetsForParent as deleteAllAssetsForParentFS,
  deleteAllMedia as deleteAllMediaFS,
  buildAssetFilename,
  getAssetFileUri,
} from '../../src/utils/assetStorage';

jest.mock('../../src/utils/assetStorage', () => ({
  saveAssetFile: jest.fn(() => 'file:///mock/saved-file.m4a'),
  deleteAssetFile: jest.fn(),
  deleteAllAssetsForParent: jest.fn(),
  deleteAllMedia: jest.fn(),
  buildAssetFilename: jest.fn((id: number, mime: string) => {
    const extMap: Record<string, string> = {
      'audio/mp4': '.m4a',
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'audio/x-m4a': '.m4a',
      'audio/aac': '.aac',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'video/mp4': '.mp4',
      'video/quicktime': '.mov',
    };
    return `asset_${id}${extMap[mime] || '.bin'}`;
  }),
  getAssetFileUri: jest.fn(
    (...args: string[]) => `file:///mock/${args.join('/')}`,
  ),
}));

const mockDb = (globalThis as any).__mockDb;

const AUDIO_PARAMS: SaveAssetParams = {
  sourceUri: 'file:///tmp/recording.m4a',
  parentType: 'word',
  parentId: 42,
  assetType: 'audio',
  mimeType: 'audio/mp4',
  fileSize: 1024,
  durationMs: 3000,
};

const PHOTO_PARAMS: SaveAssetParams = {
  sourceUri: 'file:///tmp/photo.jpg',
  parentType: 'word',
  parentId: 10,
  assetType: 'photo',
  mimeType: 'image/jpeg',
  fileSize: 5000,
  width: 1920,
  height: 1080,
};

const VIDEO_PARAMS: SaveAssetParams = {
  sourceUri: 'file:///tmp/video.mp4',
  parentType: 'variant',
  parentId: 7,
  assetType: 'video',
  mimeType: 'video/mp4',
  fileSize: 50000,
  durationMs: 15000,
  width: 1280,
  height: 720,
};

describe('assetService', () => {
  function mockAssetRow(id: number, params: SaveAssetParams): Asset {
    return {
      id,
      parent_type: params.parentType,
      parent_id: params.parentId,
      asset_type: params.assetType,
      filename: `asset_${id}${
        { 'audio/mp4': '.m4a', 'audio/mpeg': '.mp3', 'image/jpeg': '.jpg',
          'image/png': '.png', 'video/mp4': '.mp4', 'video/quicktime': '.mov' }
        [params.mimeType] || '.bin'
      }`,
      mime_type: params.mimeType,
      file_size: params.fileSize,
      duration_ms: params.durationMs ?? null,
      width: params.width ?? null,
      height: params.height ?? null,
      created_at: '2026-03-15 12:00:00',
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.runSync.mockReturnValue({ lastInsertRowId: 1, changes: 1 });
  });

  // ─── saveAsset ────────────────────────────────────────────────────────────────

  describe('saveAsset', () => {
    it('saves an audio asset and returns correct fields', async () => {
      mockDb.runSync.mockReturnValue({ lastInsertRowId: 99, changes: 1 });
      mockDb.getAllSync.mockImplementation((sql: string) => {
        if (sql.includes('SELECT * FROM assets WHERE id')) {
          return [mockAssetRow(99, AUDIO_PARAMS)];
        }
        return [];
      });

      const result = await saveAsset(AUDIO_PARAMS);

      expect(result.id).toBe(99);
      expect(result.parent_type).toBe('word');
      expect(result.parent_id).toBe(42);
      expect(result.asset_type).toBe('audio');
      expect(result.mime_type).toBe('audio/mp4');
      expect(result.file_size).toBe(1024);
      expect(result.duration_ms).toBe(3000);
      expect(result.width).toBeNull();
      expect(result.height).toBeNull();
      expect(result.filename).toBe('asset_99.m4a');
      expect(result.created_at).toBeDefined();
    });

    it('calls addAsset with placeholder filename, then updates it', async () => {
      mockDb.runSync.mockReturnValue({ lastInsertRowId: 5, changes: 1 });
      mockDb.getAllSync.mockImplementation((sql: string) => {
        if (sql.includes('SELECT * FROM assets WHERE id')) {
          return [mockAssetRow(5, AUDIO_PARAMS)];
        }
        return [];
      });

      await saveAsset(AUDIO_PARAMS);

      // First runSync call = addAsset with 'pending' filename
      expect(mockDb.runSync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO assets'),
        expect.arrayContaining(['pending']),
      );
      // Second runSync call = updateAssetFilename
      expect(mockDb.runSync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE assets SET filename'),
        ['asset_5.m4a', 5],
      );
    });

    it('calls saveAssetFile with correct arguments', async () => {
      mockDb.runSync.mockReturnValue({ lastInsertRowId: 8, changes: 1 });
      mockDb.getAllSync.mockImplementation((sql: string) => {
        if (sql.includes('SELECT * FROM assets WHERE id')) {
          return [mockAssetRow(8, AUDIO_PARAMS)];
        }
        return [];
      });

      await saveAsset(AUDIO_PARAMS);

      expect(saveAssetFile).toHaveBeenCalledWith(
        'file:///tmp/recording.m4a',
        'word',
        42,
        'audio',
        8,
        'audio/mp4',
      );
    });

    it('saves a photo asset with width and height', async () => {
      mockDb.runSync.mockReturnValue({ lastInsertRowId: 20, changes: 1 });
      mockDb.getAllSync.mockImplementation((sql: string) => {
        if (sql.includes('SELECT * FROM assets WHERE id')) {
          return [mockAssetRow(20, PHOTO_PARAMS)];
        }
        return [];
      });

      const result = await saveAsset(PHOTO_PARAMS);

      expect(result.id).toBe(20);
      expect(result.asset_type).toBe('photo');
      expect(result.mime_type).toBe('image/jpeg');
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
      expect(result.duration_ms).toBeNull();
      expect(result.filename).toBe('asset_20.jpg');
    });

    it('saves a video asset with all optional fields', async () => {
      mockDb.runSync.mockReturnValue({ lastInsertRowId: 33, changes: 1 });
      mockDb.getAllSync.mockImplementation((sql: string) => {
        if (sql.includes('SELECT * FROM assets WHERE id')) {
          return [mockAssetRow(33, VIDEO_PARAMS)];
        }
        return [];
      });

      const result = await saveAsset(VIDEO_PARAMS);

      expect(result.id).toBe(33);
      expect(result.parent_type).toBe('variant');
      expect(result.parent_id).toBe(7);
      expect(result.asset_type).toBe('video');
      expect(result.mime_type).toBe('video/mp4');
      expect(result.file_size).toBe(50000);
      expect(result.duration_ms).toBe(15000);
      expect(result.width).toBe(1280);
      expect(result.height).toBe(720);
      expect(result.filename).toBe('asset_33.mp4');
    });

    it('defaults optional fields to null when omitted', async () => {
      mockDb.runSync.mockReturnValue({ lastInsertRowId: 2, changes: 1 });

      const params: SaveAssetParams = {
        sourceUri: 'file:///tmp/recording.m4a',
        parentType: 'word',
        parentId: 1,
        assetType: 'audio',
        mimeType: 'audio/mp4',
        fileSize: 512,
      };

      mockDb.getAllSync.mockImplementation((sql: string) => {
        if (sql.includes('SELECT * FROM assets WHERE id')) {
          return [mockAssetRow(2, params)];
        }
        return [];
      });

      const result = await saveAsset(params);

      expect(result.duration_ms).toBeNull();
      expect(result.width).toBeNull();
      expect(result.height).toBeNull();
    });

    it('defaults optional fields to null when explicitly undefined', async () => {
      mockDb.runSync.mockReturnValue({ lastInsertRowId: 3, changes: 1 });

      const params: SaveAssetParams = {
        sourceUri: 'file:///tmp/recording.m4a',
        parentType: 'word',
        parentId: 1,
        assetType: 'audio',
        mimeType: 'audio/mp4',
        fileSize: 512,
        durationMs: undefined,
        width: undefined,
        height: undefined,
      };

      mockDb.getAllSync.mockImplementation((sql: string) => {
        if (sql.includes('SELECT * FROM assets WHERE id')) {
          return [mockAssetRow(3, params)];
        }
        return [];
      });

      const result = await saveAsset(params);

      expect(result.duration_ms).toBeNull();
      expect(result.width).toBeNull();
      expect(result.height).toBeNull();
    });

    it('throws for invalid MIME type and does not touch DB or files', async () => {
      const params: SaveAssetParams = {
        ...AUDIO_PARAMS,
        mimeType: 'application/pdf',
      };

      await expect(saveAsset(params)).rejects.toThrow(
        'Invalid MIME type "application/pdf" for asset type "audio"',
      );

      expect(mockDb.runSync).not.toHaveBeenCalled();
      expect(saveAssetFile).not.toHaveBeenCalled();
    });

    it('throws for photo MIME on audio asset type', async () => {
      const params: SaveAssetParams = {
        ...AUDIO_PARAMS,
        mimeType: 'image/jpeg',
      };

      await expect(saveAsset(params)).rejects.toThrow(/Invalid MIME type/);
      expect(mockDb.runSync).not.toHaveBeenCalled();
    });

    it('throws for video MIME on photo asset type', async () => {
      const params: SaveAssetParams = {
        ...PHOTO_PARAMS,
        mimeType: 'video/mp4',
      };

      await expect(saveAsset(params)).rejects.toThrow(/Invalid MIME type/);
      expect(mockDb.runSync).not.toHaveBeenCalled();
    });

    it('throws when file size exceeds limit for audio', async () => {
      const params: SaveAssetParams = {
        ...AUDIO_PARAMS,
        fileSize: 51 * 1024 * 1024, // 51MB > 50MB limit
      };

      await expect(saveAsset(params)).rejects.toThrow(/File size.*exceeds limit/);
      expect(mockDb.runSync).not.toHaveBeenCalled();
      expect(saveAssetFile).not.toHaveBeenCalled();
    });

    it('throws when file size exceeds limit for photo', async () => {
      const params: SaveAssetParams = {
        ...PHOTO_PARAMS,
        fileSize: 21 * 1024 * 1024,
      };

      await expect(saveAsset(params)).rejects.toThrow(/File size.*exceeds limit/);
      expect(mockDb.runSync).not.toHaveBeenCalled();
    });

    it('throws when file size exceeds limit for video', async () => {
      const params: SaveAssetParams = {
        ...VIDEO_PARAMS,
        fileSize: 201 * 1024 * 1024,
      };

      await expect(saveAsset(params)).rejects.toThrow(/File size.*exceeds limit/);
      expect(mockDb.runSync).not.toHaveBeenCalled();
    });

    it('throws when file size is zero', async () => {
      const params: SaveAssetParams = {
        ...AUDIO_PARAMS,
        fileSize: 0,
      };

      await expect(saveAsset(params)).rejects.toThrow(/File size.*exceeds limit/);
      expect(mockDb.runSync).not.toHaveBeenCalled();
      expect(saveAssetFile).not.toHaveBeenCalled();
    });

    it('throws when file size is negative', async () => {
      const params: SaveAssetParams = {
        ...AUDIO_PARAMS,
        fileSize: -100,
      };

      await expect(saveAsset(params)).rejects.toThrow(/File size.*exceeds limit/);
      expect(mockDb.runSync).not.toHaveBeenCalled();
    });

    it('cleans up DB record when saveAssetFile throws', async () => {
      mockDb.runSync.mockReturnValue({ lastInsertRowId: 15, changes: 1 });
      (saveAssetFile as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Disk full');
      });

      await expect(saveAsset(AUDIO_PARAMS)).rejects.toThrow('Disk full');

      // deleteAsset should have been called (third runSync call)
      expect(mockDb.runSync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM assets'),
        [15],
      );
    });

    it('re-throws original error after cleanup on file save failure', async () => {
      mockDb.runSync.mockReturnValue({ lastInsertRowId: 4, changes: 1 });
      (saveAssetFile as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Permission denied');
      });

      await expect(saveAsset(AUDIO_PARAMS)).rejects.toThrow('Permission denied');
    });

    it('throws when getAssetById returns null after save', async () => {
      mockDb.runSync.mockReturnValue({ lastInsertRowId: 60, changes: 1 });
      mockDb.getAllSync.mockReturnValue([]);

      await expect(saveAsset(AUDIO_PARAMS)).rejects.toThrow(
        'Asset 60 not found after save',
      );
    });

    it('accepts file at exact max size limit', async () => {
      mockDb.runSync.mockReturnValue({ lastInsertRowId: 50, changes: 1 });

      const params: SaveAssetParams = {
        ...AUDIO_PARAMS,
        fileSize: 50 * 1024 * 1024, // exactly 50MB
      };

      mockDb.getAllSync.mockImplementation((sql: string) => {
        if (sql.includes('SELECT * FROM assets WHERE id')) {
          return [mockAssetRow(50, params)];
        }
        return [];
      });

      const result = await saveAsset(params);
      expect(result.id).toBe(50);
    });

    it('calls buildAssetFilename with correct id and mime', async () => {
      mockDb.runSync.mockReturnValue({ lastInsertRowId: 77, changes: 1 });
      mockDb.getAllSync.mockImplementation((sql: string) => {
        if (sql.includes('SELECT * FROM assets WHERE id')) {
          return [mockAssetRow(77, AUDIO_PARAMS)];
        }
        return [];
      });

      await saveAsset(AUDIO_PARAMS);

      expect(buildAssetFilename).toHaveBeenCalledWith(77, 'audio/mp4');
    });
  });

  // ─── removeAsset ──────────────────────────────────────────────────────────────

  describe('removeAsset', () => {
    const mockAsset: Asset = {
      id: 10,
      parent_type: 'word',
      parent_id: 42,
      asset_type: 'audio',
      filename: 'asset_10.m4a',
      mime_type: 'audio/mp4',
      file_size: 1024,
      duration_ms: 3000,
      width: null,
      height: null,
      created_at: '2024-01-01T00:00:00.000Z',
    };

    it('deletes DB record and then file', async () => {
      await removeAsset(mockAsset);

      expect(mockDb.runSync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM assets'),
        [10],
      );
      expect(getAssetFileUri).toHaveBeenCalledWith(
        'word', 42, 'audio', 'asset_10.m4a',
      );
      expect(deleteAssetFile).toHaveBeenCalled();
    });

    it('propagates DB error and does not delete file', async () => {
      mockDb.runSync.mockImplementationOnce(() => {
        throw new Error('DB locked');
      });

      await expect(removeAsset(mockAsset)).rejects.toThrow('DB locked');
      expect(deleteAssetFile).not.toHaveBeenCalled();
    });

    it('removes a photo asset correctly', async () => {
      const photoAsset: Asset = {
        ...mockAsset,
        id: 25,
        asset_type: 'photo',
        filename: 'asset_25.jpg',
        mime_type: 'image/jpeg',
      };

      await removeAsset(photoAsset);

      expect(mockDb.runSync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM assets'),
        [25],
      );
      expect(getAssetFileUri).toHaveBeenCalledWith(
        'word', 42, 'photo', 'asset_25.jpg',
      );
    });

    it('removes a variant asset correctly', async () => {
      const variantAsset: Asset = {
        ...mockAsset,
        id: 30,
        parent_type: 'variant',
        parent_id: 5,
        asset_type: 'video',
        filename: 'asset_30.mp4',
        mime_type: 'video/mp4',
      };

      await removeAsset(variantAsset);

      expect(getAssetFileUri).toHaveBeenCalledWith(
        'variant', 5, 'video', 'asset_30.mp4',
      );
    });
  });

  // ─── removeAllAssetsForParent ─────────────────────────────────────────────────

  describe('removeAllAssetsForParent', () => {
    it('deletes DB records and file directory for a word', async () => {
      await removeAllAssetsForParent('word', 42);

      expect(mockDb.runSync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM assets'),
        ['word', 42],
      );
      expect(deleteAllAssetsForParentFS).toHaveBeenCalledWith('word', 42);
    });

    it('deletes DB records and file directory for a variant', async () => {
      await removeAllAssetsForParent('variant', 7);

      expect(mockDb.runSync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM assets'),
        ['variant', 7],
      );
      expect(deleteAllAssetsForParentFS).toHaveBeenCalledWith('variant', 7);
    });

    it('propagates DB error without touching filesystem', async () => {
      mockDb.runSync.mockImplementationOnce(() => {
        throw new Error('DB error');
      });

      await expect(removeAllAssetsForParent('word', 1)).rejects.toThrow('DB error');
      expect(deleteAllAssetsForParentFS).not.toHaveBeenCalled();
    });
  });

  // ─── removeAllMedia ───────────────────────────────────────────────────────────

  describe('removeAllMedia', () => {
    it('calls deleteAllMedia from assetStorage', async () => {
      await removeAllMedia();

      expect(deleteAllMediaFS).toHaveBeenCalledTimes(1);
    });
  });

  // ─── re-exports ───────────────────────────────────────────────────────────────

  describe('re-exports', () => {
    it('re-exports getAssetsByParent from database', () => {
      expect(getAssetsByParent).toBeDefined();
      expect(typeof getAssetsByParent).toBe('function');
    });

    it('re-exports getAssetsByParentAndType from database', () => {
      expect(getAssetsByParentAndType).toBeDefined();
      expect(typeof getAssetsByParentAndType).toBe('function');
    });
  });
});
