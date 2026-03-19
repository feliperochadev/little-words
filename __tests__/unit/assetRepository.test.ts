import {
  getAssetById,
  getAssetsByParent,
  getAssetsByParentAndType,
  addAsset,
  deleteAsset,
  deleteAssetsByParent,
  updateAssetFilename,
  getProfilePhoto,
  deleteProfilePhotoAsset,
} from '../../src/repositories/assetRepository';
import type { NewAsset } from '../../src/types/asset';

const mockDb = (globalThis as any).__mockDb;

describe('assetRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAssetById', () => {
    it('returns asset when found', async () => {
      const asset = { id: 1, parent_type: 'word', parent_id: 10, asset_type: 'audio', filename: 'asset_1.m4a', mime_type: 'audio/mp4', file_size: 1024, duration_ms: null, width: null, height: null, created_at: '2024-01-01' };
      mockDb.getAllAsync.mockResolvedValueOnce([asset]);
      const result = await getAssetById(1);
      expect(result).toEqual(asset);
    });

    it('returns null when asset not found', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      const result = await getAssetById(999);
      expect(result).toBeNull();
    });

    it('queries by id', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      await getAssetById(42);
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM assets WHERE id'),
        [42],
      );
    });
  });

  describe('getAssetsByParent', () => {
    it('returns assets filtered by parent type and id', async () => {
      const assets = [{ id: 1, parent_type: 'word', parent_id: 10 }];
      mockDb.getAllAsync.mockResolvedValueOnce(assets);
      const result = await getAssetsByParent('word', 10);
      expect(result).toEqual(assets);
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE parent_type = ? AND parent_id = ?'),
        ['word', 10],
      );
    });

    it('returns empty array when no assets', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      const result = await getAssetsByParent('variant', 5);
      expect(result).toEqual([]);
    });

    it('orders by created_at DESC', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      await getAssetsByParent('word', 1);
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        expect.any(Array),
      );
    });
  });

  describe('getAssetsByParentAndType', () => {
    it('returns assets filtered by parent and asset type', async () => {
      const assets = [{ id: 2, asset_type: 'photo' }];
      mockDb.getAllAsync.mockResolvedValueOnce(assets);
      const result = await getAssetsByParentAndType('word', 5, 'photo');
      expect(result).toEqual(assets);
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('AND asset_type = ?'),
        ['word', 5, 'photo'],
      );
    });

    it('orders by created_at DESC', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      await getAssetsByParentAndType('variant', 1, 'audio');
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        expect.any(Array),
      );
    });
  });

  describe('addAsset', () => {
    const baseAsset: NewAsset = {
      parent_type: 'word',
      parent_id: 1,
      asset_type: 'audio',
      filename: 'asset_1.m4a',
      mime_type: 'audio/mp4',
      file_size: 12345,
      duration_ms: 3000,
      width: null,
      height: null,
    };

    it('inserts asset and returns the new id', async () => {
      mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: 42, changes: 1 });
      const id = await addAsset(baseAsset);
      expect(id).toBe(42);
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO assets'),
        ['word', 1, 'audio', 'asset_1.m4a', 'audio/mp4', 12345, 3000, null, null],
      );
    });

    it('returns 0 when lastInsertRowId is undefined', async () => {
      mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: undefined, changes: 1 });
      const id = await addAsset(baseAsset);
      expect(id).toBe(0);
    });

    it('passes null for optional fields when omitted', async () => {
      const minimal: NewAsset = {
        parent_type: 'variant',
        parent_id: 5,
        asset_type: 'photo',
        filename: 'a.jpg',
        mime_type: 'image/jpeg',
        file_size: 5000,
      };
      mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: 3, changes: 1 });
      await addAsset(minimal);
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.any(String),
        ['variant', 5, 'photo', 'a.jpg', 'image/jpeg', 5000, null, null, null],
      );
    });
  });

  describe('deleteAsset', () => {
    it('deletes asset by id', async () => {
      await deleteAsset(42);
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM assets WHERE id = ?',
        [42],
      );
    });

    it('returns result with rowsAffected', async () => {
      mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: 0, changes: 1 });
      const result = await deleteAsset(1);
      expect(result.rowsAffected).toBe(1);
    });
  });

  describe('deleteAssetsByParent', () => {
    it('deletes all assets for a word parent', async () => {
      await deleteAssetsByParent('word', 10);
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM assets WHERE parent_type = ? AND parent_id = ?',
        ['word', 10],
      );
    });

    it('deletes all assets for a variant parent', async () => {
      await deleteAssetsByParent('variant', 5);
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM assets WHERE parent_type = ? AND parent_id = ?',
        ['variant', 5],
      );
    });
  });

  describe('updateAssetFilename', () => {
    it('updates filename by id', async () => {
      await updateAssetFilename(7, 'asset_7.m4a');
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'UPDATE assets SET filename = ? WHERE id = ?',
        ['asset_7.m4a', 7],
      );
    });

    it('returns result with rowsAffected', async () => {
      mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: 0, changes: 2 });
      const result = await updateAssetFilename(1, 'new.jpg');
      expect(result.rowsAffected).toBe(2);
    });
  });

  describe('getProfilePhoto', () => {
    it('returns the profile photo when found', async () => {
      const asset = { id: 99, parent_type: 'profile', parent_id: 1, asset_type: 'photo', filename: 'a.jpg', mime_type: 'image/jpeg', file_size: 1024, duration_ms: null, width: null, height: null, created_at: '2024-01-01' };
      mockDb.getAllAsync.mockResolvedValueOnce([asset]);
      const result = await getProfilePhoto();
      expect(result).toEqual(asset);
    });

    it('returns null when no profile photo exists', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      const result = await getProfilePhoto();
      expect(result).toBeNull();
    });

    it('queries with correct profile singleton SQL', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      await getProfilePhoto();
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining("parent_type = 'profile'"),
        [],
      );
    });
  });

  describe('deleteProfilePhotoAsset', () => {
    it('deletes the profile singleton photo row', async () => {
      await deleteProfilePhotoAsset();
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM assets WHERE parent_type = 'profile'"),
        [],
      );
    });

    it('resolves to undefined', async () => {
      const result = await deleteProfilePhotoAsset();
      expect(result).toBeUndefined();
    });
  });
});
