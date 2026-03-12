import {
  initDatabase,
  addCategory,
  getCategories,
  getWordCountByCategory,
  addWord,
  addVariant,
  getWords,
  findWordByName,
  findVariantByName,
  getSetting,
  getAllDataForCSV,
  clearAllData,
  getDashboardStats,
} from '../../src/database/database';

describe('database', () => {
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = (globalThis as any).__mockDb;
  });

  // ─── initDatabase ───────────────────────────────────────────────────────────

  describe('initDatabase', () => {
    it('resolves on success', async () => {
      await expect(initDatabase()).resolves.toBeUndefined();
    });

    it('rejects when execSync throws', async () => {
      mockDb.execSync.mockImplementationOnce(() => { throw new Error('pragma error'); });
      await expect(initDatabase()).rejects.toThrow('pragma error');
    });

    it('covers legacy migration: canonicalRow exists (reassign words + delete legacy)', async () => {
      mockDb.getFirstSync.mockImplementation((_sql: string, args: any[]) => {
        if (args[0] === 'Animais') return { id: 10 };
        if (args[0] === 'animals') return { id: 1 };
        return null;
      });
      await expect(initDatabase()).resolves.toBeUndefined();
      expect(mockDb.runSync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE words SET category_id'),
        expect.arrayContaining([1, 10])
      );
      expect(mockDb.runSync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM categories WHERE id'),
        [10]
      );
    });

    it('covers legacy migration: canonicalRow does not exist (rename in place)', async () => {
      mockDb.getFirstSync.mockImplementation((_sql: string, args: any[]) => {
        if (args[0] === 'Animais') return { id: 10 };
        return null;
      });
      await expect(initDatabase()).resolves.toBeUndefined();
      expect(mockDb.runSync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE categories SET name'),
        expect.arrayContaining(['animals', 10])
      );
    });
  });

  // ─── query helper error path ────────────────────────────────────────────────

  describe('query error path (via getCategories)', () => {
    it('rejects when getAllSync throws', async () => {
      mockDb.getAllSync.mockImplementationOnce(() => { throw new Error('db read error'); });
      await expect(getCategories()).rejects.toThrow('db read error');
    });
  });

  // ─── run helper error path ──────────────────────────────────────────────────

  describe('run error path (via addCategory)', () => {
    it('rejects when runSync throws', async () => {
      mockDb.runSync.mockImplementationOnce(() => { throw new Error('db write error'); });
      await expect(addCategory('test', '#000', '🎨')).rejects.toThrow('db write error');
    });
  });

  // ─── clearAllData ───────────────────────────────────────────────────────────

  describe('clearAllData', () => {
    it('resolves on success', async () => {
      await expect(clearAllData()).resolves.toBeUndefined();
    });

    it('rejects when withTransactionSync throws', async () => {
      mockDb.withTransactionSync.mockImplementationOnce(() => { throw new Error('tx error'); });
      await expect(clearAllData()).rejects.toThrow('tx error');
    });
  });

  // ─── getWordCountByCategory ─────────────────────────────────────────────────

  describe('getWordCountByCategory', () => {
    it('returns the count when rows exist', async () => {
      mockDb.getAllSync.mockReturnValueOnce([{ count: 7 }]);
      await expect(getWordCountByCategory(1)).resolves.toBe(7);
    });

    it('returns 0 when rows array is empty (nullish coalescing)', async () => {
      mockDb.getAllSync.mockReturnValueOnce([]);
      await expect(getWordCountByCategory(1)).resolves.toBe(0);
    });
  });

  // ─── insertId ?? 0 fallbacks ────────────────────────────────────────────────

  describe('addCategory insertId fallback', () => {
    it('returns 0 when lastInsertRowId is undefined', async () => {
      mockDb.runSync.mockReturnValueOnce({ lastInsertRowId: undefined, changes: 1 });
      await expect(addCategory('x', '#fff', '🎨')).resolves.toBe(0);
    });
  });

  describe('addWord insertId fallback', () => {
    it('returns 0 when lastInsertRowId is undefined', async () => {
      mockDb.runSync.mockReturnValueOnce({ lastInsertRowId: undefined, changes: 1 });
      await expect(addWord('hello', null, '2024-01-01')).resolves.toBe(0);
    });

    it('passes null when notes is omitted', async () => {
      await addWord('hello', null, '2024-01-01');
      expect(mockDb.runSync).toHaveBeenCalledWith(
        expect.any(String),
        ['hello', null, '2024-01-01', null]
      );
    });
  });

  describe('addVariant insertId fallback', () => {
    it('returns 0 when lastInsertRowId is undefined', async () => {
      mockDb.runSync.mockReturnValueOnce({ lastInsertRowId: undefined, changes: 1 });
      await expect(addVariant(1, 'mama', '2024-01-01')).resolves.toBe(0);
    });
  });

  // ─── getWords search branch ─────────────────────────────────────────────────

  describe('getWords', () => {
    it('uses LIKE query when search string is provided', async () => {
      mockDb.getAllSync.mockReturnValueOnce([]);
      await getWords('hello');
      expect(mockDb.getAllSync).toHaveBeenCalledWith(
        expect.stringContaining('LIKE'),
        ['%hello%']
      );
    });

    it('uses base query when search is an empty string', async () => {
      mockDb.getAllSync.mockReturnValueOnce([]);
      await getWords('');
      expect(mockDb.getAllSync).toHaveBeenCalledWith(
        expect.not.stringContaining('LIKE'),
        []
      );
    });

    it('uses base query when search is only whitespace', async () => {
      mockDb.getAllSync.mockReturnValueOnce([]);
      await getWords('   ');
      expect(mockDb.getAllSync).toHaveBeenCalledWith(
        expect.not.stringContaining('LIKE'),
        []
      );
    });

    it('uses base query when search is omitted', async () => {
      mockDb.getAllSync.mockReturnValueOnce([]);
      await getWords();
      expect(mockDb.getAllSync).toHaveBeenCalledWith(
        expect.not.stringContaining('LIKE'),
        []
      );
    });
  });

  // ─── getSetting ─────────────────────────────────────────────────────────────

  describe('getSetting', () => {
    it('returns null when key is not found', async () => {
      mockDb.getAllSync.mockReturnValueOnce([]);
      await expect(getSetting('missing')).resolves.toBeNull();
    });

    it('returns the stored value when key exists', async () => {
      mockDb.getAllSync.mockReturnValueOnce([{ value: 'hello' }]);
      await expect(getSetting('mykey')).resolves.toBe('hello');
    });
  });

  // ─── findWordByName ─────────────────────────────────────────────────────────

  describe('findWordByName', () => {
    it('returns null when no matching word', async () => {
      mockDb.getAllSync.mockReturnValueOnce([]);
      await expect(findWordByName('unknown')).resolves.toBeNull();
    });

    it('returns the first matching word', async () => {
      const word = { id: 1, word: 'hello', category_id: null, date_added: '2024-01-01' };
      mockDb.getAllSync.mockReturnValueOnce([word]);
      await expect(findWordByName('hello')).resolves.toEqual(word);
    });
  });

  // ─── findVariantByName ───────────────────────────────────────────────────────

  describe('findVariantByName', () => {
    it('returns null when no matching variant', async () => {
      mockDb.getAllSync.mockReturnValueOnce([]);
      await expect(findVariantByName(1, 'maa-maa')).resolves.toBeNull();
    });

    it('returns the first matching variant', async () => {
      const v = { id: 5, word_id: 1, variant: 'maa-maa', date_added: '2024-01-01', notes: null, created_at: '2024-01-01' };
      mockDb.getAllSync.mockReturnValueOnce([v]);
      await expect(findVariantByName(1, 'maa-maa')).resolves.toEqual(v);
    });
  });

  // ─── getAllDataForCSV ────────────────────────────────────────────────────────

  describe('getAllDataForCSV', () => {
    it('uses the default header when none is provided', async () => {
      mockDb.getAllSync.mockReturnValueOnce([]);
      const csv = await getAllDataForCSV((n) => n);
      expect(csv).toBe('palavra,categoria,data,variante\n');
    });

    it('uses the provided header', async () => {
      mockDb.getAllSync.mockReturnValueOnce([]);
      const csv = await getAllDataForCSV((n) => n, 'w,c,d,v');
      expect(csv).toContain('w,c,d,v');
    });

    it('escapes double quotes in all fields', async () => {
      mockDb.getAllSync.mockReturnValueOnce([
        { word: 'he"llo', categoria: 'test"cat', data: '2024-01-01', variante: 'var"iant' },
      ]);
      const csv = await getAllDataForCSV((n) => n, 'header');
      expect(csv).toContain('he""llo');
      expect(csv).toContain('test""cat');
      expect(csv).toContain('var""iant');
    });

    it('handles null/empty fields gracefully', async () => {
      mockDb.getAllSync.mockReturnValueOnce([
        { word: 'hi', categoria: null, data: '2024-01-01', variante: '' },
      ]);
      const csv = await getAllDataForCSV((n) => n, 'header');
      expect(csv).toContain('"hi"');
    });
  });

  // ─── getDashboardStats ───────────────────────────────────────────────────────

  describe('getDashboardStats', () => {
    it('falls back to 0 for all counts when rows are empty', async () => {
      mockDb.getAllSync
        .mockReturnValueOnce([]) // totalWordsRow
        .mockReturnValueOnce([]) // totalVariantsRow
        .mockReturnValueOnce([]) // todayRow
        .mockReturnValueOnce([]) // weekRow
        .mockReturnValueOnce([]) // monthRow
        .mockReturnValueOnce([]) // categoryCounts
        .mockReturnValueOnce([]) // recentWords
        .mockReturnValueOnce([]); // monthlyProgress
      const stats = await getDashboardStats();
      expect(stats.totalWords).toBe(0);
      expect(stats.totalVariants).toBe(0);
      expect(stats.wordsToday).toBe(0);
      expect(stats.wordsThisWeek).toBe(0);
      expect(stats.wordsThisMonth).toBe(0);
      expect(stats.categoryCounts).toEqual([]);
      expect(stats.recentWords).toEqual([]);
      expect(stats.monthlyProgress).toEqual([]);
    });
  });
});
