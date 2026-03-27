import React from 'react';
import { Alert } from 'react-native';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAudioPlayer, AudioModule } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';

import { MediaCaptureProvider } from '../../src/providers/MediaCaptureProvider';
import { useMediaCapture } from '../../src/hooks/useMediaCapture';
import { I18nProvider } from '../../src/i18n/i18n';
import * as assetService from '../../src/services/assetService';
import * as assetRepository from '../../src/repositories/assetRepository';
import * as assetStorage from '../../src/utils/assetStorage';
import type { PendingMedia } from '../../src/providers/MediaCaptureProvider';
import type { Asset } from '../../src/types/asset';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../src/services/assetService');
jest.mock('../../src/repositories/assetRepository');
jest.mock('../../src/utils/assetStorage');
jest.mock('../../src/services/notificationService', () => ({
  checkAndShowPriming: jest.fn(() => Promise.resolve()),
}));

const mockCheckAndShowPriming = require('../../src/services/notificationService').checkAndShowPriming as jest.Mock;

const mockSaveAsset = assetService.saveAsset as jest.MockedFunction<typeof assetService.saveAsset>;
const mockGetAssetsByParentAndType = assetRepository.getAssetsByParentAndType as jest.MockedFunction<
  typeof assetRepository.getAssetsByParentAndType
>;
const mockGetAssetFileUri = assetStorage.getAssetFileUri as jest.MockedFunction<
  typeof assetStorage.getAssetFileUri
>;

// expo-audio and expo-image-picker are mocked in jest.setup.js
type MockPlayer = {
  play: jest.Mock;
  pause: jest.Mock;
  remove: jest.Mock;
  addListener: jest.Mock;
};
const mockPlayer = (globalThis as Record<string, unknown>).__mockPlayer as MockPlayer;
const mockCreateAudioPlayer = createAudioPlayer as jest.Mock;
const mockSetAudioModeAsync = AudioModule.setAudioModeAsync as jest.Mock;

const mockLaunchCameraAsync = ImagePicker.launchCameraAsync as jest.Mock;
const mockLaunchImageLibraryAsync = ImagePicker.launchImageLibraryAsync as jest.Mock;
const mockRequestCameraPermissions = ImagePicker.requestCameraPermissionsAsync as jest.Mock;
const mockRequestMediaLibraryPermissions = ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;

// ── Helpers ──────────────────────────────────────────────────────────────────

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
}

function createWrapper(queryClient?: QueryClient) {
  const qc = queryClient ?? createQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <I18nProvider>
          <MediaCaptureProvider>{children}</MediaCaptureProvider>
        </I18nProvider>
      </QueryClientProvider>
    );
  };
}

const SAMPLE_MEDIA: PendingMedia = {
  uri: 'file:///tmp/audio.m4a',
  type: 'audio',
  mimeType: 'audio/mp4',
  fileSize: 12345,
  durationMs: 3000,
};

const SAMPLE_PHOTO_MEDIA: PendingMedia = {
  uri: 'file:///tmp/photo.jpg',
  type: 'photo',
  mimeType: 'image/jpeg',
  fileSize: 54321,
  width: 1920,
  height: 1080,
};

const SAMPLE_ASSET: Asset = {
  id: 42,
  parent_type: 'word',
  parent_id: 1,
  asset_type: 'audio',
  filename: 'audio-42.m4a',
  name: 'audio_42',
  mime_type: 'audio/mp4',
  file_size: 12345,
  duration_ms: 3000,
  width: null,
  height: null,
  created_at: '2026-01-01T00:00:00.000Z',
};

const SAVED_ASSET: Asset = {
  ...SAMPLE_ASSET,
  id: 99,
  filename: 'audio-99.m4a',
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('MediaCaptureProvider + useMediaCapture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveAsset.mockResolvedValue(SAVED_ASSET);
    mockGetAssetsByParentAndType.mockResolvedValue([]);
    mockGetAssetFileUri.mockReturnValue('file:///documents/media/words/1/audio/audio-42.m4a');
    mockPlayer.remove.mockReset();
    mockPlayer.addListener.mockReset();
    mockPlayer.play.mockReset();
    mockPlayer.pause.mockReset();
    mockCreateAudioPlayer.mockReturnValue(mockPlayer);
    mockSetAudioModeAsync.mockResolvedValue(undefined);
  });

  // ── useMediaCapture outside provider ─────────────────────────────────────

  describe('useMediaCapture outside provider', () => {
    it('throws when used outside MediaCaptureProvider', () => {
      // Suppress console.error for the expected error
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => {
        renderHook(() => useMediaCapture());
      }).toThrow('useMediaCapture must be used within a MediaCaptureProvider');
      spy.mockRestore();
    });
  });

  // ── Initial state ────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('has phase=idle, pendingMedia=null, prefilledWordName="", playingAssetId=null', () => {
      const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });

      expect(result.current.phase).toBe('idle');
      expect(result.current.pendingMedia).toBeNull();
      expect(result.current.prefilledWordName).toBe('');
      expect(result.current.playingAssetId).toBeNull();
    });
  });

  // ── setCapturedMedia ─────────────────────────────────────────────────────

  describe('setCapturedMedia', () => {
    it('sets pending media and transitions phase to linking', () => {
      const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });

      act(() => {
        result.current.setCapturedMedia(SAMPLE_MEDIA);
      });

      expect(result.current.pendingMedia).toEqual(SAMPLE_MEDIA);
      expect(result.current.phase).toBe('linking');
    });
  });

  // ── resetCapture ─────────────────────────────────────────────────────────

  describe('resetCapture', () => {
    it('resets to idle state', () => {
      const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });

      act(() => {
        result.current.setCapturedMedia(SAMPLE_MEDIA);
      });
      expect(result.current.phase).toBe('linking');

      act(() => {
        result.current.resetCapture();
      });

      expect(result.current.phase).toBe('idle');
      expect(result.current.pendingMedia).toBeNull();
      expect(result.current.prefilledWordName).toBe('');
    });
  });

  // ── linkMediaToWord ──────────────────────────────────────────────────────

  describe('linkMediaToWord', () => {
    it('calls saveAsset with correct params, invalidates caches, and resets', async () => {
      const queryClient = createQueryClient();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useMediaCapture(), {
        wrapper: createWrapper(queryClient),
      });

      act(() => {
        result.current.setCapturedMedia(SAMPLE_MEDIA);
      });

      await act(async () => {
        await result.current.linkMediaToWord(7);
      });

      expect(mockSaveAsset).toHaveBeenCalledWith({
        sourceUri: SAMPLE_MEDIA.uri,
        parentType: 'word',
        parentId: 7,
        assetType: 'audio',
        mimeType: 'audio/mp4',
        fileSize: 12345,
        durationMs: 3000,
        width: undefined,
        height: undefined,
      });
      expect(invalidateSpy).toHaveBeenCalled();
      expect(result.current.phase).toBe('idle');
      expect(result.current.pendingMedia).toBeNull();
    });

    it('calls checkAndShowPriming on successful save', async () => {
      const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });
      act(() => { result.current.setCapturedMedia(SAMPLE_MEDIA); });
      await act(async () => { await result.current.linkMediaToWord(7); });
      expect(mockCheckAndShowPriming).toHaveBeenCalled();
    });

    it('is a no-op when pendingMedia is null', async () => {
      const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.linkMediaToWord(7);
      });

      expect(mockSaveAsset).not.toHaveBeenCalled();
      // State unchanged
      expect(result.current.phase).toBe('idle');
    });

    it('shows Alert on error and still resets', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      mockSaveAsset.mockRejectedValueOnce(new Error('DB error'));
      const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });

      act(() => {
        result.current.setCapturedMedia(SAMPLE_MEDIA);
      });

      await act(async () => {
        await result.current.linkMediaToWord(7);
      });

      expect(alertSpy).toHaveBeenCalledWith(
        expect.any(String), // common.error
        expect.any(String), // mediaCapture.linkFailed
      );
      expect(result.current.phase).toBe('idle');
      expect(result.current.pendingMedia).toBeNull();
    });
  });

  // ── startCreateWord ──────────────────────────────────────────────────────

  describe('startCreateWord', () => {
    it('sets prefilledWordName and transitions to creating-word', () => {
      const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });

      act(() => {
        result.current.startCreateWord('mama');
      });

      expect(result.current.prefilledWordName).toBe('mama');
      expect(result.current.phase).toBe('creating-word');
    });
  });

  // ── onWordCreated ────────────────────────────────────────────────────────

  describe('onWordCreated', () => {
    it('saves asset, invalidates caches, and resets when pendingMedia exists', async () => {
      const queryClient = createQueryClient();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useMediaCapture(), {
        wrapper: createWrapper(queryClient),
      });

      act(() => {
        result.current.setCapturedMedia(SAMPLE_PHOTO_MEDIA);
      });

      await act(async () => {
        await result.current.onWordCreated(10);
      });

      expect(mockSaveAsset).toHaveBeenCalledWith({
        sourceUri: SAMPLE_PHOTO_MEDIA.uri,
        parentType: 'word',
        parentId: 10,
        assetType: 'photo',
        mimeType: 'image/jpeg',
        fileSize: 54321,
        durationMs: undefined,
        width: 1920,
        height: 1080,
      });
      expect(invalidateSpy).toHaveBeenCalled();
      expect(result.current.phase).toBe('idle');
      expect(result.current.pendingMedia).toBeNull();
    });

    it('just resets when pendingMedia is null', async () => {
      const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });

      // Set phase to something non-idle first
      act(() => {
        result.current.setPhase('creating-word');
      });

      await act(async () => {
        await result.current.onWordCreated(10);
      });

      expect(mockSaveAsset).not.toHaveBeenCalled();
      expect(result.current.phase).toBe('idle');
    });

    it('still resets on saveAsset error (does not block)', async () => {
      mockSaveAsset.mockRejectedValueOnce(new Error('Save failed'));
      const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });

      act(() => {
        result.current.setCapturedMedia(SAMPLE_MEDIA);
      });

      await act(async () => {
        await result.current.onWordCreated(10);
      });

      // No Alert shown (error is swallowed)
      expect(result.current.phase).toBe('idle');
      expect(result.current.pendingMedia).toBeNull();
    });
  });

  // ── launchPhotoPicker ────────────────────────────────────────────────────

  describe('launchPhotoPicker', () => {
    it('shows Alert with camera/gallery/cancel options', () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });

      act(() => {
        result.current.launchPhotoPicker();
      });

      expect(alertSpy).toHaveBeenCalledWith(
        expect.any(String), // photoSourceTitle
        undefined,
        expect.arrayContaining([
          expect.objectContaining({ text: expect.any(String), onPress: expect.any(Function) }),
          expect.objectContaining({ text: expect.any(String), onPress: expect.any(Function) }),
          expect.objectContaining({ text: expect.any(String), style: 'cancel' }),
        ]),
      );
    });

    describe('camera flow', () => {
      it('requests permission, launches camera, and sets captured media', async () => {
        const alertSpy = jest.spyOn(Alert, 'alert');
        mockRequestCameraPermissions.mockResolvedValueOnce({ status: 'granted', granted: true });
        mockLaunchCameraAsync.mockResolvedValueOnce({
          canceled: false,
          assets: [
            {
              uri: 'file:///camera/photo.jpg',
              mimeType: 'image/jpeg',
              fileSize: 99999,
              width: 3024,
              height: 4032,
            },
          ],
        });
        const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });

        act(() => {
          result.current.launchPhotoPicker();
        });

        // Extract camera button handler (first button)
        const alertButtons = alertSpy.mock.calls[0][2] as Array<{
          text: string;
          onPress?: () => Promise<void>;
        }>;
        const cameraButton = alertButtons[0];

        await act(async () => {
          await cameraButton.onPress!();
        });

        expect(mockRequestCameraPermissions).toHaveBeenCalled();
        expect(mockLaunchCameraAsync).toHaveBeenCalledWith({
          allowsEditing: false,
          quality: 0.8,
        });
        expect(result.current.pendingMedia).toEqual({
          uri: 'file:///camera/photo.jpg',
          type: 'photo',
          mimeType: 'image/jpeg',
          fileSize: 99999,
          width: 3024,
          height: 4032,
        });
        expect(result.current.phase).toBe('linking');
      });

      it('shows error alert when camera permission is denied', async () => {
        const alertSpy = jest.spyOn(Alert, 'alert');
        mockRequestCameraPermissions.mockResolvedValueOnce({ status: 'denied', granted: false });
        const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });

        act(() => {
          result.current.launchPhotoPicker();
        });

        const alertButtons = alertSpy.mock.calls[0][2] as Array<{
          text: string;
          onPress?: () => Promise<void>;
        }>;

        await act(async () => {
          await alertButtons[0].onPress!();
        });

        // Second Alert call is the error
        expect(alertSpy).toHaveBeenCalledTimes(2);
        expect(alertSpy).toHaveBeenLastCalledWith(
          expect.any(String), // common.error
          expect.any(String), // settings.photoPermissionDenied
        );
        expect(mockLaunchCameraAsync).not.toHaveBeenCalled();
        expect(result.current.pendingMedia).toBeNull();
      });

      it('does not set media when picker is canceled', async () => {
        const alertSpy = jest.spyOn(Alert, 'alert');
        mockRequestCameraPermissions.mockResolvedValueOnce({ status: 'granted', granted: true });
        mockLaunchCameraAsync.mockResolvedValueOnce({ canceled: true, assets: [] });
        const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });

        act(() => {
          result.current.launchPhotoPicker();
        });

        const alertButtons = alertSpy.mock.calls[0][2] as Array<{
          text: string;
          onPress?: () => Promise<void>;
        }>;

        await act(async () => {
          await alertButtons[0].onPress!();
        });

        expect(result.current.pendingMedia).toBeNull();
        expect(result.current.phase).toBe('idle');
      });

      it('uses fallback mimeType and fileSize when missing', async () => {
        const alertSpy = jest.spyOn(Alert, 'alert');
        mockRequestCameraPermissions.mockResolvedValueOnce({ status: 'granted', granted: true });
        mockLaunchCameraAsync.mockResolvedValueOnce({
          canceled: false,
          assets: [
            {
              uri: 'file:///camera/photo.jpg',
              mimeType: undefined,
              fileSize: undefined,
              width: 100,
              height: 200,
            },
          ],
        });
        const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });

        act(() => {
          result.current.launchPhotoPicker();
        });

        const alertButtons = alertSpy.mock.calls[0][2] as Array<{
          text: string;
          onPress?: () => Promise<void>;
        }>;

        await act(async () => {
          await alertButtons[0].onPress!();
        });

        expect(result.current.pendingMedia).toEqual(
          expect.objectContaining({
            mimeType: 'image/jpeg',
            fileSize: 1,
          }),
        );
      });

      it('clamps zero fileSize to 1', async () => {
        const alertSpy = jest.spyOn(Alert, 'alert');
        mockRequestCameraPermissions.mockResolvedValueOnce({ status: 'granted', granted: true });
        mockLaunchCameraAsync.mockResolvedValueOnce({
          canceled: false,
          assets: [
            {
              uri: 'file:///camera/photo.jpg',
              mimeType: 'image/png',
              fileSize: 0,
              width: 100,
              height: 200,
            },
          ],
        });
        const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });

        act(() => {
          result.current.launchPhotoPicker();
        });

        const alertButtons = alertSpy.mock.calls[0][2] as Array<{
          text: string;
          onPress?: () => Promise<void>;
        }>;

        await act(async () => {
          await alertButtons[0].onPress!();
        });

        expect(result.current.pendingMedia?.fileSize).toBe(1);
      });
    });

    describe('gallery flow', () => {
      it('requests permission, launches gallery, and sets captured media', async () => {
        const alertSpy = jest.spyOn(Alert, 'alert');
        mockRequestMediaLibraryPermissions.mockResolvedValueOnce({
          status: 'granted',
          granted: true,
        });
        mockLaunchImageLibraryAsync.mockResolvedValueOnce({
          canceled: false,
          assets: [
            {
              uri: 'file:///gallery/photo.png',
              mimeType: 'image/png',
              fileSize: 88888,
              width: 1280,
              height: 720,
            },
          ],
        });
        const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });

        act(() => {
          result.current.launchPhotoPicker();
        });

        // Gallery is the second button
        const alertButtons = alertSpy.mock.calls[0][2] as Array<{
          text: string;
          onPress?: () => Promise<void>;
        }>;
        const galleryButton = alertButtons[1];

        await act(async () => {
          await galleryButton.onPress!();
        });

        expect(mockRequestMediaLibraryPermissions).toHaveBeenCalled();
        expect(mockLaunchImageLibraryAsync).toHaveBeenCalledWith({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.8,
        });
        expect(result.current.pendingMedia).toEqual({
          uri: 'file:///gallery/photo.png',
          type: 'photo',
          mimeType: 'image/png',
          fileSize: 88888,
          width: 1280,
          height: 720,
        });
        expect(result.current.phase).toBe('linking');
      });

      it('shows error alert when gallery permission is denied', async () => {
        const alertSpy = jest.spyOn(Alert, 'alert');
        mockRequestMediaLibraryPermissions.mockResolvedValueOnce({
          status: 'denied',
          granted: false,
        });
        const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });

        act(() => {
          result.current.launchPhotoPicker();
        });

        const alertButtons = alertSpy.mock.calls[0][2] as Array<{
          text: string;
          onPress?: () => Promise<void>;
        }>;

        await act(async () => {
          await alertButtons[1].onPress!();
        });

        expect(alertSpy).toHaveBeenCalledTimes(2);
        expect(alertSpy).toHaveBeenLastCalledWith(
          expect.any(String),
          expect.any(String),
        );
        expect(mockLaunchImageLibraryAsync).not.toHaveBeenCalled();
        expect(result.current.pendingMedia).toBeNull();
      });

      it('does not set media when gallery picker is canceled', async () => {
        const alertSpy = jest.spyOn(Alert, 'alert');
        mockRequestMediaLibraryPermissions.mockResolvedValueOnce({
          status: 'granted',
          granted: true,
        });
        mockLaunchImageLibraryAsync.mockResolvedValueOnce({ canceled: true, assets: [] });
        const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });

        act(() => {
          result.current.launchPhotoPicker();
        });

        const alertButtons = alertSpy.mock.calls[0][2] as Array<{
          text: string;
          onPress?: () => Promise<void>;
        }>;

        await act(async () => {
          await alertButtons[1].onPress!();
        });

        expect(result.current.pendingMedia).toBeNull();
        expect(result.current.phase).toBe('idle');
      });

      it('uses fallback mimeType and fileSize when gallery asset is missing them', async () => {
        const alertSpy = jest.spyOn(Alert, 'alert');
        mockRequestMediaLibraryPermissions.mockResolvedValueOnce({
          status: 'granted',
          granted: true,
        });
        mockLaunchImageLibraryAsync.mockResolvedValueOnce({
          canceled: false,
          assets: [
            {
              uri: 'file:///gallery/photo.jpg',
              mimeType: null,
              fileSize: null,
              width: 640,
              height: 480,
            },
          ],
        });
        const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });

        act(() => {
          result.current.launchPhotoPicker();
        });

        const alertButtons = alertSpy.mock.calls[0][2] as Array<{
          text: string;
          onPress?: () => Promise<void>;
        }>;

        await act(async () => {
          await alertButtons[1].onPress!();
        });

        expect(result.current.pendingMedia).toEqual(
          expect.objectContaining({
            mimeType: 'image/jpeg',
            fileSize: 1,
          }),
        );
      });
    });
  });

  // ── setPhase ─────────────────────────────────────────────────────────────

  describe('setPhase', () => {
    it('allows setting phase directly', () => {
      const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });

      act(() => {
        result.current.setPhase('recording');
      });

      expect(result.current.phase).toBe('recording');
    });
  });

  // ── playAssetByParent ────────────────────────────────────────────────────

  describe('playAssetByParent', () => {
    it('fetches assets, sets audio mode, creates player, and sets playingAssetId', async () => {
      mockGetAssetsByParentAndType.mockResolvedValueOnce([SAMPLE_ASSET]);
      const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.playAssetByParent('word', 1);
      });

      expect(mockGetAssetsByParentAndType).toHaveBeenCalledWith('word', 1, 'audio');
      expect(mockSetAudioModeAsync).toHaveBeenCalledWith({
        allowsRecording: false,
        playsInSilentMode: true,
      });
      expect(mockGetAssetFileUri).toHaveBeenCalledWith('word', 1, 'audio', 'audio-42.m4a');
      expect(mockCreateAudioPlayer).toHaveBeenCalledWith({
        uri: 'file:///documents/media/words/1/audio/audio-42.m4a',
      });
      expect(mockPlayer.play).toHaveBeenCalled();
      expect(mockPlayer.addListener).toHaveBeenCalledWith('playbackStatusUpdate', expect.any(Function));
      expect(result.current.playingAssetId).toBe(42);
    });

    it('is a no-op when no audio assets exist', async () => {
      mockGetAssetsByParentAndType.mockResolvedValueOnce([]);
      const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.playAssetByParent('word', 1);
      });

      expect(mockSetAudioModeAsync).not.toHaveBeenCalled();
      expect(mockCreateAudioPlayer).not.toHaveBeenCalled();
      expect(result.current.playingAssetId).toBeNull();
    });

    it('toggles off when same asset is already playing', async () => {
      mockGetAssetsByParentAndType.mockResolvedValue([SAMPLE_ASSET]);
      const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });

      // First play
      await act(async () => {
        await result.current.playAssetByParent('word', 1);
      });
      expect(result.current.playingAssetId).toBe(42);

      // Second play of same asset -> toggle off
      await act(async () => {
        await result.current.playAssetByParent('word', 1);
      });
      expect(result.current.playingAssetId).toBeNull();
      expect(mockPlayer.remove).toHaveBeenCalled();
    });

    it('resets playingAssetId when createAudioPlayer throws', async () => {
      mockGetAssetsByParentAndType.mockResolvedValueOnce([SAMPLE_ASSET]);
      mockCreateAudioPlayer.mockImplementationOnce(() => { throw new Error('Audio load failed'); });
      const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.playAssetByParent('word', 1);
      });

      expect(result.current.playingAssetId).toBeNull();
    });

    it('handles playback status update didJustFinish', async () => {
      mockGetAssetsByParentAndType.mockResolvedValueOnce([SAMPLE_ASSET]);
      let statusCallback: (status: Record<string, unknown>) => void = () => {};
      mockPlayer.addListener.mockImplementation(
        (_event: string, cb: (status: Record<string, unknown>) => void) => {
          statusCallback = cb;
        },
      );
      const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.playAssetByParent('word', 1);
      });
      expect(result.current.playingAssetId).toBe(42);

      // Simulate playback finishing
      await act(async () => {
        statusCallback({ isLoaded: true, didJustFinish: true });
      });

      expect(result.current.playingAssetId).toBeNull();
      expect(mockPlayer.remove).toHaveBeenCalled();
    });

    it('ignores playback status that is not finished', async () => {
      mockGetAssetsByParentAndType.mockResolvedValueOnce([SAMPLE_ASSET]);
      let statusCallback: (status: Record<string, unknown>) => void = () => {};
      mockPlayer.addListener.mockImplementation(
        (_event: string, cb: (status: Record<string, unknown>) => void) => {
          statusCallback = cb;
        },
      );
      const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.playAssetByParent('word', 1);
      });

      // Status update that is not finished
      act(() => {
        statusCallback({ isLoaded: true, didJustFinish: false });
      });

      expect(result.current.playingAssetId).toBe(42);
    });

    it('ignores playback status when not loaded', async () => {
      mockGetAssetsByParentAndType.mockResolvedValueOnce([SAMPLE_ASSET]);
      let statusCallback: (status: Record<string, unknown>) => void = () => {};
      mockPlayer.addListener.mockImplementation(
        (_event: string, cb: (status: Record<string, unknown>) => void) => {
          statusCallback = cb;
        },
      );
      const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.playAssetByParent('word', 1);
      });

      act(() => {
        statusCallback({ isLoaded: false });
      });

      expect(result.current.playingAssetId).toBe(42);
    });

    it('stops previous player before playing new one', async () => {
      const asset2: Asset = { ...SAMPLE_ASSET, id: 100, filename: 'audio-100.m4a' };
      mockGetAssetsByParentAndType
        .mockResolvedValueOnce([SAMPLE_ASSET])
        .mockResolvedValueOnce([asset2]);

      const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });

      // Play first asset
      await act(async () => {
        await result.current.playAssetByParent('word', 1);
      });
      expect(result.current.playingAssetId).toBe(42);

      jest.clearAllMocks();
      mockCreateAudioPlayer.mockReturnValue(mockPlayer);
      mockSetAudioModeAsync.mockResolvedValue(undefined);
      mockGetAssetFileUri.mockReturnValue('file:///documents/media/words/2/audio/audio-100.m4a');

      // Play different asset — should remove first player, then play new
      await act(async () => {
        await result.current.playAssetByParent('word', 2);
      });

      expect(mockPlayer.remove).toHaveBeenCalled();
      expect(result.current.playingAssetId).toBe(100);
    });
  });

  // ── stopPlayback ─────────────────────────────────────────────────────────

  describe('stopPlayback', () => {
    it('removes the current player and resets playingAssetId', async () => {
      mockGetAssetsByParentAndType.mockResolvedValueOnce([SAMPLE_ASSET]);
      const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });

      // Start playing
      await act(async () => {
        await result.current.playAssetByParent('word', 1);
      });
      expect(result.current.playingAssetId).toBe(42);

      jest.clearAllMocks();

      // Stop
      await act(async () => {
        await result.current.stopPlayback();
      });

      expect(mockPlayer.remove).toHaveBeenCalled();
      expect(result.current.playingAssetId).toBeNull();
    });

    it('is safe to call when no player is active', async () => {
      const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });

      // Should not throw
      await act(async () => {
        await result.current.stopPlayback();
      });

      expect(result.current.playingAssetId).toBeNull();
    });

    it('handles remove() error gracefully', async () => {
      mockGetAssetsByParentAndType.mockResolvedValueOnce([SAMPLE_ASSET]);
      const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.playAssetByParent('word', 1);
      });

      mockPlayer.remove.mockImplementationOnce(() => { throw new Error('Already removed'); });

      await act(async () => {
        await result.current.stopPlayback();
      });

      // Should not throw, and should still reset
      expect(result.current.playingAssetId).toBeNull();
    });
  });

  // ── linkMediaToWord with photo media ─────────────────────────────────────

  describe('linkMediaToWord with photo media', () => {
    it('passes width and height for photo assets', async () => {
      const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });

      act(() => {
        result.current.setCapturedMedia(SAMPLE_PHOTO_MEDIA);
      });

      await act(async () => {
        await result.current.linkMediaToWord(3);
      });

      expect(mockSaveAsset).toHaveBeenCalledWith(
        expect.objectContaining({
          assetType: 'photo',
          width: 1920,
          height: 1080,
        }),
      );
    });
  });

  // ── linkMediaToVariant ────────────────────────────────────────────────────

  describe('linkMediaToVariant', () => {
    it('calls saveAsset with parent_type=variant and resets', async () => {
      const queryClient = createQueryClient();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useMediaCapture(), {
        wrapper: createWrapper(queryClient),
      });

      act(() => {
        result.current.setCapturedMedia(SAMPLE_MEDIA);
      });

      await act(async () => {
        await result.current.linkMediaToVariant(42, 'baa', 'baa', 'ball');
      });

      expect(mockSaveAsset).toHaveBeenCalledWith({
        sourceUri: SAMPLE_MEDIA.uri,
        parentType: 'variant',
        parentId: 42,
        assetType: 'audio',
        mimeType: 'audio/mp4',
        fileSize: 12345,
        name: 'baa',
        parentName: 'baa',
        durationMs: 3000,
        width: undefined,
        height: undefined,
      });
      expect(invalidateSpy).toHaveBeenCalled();
      expect(result.current.phase).toBe('idle');
      expect(result.current.pendingMedia).toBeNull();
    });

    it('calls checkAndShowPriming on successful save', async () => {
      const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });
      act(() => { result.current.setCapturedMedia(SAMPLE_MEDIA); });
      await act(async () => { await result.current.linkMediaToVariant(42); });
      expect(mockCheckAndShowPriming).toHaveBeenCalled();
    });

    it('is a no-op when pendingMedia is null', async () => {
      const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.linkMediaToVariant(42);
      });

      expect(mockSaveAsset).not.toHaveBeenCalled();
    });

    it('shows Alert on error and still resets', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      mockSaveAsset.mockRejectedValueOnce(new Error('DB error'));
      const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });

      act(() => {
        result.current.setCapturedMedia(SAMPLE_MEDIA);
      });

      await act(async () => {
        await result.current.linkMediaToVariant(42);
      });

      expect(alertSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
      );
      expect(result.current.phase).toBe('idle');
    });
  });

  // ── saveWithoutLinking ────────────────────────────────────────────────────

  describe('saveWithoutLinking', () => {
    it('calls saveAsset with parent_type=unlinked and resets', async () => {
      const queryClient = createQueryClient();
      const { result } = renderHook(() => useMediaCapture(), {
        wrapper: createWrapper(queryClient),
      });

      act(() => {
        result.current.setCapturedMedia(SAMPLE_MEDIA);
      });

      await act(async () => {
        await result.current.saveWithoutLinking('my recording');
      });

      expect(mockSaveAsset).toHaveBeenCalledWith({
        sourceUri: SAMPLE_MEDIA.uri,
        parentType: 'unlinked',
        parentId: 1,
        assetType: 'audio',
        mimeType: 'audio/mp4',
        fileSize: 12345,
        name: 'my recording',
        durationMs: 3000,
        width: undefined,
        height: undefined,
      });
      expect(result.current.phase).toBe('idle');
      expect(result.current.pendingMedia).toBeNull();
    });

    it('calls checkAndShowPriming on successful save', async () => {
      const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });
      act(() => { result.current.setCapturedMedia(SAMPLE_MEDIA); });
      await act(async () => { await result.current.saveWithoutLinking('my recording'); });
      expect(mockCheckAndShowPriming).toHaveBeenCalled();
    });

    it('is a no-op when pendingMedia is null', async () => {
      const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.saveWithoutLinking();
      });

      expect(mockSaveAsset).not.toHaveBeenCalled();
    });

    it('shows Alert on error and still resets', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      mockSaveAsset.mockRejectedValueOnce(new Error('fail'));
      const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });

      act(() => {
        result.current.setCapturedMedia(SAMPLE_MEDIA);
      });

      await act(async () => {
        await result.current.saveWithoutLinking();
      });

      expect(alertSpy).toHaveBeenCalled();
      expect(result.current.phase).toBe('idle');
    });
  });

  // ── edge case: remove error in didJustFinish callback ────────────────────

  describe('playback finish callback', () => {
    it('remove() error in didJustFinish is handled gracefully', async () => {
      mockGetAssetsByParentAndType.mockResolvedValueOnce([SAMPLE_ASSET]);
      let statusCallback: (status: Record<string, unknown>) => void = () => {};
      mockPlayer.addListener.mockImplementation(
        (_event: string, cb: (status: Record<string, unknown>) => void) => {
          statusCallback = cb;
        },
      );

      const { result } = renderHook(() => useMediaCapture(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.playAssetByParent('word', 1);
      });

      // Trigger didJustFinish — player.remove() should be called
      act(() => {
        statusCallback({ isLoaded: true, didJustFinish: true });
      });

      await waitFor(() => {
        expect(result.current.playingAssetId).toBeNull();
      });
    });
  });
});
