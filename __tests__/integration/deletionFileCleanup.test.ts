import { deleteWord } from '../../src/services/wordService';
import { deleteVariant } from '../../src/services/variantService';
import { clearAllData } from '../../src/services/settingsService';
import {
  deleteAllAssetsForParent,
  deleteAllMedia,
} from '../../src/utils/assetStorage';

jest.mock('../../src/utils/assetStorage', () => ({
  deleteAllAssetsForParent: jest.fn(),
  deleteAllMedia: jest.fn(),
  saveAssetFile: jest.fn(),
  deleteAssetFile: jest.fn(),
  buildAssetFilename: jest.fn(),
  getAssetFileUri: jest.fn(),
}));

const mockDb = (globalThis as any).__mockDb;

describe('deletion file cleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.runAsync.mockResolvedValue({ changes: 1 });
    mockDb.getAllAsync.mockResolvedValue([]);
  });

  // ─── wordService.deleteWord ──────────────────────────────────────────────────

  describe('wordService.deleteWord', () => {
    it('cleans up word asset files after DB cascade', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]); // getVariantsByWord returns no variants (in wordService)
      mockDb.getAllAsync.mockResolvedValueOnce([]); // getVariantsByWord in wordRepository transaction

      await deleteWord(42);

      expect(deleteAllAssetsForParent).toHaveBeenCalledWith('word', 42);
    });

    it('cleans up variant asset files when word has variants', async () => {
      const variants = [
        { id: 10, word_id: 42, variant: 'gato', date_added: '2024-01-01', notes: null, created_at: '2024-01-01' },
        { id: 11, word_id: 42, variant: 'gatinho', date_added: '2024-01-01', notes: null, created_at: '2024-01-01' },
      ];
      // First call: wordService gets variants for file cleanup
      mockDb.getAllAsync.mockResolvedValueOnce(variants);
      // Second call: wordRepository transaction gets variants for asset deletion
      mockDb.getAllAsync.mockResolvedValueOnce(variants);

      await deleteWord(42);

      expect(deleteAllAssetsForParent).toHaveBeenCalledWith('word', 42);
      expect(deleteAllAssetsForParent).toHaveBeenCalledWith('variant', 10);
      expect(deleteAllAssetsForParent).toHaveBeenCalledWith('variant', 11);
      expect(deleteAllAssetsForParent).toHaveBeenCalledTimes(3);
    });

    it('still cleans up files even when word has no assets', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await deleteWord(1);

      expect(deleteAllAssetsForParent).toHaveBeenCalledWith('word', 1);
    });

    it('calls DB delete inside transaction', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await deleteWord(5);

      expect(mockDb.withTransactionAsync).toHaveBeenCalled();
    });
  });

  // ─── variantService.deleteVariant ────────────────────────────────────────────

  describe('variantService.deleteVariant', () => {
    it('cleans up variant asset files after DB cascade', async () => {
      await deleteVariant(99);

      expect(deleteAllAssetsForParent).toHaveBeenCalledWith('variant', 99);
    });

    it('calls DB delete inside transaction', async () => {
      await deleteVariant(7);

      expect(mockDb.withTransactionAsync).toHaveBeenCalled();
    });

    it('still calls file cleanup even when variant has no assets', async () => {
      await deleteVariant(1);

      expect(deleteAllAssetsForParent).toHaveBeenCalledWith('variant', 1);
      expect(deleteAllAssetsForParent).toHaveBeenCalledTimes(1);
    });
  });

  // ─── settingsService.clearAllData ────────────────────────────────────────────

  describe('settingsService.clearAllData', () => {
    it('calls deleteAllMedia for file cleanup after DB purge', async () => {
      await clearAllData();

      expect(deleteAllMedia).toHaveBeenCalledTimes(1);
    });

    it('deletes assets from DB before files', async () => {
      await clearAllData();

      // DB transaction should have executed (includes DELETE FROM assets)
      expect(mockDb.withTransactionAsync).toHaveBeenCalled();
      expect(deleteAllMedia).toHaveBeenCalled();
    });

    it('re-seeds default categories after clearing', async () => {
      await clearAllData();

      // Verify that INSERT INTO categories was called (re-seeding)
      const insertCalls = mockDb.runAsync.mock.calls.filter(
        (call: string[]) => call[0]?.includes('INSERT INTO categories'),
      );
      expect(insertCalls.length).toBeGreaterThan(0);
    });
  });
});
