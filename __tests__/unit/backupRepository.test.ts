import {
  getAllCategoriesForBackup,
  getAllWordsForBackup,
  getAllVariantsForBackup,
  getAllAssetsForBackup,
} from '../../src/repositories/backupRepository';

const mockDb = (globalThis as any).__mockDb;

describe('backupRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllCategoriesForBackup', () => {
    it('returns all categories ordered by id', async () => {
      const cats = [
        { id: 1, name: 'animals', color: '#f00', emoji: '🐾', created_at: '2024-01-01' },
        { id: 2, name: 'food', color: '#0f0', emoji: '🍕', created_at: '2024-01-02' },
      ];
      mockDb.getAllAsync.mockResolvedValueOnce(cats);
      const result = await getAllCategoriesForBackup();
      expect(result).toEqual(cats);
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY id ASC'),
      );
    });

    it('returns empty array when no categories', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      const result = await getAllCategoriesForBackup();
      expect(result).toEqual([]);
    });
  });

  describe('getAllWordsForBackup', () => {
    it('returns all words ordered by id', async () => {
      const words = [
        { id: 1, word: 'mama', category_id: null, date_added: '2024-01-01', notes: null, created_at: '2024-01-01' },
        { id: 2, word: 'dada', category_id: 1, date_added: '2024-01-02', notes: 'first word', created_at: '2024-01-02' },
      ];
      mockDb.getAllAsync.mockResolvedValueOnce(words);
      const result = await getAllWordsForBackup();
      expect(result).toEqual(words);
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY id ASC'),
      );
    });
  });

  describe('getAllVariantsForBackup', () => {
    it('returns all variants ordered by id', async () => {
      const variants = [
        { id: 1, word_id: 1, variant: 'maa', date_added: '2024-01-01', notes: null, created_at: '2024-01-01' },
      ];
      mockDb.getAllAsync.mockResolvedValueOnce(variants);
      const result = await getAllVariantsForBackup();
      expect(result).toEqual(variants);
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY id ASC'),
      );
    });
  });

  describe('getAllAssetsForBackup', () => {
    it('includes all asset types including unlinked', async () => {
      const assets = [
        { id: 1, parent_type: 'word', parent_id: 1, asset_type: 'audio', filename: 'asset_1.m4a', name: null, mime_type: 'audio/mp4', file_size: 1024, duration_ms: 3000, width: null, height: null, created_at: '2024-01-01' },
        { id: 2, parent_type: 'unlinked', parent_id: 5, asset_type: 'audio', filename: 'asset_2.m4a', name: null, mime_type: 'audio/mp4', file_size: 512, duration_ms: 1500, width: null, height: null, created_at: '2024-01-02' },
      ];
      mockDb.getAllAsync.mockResolvedValueOnce(assets);
      const result = await getAllAssetsForBackup();
      expect(result).toHaveLength(2);
      expect(result[1].parent_type).toBe('unlinked');
    });

    it('does not filter assets by parent_type', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      await getAllAssetsForBackup();
      const sql: string = mockDb.getAllAsync.mock.calls[0][0];
      // Must NOT have a WHERE clause filtering by parent_type
      expect(sql).not.toContain("parent_type !=");
      expect(sql).not.toContain("parent_type NOT");
    });

    it('returns empty array when no assets', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      const result = await getAllAssetsForBackup();
      expect(result).toEqual([]);
    });
  });
});
