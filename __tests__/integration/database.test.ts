import {
  initDatabase,
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  deleteCategoryWithUnlink,
  getWordCountByCategory,
  unlinkWordsFromCategory,
  getWords,
  addWord,
  updateWord,
  deleteWord,
  findWordByName,
  getVariantsByWord,
  getAllVariants,
  addVariant,
  updateVariant,
  deleteVariant,
  getDashboardStats,
  getSetting,
  setSetting,
  getAllDataForCSV,
  clearAllData,
} from '../../src/database/database';

const mockDb = (global as any).__mockDb;

describe('database', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initDatabase', () => {
    it('creates tables and seeds categories', async () => {
      await initDatabase();
      expect(mockDb.execSync).toHaveBeenCalled();
      expect(mockDb.withTransactionSync).toHaveBeenCalled();
    });
  });

  describe('getCategories', () => {
    it('returns categories from the database', async () => {
      (mockDb.getAllSync as jest.Mock).mockReturnValueOnce([
        { id: 1, name: 'animals', color: '#FF6B9D', emoji: '🐾', created_at: '2024-01-01' },
      ]);
      const result = await getCategories();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('animals');
    });

    it('returns empty array when no categories', async () => {
      (mockDb.getAllSync as jest.Mock).mockReturnValueOnce([]);
      const result = await getCategories();
      expect(result).toHaveLength(0);
    });
  });

  describe('addCategory', () => {
    it('inserts and returns the new id', async () => {
      (mockDb.runSync as jest.Mock).mockReturnValueOnce({ lastInsertRowId: 5, changes: 1 });
      const id = await addCategory('TestCat', '#000', '🎯');
      expect(id).toBe(5);
    });
  });

  describe('updateCategory', () => {
    it('calls runSync with correct params', async () => {
      await updateCategory(1, 'Updated', '#FFF', '✨');
      expect(mockDb.runSync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE categories'),
        ['Updated', '#FFF', '✨', 1]
      );
    });
  });

  describe('deleteCategory', () => {
    it('calls runSync with correct id', async () => {
      await deleteCategory(3);
      expect(mockDb.runSync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM categories'),
        [3]
      );
    });
  });

  describe('deleteCategoryWithUnlink', () => {
    it('runs both UPDATE and DELETE inside a transaction', async () => {
      await deleteCategoryWithUnlink(3);
      expect(mockDb.withTransactionSync).toHaveBeenCalled();
      expect(mockDb.runSync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE words SET category_id = NULL'),
        [3]
      );
      expect(mockDb.runSync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM categories'),
        [3]
      );
    });

    it('rejects when the transaction throws', async () => {
      (mockDb.withTransactionSync as jest.Mock).mockImplementationOnce(() => {
        throw new Error('DB locked');
      });
      await expect(deleteCategoryWithUnlink(3)).rejects.toThrow('DB locked');
    });
  });

  describe('getWordCountByCategory', () => {
    it('returns count from query', async () => {
      (mockDb.getAllSync as jest.Mock).mockReturnValueOnce([{ count: 5 }]);
      const count = await getWordCountByCategory(1);
      expect(count).toBe(5);
    });

    it('returns 0 when no results', async () => {
      (mockDb.getAllSync as jest.Mock).mockReturnValueOnce([{}]);
      const count = await getWordCountByCategory(1);
      expect(count).toBe(0);
    });
  });

  describe('unlinkWordsFromCategory', () => {
    it('sets category_id to NULL for words in the category', async () => {
      await unlinkWordsFromCategory(2);
      expect(mockDb.runSync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE words SET category_id = NULL'),
        [2]
      );
    });
  });

  describe('getWords', () => {
    it('returns words without search', async () => {
      (mockDb.getAllSync as jest.Mock).mockReturnValueOnce([
        { id: 1, word: 'mamãe', category_id: 1, date_added: '2024-01-01', notes: null, created_at: '2024-01-01' },
      ]);
      const result = await getWords();
      expect(result).toHaveLength(1);
    });

    it('filters by search term', async () => {
      (mockDb.getAllSync as jest.Mock).mockReturnValueOnce([]);
      await getWords('mama');
      expect(mockDb.getAllSync).toHaveBeenCalledWith(
        expect.stringContaining('LIKE'),
        ['%mama%']
      );
    });

    it('handles empty search string', async () => {
      (mockDb.getAllSync as jest.Mock).mockReturnValueOnce([]);
      await getWords('   ');
      // Should not use LIKE clause for whitespace-only search
      expect(mockDb.getAllSync).toHaveBeenCalled();
    });
  });

  describe('addWord', () => {
    it('returns inserted id', async () => {
      (mockDb.runSync as jest.Mock).mockReturnValueOnce({ lastInsertRowId: 10, changes: 1 });
      const id = await addWord('hello', 1, '2024-01-01', 'note');
      expect(id).toBe(10);
    });

    it('handles null category and notes', async () => {
      (mockDb.runSync as jest.Mock).mockReturnValueOnce({ lastInsertRowId: 11, changes: 1 });
      const id = await addWord('hello', null, '2024-01-01');
      expect(id).toBe(11);
    });
  });

  describe('updateWord', () => {
    it('updates word record', async () => {
      await updateWord(1, 'updated', 2, '2024-02-01', 'new note');
      expect(mockDb.runSync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE words'),
        ['updated', 2, '2024-02-01', 'new note', 1]
      );
    });
  });

  describe('deleteWord', () => {
    it('deletes word by id', async () => {
      await deleteWord(5);
      expect(mockDb.runSync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM words'),
        [5]
      );
    });
  });

  describe('findWordByName', () => {
    it('returns word when found', async () => {
      const word = { id: 1, word: 'mamãe', category_id: 1, date_added: '2024-01-01' };
      (mockDb.getAllSync as jest.Mock).mockReturnValueOnce([word]);
      const result = await findWordByName('mamãe');
      expect(result).toEqual(word);
    });

    it('returns null when not found', async () => {
      (mockDb.getAllSync as jest.Mock).mockReturnValueOnce([]);
      const result = await findWordByName('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('variants', () => {
    it('getVariantsByWord returns variants', async () => {
      (mockDb.getAllSync as jest.Mock).mockReturnValueOnce([
        { id: 1, word_id: 1, variant: 'mamá', date_added: '2024-01-01' },
      ]);
      const result = await getVariantsByWord(1);
      expect(result).toHaveLength(1);
    });

    it('getAllVariants returns all variants with main word', async () => {
      (mockDb.getAllSync as jest.Mock).mockReturnValueOnce([]);
      const result = await getAllVariants();
      expect(result).toEqual([]);
    });

    it('addVariant returns inserted id', async () => {
      (mockDb.runSync as jest.Mock).mockReturnValueOnce({ lastInsertRowId: 7, changes: 1 });
      const id = await addVariant(1, 'mamá', '2024-01-01', 'note');
      expect(id).toBe(7);
    });

    it('updateVariant updates record', async () => {
      await updateVariant(1, 'mamã', '2024-02-01', 'updated note');
      expect(mockDb.runSync).toHaveBeenCalled();
    });

    it('deleteVariant deletes record', async () => {
      await deleteVariant(3);
      expect(mockDb.runSync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM variants'),
        [3]
      );
    });
  });

  describe('getDashboardStats', () => {
    it('returns stats object with correct shape', async () => {
      (mockDb.getAllSync as jest.Mock).mockImplementation(() => [{ count: 0 }]);
      const stats = await getDashboardStats();
      expect(stats).toHaveProperty('totalWords');
      expect(stats).toHaveProperty('totalVariants');
      expect(stats).toHaveProperty('wordsToday');
      expect(stats).toHaveProperty('wordsThisWeek');
      expect(stats).toHaveProperty('wordsThisMonth');
      expect(stats).toHaveProperty('categoryCounts');
      expect(stats).toHaveProperty('recentWords');
      expect(stats).toHaveProperty('monthlyProgress');
    });
  });

  describe('settings', () => {
    it('getSetting returns value when found', async () => {
      (mockDb.getAllSync as jest.Mock).mockReturnValueOnce([{ value: 'en-US' }]);
      const result = await getSetting('app_locale');
      expect(result).toBe('en-US');
    });

    it('getSetting returns null when not found', async () => {
      (mockDb.getAllSync as jest.Mock).mockReturnValueOnce([]);
      const result = await getSetting('nonexistent');
      expect(result).toBeNull();
    });

    it('setSetting inserts or replaces', async () => {
      await setSetting('key', 'value');
      expect(mockDb.runSync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE'),
        ['key', 'value']
      );
    });
  });

  describe('getAllDataForCSV', () => {
    it('returns CSV string with header', async () => {
      (mockDb.getAllSync as jest.Mock).mockReturnValueOnce([
        { word: 'mamãe', categoria: 'family', data: '2024-01-01', variante: '' },
      ]);
      const resolver = (name: string) => name;
      const csv = await getAllDataForCSV(resolver);
      expect(csv).toContain('palavra,categoria,data,variante');
      expect(csv).toContain('mamãe');
    });

    it('returns just header for empty data', async () => {
      (mockDb.getAllSync as jest.Mock).mockReturnValueOnce([]);
      const resolver = (name: string) => name;
      const csv = await getAllDataForCSV(resolver);
      expect(csv).toContain('palavra,categoria,data,variante');
    });
  });

  describe('clearAllData', () => {
    it('deletes all tables and re-seeds categories', async () => {
      await clearAllData();
      expect(mockDb.withTransactionSync).toHaveBeenCalled();
      expect(mockDb.execSync).toHaveBeenCalled();
    });
  });
});
