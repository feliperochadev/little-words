import {
  getKeepsakeWords,
  loadKeepsakeState,
  keepsakeFileExists,
  getKeepsakeFileUri,
  setPhotoOverride,
  clearPhotoOverride,
  captureKeepsake,
  shareKeepsake,
  saveKeepsakeToLibrary,
} from '../../src/services/keepsakeService';

const mockDb = globalThis.__mockDb;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getAllAsync = mockDb.getAllAsync as jest.Mock<Promise<any[]>>;

jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true, status: 'granted' })),
  saveToLibraryAsync: jest.fn(() => Promise.resolve()),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('keepsakeService', () => {
  describe('getKeepsakeFileUri', () => {
    it('returns a path under Documents/media/keepsake/', () => {
      const uri = getKeepsakeFileUri();
      expect(uri).toContain('media/keepsake/keepsake.jpg');
    });
  });

  describe('keepsakeFileExists', () => {
    it('returns true when file exists', () => {
      // expo-file-system mock returns exists: true by default
      expect(keepsakeFileExists()).toBe(true);
    });
  });

  describe('loadKeepsakeState', () => {
    it('returns isGenerated=true when state says true and file exists', async () => {
      // First call: keepsake_generated
      getAllAsync
        .mockResolvedValueOnce([{ value: 'true' }])
        // Second call: keepsake_generated_at
        .mockResolvedValueOnce([{ value: '2026-01-15T12:00:00Z' }])
        // Third call: photo overrides
        .mockResolvedValueOnce([]);

      const state = await loadKeepsakeState();
      expect(state.isGenerated).toBe(true);
      expect(state.generatedAt).toBe('2026-01-15T12:00:00Z');
      expect(state.photoOverrides).toEqual({});
    });

    it('returns isGenerated=false when state says false', async () => {
      getAllAsync
        .mockResolvedValueOnce([{ value: 'false' }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const state = await loadKeepsakeState();
      expect(state.isGenerated).toBe(false);
    });

    it('returns isGenerated=false when no state exists', async () => {
      getAllAsync
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const state = await loadKeepsakeState();
      expect(state.isGenerated).toBe(false);
    });

    it('includes photo overrides in state', async () => {
      getAllAsync
        .mockResolvedValueOnce([{ value: 'true' }])
        .mockResolvedValueOnce([{ value: '2026-01-15T12:00:00Z' }])
        .mockResolvedValueOnce([
          { key: 'photo_override_1', value: 'file:///custom1.jpg' },
          { key: 'photo_override_3', value: 'file:///custom3.jpg' },
        ]);

      const state = await loadKeepsakeState();
      expect(state.photoOverrides).toEqual({
        1: 'file:///custom1.jpg',
        3: 'file:///custom3.jpg',
      });
    });
  });

  describe('getKeepsakeWords', () => {
    it('returns words with photos from assets when no overrides', async () => {
      // getEarliestWords
      getAllAsync
        .mockResolvedValueOnce([
          { id: 1, word: 'mama', date_added: '2026-01-01', category_emoji: '👨‍👩‍👧' },
          { id: 2, word: 'papa', date_added: '2026-01-02', category_emoji: '👨‍👩‍👧' },
          { id: 3, word: 'water', date_added: '2026-01-03', category_emoji: '🍽️' },
        ])
        // getAllKeepsakePhotoOverrides
        .mockResolvedValueOnce([])
        // getWordPhotoFilename for word 1
        .mockResolvedValueOnce([{ filename: 'asset_10.jpg' }])
        // getWordPhotoFilename for word 2
        .mockResolvedValueOnce([])
        // getWordPhotoFilename for word 3
        .mockResolvedValueOnce([{ filename: 'asset_20.jpg' }]);

      const words = await getKeepsakeWords();
      expect(words).toHaveLength(3);
      expect(words[0].word).toBe('mama');
      expect(words[0].photoUri).toContain('asset_10.jpg');
      expect(words[1].word).toBe('papa');
      expect(words[1].photoUri).toBeNull();
      expect(words[2].word).toBe('water');
      expect(words[2].photoUri).toContain('asset_20.jpg');
    });

    it('uses photo override when available', async () => {
      getAllAsync
        .mockResolvedValueOnce([
          { id: 1, word: 'mama', date_added: '2026-01-01', category_emoji: '👨‍👩‍👧' },
        ])
        .mockResolvedValueOnce([
          { key: 'photo_override_1', value: 'file:///custom.jpg' },
        ]);

      const words = await getKeepsakeWords();
      expect(words[0].photoUri).toBe('file:///custom.jpg');
    });

    it('returns empty array when no words exist', async () => {
      getAllAsync
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const words = await getKeepsakeWords();
      expect(words).toEqual([]);
    });
  });

  describe('setPhotoOverride', () => {
    it('stores photo override in keepsake_state', async () => {
      await setPhotoOverride(1, 'file:///photo.jpg');
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'INSERT OR REPLACE INTO keepsake_state (key, value) VALUES (?, ?)',
        ['photo_override_1', 'file:///photo.jpg'],
      );
    });
  });

  describe('clearPhotoOverride', () => {
    it('deletes photo override from keepsake_state', async () => {
      await clearPhotoOverride(1);
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM keepsake_state WHERE key=?',
        ['photo_override_1'],
      );
    });
  });

  describe('captureKeepsake', () => {
    it('throws when viewRef.current is null', async () => {
      const viewRef = { current: null };
      await expect(captureKeepsake(viewRef)).rejects.toThrow(
        'Keepsake card view ref is not available',
      );
    });

    it('captures, copies file, and updates state', async () => {
      const mockView = {} as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      const viewRef = { current: mockView };
      const { captureRef } = require('react-native-view-shot');

      const uri = await captureKeepsake(viewRef);
      expect(uri).toContain('keepsake.jpg');
      expect(captureRef).toHaveBeenCalledWith(
        mockView,
        expect.objectContaining({
          format: 'jpg',
          width: 1080,
          height: 1920,
        }),
      );

      // Should have updated keepsake_state
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'INSERT OR REPLACE INTO keepsake_state (key, value) VALUES (?, ?)',
        ['keepsake_generated', 'true'],
      );
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'INSERT OR REPLACE INTO keepsake_state (key, value) VALUES (?, ?)',
        expect.arrayContaining(['keepsake_generated_at']),
      );
    });

    it('replaces existing keepsake file before copying', async () => {
      const mockView = {} as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      const viewRef = { current: mockView };
      const FS = require('expo-file-system');

      await captureKeepsake(viewRef);
      expect(FS._fileMock.delete).toHaveBeenCalled();
      expect(FS._fileMock.copy).toHaveBeenCalled();
    });
  });

  describe('shareKeepsake', () => {
    it('calls Sharing.shareAsync with the file URI', async () => {
      const Sharing = require('expo-sharing');
      await shareKeepsake('file:///mock/keepsake.jpg');
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        'file:///mock/keepsake.jpg',
        expect.objectContaining({ mimeType: 'image/jpeg' }),
      );
    });

    it('throws when sharing is not available', async () => {
      const Sharing = require('expo-sharing');
      Sharing.isAvailableAsync.mockResolvedValueOnce(false);
      await expect(shareKeepsake('file:///mock/keepsake.jpg')).rejects.toThrow(
        'Sharing is not available on this device',
      );
    });
  });

  describe('saveKeepsakeToLibrary', () => {
    it('saves to library when permission granted', async () => {
      const ML = require('expo-media-library');
      await saveKeepsakeToLibrary('file:///mock/keepsake.jpg');
      expect(ML.saveToLibraryAsync).toHaveBeenCalledWith('file:///mock/keepsake.jpg');
    });

    it('throws PERMISSION_DENIED when not granted', async () => {
      const ML = require('expo-media-library');
      ML.requestPermissionsAsync.mockResolvedValueOnce({ granted: false, status: 'denied' });
      await expect(saveKeepsakeToLibrary('file:///mock/keepsake.jpg')).rejects.toThrow(
        'PERMISSION_DENIED',
      );
    });
  });
});
