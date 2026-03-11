import { Directory } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { saveCSVToDevice, shareCSV, exportCSV } from '../../src/utils/csvExport';

const mockDb = (global as any).__mockDb;

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
      mockDb.getAllSync.mockReturnValue([{ word: 'hello', categoria: 'test', data: '2024-01-01', variante: '' }]);
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
      (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);
      const result = await shareCSV(resolver, header, t);
      expect(result.success).toBe(true);
    });

    it('uses locale-aware dialog title from t()', async () => {
      mockDb.getAllSync.mockReturnValue([]);
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
      mockDb.getAllSync.mockReturnValue([]);
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);
      const result = await shareCSV(resolver, header, t);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not available');
    });

    it('returns error on exception', async () => {
      mockDb.getAllSync.mockImplementation(() => { throw new Error('fail'); });
      const result = await shareCSV(resolver, header, t);
      expect(result.success).toBe(false);
      expect(result.error).toBe('fail');
      mockDb.getAllSync.mockReturnValue([]);
    });
  });

  describe('saveCSVToDevice', () => {
    it('returns success when directory is picked', async () => {
      mockDb.getAllSync.mockReturnValue([]);
      const result = await saveCSVToDevice(resolver, header, t);
      expect(result.success).toBe(true);
    });

    it('returns cancelled when picker is dismissed', async () => {
      mockDb.getAllSync.mockReturnValue([]);
      (Directory.pickDirectoryAsync as jest.Mock).mockRejectedValueOnce(new Error('User cancelled'));
      const result = await saveCSVToDevice(resolver, header, t);
      expect(result.success).toBe(false);
      expect(result.error).toBe('cancelled');
    });

    it('returns error on exception', async () => {
      mockDb.getAllSync.mockImplementation(() => { throw new Error('boom'); });
      const result = await saveCSVToDevice(resolver, header, t);
      expect(result.success).toBe(false);
      expect(result.error).toBe('boom');
      mockDb.getAllSync.mockReturnValue([]);
    });
  });

  describe('exportCSV', () => {
    it('is an alias for shareCSV', () => {
      expect(exportCSV).toBe(shareCSV);
    });
  });
});
