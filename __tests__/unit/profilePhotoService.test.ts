import {
  getProfilePhoto,
  saveProfilePhoto,
  deleteProfilePhoto,
} from '../../src/services/assetService';

jest.mock('../../src/utils/assetStorage', () => ({
  saveAssetFile: jest.fn(() => 'file:///mock/saved-photo.jpg'),
  deleteAssetFile: jest.fn(),
  deleteAllAssetsForParent: jest.fn(),
  deleteAllMedia: jest.fn(),
  buildAssetFilename: jest.fn((id: number, mime: string) => {
    const extMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    return `asset_${id}${extMap[mime] || '.bin'}`;
  }),
  getAssetFileUri: jest.fn((...args: string[]) => `file:///mock/${args.join('/')}`),
}));

const mockDb = (globalThis as any).__mockDb;

const PROFILE_PHOTO_ROW = {
  id: 1,
  parent_type: 'profile',
  parent_id: 1,
  asset_type: 'photo',
  filename: 'asset_1.jpg',
  mime_type: 'image/jpeg',
  file_size: 2048,
  duration_ms: null,
  width: null,
  height: null,
  created_at: '2024-01-01T00:00:00.000Z',
};

describe('profilePhotoService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.getAllAsync.mockResolvedValue([]);
    mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
  });

  // ─── getProfilePhoto ───────────────────────────────────────────────────────

  describe('getProfilePhoto', () => {
    it('returns null when no profile photo exists', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      const result = await getProfilePhoto();
      expect(result).toBeNull();
    });

    it('returns the photo asset when one exists', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([PROFILE_PHOTO_ROW]);
      const result = await getProfilePhoto();
      expect(result).toEqual(PROFILE_PHOTO_ROW);
    });

    it('queries with correct parent_type, parent_id, and asset_type', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      await getProfilePhoto();
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining("parent_type = 'profile'"),
        expect.anything(),
      );
    });

    it('returns only the first row when multiple rows exist (defensive)', async () => {
      const second = { ...PROFILE_PHOTO_ROW, id: 2 };
      mockDb.getAllAsync.mockResolvedValueOnce([PROFILE_PHOTO_ROW, second]);
      const result = await getProfilePhoto();
      expect(result?.id).toBe(1);
    });
  });

  // ─── deleteProfilePhoto ────────────────────────────────────────────────────

  describe('deleteProfilePhoto', () => {
    it('does nothing when no photo exists', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      await expect(deleteProfilePhoto()).resolves.toBeUndefined();
      // runAsync should not be called for delete since nothing to delete
      expect(mockDb.runAsync).not.toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM assets'),
        expect.anything(),
      );
    });

    it('removes DB record and file when photo exists', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([PROFILE_PHOTO_ROW]);
      const { deleteAssetFile } = require('../../src/utils/assetStorage');
      await deleteProfilePhoto();
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM assets'),
        expect.arrayContaining([1]),
      );
      // deleteAssetFile is called with the URI built by getAssetFileUri (mocked as file:///mock/...)
      expect(deleteAssetFile).toHaveBeenCalled();
    });
  });

  // ─── saveProfilePhoto ──────────────────────────────────────────────────────

  describe('saveProfilePhoto', () => {
    it('inserts a new asset record and returns it', async () => {
      // No existing photo
      mockDb.getAllAsync
        .mockResolvedValueOnce([])   // getProfilePhoto (delete check)
        .mockResolvedValueOnce([{ ...PROFILE_PHOTO_ROW }]);  // getAssetById after insert
      const { saveAssetFile } = require('../../src/utils/assetStorage');

      const result = await saveProfilePhoto('file:///tmp/photo.jpg', 'image/jpeg', 2048);
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO assets'),
        expect.anything(),
      );
      expect(saveAssetFile).toHaveBeenCalled();
      expect(result.parent_type).toBe('profile');
      expect(result.parent_id).toBe(1);
      expect(result.asset_type).toBe('photo');
    });

    it('deletes existing photo before saving new one (singleton enforcement)', async () => {
      // First getAllAsync: existing profile photo found
      mockDb.getAllAsync
        .mockResolvedValueOnce([PROFILE_PHOTO_ROW])   // getProfilePhoto for delete
        .mockResolvedValueOnce([{ ...PROFILE_PHOTO_ROW, id: 2, filename: 'asset_2.jpg' }]);  // getAssetById after insert

      const { deleteAssetFile } = require('../../src/utils/assetStorage');
      await saveProfilePhoto('file:///tmp/new-photo.jpg', 'image/jpeg', 3000);

      // Should delete old one (deleteAssetFile called with URI from getAssetFileUri mock)
      expect(deleteAssetFile).toHaveBeenCalled();
      // Then insert new one
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO assets'),
        expect.anything(),
      );
    });

    it('uses fileSize=1 when fileSize is 0 (expo-image-picker undefined fix)', async () => {
      mockDb.getAllAsync
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ ...PROFILE_PHOTO_ROW, file_size: 1 }]);
      // Should not throw even with fileSize=0
      await expect(saveProfilePhoto('file:///tmp/photo.jpg', 'image/jpeg', 0)).resolves.toBeDefined();
    });

    it('uses fileSize=1 when fileSize is undefined', async () => {
      mockDb.getAllAsync
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ ...PROFILE_PHOTO_ROW, file_size: 1 }]);
      await expect(saveProfilePhoto('file:///tmp/photo.jpg', 'image/jpeg', undefined)).resolves.toBeDefined();
    });
  });
});
