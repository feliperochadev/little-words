import { unzipSync, strFromU8 } from 'fflate';

// --- Mocks ---
const mockGetAllCategoriesForBackup = jest.fn();
const mockGetAllWordsForBackup = jest.fn();
const mockGetAllVariantsForBackup = jest.fn();
const mockGetAllAssetsForBackup = jest.fn();

jest.mock('../../src/repositories/backupRepository', () => ({
  getAllCategoriesForBackup: (...args: unknown[]) => mockGetAllCategoriesForBackup(...args),
  getAllWordsForBackup: (...args: unknown[]) => mockGetAllWordsForBackup(...args),
  getAllVariantsForBackup: (...args: unknown[]) => mockGetAllVariantsForBackup(...args),
  getAllAssetsForBackup: (...args: unknown[]) => mockGetAllAssetsForBackup(...args),
}));

const mockFileBytesResult = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]);
const mockFileExists = true;
const mockFileWrite = jest.fn();
const mockFileBytes = jest.fn().mockResolvedValue(mockFileBytesResult);

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation(() => ({
    exists: mockFileExists,
    bytes: mockFileBytes,
    write: mockFileWrite,
    uri: 'file:///cache/test.zip',
  })),
  Directory: jest.fn().mockImplementation(() => ({
    createFile: jest.fn().mockReturnValue({ write: mockFileWrite, uri: 'file:///test.zip' }),
    pickDirectoryAsync: jest.fn(),
  })),
  Paths: { cache: 'file:///cache/', document: { uri: 'file:///documents/' } },
}));

const mockShareAsync = jest.fn().mockResolvedValue(undefined);
const mockIsAvailableAsync = jest.fn().mockResolvedValue(true);
jest.mock('expo-sharing', () => ({
  shareAsync: (...args: unknown[]) => mockShareAsync(...args),
  isAvailableAsync: (...args: unknown[]) => mockIsAvailableAsync(...args),
}));

jest.mock('expo-constants', () => ({
  default: { expoConfig: { version: '0.8.0' } },
}));

const mockGetState = jest.fn().mockReturnValue({ name: 'Sofia', sex: 'girl', birth: '2023-01-01' });
jest.mock('../../src/stores/settingsStore', () => ({
  useSettingsStore: { getState: (...args: unknown[]) => mockGetState(...args) },
}));

const mockGetAssetFileUri = jest.fn().mockReturnValue('file:///media/words/1/audio/asset_1.m4a');
jest.mock('../../src/utils/assetStorage', () => ({
  getAssetFileUri: (...args: unknown[]) => mockGetAssetFileUri(...args),
}));

import { buildBackupZip, shareFullBackup, saveFullBackupToDevice } from '../../src/utils/backupExport';

const mockT = (key: string): string =>
  ({
    'brandHeader.appName': 'Little Words',
    'backup.shareDialogTitle': 'Share Backup',
    'backup.saveSuccess': 'Saved!',
    'backup.saveMsg': 'Saved.',
  }[key] ?? key);

const mockLocale = 'en-US';

const sampleCategory = { id: 1, name: 'food', color: '#f00', emoji: '🍕', created_at: '2024-01-01' };
const sampleWord = { id: 1, word: 'mama', category_id: null, date_added: '2024-01-01', notes: null, created_at: '2024-01-01' };
const sampleVariant = { id: 1, word_id: 1, variant: 'maa', date_added: '2024-01-01', notes: null, created_at: '2024-01-01' };
const sampleAsset = {
  id: 1, parent_type: 'word', parent_id: 1, asset_type: 'audio',
  filename: 'asset_1.m4a', name: null, mime_type: 'audio/mp4',
  file_size: 1024, duration_ms: 3000, width: null, height: null, created_at: '2024-01-01',
};

describe('backupExport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllCategoriesForBackup.mockResolvedValue([sampleCategory]);
    mockGetAllWordsForBackup.mockResolvedValue([sampleWord]);
    mockGetAllVariantsForBackup.mockResolvedValue([sampleVariant]);
    mockGetAllAssetsForBackup.mockResolvedValue([sampleAsset]);
    mockIsAvailableAsync.mockResolvedValue(true);
    mockFileBytes.mockResolvedValue(mockFileBytesResult);
  });

  describe('buildBackupZip', () => {
    it('produces a valid ZIP with manifest.json and data.json', async () => {
      const zipBytes = await buildBackupZip(mockT, mockLocale);
      expect(zipBytes).toBeInstanceOf(Uint8Array);

      const extracted = unzipSync(zipBytes);
      expect(Object.keys(extracted)).toContain('manifest.json');
      expect(Object.keys(extracted)).toContain('data.json');
    });

    it('manifest.json has correct version and counts', async () => {
      const zipBytes = await buildBackupZip(mockT, mockLocale);
      const extracted = unzipSync(zipBytes);
      const manifest = JSON.parse(strFromU8(extracted['manifest.json']));
      expect(manifest.version).toBe('1.0');
      expect(manifest.word_count).toBe(1);
      expect(manifest.variant_count).toBe(1);
      expect(manifest.category_count).toBe(1);
      expect(manifest.asset_count).toBe(1);
      expect(manifest.locale).toBe('en-US');
      expect(typeof manifest.app_version).toBe('string');
    });

    it('data.json includes all entities', async () => {
      const zipBytes = await buildBackupZip(mockT, mockLocale);
      const extracted = unzipSync(zipBytes);
      const data = JSON.parse(strFromU8(extracted['data.json']));
      expect(data.words).toHaveLength(1);
      expect(data.words[0].word).toBe('mama');
      expect(data.variants).toHaveLength(1);
      expect(data.categories).toHaveLength(1);
      expect(data.assets).toHaveLength(1);
    });

    it('data.json has profile settings', async () => {
      const zipBytes = await buildBackupZip(mockT, mockLocale);
      const extracted = unzipSync(zipBytes);
      const data = JSON.parse(strFromU8(extracted['data.json']));
      expect(data.settings.name).toBe('Sofia');
      expect(data.settings.sex).toBe('girl');
      expect(data.settings.birth).toBe('2023-01-01');
    });

    it('assets have computed media_path', async () => {
      const zipBytes = await buildBackupZip(mockT, mockLocale);
      const extracted = unzipSync(zipBytes);
      const data = JSON.parse(strFromU8(extracted['data.json']));
      expect(data.assets[0].media_path).toBe('words/1/audio/asset_1.m4a');
    });

    it('media file is included in ZIP when it exists', async () => {
      const zipBytes = await buildBackupZip(mockT, mockLocale);
      const extracted = unzipSync(zipBytes);
      expect(Object.keys(extracted)).toContain('media/words/1/audio/asset_1.m4a');
    });

    it('skips asset files that throw on read', async () => {
      mockFileBytes.mockRejectedValueOnce(new Error('file error'));
      const zipBytes = await buildBackupZip(mockT, mockLocale);
      expect(zipBytes).toBeInstanceOf(Uint8Array);
      const extracted = unzipSync(zipBytes);
      // data.json still has the asset record even if file is missing
      const data = JSON.parse(strFromU8(extracted['data.json']));
      expect(data.assets).toHaveLength(1);
    });

    it('passes locale to manifest and data', async () => {
      const zipBytes = await buildBackupZip(mockT, 'pt-BR');
      const extracted = unzipSync(zipBytes);
      const manifest = JSON.parse(strFromU8(extracted['manifest.json']));
      const data = JSON.parse(strFromU8(extracted['data.json']));
      expect(manifest.locale).toBe('pt-BR');
      expect(data.settings.locale).toBe('pt-BR');
    });

    it('handles unlinked parent type in media_path', async () => {
      mockGetAllAssetsForBackup.mockResolvedValue([{
        ...sampleAsset,
        parent_type: 'unlinked',
        parent_id: 5,
      }]);
      const zipBytes = await buildBackupZip(mockT, mockLocale);
      const extracted = unzipSync(zipBytes);
      const data = JSON.parse(strFromU8(extracted['data.json']));
      expect(data.assets[0].media_path).toBe('unlinked/5/audio/asset_1.m4a');
    });

    it('uses empty string when settings name and birth are null', async () => {
      mockGetState.mockReturnValueOnce({ name: null, sex: null, birth: null });
      const zipBytes = await buildBackupZip(mockT, mockLocale);
      const extracted = unzipSync(zipBytes);
      const data = JSON.parse(strFromU8(extracted['data.json']));
      expect(data.settings.name).toBe('');
      expect(data.settings.birth).toBe('');
    });

    it('falls back to parentType string when not in PARENT_DIRS', async () => {
      mockGetAllAssetsForBackup.mockResolvedValue([{
        ...sampleAsset,
        parent_type: 'unknown_type',
      }]);
      const zipBytes = await buildBackupZip(mockT, mockLocale);
      const extracted = unzipSync(zipBytes);
      const data = JSON.parse(strFromU8(extracted['data.json']));
      expect(data.assets[0].media_path).toContain('unknown_type/');
    });

    it('falls back to assetType string when not in ASSET_TYPE_DIRS', async () => {
      mockGetAllAssetsForBackup.mockResolvedValue([{
        ...sampleAsset,
        asset_type: 'document' as any, // 'document' is NOT in ASSET_TYPE_DIRS → fallback
      }]);
      const zipBytes = await buildBackupZip(mockT, mockLocale);
      const extracted = unzipSync(zipBytes);
      const data = JSON.parse(strFromU8(extracted['data.json']));
      expect(data.assets[0].media_path).toContain('/document/');
    });

    it('skips asset file when file does not exist on disk', async () => {
      const { File } = require('expo-file-system');
      File.mockImplementationOnce(() => ({
        exists: false,
        bytes: mockFileBytes,
        write: mockFileWrite,
        uri: 'file:///media/words/1/audio/asset_1.m4a',
      }));
      const zipBytes = await buildBackupZip(mockT, mockLocale);
      const extracted = unzipSync(zipBytes);
      // data.json still has the asset record
      const data = JSON.parse(strFromU8(extracted['data.json']));
      expect(data.assets).toHaveLength(1);
    });
  });

  describe('shareFullBackup', () => {
    it('returns success when sharing is available and succeeds', async () => {
      const result = await shareFullBackup(mockT, mockLocale);
      expect(result.success).toBe(true);
      expect(mockShareAsync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ mimeType: 'application/zip' }),
      );
    });

    it('returns failure when sharing is not available', async () => {
      mockIsAvailableAsync.mockResolvedValueOnce(false);
      const result = await shareFullBackup(mockT, mockLocale);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not available');
    });

    it('returns failure when sharing throws', async () => {
      mockShareAsync.mockRejectedValueOnce(new Error('share error'));
      const result = await shareFullBackup(mockT, mockLocale);
      expect(result.success).toBe(false);
      expect(result.error).toBe('share error');
    });

    it('returns Unknown error when a non-Error is thrown during sharing', async () => {
      mockShareAsync.mockRejectedValueOnce('plain string error');
      const result = await shareFullBackup(mockT, mockLocale);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });
  });

  describe('saveFullBackupToDevice', () => {
    it('returns error when zip creation throws', async () => {
      mockGetAllWordsForBackup.mockRejectedValueOnce(new Error('db error'));
      const result = await saveFullBackupToDevice(mockT, mockLocale);
      expect(result.success).toBe(false);
      expect(result.error).toBe('db error');
    });

    it('returns success when directory is picked and file is written', async () => {
      const mockCreateFile = jest.fn().mockReturnValue({ write: mockFileWrite, uri: 'file:///chosen/backup.zip' });
      const { Directory } = require('expo-file-system');
      Directory.pickDirectoryAsync = jest.fn().mockResolvedValue({ createFile: mockCreateFile });
      const result = await saveFullBackupToDevice(mockT, mockLocale);
      expect(result.success).toBe(true);
      expect(mockFileWrite).toHaveBeenCalled();
    });

    it('returns cancelled when directory picker throws', async () => {
      const { Directory } = require('expo-file-system');
      Directory.pickDirectoryAsync = jest.fn().mockRejectedValue(new Error('cancelled'));
      const result = await saveFullBackupToDevice(mockT, mockLocale);
      expect(result.success).toBe(false);
      expect(result.error).toBe('cancelled');
    });
  });
});
