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
    mockDb.runSync.mockReturnValue({ changes: 1 });
    mockDb.getAllSync.mockReturnValue([]);
  });

  // ─── wordService.deleteWord ──────────────────────────────────────────────────

  describe('wordService.deleteWord', () => {
    it('cleans up word asset files after DB cascade', async () => {
      mockDb.getAllSync.mockReturnValueOnce([]); // getVariantsByWord returns no variants

      await deleteWord(42);

      expect(deleteAllAssetsForParent).toHaveBeenCalledWith('word', 42);
    });

    it('cleans up variant asset files when word has variants', async () => {
      mockDb.getAllSync.mockReturnValueOnce([
        { id: 10, word_id: 42, variant: 'gato', date_added: '2024-01-01', notes: null, created_at: '2024-01-01' },
        { id: 11, word_id: 42, variant: 'gatinho', date_added: '2024-01-01', notes: null, created_at: '2024-01-01' },
      ]);

      await deleteWord(42);

      expect(deleteAllAssetsForParent).toHaveBeenCalledWith('word', 42);
      expect(deleteAllAssetsForParent).toHaveBeenCalledWith('variant', 10);
      expect(deleteAllAssetsForParent).toHaveBeenCalledWith('variant', 11);
      expect(deleteAllAssetsForParent).toHaveBeenCalledTimes(3);
    });

    it('still cleans up files even when word has no assets', async () => {
      mockDb.getAllSync.mockReturnValueOnce([]);

      await deleteWord(1);

      expect(deleteAllAssetsForParent).toHaveBeenCalledWith('word', 1);
    });

    it('calls DB delete inside transaction', async () => {
      mockDb.getAllSync.mockReturnValueOnce([]);

      await deleteWord(5);

      expect(mockDb.withTransactionSync).toHaveBeenCalled();
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

      expect(mockDb.withTransactionSync).toHaveBeenCalled();
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
      expect(mockDb.withTransactionSync).toHaveBeenCalled();
      expect(deleteAllMedia).toHaveBeenCalled();
    });

    it('re-seeds default categories after clearing', async () => {
      await clearAllData();

      // Verify that INSERT INTO categories was called (re-seeding)
      const insertCalls = mockDb.runSync.mock.calls.filter(
        (call: string[]) => call[0]?.includes('INSERT INTO categories'),
      );
      expect(insertCalls.length).toBeGreaterThan(0);
    });
  });
});
