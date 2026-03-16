import {
  getTotalWordCount,
  getTotalVariantCount,
  getWordCountForDate,
  getWordCountSinceDate,
  getCategoryCounts,
  getRecentWords,
  getMonthlyProgress,
} from '../../src/repositories/dashboardRepository';

const mockDb = (globalThis as any).__mockDb;

describe('dashboardRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTotalWordCount', () => {
    it('returns total word count', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([{ count: 15 }]);
      const result = await getTotalWordCount();
      expect(result).toBe(15);
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*) as count FROM words'),
      );
    });

    it('returns 0 when rows are empty', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      const result = await getTotalWordCount();
      expect(result).toBe(0);
    });

    it('returns 0 when count is undefined', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([{}]);
      const result = await getTotalWordCount();
      expect(result).toBe(0);
    });
  });

  describe('getTotalVariantCount', () => {
    it('returns total variant count', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([{ count: 8 }]);
      const result = await getTotalVariantCount();
      expect(result).toBe(8);
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*) as count FROM variants'),
      );
    });

    it('returns 0 when rows are empty', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      const result = await getTotalVariantCount();
      expect(result).toBe(0);
    });
  });

  describe('getWordCountForDate', () => {
    it('returns count of words for a specific date', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([{ count: 3 }]);
      const result = await getWordCountForDate('2024-01-01');
      expect(result).toBe(3);
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE date_added = ?'),
        ['2024-01-01'],
      );
    });

    it('returns 0 when no words on the date', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      const result = await getWordCountForDate('2024-01-01');
      expect(result).toBe(0);
    });
  });

  describe('getWordCountSinceDate', () => {
    it('returns count of words since a date', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([{ count: 12 }]);
      const result = await getWordCountSinceDate('2024-01-01');
      expect(result).toBe(12);
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE date_added >= ?'),
        ['2024-01-01'],
      );
    });

    it('returns 0 when no words since date', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      const result = await getWordCountSinceDate('2024-12-01');
      expect(result).toBe(0);
    });
  });

  describe('getCategoryCounts', () => {
    it('returns category counts with name, color, emoji', async () => {
      const cats = [
        { name: 'animals', count: 5, color: '#FF6B9D', emoji: '🐾' },
        { name: 'food', count: 3, color: '#FF9F43', emoji: '🍎' },
      ];
      mockDb.getAllAsync.mockResolvedValueOnce(cats);
      const result = await getCategoryCounts();
      expect(result).toEqual(cats);
    });

    it('includes LEFT JOIN with words', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      await getCategoryCounts();
      const sql = mockDb.getAllAsync.mock.calls[0][0];
      expect(sql).toContain('LEFT JOIN words');
      expect(sql).toContain('GROUP BY c.id');
      expect(sql).toContain('ORDER BY count DESC');
    });

    it('returns empty array when no categories', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      const result = await getCategoryCounts();
      expect(result).toEqual([]);
    });
  });

  describe('getRecentWords', () => {
    it('returns recent words with limit', async () => {
      const words = [
        { id: 1, word: 'mama', category_id: 1, date_added: '2024-01-01' },
      ];
      mockDb.getAllAsync.mockResolvedValueOnce(words);
      const result = await getRecentWords(10);
      expect(result).toEqual(words);
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ?'),
        [10],
      );
    });

    it('includes JOIN with categories', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      await getRecentWords(5);
      const sql = mockDb.getAllAsync.mock.calls[0][0];
      expect(sql).toContain('LEFT JOIN categories');
    });

    it('orders by created_at DESC', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      await getRecentWords(10);
      const sql = mockDb.getAllAsync.mock.calls[0][0];
      expect(sql).toContain('ORDER BY w.created_at DESC');
    });
  });

  describe('getMonthlyProgress', () => {
    it('returns monthly progress with limit', async () => {
      const months = [
        { month: '2024-01', count: 5 },
        { month: '2024-02', count: 8 },
      ];
      mockDb.getAllAsync.mockResolvedValueOnce(months);
      const result = await getMonthlyProgress(12);
      expect(result).toEqual(months);
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ?'),
        [12],
      );
    });

    it('uses strftime for month grouping', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      await getMonthlyProgress(6);
      const sql = mockDb.getAllAsync.mock.calls[0][0];
      expect(sql).toContain("strftime('%Y-%m', date_added)");
      expect(sql).toContain('GROUP BY month');
    });

    it('orders by month ASC', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      await getMonthlyProgress(12);
      const sql = mockDb.getAllAsync.mock.calls[0][0];
      expect(sql).toContain('ORDER BY month ASC');
    });
  });
});
