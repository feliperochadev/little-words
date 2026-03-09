import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { saveCSVToDevice, shareCSV, exportCSV } from '../../src/utils/csvExport';

const mockDb = (global as any).__mockDb;

const resolver = (name: string) => name;

describe('csvExport', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('shareCSV', () => {
    it('returns success when sharing works', async () => {
      mockDb.getAllSync.mockReturnValue([{ word: 'hello', categoria: 'test', data: '2024-01-01', variante: '' }]);
      (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
      (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);
      const result = await shareCSV(resolver);
      expect(result.success).toBe(true);
    });

    it('returns error when sharing not available', async () => {
      mockDb.getAllSync.mockReturnValue([]);
      (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);
      const result = await shareCSV(resolver);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not available');
    });

    it('returns error on exception', async () => {
      mockDb.getAllSync.mockImplementation(() => { throw new Error('fail'); });
      const result = await shareCSV(resolver);
      expect(result.success).toBe(false);
      expect(result.error).toBe('fail');
      mockDb.getAllSync.mockReturnValue([]);
    });
  });

  describe('saveCSVToDevice', () => {
    it('returns success when granted', async () => {
      mockDb.getAllSync.mockReturnValue([]);
      (FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync as jest.Mock)
        .mockResolvedValue({ granted: true, directoryUri: 'content://dir' });
      (FileSystem.StorageAccessFramework.createFileAsync as jest.Mock)
        .mockResolvedValue('content://file');
      (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);
      const result = await saveCSVToDevice(resolver);
      expect(result.success).toBe(true);
    });

    it('returns cancelled when not granted', async () => {
      mockDb.getAllSync.mockReturnValue([]);
      (FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync as jest.Mock)
        .mockResolvedValue({ granted: false });
      const result = await saveCSVToDevice(resolver);
      expect(result.success).toBe(false);
      expect(result.error).toBe('cancelled');
    });

    it('returns error on exception', async () => {
      mockDb.getAllSync.mockImplementation(() => { throw new Error('boom'); });
      const result = await saveCSVToDevice(resolver);
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
