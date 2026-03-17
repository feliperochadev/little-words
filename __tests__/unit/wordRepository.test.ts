import {
  getWords,
  findWordByName,
  addWord,
  updateWord,
  deleteWord,
  getVariantsByWord,
} from '../../src/repositories/wordRepository';

const mockDb = (globalThis as any).__mockDb;

describe('wordRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getWords', () => {
    it('returns words without search', async () => {
      const words = [
        { id: 1, word: 'mamãe', category_id: 1, date_added: '2024-01-01', notes: null, created_at: '2024-01-01' },
      ];
      mockDb.getAllAsync.mockResolvedValueOnce(words);
      const result = await getWords();
      expect(result).toEqual(words);
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.not.stringContaining('LIKE'),
      );
    });

    it('uses LIKE query when search is provided', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      await getWords('mamã');
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('LIKE'),
        ['%mamã%'],
      );
    });

    it('uses base query when search is whitespace only', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      await getWords('   ');
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.not.stringContaining('LIKE'),
      );
    });

    it('uses base query when search is empty string', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      await getWords('');
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.not.stringContaining('LIKE'),
      );
    });

    it('includes variant_count, variant_texts, and asset_count subqueries', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      await getWords();
      const sql = mockDb.getAllAsync.mock.calls[0][0];
      expect(sql).toContain('variant_count');
      expect(sql).toContain('variant_texts');
      expect(sql).toContain('asset_count');
    });

    it('includes LEFT JOIN with categories', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      await getWords();
      const sql = mockDb.getAllAsync.mock.calls[0][0];
      expect(sql).toContain('LEFT JOIN categories');
    });

    it('trims whitespace from search term', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      await getWords('  mama  ');
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('LIKE'),
        ['%mama%'],
      );
    });
  });

  describe('findWordByName', () => {
    it('returns the word when found', async () => {
      const word = { id: 1, word: 'hello', category_id: null, date_added: '2024-01-01' };
      mockDb.getAllAsync.mockResolvedValueOnce([word]);
      const result = await findWordByName('hello');
      expect(result).toEqual(word);
    });

    it('returns null when no word found', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      const result = await findWordByName('unknown');
      expect(result).toBeNull();
    });

    it('trims whitespace from the word parameter', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      await findWordByName('  hello  ');
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.any(String),
        ['hello'],
      );
    });

    it('uses case-insensitive LOWER() comparison', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      await findWordByName('Hello');
      const sql = mockDb.getAllAsync.mock.calls[0][0];
      expect(sql).toContain('LOWER(w.word) = LOWER(?)');
    });

    it('uses LIMIT 1', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      await findWordByName('test');
      const sql = mockDb.getAllAsync.mock.calls[0][0];
      expect(sql).toContain('LIMIT 1');
    });
  });

  describe('addWord', () => {
    it('inserts word and returns the new id', async () => {
      mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: 10, changes: 1 });
      const id = await addWord('hello', 1, '2024-01-01', 'note');
      expect(id).toBe(10);
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO words'),
        ['hello', 1, '2024-01-01', 'note'],
      );
    });

    it('returns 0 when lastInsertRowId is undefined', async () => {
      mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: undefined, changes: 1 });
      const id = await addWord('hello', null, '2024-01-01');
      expect(id).toBe(0);
    });

    it('passes null when notes is omitted', async () => {
      await addWord('hello', null, '2024-01-01');
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.any(String),
        ['hello', null, '2024-01-01', null],
      );
    });

    it('handles null categoryId', async () => {
      await addWord('hello', null, '2024-01-01');
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([null]),
      );
    });
  });

  describe('updateWord', () => {
    it('updates word record with all fields', async () => {
      await updateWord(1, 'updated', 2, '2024-02-01', 'new note');
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE words SET word=?'),
        ['updated', 2, '2024-02-01', 'new note', 1],
      );
    });

    it('passes null for notes when omitted', async () => {
      await updateWord(1, 'updated', null, '2024-02-01');
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.any(String),
        ['updated', null, '2024-02-01', null, 1],
      );
    });
  });

  describe('deleteWord', () => {
    it('deletes variant assets, word assets, and the word in a transaction', async () => {
      const variants = [{ id: 10 }, { id: 11 }];
      mockDb.getAllAsync.mockResolvedValueOnce(variants);

      await deleteWord(1);

      expect(mockDb.withTransactionAsync).toHaveBeenCalledTimes(1);
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        'SELECT id FROM variants WHERE word_id = ?',
        [1],
      );
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        `DELETE FROM assets WHERE parent_type = 'variant' AND parent_id = ?`,
        [10],
      );
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        `DELETE FROM assets WHERE parent_type = 'variant' AND parent_id = ?`,
        [11],
      );
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        `DELETE FROM assets WHERE parent_type = 'word' AND parent_id = ?`,
        [1],
      );
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM words WHERE id = ?',
        [1],
      );
    });

    it('handles word with no variants gracefully', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      await deleteWord(5);
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM words WHERE id = ?',
        [5],
      );
    });

    it('rejects when transaction throws', async () => {
      mockDb.withTransactionAsync.mockRejectedValueOnce(new Error('tx error'));
      await expect(deleteWord(1)).rejects.toThrow('tx error');
    });
  });

  describe('getVariantsByWord', () => {
    it('returns variants for a word ordered by created_at DESC', async () => {
      const variants = [
        { id: 1, word_id: 1, variant: 'mamá', date_added: '2024-01-01', notes: null, created_at: '2024-01-01' },
      ];
      mockDb.getAllAsync.mockResolvedValueOnce(variants);
      const result = await getVariantsByWord(1);
      expect(result).toEqual(variants);
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        [1],
      );
    });

    it('returns empty array when no variants', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      const result = await getVariantsByWord(99);
      expect(result).toEqual([]);
    });
  });
});
