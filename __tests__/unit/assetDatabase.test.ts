import { initDatabase } from '../../src/db/init';
import {
  getAssetsByParent,
  getAssetsByParentAndType,
  getAssetById,
  addAsset,
  deleteAsset,
  deleteAssetsByParent,
  updateAssetFilename,
} from '../../src/repositories/assetRepository';
import {
  deleteWord,
} from '../../src/repositories/wordRepository';
import {
  deleteVariant,
} from '../../src/repositories/variantRepository';
import {
  clearAllData,
  getSetting as _getSetting,
} from '../../src/repositories/settingsRepository';
import {
  getWords,
} from '../../src/repositories/wordRepository';
import { getAllVariants } from '../../src/repositories/variantRepository';
import type { NewAsset } from '../../src/types/asset';

describe('asset database operations', () => {
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = (globalThis as any).__mockDb;
  });

  // ─── initDatabase — assets table ────────────────────────────────────────────

  describe('initDatabase (assets table)', () => {
    it('creates the assets table', async () => {
      await initDatabase();

      expect(mockDb.execSync).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS assets'),
      );
    });

    it('creates assets table with parent_type CHECK constraint', async () => {
      await initDatabase();

      const call = mockDb.execSync.mock.calls.find(
        (c: string[]) => c[0].includes('CREATE TABLE IF NOT EXISTS assets'),
      );
      expect(call).toBeDefined();
      expect(call[0]).toContain("parent_type IN ('word', 'variant')");
    });

    it('creates assets table with asset_type CHECK constraint', async () => {
      await initDatabase();

      const call = mockDb.execSync.mock.calls.find(
        (c: string[]) => c[0].includes('CREATE TABLE IF NOT EXISTS assets'),
      );
      expect(call[0]).toContain("asset_type IN ('audio', 'photo', 'video')");
    });

    it('creates the idx_assets_parent index', async () => {
      await initDatabase();

      expect(mockDb.execSync).toHaveBeenCalledWith(
        expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_assets_parent'),
      );
    });

    it('creates the idx_assets_type index', async () => {
      await initDatabase();

      expect(mockDb.execSync).toHaveBeenCalledWith(
        expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_assets_type'),
      );
    });
  });

  // ─── getAssetsByParent ──────────────────────────────────────────────────────

  describe('getAssetsByParent', () => {
    it('returns assets for a word', async () => {
      const mockAssets = [
        { id: 1, parent_type: 'word', parent_id: 10, asset_type: 'audio', filename: 'asset_1.m4a' },
        { id: 2, parent_type: 'word', parent_id: 10, asset_type: 'photo', filename: 'asset_2.jpg' },
      ];
      mockDb.getAllAsync.mockResolvedValueOnce(mockAssets);

      const result = await getAssetsByParent('word', 10);

      expect(result).toEqual(mockAssets);
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE parent_type = ? AND parent_id = ?'),
        ['word', 10],
      );
    });

    it('returns assets for a variant', async () => {
      const mockAssets = [
        { id: 3, parent_type: 'variant', parent_id: 5, asset_type: 'video', filename: 'asset_3.mp4' },
      ];
      mockDb.getAllAsync.mockResolvedValueOnce(mockAssets);

      const result = await getAssetsByParent('variant', 5);

      expect(result).toEqual(mockAssets);
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.any(String),
        ['variant', 5],
      );
    });

    it('returns empty array when no assets exist', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);

      const result = await getAssetsByParent('word', 999);

      expect(result).toEqual([]);
    });

    it('queries with ORDER BY created_at DESC', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);

      await getAssetsByParent('word', 1);

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        expect.any(Array),
      );
    });
  });

  // ─── getAssetById ─────────────────────────────────────────────────────────

  describe('getAssetById', () => {
    it('returns the asset when found', async () => {
      const mockAsset = {
        id: 42,
        parent_type: 'word',
        parent_id: 10,
        asset_type: 'audio',
        filename: 'asset_42.m4a',
        mime_type: 'audio/mp4',
        file_size: 1024,
        duration_ms: 3000,
        width: null,
        height: null,
        created_at: '2026-03-15 12:00:00',
      };
      mockDb.getAllAsync.mockResolvedValueOnce([mockAsset]);

      const result = await getAssetById(42);

      expect(result).toEqual(mockAsset);
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM assets WHERE id'),
        [42],
      );
    });

    it('returns null when asset not found', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);

      const result = await getAssetById(999);

      expect(result).toBeNull();
    });
  });

  // ─── getAssetsByParentAndType ───────────────────────────────────────────────

  describe('getAssetsByParentAndType', () => {
    it('filters by parent and asset type', async () => {
      const mockAssets = [
        { id: 1, parent_type: 'word', parent_id: 10, asset_type: 'audio', filename: 'asset_1.m4a' },
      ];
      mockDb.getAllAsync.mockResolvedValueOnce(mockAssets);

      const result = await getAssetsByParentAndType('word', 10, 'audio');

      expect(result).toEqual(mockAssets);
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('AND asset_type = ?'),
        ['word', 10, 'audio'],
      );
    });

    it('returns empty for a variant with no photos', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);

      const result = await getAssetsByParentAndType('variant', 3, 'photo');

      expect(result).toEqual([]);
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.any(String),
        ['variant', 3, 'photo'],
      );
    });

    it('queries with ORDER BY created_at DESC', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);

      await getAssetsByParentAndType('word', 1, 'video');

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        expect.any(Array),
      );
    });
  });

  // ─── addAsset ───────────────────────────────────────────────────────────────

  describe('addAsset', () => {
    const newAsset: NewAsset = {
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

    it('inserts an asset and returns the insertId', async () => {
      mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: 42, changes: 1 });

      const id = await addAsset(newAsset);

      expect(id).toBe(42);
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO assets'),
        ['word', 1, 'audio', 'asset_1.m4a', 'audio/mp4', 12345, 3000, null, null],
      );
    });

    it('returns 0 when lastInsertRowId is undefined', async () => {
      mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: undefined, changes: 1 });

      const id = await addAsset(newAsset);

      expect(id).toBe(0);
    });

    it('passes null for optional fields when omitted', async () => {
      const minimal: NewAsset = {
        parent_type: 'variant',
        parent_id: 5,
        asset_type: 'photo',
        filename: 'asset_2.jpg',
        mime_type: 'image/jpeg',
        file_size: 5000,
      };
      mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: 10, changes: 1 });

      await addAsset(minimal);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO assets'),
        ['variant', 5, 'photo', 'asset_2.jpg', 'image/jpeg', 5000, null, null, null],
      );
    });

    it('passes dimension values for photo assets', async () => {
      const photoAsset: NewAsset = {
        parent_type: 'word',
        parent_id: 2,
        asset_type: 'photo',
        filename: 'asset_3.png',
        mime_type: 'image/png',
        file_size: 80000,
        width: 1920,
        height: 1080,
      };
      mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: 15, changes: 1 });

      await addAsset(photoAsset);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.any(String),
        ['word', 2, 'photo', 'asset_3.png', 'image/png', 80000, null, 1920, 1080],
      );
    });
  });

  // ─── deleteAsset ────────────────────────────────────────────────────────────

  describe('deleteAsset', () => {
    it('deletes asset by id', async () => {
      await deleteAsset(42);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM assets WHERE id = ?',
        [42],
      );
    });

    it('returns rowsAffected from the result', async () => {
      mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: 0, changes: 1 });

      const result = await deleteAsset(1);

      expect(result.rowsAffected).toBe(1);
    });
  });

  // ─── deleteAssetsByParent ───────────────────────────────────────────────────

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

  // ─── updateAssetFilename ────────────────────────────────────────────────────

  describe('updateAssetFilename', () => {
    it('updates filename by asset id', async () => {
      await updateAssetFilename(7, 'asset_7.m4a');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'UPDATE assets SET filename = ? WHERE id = ?',
        ['asset_7.m4a', 7],
      );
    });

    it('returns result with rowsAffected', async () => {
      mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: 0, changes: 1 });

      const result = await updateAssetFilename(1, 'new_name.jpg');

      expect(result.rowsAffected).toBe(1);
    });
  });

  // ─── deleteWord — asset cascade ─────────────────────────────────────────────

  describe('deleteWord (asset cascade)', () => {
    it('deletes variant assets, word assets, and the word in a transaction', async () => {
      const variants = [{ id: 10 }, { id: 11 }];
      mockDb.getAllAsync.mockResolvedValueOnce(variants);

      await deleteWord(1);

      // Transaction is used
      expect(mockDb.withTransactionAsync).toHaveBeenCalledTimes(1);

      // Fetches variants for the word
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        'SELECT id FROM variants WHERE word_id = ?',
        [1],
      );

      // Deletes assets for each variant
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        `DELETE FROM assets WHERE parent_type = 'variant' AND parent_id = ?`,
        [10],
      );
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        `DELETE FROM assets WHERE parent_type = 'variant' AND parent_id = ?`,
        [11],
      );

      // Deletes assets for the word itself
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        `DELETE FROM assets WHERE parent_type = 'word' AND parent_id = ?`,
        [1],
      );

      // Deletes the word
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM words WHERE id = ?',
        [1],
      );
    });

    it('handles word with no variants', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);

      await deleteWord(5);

      // Should still delete word assets and the word itself
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        `DELETE FROM assets WHERE parent_type = 'word' AND parent_id = ?`,
        [5],
      );
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM words WHERE id = ?',
        [5],
      );
    });

    it('rejects when the transaction throws', async () => {
      mockDb.withTransactionAsync.mockRejectedValueOnce(new Error('transaction failed'));

      await expect(deleteWord(1)).rejects.toThrow('transaction failed');
    });
  });

  // ─── deleteVariant — asset cascade ──────────────────────────────────────────

  describe('deleteVariant (asset cascade)', () => {
    it('deletes variant assets and the variant in a transaction', async () => {
      await deleteVariant(5);

      expect(mockDb.withTransactionAsync).toHaveBeenCalledTimes(1);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        `DELETE FROM assets WHERE parent_type = 'variant' AND parent_id = ?`,
        [5],
      );
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM variants WHERE id = ?',
        [5],
      );
    });

    it('calls asset deletion before variant deletion', async () => {
      const callOrder: string[] = [];
      mockDb.runAsync.mockImplementation((sql: string) => {
        if (sql.includes('DELETE FROM assets')) callOrder.push('delete_assets');
        if (sql.includes('DELETE FROM variants')) callOrder.push('delete_variant');
        return Promise.resolve({ lastInsertRowId: 0, changes: 1 });
      });

      await deleteVariant(3);

      expect(callOrder).toEqual(['delete_assets', 'delete_variant']);
    });

    it('rejects when the transaction throws', async () => {
      mockDb.withTransactionAsync.mockRejectedValueOnce(new Error('variant tx error'));

      await expect(deleteVariant(1)).rejects.toThrow('variant tx error');
    });
  });

  // ─── clearAllData — assets deletion ─────────────────────────────────────────

  describe('clearAllData (includes assets)', () => {
    it('deletes assets and runs transaction', async () => {
      await clearAllData();
      expect(mockDb.withTransactionAsync).toHaveBeenCalledTimes(1);
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM assets'),
      );
    });

    it('runs inside a transaction', async () => {
      await clearAllData();
      expect(mockDb.withTransactionAsync).toHaveBeenCalledTimes(1);
    });

    it('rejects when transaction throws', async () => {
      mockDb.withTransactionAsync.mockRejectedValueOnce(new Error('clear error'));

      await expect(clearAllData()).rejects.toThrow('clear error');
    });
  });

  // ─── getWords — asset_count subquery ────────────────────────────────────────

  describe('getWords (asset_count subquery)', () => {
    it('includes asset_count in the query', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);

      await getWords();

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('asset_count'),
      );
    });

    it('includes a subquery counting assets for word parent type', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);

      await getWords();

      const sql = mockDb.getAllAsync.mock.calls[0][0];
      expect(sql).toContain("parent_type = 'word'");
      expect(sql).toContain('asset_count');
    });

    it('returns words with asset_count field', async () => {
      const words = [
        { id: 1, word: 'mama', asset_count: 3 },
        { id: 2, word: 'papa', asset_count: 0 },
      ];
      mockDb.getAllAsync.mockResolvedValueOnce(words);

      const result = await getWords();

      expect(result).toEqual(words);
      expect(result[0].asset_count).toBe(3);
      expect(result[1].asset_count).toBe(0);
    });
  });

  // ─── getAllVariants — asset_count subquery ───────────────────────────────────

  describe('getAllVariants (asset_count subquery)', () => {
    it('includes asset_count in the query', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);

      await getAllVariants();

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('asset_count'),
      );
    });

    it('includes a subquery counting assets for variant parent type', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);

      await getAllVariants();

      const sql = mockDb.getAllAsync.mock.calls[0][0];
      expect(sql).toContain("parent_type = 'variant'");
      expect(sql).toContain('asset_count');
    });

    it('returns variants with asset_count field', async () => {
      const variants = [
        { id: 1, word_id: 1, variant: 'ma-ma', main_word: 'mama', asset_count: 2 },
      ];
      mockDb.getAllAsync.mockResolvedValueOnce(variants);

      const result = await getAllVariants();

      expect(result).toEqual(variants);
      expect(result[0].asset_count).toBe(2);
    });
  });
});
