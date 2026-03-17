import {
  getSetting,
  setSetting,
  clearAllData,
} from '../../src/repositories/settingsRepository';

const mockDb = (globalThis as any).__mockDb;

describe('settingsRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSetting', () => {
    it('returns the value when key exists', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([{ value: 'en-US' }]);
      const result = await getSetting('app_locale');
      expect(result).toBe('en-US');
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('SELECT value FROM settings WHERE key=?'),
        ['app_locale'],
      );
    });

    it('returns null when key does not exist', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      const result = await getSetting('nonexistent');
      expect(result).toBeNull();
    });

    it('returns first value when multiple rows exist', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([{ value: 'pt-BR' }, { value: 'en-US' }]);
      const result = await getSetting('app_locale');
      expect(result).toBe('pt-BR');
    });
  });

  describe('setSetting', () => {
    it('calls INSERT OR REPLACE with key and value', async () => {
      await setSetting('app_locale', 'pt-BR');
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO settings'),
        ['app_locale', 'pt-BR'],
      );
    });

    it('returns run result', async () => {
      mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: 1, changes: 1 });
      const result = await setSetting('key', 'value');
      expect(result.rowsAffected).toBe(1);
    });
  });

  describe('clearAllData', () => {
    it('resolves on success', async () => {
      await expect(clearAllData()).resolves.toBeUndefined();
    });

    it('runs inside a transaction', async () => {
      await clearAllData();
      expect(mockDb.withTransactionAsync).toHaveBeenCalledTimes(1);
    });

    it('deletes from assets, variants, words, categories, settings', async () => {
      await clearAllData();
      // Should have called run for each table
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM assets'),
      );
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM variants'),
      );
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM words'),
      );
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM categories'),
      );
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM settings'),
      );
    });

    it('re-seeds default categories', async () => {
      await clearAllData();
      const insertCalls = mockDb.runAsync.mock.calls.filter(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('INSERT INTO categories'),
      );
      expect(insertCalls.length).toBeGreaterThan(0);
    });

    it('rejects when transaction throws', async () => {
      mockDb.withTransactionAsync.mockRejectedValueOnce(new Error('tx error'));
      await expect(clearAllData()).rejects.toThrow('tx error');
    });
  });
});
