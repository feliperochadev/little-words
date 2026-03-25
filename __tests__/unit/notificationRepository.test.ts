import {
  getNotificationState,
  setNotificationState,
  clearNotificationState,
  getWordsWithUpcomingAnniversaries,
  getEmptyCategoryNames,
  getTotalNonProfileAssetCount,
} from '../../src/repositories/notificationRepository';

const db = (globalThis as any).__mockDb;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getNotificationState', () => {
  it('returns value when key exists', async () => {
    db.getAllAsync.mockResolvedValueOnce([{ value: 'test-value' }]);
    const result = await getNotificationState('some-key');
    expect(result).toBe('test-value');
    expect(db.getAllAsync).toHaveBeenCalledWith(
      'SELECT value FROM notification_state WHERE key=?',
      ['some-key'],
    );
  });

  it('returns null when key does not exist', async () => {
    db.getAllAsync.mockResolvedValueOnce([]);
    const result = await getNotificationState('missing-key');
    expect(result).toBeNull();
  });
});

describe('setNotificationState', () => {
  it('calls run with correct SQL and params', async () => {
    db.runAsync.mockResolvedValueOnce({ lastInsertRowId: 1, changes: 1 });
    await setNotificationState('my-key', 'my-value');
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR REPLACE INTO notification_state'),
      ['my-key', 'my-value'],
    );
  });
});

describe('clearNotificationState', () => {
  it('calls DELETE on notification_state', async () => {
    db.runAsync.mockResolvedValueOnce({ lastInsertRowId: 0, changes: 5 });
    await clearNotificationState();
    expect(db.runAsync).toHaveBeenCalledWith('DELETE FROM notification_state');
  });
});

describe('getWordsWithUpcomingAnniversaries', () => {
  it('returns word rows from the query', async () => {
    const mockRows = [
      { id: 1, word: 'mama', date_added: '2025-03-24' },
      { id: 2, word: 'dada', date_added: '2025-03-24' },
    ];
    db.getAllAsync.mockResolvedValueOnce(mockRows);
    const result = await getWordsWithUpcomingAnniversaries();
    expect(result).toEqual(mockRows);
    expect(db.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('date_added'),
    );
  });

  it('returns empty array when no anniversaries', async () => {
    db.getAllAsync.mockResolvedValueOnce([]);
    const result = await getWordsWithUpcomingAnniversaries();
    expect(result).toEqual([]);
  });
});

describe('getEmptyCategoryNames', () => {
  it('returns categories with no words', async () => {
    db.getAllAsync.mockResolvedValueOnce([{ name: 'animals' }, { name: 'food' }]);
    const result = await getEmptyCategoryNames();
    expect(result).toEqual([{ name: 'animals' }, { name: 'food' }]);
    expect(db.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('HAVING COUNT(w.id) = 0'),
    );
  });
});

describe('getTotalNonProfileAssetCount', () => {
  it('returns count excluding profile assets', async () => {
    db.getAllAsync.mockResolvedValueOnce([{ count: 7 }]);
    const result = await getTotalNonProfileAssetCount();
    expect(result).toBe(7);
    expect(db.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining("parent_type != 'profile'"),
    );
  });

  it('returns 0 when result is empty', async () => {
    db.getAllAsync.mockResolvedValueOnce([]);
    const result = await getTotalNonProfileAssetCount();
    expect(result).toBe(0);
  });
});
