import {
  getCategories,
  findCategoryByName,
  addCategory,
  updateCategory,
  deleteCategory,
  deleteCategoryWithUnlink,
  unlinkWordsFromCategory,
  getWordCountByCategory,
} from '../../src/repositories/categoryRepository';

const mockDb = (globalThis as any).__mockDb;

describe('categoryRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCategories', () => {
    it('returns categories ordered by name with others/outros forced last', async () => {
      const cats = [
        { id: 1, name: 'animals', color: '#FF6B9D', emoji: '🐾', created_at: '2024-01-01' },
      ];
      mockDb.getAllAsync.mockResolvedValueOnce(cats);
      const result = await getCategories();
      expect(result).toEqual(cats);
      const sql = mockDb.getAllAsync.mock.calls[0][0];
      expect(sql).toContain("LOWER(name) IN ('others', 'outros')");
      expect(sql).toContain('name ASC');
    });

    it('returns empty array when no categories exist', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      const result = await getCategories();
      expect(result).toEqual([]);
    });

    it('rejects when query fails', async () => {
      mockDb.getAllAsync.mockRejectedValueOnce(new Error('db error'));
      await expect(getCategories()).rejects.toThrow('db error');
    });
  });

  describe('addCategory', () => {
    it('inserts category and returns the new id', async () => {
      mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: 5, changes: 1 });
      const id = await addCategory('Sports', '#123456', '⚽');
      expect(id).toBe(5);
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO categories'),
        ['Sports', '#123456', '⚽'],
      );
    });

    it('returns 0 when lastInsertRowId is undefined', async () => {
      mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: undefined, changes: 1 });
      const id = await addCategory('Sports', '#123456', '⚽');
      expect(id).toBe(0);
    });
  });

  describe('findCategoryByName', () => {
    it('returns category when found', async () => {
      const category = { id: 2, name: 'Animals', color: '#123456', emoji: '🐾' };
      mockDb.getAllAsync.mockResolvedValueOnce([category]);
      const result = await findCategoryByName('Animals');
      expect(result).toEqual(category);
    });

    it('returns null when no category found', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      const result = await findCategoryByName('Unknown');
      expect(result).toBeNull();
    });

    it('trims whitespace and uses case-insensitive match', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      await findCategoryByName('  Animals  ');
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(name) = LOWER(?)'),
        ['Animals'],
      );
    });

    it('uses LIMIT 1', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      await findCategoryByName('Animals');
      const sql = mockDb.getAllAsync.mock.calls[0][0];
      expect(sql).toContain('LIMIT 1');
    });
  });

  describe('updateCategory', () => {
    it('calls UPDATE with correct parameters', async () => {
      await updateCategory(1, 'Updated', '#FFFFFF', '✨');
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE categories SET name=?, color=?, emoji=?'),
        ['Updated', '#FFFFFF', '✨', 1],
      );
    });
  });

  describe('deleteCategory', () => {
    it('calls DELETE with the correct id', async () => {
      await deleteCategory(3);
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM categories WHERE id=?'),
        [3],
      );
    });
  });

  describe('deleteCategoryWithUnlink', () => {
    it('runs UPDATE and DELETE inside a transaction', async () => {
      await deleteCategoryWithUnlink(3);
      expect(mockDb.withTransactionAsync).toHaveBeenCalledTimes(1);
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE words SET category_id = NULL'),
        [3],
      );
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM categories WHERE id = ?'),
        [3],
      );
    });

    it('rejects when transaction fails', async () => {
      mockDb.withTransactionAsync.mockRejectedValueOnce(new Error('tx failed'));
      await expect(deleteCategoryWithUnlink(1)).rejects.toThrow('tx failed');
    });
  });

  describe('unlinkWordsFromCategory', () => {
    it('sets category_id to NULL for words in the given category', async () => {
      await unlinkWordsFromCategory(2);
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE words SET category_id = NULL WHERE category_id = ?'),
        [2],
      );
    });
  });

  describe('getWordCountByCategory', () => {
    it('returns the count when rows exist', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([{ count: 7 }]);
      const count = await getWordCountByCategory(1);
      expect(count).toBe(7);
    });

    it('returns 0 when rows array is empty', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      const count = await getWordCountByCategory(1);
      expect(count).toBe(0);
    });

    it('returns 0 when count field is missing', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([{}]);
      const count = await getWordCountByCategory(1);
      expect(count).toBe(0);
    });
  });
});
