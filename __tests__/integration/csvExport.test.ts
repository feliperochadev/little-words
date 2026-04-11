import { Directory } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { saveCSVToDevice, shareCSV, exportCSV } from '../../src/utils/csvExport';

const mockDb = (globalThis as any).__mockDb;

const resolver = (name: string) => name;
const header = 'word,category,date,variant';
const t = (key: string) => ({
  'csv.filenamePrefix': 'little-words',
  'csv.shareDialogTitle': 'Share Little Words CSV',
}[key] ?? key);

describe('csvExport', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('shareCSV', () => {
    it('returns success when sharing works', async () => {
      mockDb.getAllAsync.mockResolvedValue([{ word: 'hello', categoria: 'test', data: '2024-01-01', variante: '' }]);
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
      (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);
      const result = await shareCSV(resolver, header, t);
      expect(result.success).toBe(true);
    });

    it('uses locale-aware dialog title from t()', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
      (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);
      const ptT = (key: string) => ({
        'csv.filenamePrefix': 'palavrinhas',
        'csv.shareDialogTitle': 'Share Palavrinhas CSV',
      }[key] ?? key);
      await shareCSV(resolver, header, ptT);
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ dialogTitle: 'Share Palavrinhas CSV' }),
      );
    });

    it('returns error when sharing not available', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);
      const result = await shareCSV(resolver, header, t);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not available');
    });

    it('returns error on exception', async () => {
      mockDb.getAllAsync.mockRejectedValue(new Error('fail'));
      const result = await shareCSV(resolver, header, t);
      expect(result.success).toBe(false);
      expect(result.error).toBe('fail');
      mockDb.getAllAsync.mockResolvedValue([]);
    });
  });

  describe('saveCSVToDevice', () => {
    it('returns success when directory is picked', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);
      const result = await saveCSVToDevice(resolver, header, t);
      expect(result.success).toBe(true);
    });

    it('returns cancelled when picker is dismissed', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);
      (Directory.pickDirectoryAsync as jest.Mock).mockRejectedValueOnce(new Error('User cancelled'));
      const result = await saveCSVToDevice(resolver, header, t);
      expect(result.success).toBe(false);
      expect(result.error).toBe('cancelled');
    });

    it('returns error on exception', async () => {
      mockDb.getAllAsync.mockRejectedValue(new Error('boom'));
      const result = await saveCSVToDevice(resolver, header, t);
      expect(result.success).toBe(false);
      expect(result.error).toBe('boom');
      mockDb.getAllAsync.mockResolvedValue([]);
    });
  });

  describe('exportCSV', () => {
    it('is an alias for shareCSV', () => {
      expect(exportCSV).toBe(shareCSV);
    });
  });

  describe('non-Error exceptions (getErrorMessage false branch)', () => {
    it('shareCSV returns "Unknown error" for non-Error rejection', async () => {
      mockDb.getAllAsync.mockRejectedValueOnce('plain string error');
      const result = await shareCSV(resolver, header, t);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
      mockDb.getAllAsync.mockResolvedValue([]);
    });

    it('saveCSVToDevice returns "Unknown error" for non-Error rejection', async () => {
      mockDb.getAllAsync.mockRejectedValueOnce(42);
      const result = await saveCSVToDevice(resolver, header, t);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
      mockDb.getAllAsync.mockResolvedValue([]);
    });
  });
});
