import { zipSync, strToU8 } from 'fflate';
import { openBackupZip, importFullBackup } from '../../src/utils/backupImport';
import type { BackupData } from '../../src/types/backup';

// --- Repository mocks ---
jest.mock('../../src/repositories/categoryRepository', () => ({
  findCategoryByName: jest.fn(),
  importCategory: jest.fn(),
}));
jest.mock('../../src/repositories/wordRepository', () => ({
  findWordByName: jest.fn(),
  importWord: jest.fn(),
}));
jest.mock('../../src/repositories/variantRepository', () => ({
  findVariantByName: jest.fn(),
  importVariant: jest.fn(),
}));
jest.mock('../../src/repositories/assetRepository', () => ({
  importAsset: jest.fn(),
  updateAssetFilename: jest.fn(),
  deleteAsset: jest.fn(),
}));

const mockClearKeepsakeState = jest.fn().mockResolvedValue(undefined);
const mockSetKeepsakeState = jest.fn().mockResolvedValue(undefined);

jest.mock('../../src/repositories/keepsakeRepository', () => ({
  clearKeepsakeState: (...args: unknown[]) => mockClearKeepsakeState(...args),
  setKeepsakeState: (...args: unknown[]) => mockSetKeepsakeState(...args),
}));

import * as categoryRepo from '../../src/repositories/categoryRepository';
import * as wordRepo from '../../src/repositories/wordRepository';
import * as variantRepo from '../../src/repositories/variantRepository';
import * as assetRepo from '../../src/repositories/assetRepository';

const mockDb = (globalThis as any).__mockDb;

const mockFindCategory = categoryRepo.findCategoryByName as jest.Mock;
const mockImportCategory = categoryRepo.importCategory as jest.Mock;
const mockFindWord = wordRepo.findWordByName as jest.Mock;
const mockImportWord = wordRepo.importWord as jest.Mock;
const mockFindVariant = variantRepo.findVariantByName as jest.Mock;
const mockImportVariant = variantRepo.importVariant as jest.Mock;
const mockImportAsset = assetRepo.importAsset as jest.Mock;
const mockUpdateAssetFilename = assetRepo.updateAssetFilename as jest.Mock;
const mockDeleteAsset = assetRepo.deleteAsset as jest.Mock;

// --- File system mock ---
const mockFileWrite = jest.fn();
const mockDirCreate = jest.fn();

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation(() => ({
    exists: true,
    write: mockFileWrite,
    uri: 'file:///media/test.m4a',
  })),
  Directory: jest.fn().mockImplementation(() => ({
    exists: false,
    create: mockDirCreate,
  })),
  Paths: { document: { uri: 'file:///documents/' } },
}));

// --- assetStorage mock ---
const mockGetAssetFileUri = jest.fn().mockReturnValue('file:///media/words/1/audio/asset_1.m4a');
const mockEnsureAssetDirTree = jest.fn();
jest.mock('../../src/utils/assetStorage', () => ({
  ensureAssetDirTree: (...args: unknown[]) => mockEnsureAssetDirTree(...args),
  getAssetFileUri: (...args: unknown[]) => mockGetAssetFileUri(...args),
}));

// --- Helpers ---
function makeValidZip(
  data: BackupData,
  manifest = { version: '1.0', word_count: 0, variant_count: 0, category_count: 0, asset_count: 0, locale: 'en-US', exported_at: '2026-01-01T00:00:00Z', app_version: '0.8.0' },
  extraFiles: Record<string, Uint8Array> = {},
): Uint8Array {
  return zipSync({
    'manifest.json': strToU8(JSON.stringify(manifest)),
    'data.json': strToU8(JSON.stringify(data)),
    ...extraFiles,
  });
}

const emptyData: BackupData = {
  version: '1.0',
  settings: { name: 'Baby', sex: 'girl', birth: '2024-01-01', locale: 'en-US' },
  categories: [],
  words: [],
  variants: [],
  assets: [],
};

describe('backupImport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFileWrite.mockReset();
    mockDirCreate.mockReset();
    mockEnsureAssetDirTree.mockReset();
    mockClearKeepsakeState.mockResolvedValue(undefined);
    mockSetKeepsakeState.mockResolvedValue(undefined);
    mockDb.withTransactionAsync.mockImplementation(async (fn: () => Promise<void>) => fn());

    // Default repository responses
    mockFindCategory.mockResolvedValue(null);
    mockImportCategory.mockResolvedValue(1);
    mockFindWord.mockResolvedValue(null);
    mockImportWord.mockResolvedValue(1);
    mockFindVariant.mockResolvedValue(null);
    mockImportVariant.mockResolvedValue(1);
    mockImportAsset.mockResolvedValue(42);
    mockUpdateAssetFilename.mockResolvedValue(undefined);
    mockDeleteAsset.mockResolvedValue(undefined);
  });

  describe('openBackupZip', () => {
    it('returns manifest, data, and fileMap for a valid ZIP', () => {
      const zip = makeValidZip(emptyData);
      const { manifest, data, fileMap } = openBackupZip(zip);
      expect(manifest.version).toBe('1.0');
      expect(data.words).toEqual([]);
      expect(fileMap['manifest.json']).toBeDefined();
      expect(fileMap['data.json']).toBeDefined();
    });

    it('throws when bytes are not a valid ZIP', () => {
      expect(() => openBackupZip(new Uint8Array([1, 2, 3]))).toThrow('Not a valid ZIP file');
    });

    it('throws when manifest.json is missing', () => {
      const zip = zipSync({ 'data.json': strToU8('{"words":[],"variants":[],"categories":[],"assets":[]}') });
      expect(() => openBackupZip(zip)).toThrow('missing manifest.json');
    });

    it('throws when data.json is missing', () => {
      const zip = zipSync({ 'manifest.json': strToU8('{"version":"1.0"}') });
      expect(() => openBackupZip(zip)).toThrow('missing data.json');
    });

    it('throws for unsupported manifest version', () => {
      const zip = zipSync({
        'manifest.json': strToU8('{"version":"9.9"}'),
        'data.json': strToU8('{"words":[],"variants":[],"categories":[],"assets":[]}'),
      });
      expect(() => openBackupZip(zip)).toThrow('Unsupported backup version');
    });

    it('throws when data.json is missing required arrays', () => {
      const zip = zipSync({
        'manifest.json': strToU8('{"version":"1.0"}'),
        'data.json': strToU8('{"words":[]}'),
      });
      expect(() => openBackupZip(zip)).toThrow('missing "variants" array');
    });

    it('throws on path traversal in media_path', () => {
      const dataWithBadPath: BackupData = {
        ...emptyData,
        assets: [{ id: 1, parent_type: 'word', parent_id: 1, asset_type: 'audio', filename: 'asset_1.m4a', name: null, mime_type: 'audio/mp4', file_size: 1024, duration_ms: null, width: null, height: null, created_at: '2024-01-01', media_path: '../evil/path' }],
      };
      const zip = makeValidZip(dataWithBadPath);
      expect(() => openBackupZip(zip)).toThrow('Unsafe file path detected');
    });
  });

  describe('importFullBackup', () => {
    it('returns zero counts for empty backup', async () => {
      const result = await importFullBackup(emptyData, {});
      expect(result.categoriesAdded).toBe(0);
      expect(result.wordsAdded).toBe(0);
      expect(result.wordsSkipped).toBe(0);
      expect(result.variantsAdded).toBe(0);
      expect(result.audiosRestored + result.photosRestored + result.videosRestored).toBe(0);
      expect(result.assetWarnings).toHaveLength(0);
    });

    it('imports a new category', async () => {
      mockFindCategory.mockResolvedValueOnce(null);
      mockImportCategory.mockResolvedValueOnce(7);
      const data: BackupData = {
        ...emptyData,
        categories: [{ id: 1, name: 'food', color: '#f00', emoji: '🍕', created_at: '2024-01-01' }],
      };
      const result = await importFullBackup(data, {});
      expect(result.categoriesAdded).toBe(1);
      expect(mockImportCategory).toHaveBeenCalledWith('food', '#f00', '🍕', '2024-01-01');
    });

    it('skips existing category (matched by name)', async () => {
      mockFindCategory.mockResolvedValueOnce({ id: 99, name: 'food', color: '#f00', emoji: '🍕', created_at: '2024-01-01' });
      const data: BackupData = {
        ...emptyData,
        categories: [{ id: 1, name: 'food', color: '#f00', emoji: '🍕', created_at: '2024-01-01' }],
      };
      const result = await importFullBackup(data, {});
      expect(result.categoriesAdded).toBe(0);
      expect(mockImportCategory).not.toHaveBeenCalled();
    });

    it('maps old category id to new id for imported words', async () => {
      mockFindCategory.mockResolvedValueOnce(null);
      mockImportCategory.mockResolvedValueOnce(99);
      mockFindWord.mockResolvedValueOnce(null);
      mockImportWord.mockResolvedValueOnce(10);
      const data: BackupData = {
        ...emptyData,
        categories: [{ id: 1, name: 'food', color: '#f00', emoji: '🍕', created_at: '2024-01-01' }],
        words: [{ id: 1, word: 'pizza', category_id: 1, date_added: '2024-01-01', notes: null, created_at: '2024-01-01' }],
      };
      const result = await importFullBackup(data, {});
      expect(result.wordsAdded).toBe(1);
      expect(mockImportWord).toHaveBeenCalledWith('pizza', 99, '2024-01-01', null, '2024-01-01');
    });

    it('imports a new word', async () => {
      mockFindWord.mockResolvedValueOnce(null);
      mockImportWord.mockResolvedValueOnce(10);
      const data: BackupData = {
        ...emptyData,
        words: [{ id: 1, word: 'mama', category_id: null, date_added: '2024-01-01', notes: null, created_at: '2024-01-01' }],
      };
      const result = await importFullBackup(data, {});
      expect(result.wordsAdded).toBe(1);
      expect(result.wordsSkipped).toBe(0);
    });

    it('skips existing word (case-insensitive match)', async () => {
      mockFindWord.mockResolvedValueOnce({ id: 77, word: 'Mama', category_id: null, date_added: '2024-01-01', notes: null, created_at: '2024-01-01', variant_count: 0 });
      const data: BackupData = {
        ...emptyData,
        words: [{ id: 1, word: 'Mama', category_id: null, date_added: '2024-01-01', notes: null, created_at: '2024-01-01' }],
      };
      const result = await importFullBackup(data, {});
      expect(result.wordsAdded).toBe(0);
      expect(result.wordsSkipped).toBe(1);
      expect(mockImportWord).not.toHaveBeenCalled();
    });

    it('imports word with non-null category_id not in idMap (maps to null)', async () => {
      mockFindWord.mockResolvedValueOnce(null);
      mockImportWord.mockResolvedValueOnce(10);
      const data: BackupData = {
        ...emptyData,
        words: [{ id: 1, word: 'mama', category_id: 5, date_added: '2024-01-01', notes: null, created_at: '2024-01-01' }],
      };
      const result = await importFullBackup(data, {});
      expect(result.wordsAdded).toBe(1);
      expect(mockImportWord).toHaveBeenCalledWith('mama', null, '2024-01-01', null, '2024-01-01');
    });

    it('imports a new variant', async () => {
      mockFindWord.mockResolvedValueOnce(null);
      mockImportWord.mockResolvedValueOnce(10);
      mockFindVariant.mockResolvedValueOnce(null);
      mockImportVariant.mockResolvedValueOnce(20);
      const data: BackupData = {
        ...emptyData,
        words: [{ id: 1, word: 'mama', category_id: null, date_added: '2024-01-01', notes: null, created_at: '2024-01-01' }],
        variants: [{ id: 1, word_id: 1, variant: 'maa', date_added: '2024-01-01', notes: null, created_at: '2024-01-01' }],
      };
      const result = await importFullBackup(data, {});
      expect(result.variantsAdded).toBe(1);
      expect(mockImportVariant).toHaveBeenCalledWith(10, 'maa', '2024-01-01', null, '2024-01-01');
    });

    it('skips existing variants (matched by word + variant name)', async () => {
      mockFindWord.mockResolvedValueOnce(null);
      mockImportWord.mockResolvedValueOnce(10);
      mockFindVariant.mockResolvedValueOnce({ id: 55, word_id: 10, variant: 'maa', date_added: '2024-01-01', notes: null, created_at: '2024-01-01' });
      const data: BackupData = {
        ...emptyData,
        words: [{ id: 1, word: 'mama', category_id: null, date_added: '2024-01-01', notes: null, created_at: '2024-01-01' }],
        variants: [{ id: 1, word_id: 1, variant: 'maa', date_added: '2024-01-01', notes: null, created_at: '2024-01-01' }],
      };
      const result = await importFullBackup(data, {});
      expect(result.variantsAdded).toBe(0);
      expect(mockImportVariant).not.toHaveBeenCalled();
    });

    it('skips orphaned variants whose word_id has no mapping', async () => {
      const data: BackupData = {
        ...emptyData,
        words: [],
        variants: [{ id: 1, word_id: 999, variant: 'maa', date_added: '2024-01-01', notes: null, created_at: '2024-01-01' }],
      };
      const result = await importFullBackup(data, {});
      expect(result.variantsAdded).toBe(0);
    });

    it('restores an audio asset when the file exists in the ZIP', async () => {
      mockFindWord.mockResolvedValueOnce(null);
      mockImportWord.mockResolvedValueOnce(10);
      mockImportAsset.mockResolvedValueOnce(42);
      const fileMap: Record<string, Uint8Array> = {
        'media/words/1/audio/asset_1.m4a': new Uint8Array([1, 2, 3]),
      };
      const data: BackupData = {
        ...emptyData,
        words: [{ id: 1, word: 'mama', category_id: null, date_added: '2024-01-01', notes: null, created_at: '2024-01-01' }],
        assets: [{
          id: 1, parent_type: 'word', parent_id: 1, asset_type: 'audio',
          filename: 'asset_1.m4a', name: null, mime_type: 'audio/mp4',
          file_size: 1024, duration_ms: null, width: null, height: null, created_at: '2024-01-01',
          media_path: 'words/1/audio/asset_1.m4a',
        }],
      };
      const result = await importFullBackup(data, fileMap);
      expect(result.audiosRestored).toBe(1);
      expect(result.assetWarnings).toHaveLength(0);
      expect(mockFileWrite).toHaveBeenCalled();
      expect(mockUpdateAssetFilename).toHaveBeenCalledWith(42, 'asset_42.m4a');
    });

    it('restores a photo asset', async () => {
      mockImportAsset.mockResolvedValueOnce(5);
      const fileMap = { 'media/profile/1/photos/asset_1.jpg': new Uint8Array([1, 2, 3]) };
      const data: BackupData = {
        ...emptyData,
        assets: [{
          id: 1, parent_type: 'profile', parent_id: 1, asset_type: 'photo',
          filename: 'asset_1.jpg', name: null, mime_type: 'image/jpeg',
          file_size: 2048, duration_ms: null, width: 100, height: 100, created_at: '2024-01-01',
          media_path: 'profile/1/photos/asset_1.jpg',
        }],
      };
      const result = await importFullBackup(data, fileMap);
      expect(result.photosRestored).toBe(1);
    });

    it('restores a video asset', async () => {
      mockImportAsset.mockResolvedValueOnce(6);
      const fileMap = { 'media/words/1/videos/asset_1.mp4': new Uint8Array([1, 2, 3]) };
      const data: BackupData = {
        ...emptyData,
        words: [{ id: 1, word: 'mama', category_id: null, date_added: '2024-01-01', notes: null, created_at: '2024-01-01' }],
        assets: [{
          id: 1, parent_type: 'word', parent_id: 1, asset_type: 'video',
          filename: 'asset_1.mp4', name: null, mime_type: 'video/mp4',
          file_size: 5000, duration_ms: 3000, width: 1920, height: 1080, created_at: '2024-01-01',
          media_path: 'words/1/videos/asset_1.mp4',
        }],
      };
      const result = await importFullBackup(data, fileMap);
      expect(result.videosRestored).toBe(1);
    });

    it('handles profile assets (parent_id = 1)', async () => {
      mockImportAsset.mockResolvedValueOnce(3);
      const fileMap = { 'media/profile/1/photos/asset_1.jpg': new Uint8Array([1, 2, 3]) };
      const data: BackupData = {
        ...emptyData,
        assets: [{
          id: 1, parent_type: 'profile', parent_id: 1, asset_type: 'photo',
          filename: 'asset_1.jpg', name: null, mime_type: 'image/jpeg',
          file_size: 2048, duration_ms: null, width: 100, height: 100, created_at: '2024-01-01',
          media_path: 'profile/1/photos/asset_1.jpg',
        }],
      };
      const result = await importFullBackup(data, fileMap);
      expect(result.photosRestored).toBe(1);
    });

    it('handles unlinked assets (stored as unlinked type, parent_id preserved)', async () => {
      mockImportAsset.mockResolvedValueOnce(9);
      const fileMap = { 'media/unlinked/5/audio/asset_9.m4a': new Uint8Array([1, 2, 3]) };
      const data: BackupData = {
        ...emptyData,
        assets: [{
          id: 9, parent_type: 'unlinked', parent_id: 5, asset_type: 'audio',
          filename: 'asset_9.m4a', name: null, mime_type: 'audio/mp4',
          file_size: 512, duration_ms: null, width: null, height: null, created_at: '2024-01-01',
          media_path: 'unlinked/5/audio/asset_9.m4a',
        }],
      };
      const result = await importFullBackup(data, fileMap);
      expect(result.audiosRestored).toBe(1);
      expect(result.assetWarnings).toHaveLength(0);
      expect(mockImportAsset).toHaveBeenCalledWith(
        expect.objectContaining({ parentType: 'unlinked', parentId: 5 })
      );
    });

    it('warns when asset file is missing from ZIP', async () => {
      mockFindWord.mockResolvedValueOnce(null);
      mockImportWord.mockResolvedValueOnce(10);
      const data: BackupData = {
        ...emptyData,
        words: [{ id: 1, word: 'mama', category_id: null, date_added: '2024-01-01', notes: null, created_at: '2024-01-01' }],
        assets: [{
          id: 1, parent_type: 'word', parent_id: 1, asset_type: 'audio',
          filename: 'asset_1.m4a', name: null, mime_type: 'audio/mp4',
          file_size: 1024, duration_ms: null, width: null, height: null, created_at: '2024-01-01',
          media_path: 'words/1/audio/asset_1.m4a',
        }],
      };
      const result = await importFullBackup(data, {});
      expect(result.audiosRestored + result.photosRestored + result.videosRestored).toBe(0);
      expect(result.assetWarnings).toHaveLength(1);
      expect(result.assetWarnings[0]).toContain('file not found in backup');
    });

    it('rescues orphaned word asset as unlinked when file is missing from ZIP', async () => {
      // No file in fileMap → still warns for missing file, but does not drop asset silently
      const data: BackupData = {
        ...emptyData,
        words: [],
        assets: [{
          id: 1, parent_type: 'word', parent_id: 999, asset_type: 'audio',
          filename: 'asset_1.m4a', name: null, mime_type: 'audio/mp4',
          file_size: 1024, duration_ms: null, width: null, height: null, created_at: '2024-01-01',
          media_path: 'words/999/audio/asset_1.m4a',
        }],
      };
      const result = await importFullBackup(data, {});
      expect(result.assetWarnings).toHaveLength(1);
      expect(result.assetWarnings[0]).toContain('file not found in backup');
    });

    it('rescues orphaned word asset as unlinked when file exists in ZIP', async () => {
      mockImportAsset.mockResolvedValueOnce(18);
      const fileMap = { 'media/words/1/audio/asset_18.m4a': new Uint8Array([1, 2, 3]) };
      const data: BackupData = {
        ...emptyData,
        // No word with id=1 in backup → orphaned asset
        assets: [{
          id: 18, parent_type: 'word', parent_id: 1, asset_type: 'audio',
          filename: 'asset_18.m4a', name: null, mime_type: 'audio/mp4',
          file_size: 1024, duration_ms: null, width: null, height: null, created_at: '2024-01-01',
          media_path: 'words/1/audio/asset_18.m4a',
        }],
      };
      const result = await importFullBackup(data, fileMap);
      expect(result.audiosRestored).toBe(1);
      expect(result.assetWarnings).toHaveLength(0);
      expect(mockImportAsset).toHaveBeenCalledWith(
        expect.objectContaining({ parentType: 'unlinked', parentId: 1 })
      );
    });

    it('rescues orphaned variant asset as unlinked when file exists in ZIP', async () => {
      mockImportAsset.mockResolvedValueOnce(9);
      const fileMap = { 'media/variants/999/audio/asset_1.m4a': new Uint8Array([1]) };
      const data: BackupData = {
        ...emptyData,
        assets: [{
          id: 1, parent_type: 'variant', parent_id: 999, asset_type: 'audio',
          filename: 'asset_1.m4a', name: null, mime_type: 'audio/mp4',
          file_size: 512, duration_ms: null, width: null, height: null, created_at: '2024-01-01',
          media_path: 'variants/999/audio/asset_1.m4a',
        }],
      };
      const result = await importFullBackup(data, fileMap);
      expect(result.audiosRestored).toBe(1);
      expect(result.assetWarnings).toHaveLength(0);
      expect(mockImportAsset).toHaveBeenCalledWith(
        expect.objectContaining({ parentType: 'unlinked', parentId: 1 })
      );
    });

    it('warns and rolls back DB record when file write fails', async () => {
      mockFindWord.mockResolvedValueOnce(null);
      mockImportWord.mockResolvedValueOnce(10);
      mockImportAsset.mockResolvedValueOnce(42);
      mockFileWrite.mockImplementationOnce(() => { throw new Error('disk full'); });
      const fileMap: Record<string, Uint8Array> = {
        'media/words/1/audio/asset_1.m4a': new Uint8Array([1, 2, 3]),
      };
      const data: BackupData = {
        ...emptyData,
        words: [{ id: 1, word: 'mama', category_id: null, date_added: '2024-01-01', notes: null, created_at: '2024-01-01' }],
        assets: [{
          id: 1, parent_type: 'word', parent_id: 1, asset_type: 'audio',
          filename: 'asset_1.m4a', name: null, mime_type: 'audio/mp4',
          file_size: 1024, duration_ms: null, width: null, height: null, created_at: '2024-01-01',
          media_path: 'words/1/audio/asset_1.m4a',
        }],
      };
      const result = await importFullBackup(data, fileMap);
      expect(result.audiosRestored + result.photosRestored + result.videosRestored).toBe(0);
      expect(result.assetWarnings[0]).toContain('disk full');
      expect(mockDeleteAsset).toHaveBeenCalledWith(42);
    });

    it('handles DELETE failure gracefully when file write fails', async () => {
      mockFindWord.mockResolvedValueOnce(null);
      mockImportWord.mockResolvedValueOnce(10);
      mockImportAsset.mockResolvedValueOnce(42);
      mockFileWrite.mockImplementationOnce(() => { throw new Error('disk full'); });
      mockDeleteAsset.mockRejectedValueOnce(new Error('delete failed'));
      const fileMap = { 'media/words/1/audio/asset_1.m4a': new Uint8Array([1, 2, 3]) };
      const data: BackupData = {
        ...emptyData,
        words: [{ id: 1, word: 'mama', category_id: null, date_added: '2024-01-01', notes: null, created_at: '2024-01-01' }],
        assets: [{
          id: 1, parent_type: 'word', parent_id: 1, asset_type: 'audio',
          filename: 'asset_1.m4a', name: null, mime_type: 'audio/mp4',
          file_size: 1024, duration_ms: null, width: null, height: null, created_at: '2024-01-01',
          media_path: 'words/1/audio/asset_1.m4a',
        }],
      };
      const result = await importFullBackup(data, fileMap);
      expect(result.audiosRestored + result.photosRestored + result.videosRestored).toBe(0);
      expect(result.assetWarnings[0]).toContain('disk full');
    });

    it('warns when asset DB insert throws', async () => {
      mockFindWord.mockResolvedValueOnce(null);
      mockImportWord.mockResolvedValueOnce(10);
      mockImportAsset.mockRejectedValueOnce(new Error('constraint error'));
      const fileMap = { 'media/words/1/audio/asset_1.m4a': new Uint8Array([1, 2, 3]) };
      const data: BackupData = {
        ...emptyData,
        words: [{ id: 1, word: 'mama', category_id: null, date_added: '2024-01-01', notes: null, created_at: '2024-01-01' }],
        assets: [{
          id: 1, parent_type: 'word', parent_id: 1, asset_type: 'audio',
          filename: 'asset_1.m4a', name: null, mime_type: 'audio/mp4',
          file_size: 1024, duration_ms: null, width: null, height: null, created_at: '2024-01-01',
          media_path: 'words/1/audio/asset_1.m4a',
        }],
      };
      const result = await importFullBackup(data, fileMap);
      expect(result.audiosRestored + result.photosRestored + result.videosRestored).toBe(0);
      expect(result.assetWarnings[0]).toContain('DB insert failed');
    });

    it('warns when asset DB insert throws a non-Error value', async () => {
      mockFindWord.mockResolvedValueOnce(null);
      mockImportWord.mockResolvedValueOnce(10);
      mockImportAsset.mockRejectedValueOnce('string error');
      const fileMap = { 'media/words/1/audio/asset_1.m4a': new Uint8Array([1, 2, 3]) };
      const data: BackupData = {
        ...emptyData,
        words: [{ id: 1, word: 'mama', category_id: null, date_added: '2024-01-01', notes: null, created_at: '2024-01-01' }],
        assets: [{
          id: 1, parent_type: 'word', parent_id: 1, asset_type: 'audio',
          filename: 'asset_1.m4a', name: null, mime_type: 'audio/mp4',
          file_size: 1024, duration_ms: null, width: null, height: null, created_at: '2024-01-01',
          media_path: 'words/1/audio/asset_1.m4a',
        }],
      };
      const result = await importFullBackup(data, fileMap);
      expect(result.audiosRestored + result.photosRestored + result.videosRestored).toBe(0);
      expect(result.assetWarnings[0]).toContain('DB insert failed');
    });

    it('handles asset filename without extension', async () => {
      mockFindWord.mockResolvedValueOnce(null);
      mockImportWord.mockResolvedValueOnce(10);
      mockImportAsset.mockResolvedValueOnce(42);
      const fileMap = { 'media/words/1/audio/asset_1': new Uint8Array([1, 2, 3]) };
      const data: BackupData = {
        ...emptyData,
        words: [{ id: 1, word: 'mama', category_id: null, date_added: '2024-01-01', notes: null, created_at: '2024-01-01' }],
        assets: [{
          id: 1, parent_type: 'word', parent_id: 1, asset_type: 'audio',
          filename: 'asset_1', name: null, mime_type: 'audio/mp4',
          file_size: 1024, duration_ms: null, width: null, height: null, created_at: '2024-01-01',
          media_path: 'words/1/audio/asset_1',
        }],
      };
      const result = await importFullBackup(data, fileMap);
      expect(result.audiosRestored + result.photosRestored + result.videosRestored + result.assetWarnings.length).toBeGreaterThan(0);
      // No extension — filename should be asset_42 (no dot)
      expect(mockUpdateAssetFilename).toHaveBeenCalledWith(42, 'asset_42');
    });

    it('warns with String() when file write throws a non-Error value', async () => {
      mockFindWord.mockResolvedValueOnce(null);
      mockImportWord.mockResolvedValueOnce(10);
      mockImportAsset.mockResolvedValueOnce(42);
      mockFileWrite.mockImplementationOnce(() => { throw 'non-error-string'; });
      const fileMap = { 'media/words/1/audio/asset_1.m4a': new Uint8Array([1, 2, 3]) };
      const data: BackupData = {
        ...emptyData,
        words: [{ id: 1, word: 'mama', category_id: null, date_added: '2024-01-01', notes: null, created_at: '2024-01-01' }],
        assets: [{
          id: 1, parent_type: 'word', parent_id: 1, asset_type: 'audio',
          filename: 'asset_1.m4a', name: null, mime_type: 'audio/mp4',
          file_size: 1024, duration_ms: null, width: null, height: null, created_at: '2024-01-01',
          media_path: 'words/1/audio/asset_1.m4a',
        }],
      };
      const result = await importFullBackup(data, fileMap);
      expect(result.audiosRestored + result.photosRestored + result.videosRestored).toBe(0);
      expect(result.assetWarnings[0]).toContain('file write failed');
    });

    it('skips keepsake restore when backup has no keepsake field (old backup)', async () => {
      const result = await importFullBackup(emptyData, {});
      expect(result.categoriesAdded).toBe(0);
      expect(mockClearKeepsakeState).not.toHaveBeenCalled();
      expect(mockSetKeepsakeState).not.toHaveBeenCalled();
    });

    it('restores keepsake state rows from backup', async () => {
      const data: BackupData = {
        ...emptyData,
        keepsake: {
          state: [
            { key: 'keepsake_generated', value: 'true' },
            { key: 'keepsake_generated_at', value: '2026-01-01T00:00:00Z' },
          ],
          filename: 'keepsake.jpg',
        },
      };
      await importFullBackup(data, {});
      expect(mockClearKeepsakeState).toHaveBeenCalledTimes(1);
      expect(mockSetKeepsakeState).toHaveBeenCalledTimes(2);
      expect(mockSetKeepsakeState).toHaveBeenCalledWith('keepsake_generated', 'true');
      expect(mockSetKeepsakeState).toHaveBeenCalledWith('keepsake_generated_at', '2026-01-01T00:00:00Z');
    });

    it('does not call clearKeepsakeState when state array is empty', async () => {
      const data: BackupData = {
        ...emptyData,
        keepsake: { state: [], filename: null },
      };
      await importFullBackup(data, {});
      expect(mockClearKeepsakeState).not.toHaveBeenCalled();
      expect(mockSetKeepsakeState).not.toHaveBeenCalled();
    });

    it('writes keepsake image file when present in ZIP', async () => {
      const keepsakeBytes = new Uint8Array([0xFF, 0xD8, 0xFF]);
      const fileMap = { 'media/keepsake/keepsake.jpg': keepsakeBytes };
      const data: BackupData = {
        ...emptyData,
        keepsake: {
          state: [{ key: 'keepsake_generated', value: 'true' }],
          filename: 'keepsake.jpg',
        },
      };
      await importFullBackup(data, fileMap);
      expect(mockDirCreate).toHaveBeenCalledTimes(1);
      expect(mockFileWrite).toHaveBeenCalledWith(keepsakeBytes);
    });

    it('skips keepsake file write when not present in ZIP', async () => {
      const data: BackupData = {
        ...emptyData,
        keepsake: {
          state: [{ key: 'keepsake_generated', value: 'true' }],
          filename: null,
        },
      };
      await importFullBackup(data, {});
      expect(mockClearKeepsakeState).toHaveBeenCalledTimes(1);
      // No keepsake bytes in fileMap → no file write
      expect(mockFileWrite).not.toHaveBeenCalled();
    });

    it('does not create dir when it already exists', async () => {
      const { Directory } = require('expo-file-system');
      Directory.mockImplementationOnce(() => ({ exists: true, create: mockDirCreate }));
      const keepsakeBytes = new Uint8Array([0xFF, 0xD8]);
      const fileMap = { 'media/keepsake/keepsake.jpg': keepsakeBytes };
      const data: BackupData = {
        ...emptyData,
        keepsake: { state: [], filename: 'keepsake.jpg' },
      };
      await importFullBackup(data, fileMap);
      expect(mockDirCreate).not.toHaveBeenCalled();
      expect(mockFileWrite).toHaveBeenCalledWith(keepsakeBytes);
    });
  });
});
