import {
  getVariantsByWord,
  findVariantByName,
  getAllVariants,
  addVariant,
  updateVariant,
  deleteVariant,
  importVariant,
} from '../../src/repositories/variantRepository';

const mockDb = (globalThis as any).__mockDb;

describe('variantRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getVariantsByWord', () => {
    it('returns variants for a word ordered by created_at DESC', async () => {
      const variants = [
        { id: 1, word_id: 5, variant: 'mamá', date_added: '2024-01-01', notes: null, created_at: '2024-01-01' },
      ];
      mockDb.getAllAsync.mockResolvedValueOnce(variants);
      const result = await getVariantsByWord(5);
      expect(result).toEqual(variants);
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE word_id=?'),
        [5],
      );
    });

    it('returns empty array when no variants', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      const result = await getVariantsByWord(99);
      expect(result).toEqual([]);
    });

    it('orders by created_at DESC', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      await getVariantsByWord(1);
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        [1],
      );
    });
  });

  describe('findVariantByName', () => {
    it('returns variant when found', async () => {
      const v = { id: 3, word_id: 1, variant: 'maa-maa', date_added: '2024-01-01', notes: null, created_at: '2024-01-01' };
      mockDb.getAllAsync.mockResolvedValueOnce([v]);
      const result = await findVariantByName(1, 'maa-maa');
      expect(result).toEqual(v);
    });

    it('returns null when not found', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      const result = await findVariantByName(1, 'nonexistent');
      expect(result).toBeNull();
    });

    it('uses case-insensitive LOWER() comparison', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      await findVariantByName(1, 'MAA-MAA');
      const sql = mockDb.getAllAsync.mock.calls[0][0];
      expect(sql).toContain('LOWER(variant)=LOWER(?)');
    });

    it('trims whitespace from the variant parameter', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      await findVariantByName(1, '  maa-maa  ');
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.any(String),
        [1, 'maa-maa'],
      );
    });

    it('uses LIMIT 1', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      await findVariantByName(1, 'test');
      const sql = mockDb.getAllAsync.mock.calls[0][0];
      expect(sql).toContain('LIMIT 1');
    });
  });

  describe('getAllVariants', () => {
    it('returns all variants with main_word and asset_count', async () => {
      const variants = [
        { id: 1, word_id: 1, variant: 'ma-ma', main_word: 'mama', asset_count: 2 },
      ];
      mockDb.getAllAsync.mockResolvedValueOnce(variants);
      const result = await getAllVariants();
      expect(result).toEqual(variants);
    });

    it('includes asset_count subquery', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      await getAllVariants();
      const sql = mockDb.getAllAsync.mock.calls[0][0];
      expect(sql).toContain('asset_count');
      expect(sql).toContain("parent_type = 'variant'");
    });

    it('includes JOIN with words table', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      await getAllVariants();
      const sql = mockDb.getAllAsync.mock.calls[0][0];
      expect(sql).toContain('JOIN words w ON v.word_id = w.id');
    });

    it('orders by created_at DESC', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      await getAllVariants();
      const sql = mockDb.getAllAsync.mock.calls[0][0];
      expect(sql).toContain('ORDER BY v.created_at DESC');
    });
  });

  describe('addVariant', () => {
    it('inserts variant and returns the new id', async () => {
      mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: 7, changes: 1 });
      const id = await addVariant(1, 'mamá', '2024-01-01', 'note');
      expect(id).toBe(7);
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO variants'),
        [1, 'mamá', '2024-01-01', 'note'],
      );
    });

    it('returns 0 when lastInsertRowId is undefined', async () => {
      mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: undefined, changes: 1 });
      const id = await addVariant(1, 'mamá', '2024-01-01');
      expect(id).toBe(0);
    });

    it('passes null when notes is omitted', async () => {
      await addVariant(1, 'mamá', '2024-01-01');
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.any(String),
        [1, 'mamá', '2024-01-01', null],
      );
    });
  });

  describe('updateVariant', () => {
    it('updates variant record', async () => {
      await updateVariant(1, 'mamã', '2024-02-01', 'updated note');
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE variants SET variant=?'),
        ['mamã', '2024-02-01', 'updated note', 1],
      );
    });

    it('passes null when notes is omitted', async () => {
      await updateVariant(1, 'mamã', '2024-02-01');
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.any(String),
        ['mamã', '2024-02-01', null, 1],
      );
    });
  });

  describe('deleteVariant', () => {
    it('deletes assets and variant inside a transaction', async () => {
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

    it('deletes assets before variant', async () => {
      const callOrder: string[] = [];
      mockDb.runAsync.mockImplementation((sql: string) => {
        if (sql.includes('DELETE FROM assets')) callOrder.push('assets');
        if (sql.includes('DELETE FROM variants')) callOrder.push('variants');
        return Promise.resolve({ lastInsertRowId: 0, changes: 1 });
      });

      await deleteVariant(3);
      expect(callOrder).toEqual(['assets', 'variants']);
    });

    it('rejects when transaction throws', async () => {
      mockDb.withTransactionAsync.mockRejectedValueOnce(new Error('tx error'));
      await expect(deleteVariant(1)).rejects.toThrow('tx error');
    });
  });

  describe('importVariant', () => {
    it('inserts variant with created_at and returns the new id', async () => {
      mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: 25, changes: 1 });
      const id = await importVariant(10, 'maa', '2024-01-01', null, '2024-01-01');
      expect(id).toBe(25);
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO variants'),
        [10, 'maa', '2024-01-01', null, '2024-01-01'],
      );
      expect(mockDb.runAsync.mock.calls[0][0]).toContain('created_at');
    });

    it('inserts variant with non-null notes', async () => {
      mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: 26, changes: 1 });
      const id = await importVariant(10, 'mama', '2024-02-01', 'soft pronunciation', '2024-02-01');
      expect(id).toBe(26);
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO variants'),
        [10, 'mama', '2024-02-01', 'soft pronunciation', '2024-02-01'],
      );
    });

    it('returns 0 when lastInsertRowId is null', async () => {
      mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: null, changes: 1 });
      const id = await importVariant(10, 'maa', '2024-01-01', null, '2024-01-01');
      expect(id).toBe(0);
    });
  });
});
