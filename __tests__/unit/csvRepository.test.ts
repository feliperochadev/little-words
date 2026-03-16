import { getCsvRows } from '../../src/repositories/csvRepository';

const mockDb = (globalThis as any).__mockDb;

describe('csvRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCsvRows', () => {
    it('returns csv rows', async () => {
      const rows = [
        { word: 'mama', categoria: 'family', data: '2024-01-01', variante: '' },
        { word: 'mama', categoria: 'family', data: '2024-01-02', variante: 'ma-ma' },
      ];
      mockDb.getAllAsync.mockResolvedValueOnce(rows);
      const result = await getCsvRows();
      expect(result).toEqual(rows);
    });

    it('returns empty array when no data', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      const result = await getCsvRows();
      expect(result).toEqual([]);
    });

    it('uses UNION ALL to combine words and variants', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      await getCsvRows();
      const sql = mockDb.getAllAsync.mock.calls[0][0];
      expect(sql).toContain('UNION ALL');
    });

    it('includes words joined with categories', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      await getCsvRows();
      const sql = mockDb.getAllAsync.mock.calls[0][0];
      expect(sql).toContain('FROM words w LEFT JOIN categories c');
    });

    it('includes variants joined with words and categories', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      await getCsvRows();
      const sql = mockDb.getAllAsync.mock.calls[0][0];
      expect(sql).toContain('FROM variants v');
      expect(sql).toContain('JOIN words w ON v.word_id = w.id');
    });

    it('orders results by data ASC', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      await getCsvRows();
      const sql = mockDb.getAllAsync.mock.calls[0][0];
      expect(sql).toContain('ORDER BY data ASC');
    });

    it('selects required columns: word, categoria, data, variante', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      await getCsvRows();
      const sql = mockDb.getAllAsync.mock.calls[0][0];
      expect(sql).toContain('w.word');
      expect(sql).toContain('c.name as categoria');
      expect(sql).toContain('variante');
    });

    it('rejects when query fails', async () => {
      mockDb.getAllAsync.mockRejectedValueOnce(new Error('db error'));
      await expect(getCsvRows()).rejects.toThrow('db error');
    });
  });
});
