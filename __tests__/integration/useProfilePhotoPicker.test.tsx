import React from 'react';
import { Alert } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from '../../src/i18n/i18n';
import { useProfilePhotoPicker } from '../../src/hooks/useProfilePhotoPicker';
import * as assetService from '../../src/services/assetService';
import { createTestQueryClient } from '../helpers/renderWithProviders';

jest.mock('../../src/services/assetService', () => ({
  getAssetsByParent: jest.fn(() => Promise.resolve([])),
  getAssetsByParentAndType: jest.fn(() => Promise.resolve([])),
  getProfilePhoto: jest.fn(() => Promise.resolve(null)),
  saveProfilePhoto: jest.fn(() => Promise.resolve(null)),
  deleteProfilePhoto: jest.fn(() => Promise.resolve()),
  saveAsset: jest.fn(() => Promise.resolve(null)),
  removeAsset: jest.fn(() => Promise.resolve()),
}));

const mockedImagePicker = ImagePicker as jest.Mocked<typeof ImagePicker>;
const mockedService = assetService as jest.Mocked<typeof assetService>;

const MOCK_ASSET: ImagePicker.ImagePickerAsset = {
  uri: 'file:///photo.jpg',
  mimeType: 'image/jpeg',
  fileSize: 1024,
  width: 400,
  height: 400,
  assetId: null,
  base64: null,
  duration: null,
  exif: null,
  fileName: 'photo.jpg',
  pairedVideoAsset: null,
  type: 'image',
};

function createWrapper() {
  const queryClient = createTestQueryClient();
  return {
    queryClient,
    wrapper({ children }: { children: React.ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          <I18nProvider>{children}</I18nProvider>
        </QueryClientProvider>
      );
    },
  };
}

describe('useProfilePhotoPicker', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedImagePicker.requestCameraPermissionsAsync.mockResolvedValue({ granted: true, status: 'granted', expires: 'never', canAskAgain: true } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true, status: 'granted', expires: 'never', canAskAgain: true } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedImagePicker.launchCameraAsync.mockResolvedValue({ canceled: true, assets: null } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedImagePicker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null } as any);
  });

  describe('handlePickPhoto', () => {
    it('shows a source picker Alert with camera, gallery, and cancel options', () => {
      const { wrapper } = createWrapper();
      const onPhotoSelected = jest.fn();
      const { result } = renderHook(() => useProfilePhotoPicker({ onPhotoSelected }), { wrapper });

      act(() => { result.current.handlePickPhoto(); });

      expect(alertSpy).toHaveBeenCalledWith(
        expect.any(String),
        undefined,
        expect.arrayContaining([
          expect.objectContaining({ text: expect.any(String), onPress: expect.any(Function) }),
          expect.objectContaining({ text: expect.any(String), onPress: expect.any(Function) }),
          expect.objectContaining({ text: expect.any(String), style: 'cancel' }),
        ]),
      );
    });

    it('does not open picker a second time when pickingPhoto is true', () => {
      const { wrapper } = createWrapper();
      const onPhotoSelected = jest.fn();
      const { result } = renderHook(() => useProfilePhotoPicker({ onPhotoSelected }), { wrapper });

      act(() => { result.current.handlePickPhoto(); });
      act(() => { result.current.handlePickPhoto(); });

      expect(alertSpy).toHaveBeenCalledTimes(1);
    });

    it('pressing cancel in alert resets pickingPhoto guard', () => {
      const { wrapper } = createWrapper();
      const onPhotoSelected = jest.fn();
      const { result } = renderHook(() => useProfilePhotoPicker({ onPhotoSelected }), { wrapper });

      act(() => { result.current.handlePickPhoto(); });

      // grab the cancel button onPress
      const alertArgs = alertSpy.mock.calls[0];
      const cancelBtn = (alertArgs[2] as { text: string; style?: string; onPress?: () => void }[]).find(b => b.style === 'cancel');
      act(() => { cancelBtn?.onPress?.(); });

      // should be able to open again
      alertSpy.mockClear();
      act(() => { result.current.handlePickPhoto(); });
      expect(alertSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('launchPicker — camera', () => {
    it('calls onPhotoSelected with asset when camera succeeds', async () => {
      const { wrapper } = createWrapper();
      const onPhotoSelected = jest.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockedImagePicker.launchCameraAsync.mockResolvedValue({ canceled: false, assets: [MOCK_ASSET] } as any);

      const { result } = renderHook(() => useProfilePhotoPicker({ onPhotoSelected }), { wrapper });

      // trigger camera via Alert button
      act(() => { result.current.handlePickPhoto(); });
      const cameraBtn = (alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[])[0];
      await act(async () => { cameraBtn.onPress?.(); });

      expect(mockedImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled();
      expect(mockedImagePicker.launchCameraAsync).toHaveBeenCalledWith({
        allowsEditing: true, aspect: [1, 1], quality: 0.8,
      });
      expect(onPhotoSelected).toHaveBeenCalledWith(MOCK_ASSET);
    });

    it('shows permission denied alert and does not launch camera when permission denied', async () => {
      const { wrapper } = createWrapper();
      const onPhotoSelected = jest.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockedImagePicker.requestCameraPermissionsAsync.mockResolvedValue({ granted: false, status: 'denied', expires: 'never', canAskAgain: false } as any);

      const { result } = renderHook(() => useProfilePhotoPicker({ onPhotoSelected }), { wrapper });

      act(() => { result.current.handlePickPhoto(); });
      const cameraBtn = (alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[])[0];
      alertSpy.mockClear();
      await act(async () => { cameraBtn.onPress?.(); });

      expect(alertSpy).toHaveBeenCalled();
      expect(mockedImagePicker.launchCameraAsync).not.toHaveBeenCalled();
      expect(onPhotoSelected).not.toHaveBeenCalled();
    });

    it('does not call onPhotoSelected when camera picker is cancelled', async () => {
      const { wrapper } = createWrapper();
      const onPhotoSelected = jest.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockedImagePicker.launchCameraAsync.mockResolvedValue({ canceled: true, assets: null } as any);

      const { result } = renderHook(() => useProfilePhotoPicker({ onPhotoSelected }), { wrapper });

      act(() => { result.current.handlePickPhoto(); });
      const cameraBtn = (alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[])[0];
      await act(async () => { cameraBtn.onPress?.(); });

      expect(onPhotoSelected).not.toHaveBeenCalled();
    });
  });

  describe('launchPicker — library', () => {
    it('calls onPhotoSelected with asset when library succeeds', async () => {
      const { wrapper } = createWrapper();
      const onPhotoSelected = jest.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockedImagePicker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [MOCK_ASSET] } as any);

      const { result } = renderHook(() => useProfilePhotoPicker({ onPhotoSelected }), { wrapper });

      act(() => { result.current.handlePickPhoto(); });
      const galleryBtn = (alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[])[1];
      await act(async () => { galleryBtn.onPress?.(); });

      expect(mockedImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalled();
      expect(mockedImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
        mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8,
      });
      expect(onPhotoSelected).toHaveBeenCalledWith(MOCK_ASSET);
    });

    it('shows permission denied alert and does not launch library when permission denied', async () => {
      const { wrapper } = createWrapper();
      const onPhotoSelected = jest.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockedImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: false, status: 'denied', expires: 'never', canAskAgain: false } as any);

      const { result } = renderHook(() => useProfilePhotoPicker({ onPhotoSelected }), { wrapper });

      act(() => { result.current.handlePickPhoto(); });
      const galleryBtn = (alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[])[1];
      alertSpy.mockClear();
      await act(async () => { galleryBtn.onPress?.(); });

      expect(alertSpy).toHaveBeenCalled();
      expect(mockedImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
      expect(onPhotoSelected).not.toHaveBeenCalled();
    });

    it('does not call onPhotoSelected when library picker is cancelled', async () => {
      const { wrapper } = createWrapper();
      const onPhotoSelected = jest.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockedImagePicker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null } as any);

      const { result } = renderHook(() => useProfilePhotoPicker({ onPhotoSelected }), { wrapper });

      act(() => { result.current.handlePickPhoto(); });
      const galleryBtn = (alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[])[1];
      await act(async () => { galleryBtn.onPress?.(); });

      expect(onPhotoSelected).not.toHaveBeenCalled();
    });
  });

  describe('handleRemovePhoto', () => {
    it('shows a remove confirm Alert', () => {
      const { wrapper } = createWrapper();
      const onPhotoSelected = jest.fn();
      const { result } = renderHook(() => useProfilePhotoPicker({ onPhotoSelected }), { wrapper });

      act(() => { result.current.handleRemovePhoto(); });

      expect(alertSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({ style: 'cancel' }),
          expect.objectContaining({ style: 'destructive' }),
        ]),
      );
    });

    it('calls deleteProfilePhoto and onPhotoRemoved when confirm is pressed', async () => {
      const { wrapper } = createWrapper();
      const onPhotoSelected = jest.fn();
      const onPhotoRemoved = jest.fn();
      const { result } = renderHook(
        () => useProfilePhotoPicker({ onPhotoSelected, onPhotoRemoved }),
        { wrapper },
      );

      act(() => { result.current.handleRemovePhoto(); });
      const destructiveBtn = (alertSpy.mock.calls[0][2] as { text: string; style?: string; onPress?: () => void }[]).find(b => b.style === 'destructive');
      await act(async () => { await destructiveBtn?.onPress?.(); });

      expect(mockedService.deleteProfilePhoto).toHaveBeenCalled();
      expect(onPhotoRemoved).toHaveBeenCalled();
    });

    it('does not call onPhotoRemoved when cancel is pressed', async () => {
      const { wrapper } = createWrapper();
      const onPhotoSelected = jest.fn();
      const onPhotoRemoved = jest.fn();
      const { result } = renderHook(
        () => useProfilePhotoPicker({ onPhotoSelected, onPhotoRemoved }),
        { wrapper },
      );

      act(() => { result.current.handleRemovePhoto(); });
      const cancelBtn = (alertSpy.mock.calls[0][2] as { text: string; style?: string; onPress?: () => void }[]).find(b => b.style === 'cancel');
      cancelBtn?.onPress?.();

      expect(mockedService.deleteProfilePhoto).not.toHaveBeenCalled();
      expect(onPhotoRemoved).not.toHaveBeenCalled();
    });

    it('works without onPhotoRemoved callback', async () => {
      const { wrapper } = createWrapper();
      const onPhotoSelected = jest.fn();
      const { result } = renderHook(() => useProfilePhotoPicker({ onPhotoSelected }), { wrapper });

      act(() => { result.current.handleRemovePhoto(); });
      const destructiveBtn = (alertSpy.mock.calls[0][2] as { text: string; style?: string; onPress?: () => void }[]).find(b => b.style === 'destructive');

      await expect(act(async () => { await destructiveBtn?.onPress?.(); })).resolves.not.toThrow();
      expect(mockedService.deleteProfilePhoto).toHaveBeenCalled();
    });
  });
});
