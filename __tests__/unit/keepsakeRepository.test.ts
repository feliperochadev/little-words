import {
  getKeepsakeState,
  setKeepsakeState,
  deleteKeepsakeState,
  clearKeepsakeState,
  getAllKeepsakePhotoOverrides,
  getEarliestWords,
  getWordPhotoFilename,
  getTotalWordCount,
} from '../../src/repositories/keepsakeRepository';

const mockDb = globalThis.__mockDb;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getAllAsync = mockDb.getAllAsync as jest.Mock<Promise<any[]>>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('keepsakeRepository', () => {
  describe('getKeepsakeState', () => {
    it('returns the value when key exists', async () => {
      getAllAsync.mockResolvedValueOnce([{ value: 'true' }]);
      const result = await getKeepsakeState('keepsake_generated');
      expect(result).toBe('true');
      expect(getAllAsync).toHaveBeenCalledWith(
        'SELECT value FROM keepsake_state WHERE key=?',
        ['keepsake_generated'],
      );
    });

    it('returns null when key does not exist', async () => {
      getAllAsync.mockResolvedValueOnce([]);
      const result = await getKeepsakeState('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('setKeepsakeState', () => {
    it('inserts or replaces the key-value pair', async () => {
      await setKeepsakeState('keepsake_generated', 'true');
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'INSERT OR REPLACE INTO keepsake_state (key, value) VALUES (?, ?)',
        ['keepsake_generated', 'true'],
      );
    });
  });

  describe('deleteKeepsakeState', () => {
    it('deletes the key', async () => {
      await deleteKeepsakeState('photo_override_1');
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM keepsake_state WHERE key=?',
        ['photo_override_1'],
      );
    });
  });

  describe('clearKeepsakeState', () => {
    it('deletes all rows', async () => {
      await clearKeepsakeState();
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM keepsake_state',
      );
    });
  });

  describe('getAllKeepsakePhotoOverrides', () => {
    it('returns a map of wordId to photo URI', async () => {
      getAllAsync.mockResolvedValueOnce([
        { key: 'photo_override_1', value: 'file:///photo1.jpg' },
        { key: 'photo_override_5', value: 'file:///photo5.jpg' },
      ]);
      const result = await getAllKeepsakePhotoOverrides();
      expect(result).toEqual({
        1: 'file:///photo1.jpg',
        5: 'file:///photo5.jpg',
      });
    });

    it('returns empty object when no overrides', async () => {
      getAllAsync.mockResolvedValueOnce([]);
      const result = await getAllKeepsakePhotoOverrides();
      expect(result).toEqual({});
    });

    it('skips keys with non-numeric word IDs', async () => {
      getAllAsync.mockResolvedValueOnce([
        { key: 'photo_override_abc', value: 'file:///photo.jpg' },
      ]);
      const result = await getAllKeepsakePhotoOverrides();
      expect(result).toEqual({});
    });
  });

  describe('getEarliestWords', () => {
    it('queries words ordered by date_added ASC with limit', async () => {
      const mockWords = [
        { id: 1, word: 'mama', date_added: '2026-01-01', category_emoji: '👨‍👩‍👧' },
        { id: 2, word: 'papa', date_added: '2026-01-02', category_emoji: '👨‍👩‍👧' },
      ];
      getAllAsync.mockResolvedValueOnce(mockWords);
      const result = await getEarliestWords(3);
      expect(result).toEqual(mockWords);
      expect(getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY w.date_added ASC'),
        [3],
      );
    });
  });

  describe('getWordPhotoFilename', () => {
    it('returns filename when photo exists', async () => {
      getAllAsync.mockResolvedValueOnce([{ filename: 'asset_1.jpg' }]);
      const result = await getWordPhotoFilename(1);
      expect(result).toBe('asset_1.jpg');
    });

    it('returns null when no photo', async () => {
      getAllAsync.mockResolvedValueOnce([]);
      const result = await getWordPhotoFilename(1);
      expect(result).toBeNull();
    });
  });

  describe('getTotalWordCount', () => {
    it('returns count', async () => {
      getAllAsync.mockResolvedValueOnce([{ count: 42 }]);
      const result = await getTotalWordCount();
      expect(result).toBe(42);
    });

    it('returns 0 when no rows', async () => {
      getAllAsync.mockResolvedValueOnce([]);
      const result = await getTotalWordCount();
      expect(result).toBe(0);
    });
  });
});
