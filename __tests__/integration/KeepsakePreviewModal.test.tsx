import React from 'react';
import { Alert, Linking } from 'react-native';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { KeepsakePreviewModal } from '../../src/components/keepsake/KeepsakePreviewModal';
import { useSettingsStore } from '../../src/stores/settingsStore';
import type { KeepsakeWord } from '../../src/types/keepsake';

let mockWords: KeepsakeWord[] = [
  { id: 1, word: 'mama', dateAdded: '2026-01-01', photoUri: null, categoryEmoji: '👨‍👩‍👧' },
  { id: 2, word: 'papa', dateAdded: '2026-01-02', photoUri: null, categoryEmoji: '👨‍👩‍👧' },
];

jest.mock('../../src/services/keepsakeService', () => ({
  getKeepsakeWords: jest.fn(() => Promise.resolve(mockWords)),
  loadKeepsakeState: jest.fn(() => Promise.resolve({
    isGenerated: false,
    generatedAt: null,
    photoOverrides: {},
  })),
  captureKeepsake: jest.fn(() => Promise.resolve('file:///mock/capture.jpg')),
  setPhotoOverride: jest.fn(() => Promise.resolve()),
  saveKeepsakeToLibrary: jest.fn(() => Promise.resolve()),
  shareKeepsake: jest.fn(() => Promise.resolve()),
  getKeepsakeFileUri: jest.fn(() => 'file:///mock/keepsake.jpg'),
}));

function getService() {
  return require('../../src/services/keepsakeService') as {
    captureKeepsake: jest.Mock;
    saveKeepsakeToLibrary: jest.Mock;
    shareKeepsake: jest.Mock;
    setPhotoOverride: jest.Mock;
    getKeepsakeWords: jest.Mock;
  };
}

function pressAlertButton(text: string) {
  const calls = (Alert.alert as jest.Mock).mock.calls;
  const lastCall = calls[calls.length - 1];
  const buttons = lastCall?.[2] as Array<{ text: string; onPress?: () => void }> | undefined;
  const btn = buttons?.find((b) => b.text === text);
  btn?.onPress?.();
}

beforeEach(() => {
  jest.clearAllMocks();
  useSettingsStore.setState({ name: 'Noah', sex: 'boy', birth: undefined, isOnboardingDone: true });
  mockWords = [
    { id: 1, word: 'mama', dateAdded: '2026-01-01', photoUri: null, categoryEmoji: '👨‍👩‍👧' },
    { id: 2, word: 'papa', dateAdded: '2026-01-02', photoUri: null, categoryEmoji: '👨‍👩‍👧' },
  ];
  (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
  (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
  (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({ canceled: true, assets: [] });
  (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: true, assets: [] });
  jest.spyOn(Alert, 'alert');
});

describe('KeepsakePreviewModal', () => {
  it('allows saving twice in sequence', async () => {
    const onClose = jest.fn();
    const svc = getService();
    const { findByTestId } = renderWithProviders(
      <KeepsakePreviewModal visible={true} onClose={onClose} />,
    );

    const saveBtn = await findByTestId('keepsake-save-btn');

    fireEvent.press(saveBtn);
    await waitFor(() => {
      expect(svc.captureKeepsake).toHaveBeenCalledTimes(1);
      expect(svc.saveKeepsakeToLibrary).toHaveBeenCalledTimes(1);
    });

    fireEvent.press(saveBtn);
    await waitFor(() => {
      expect(svc.captureKeepsake).toHaveBeenCalledTimes(2);
      expect(svc.saveKeepsakeToLibrary).toHaveBeenCalledTimes(2);
    });
  });

  it('allows sharing twice in sequence', async () => {
    const onClose = jest.fn();
    const svc = getService();
    const { findByTestId } = renderWithProviders(
      <KeepsakePreviewModal visible={true} onClose={onClose} />,
    );

    const shareBtn = await findByTestId('keepsake-share-btn');

    fireEvent.press(shareBtn);
    await waitFor(() => {
      expect(svc.captureKeepsake).toHaveBeenCalledTimes(1);
      expect(svc.shareKeepsake).toHaveBeenCalledTimes(1);
    });

    fireEvent.press(shareBtn);
    await waitFor(() => {
      expect(svc.captureKeepsake).toHaveBeenCalledTimes(2);
      expect(svc.shareKeepsake).toHaveBeenCalledTimes(2);
    });
  });

  it('renders modal when visible', async () => {
    const onClose = jest.fn();
    const { findByTestId } = renderWithProviders(
      <KeepsakePreviewModal visible={true} onClose={onClose} />,
    );

    const modal = await findByTestId('keepsake-preview-modal');
    expect(modal).toBeTruthy();
  });

  it('calls onClose when close button is pressed', async () => {
    const onClose = jest.fn();
    const { findByTestId } = renderWithProviders(
      <KeepsakePreviewModal visible={true} onClose={onClose} />,
    );

    const closeBtn = await findByTestId('keepsake-close-btn');
    fireEvent.press(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders save and share buttons when words are loaded', async () => {
    const onClose = jest.fn();
    const { findByTestId } = renderWithProviders(
      <KeepsakePreviewModal visible={true} onClose={onClose} />,
    );

    const saveBtn = await findByTestId('keepsake-save-btn');
    const shareBtn = await findByTestId('keepsake-share-btn');
    expect(saveBtn).toBeTruthy();
    expect(shareBtn).toBeTruthy();
  });

  it('renders photo swap touch targets for each word', async () => {
    const onClose = jest.fn();
    const { findByTestId } = renderWithProviders(
      <KeepsakePreviewModal visible={true} onClose={onClose} />,
    );

    const swap0 = await findByTestId('keepsake-swap-0');
    const swap1 = await findByTestId('keepsake-swap-1');
    expect(swap0).toBeTruthy();
    expect(swap1).toBeTruthy();
  });

  it('hides camera badge when photo already exists', async () => {
    mockWords = [
      { id: 1, word: 'mama', dateAdded: '2026-01-01', photoUri: 'file:///photo-1.jpg', categoryEmoji: '👨‍👩‍👧' },
      { id: 2, word: 'papa', dateAdded: '2026-01-02', photoUri: null, categoryEmoji: '👨‍👩‍👧' },
    ];
    const onClose = jest.fn();
    const { findByTestId, queryByTestId } = renderWithProviders(
      <KeepsakePreviewModal visible={true} onClose={onClose} />,
    );

    await findByTestId('keepsake-swap-0');
    await findByTestId('keepsake-swap-1');
    expect(queryByTestId('keepsake-swap-badge-0')).toBeNull();
    expect(queryByTestId('keepsake-swap-badge-1')).toBeTruthy();
  });

  it('opens Alert when photo swap target is pressed', async () => {
    const onClose = jest.fn();
    const { findByTestId } = renderWithProviders(
      <KeepsakePreviewModal visible={true} onClose={onClose} />,
    );

    const swap0 = await findByTestId('keepsake-swap-0');
    fireEvent.press(swap0);

    expect(Alert.alert).toHaveBeenCalledWith(
      expect.any(String),
      undefined,
      expect.arrayContaining([
        expect.objectContaining({ text: expect.any(String) }),
      ]),
    );
  });

  it('does not render content when modal is not visible', () => {
    const onClose = jest.fn();
    const { queryByTestId } = renderWithProviders(
      <KeepsakePreviewModal visible={false} onClose={onClose} />,
    );
    expect(queryByTestId('keepsake-close-btn')).toBeNull();
  });

  it('camera permission granted — launches camera and calls setPhotoOverride on selection', async () => {
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///camera.jpg' }],
    });
    const svc = getService();
    const { findByTestId } = renderWithProviders(
      <KeepsakePreviewModal visible={true} onClose={jest.fn()} />,
    );

    const swap0 = await findByTestId('keepsake-swap-0');
    fireEvent.press(swap0);

    await act(async () => {
      pressAlertButton('Take Photo');
    });

    await waitFor(() => {
      expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
      expect(svc.setPhotoOverride).toHaveBeenCalledWith(1, 'file:///camera.jpg');
    });
  });

  it('camera permission denied — shows permission alert without launching camera', async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false });
    const { findByTestId } = renderWithProviders(
      <KeepsakePreviewModal visible={true} onClose={jest.fn()} />,
    );

    const swap0 = await findByTestId('keepsake-swap-0');
    fireEvent.press(swap0);

    await act(async () => {
      pressAlertButton('Take Photo');
    });

    await waitFor(() => {
      expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledTimes(2);
    });
  });

  it('camera launch canceled — does not call setPhotoOverride', async () => {
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValueOnce({ canceled: true, assets: [] });
    const svc = getService();
    const { findByTestId } = renderWithProviders(
      <KeepsakePreviewModal visible={true} onClose={jest.fn()} />,
    );

    const swap0 = await findByTestId('keepsake-swap-0');
    fireEvent.press(swap0);

    await act(async () => {
      pressAlertButton('Take Photo');
    });

    await waitFor(() => {
      expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
      expect(svc.setPhotoOverride).not.toHaveBeenCalled();
    });
  });

  it('library permission granted — launches library and calls setPhotoOverride on selection', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///library.jpg' }],
    });
    const svc = getService();
    const { findByTestId } = renderWithProviders(
      <KeepsakePreviewModal visible={true} onClose={jest.fn()} />,
    );

    const swap0 = await findByTestId('keepsake-swap-0');
    fireEvent.press(swap0);

    await act(async () => {
      pressAlertButton('Choose from Library');
    });

    await waitFor(() => {
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      expect(svc.setPhotoOverride).toHaveBeenCalledWith(1, 'file:///library.jpg');
    });
  });

  it('library permission denied — shows permission alert without launching library', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false });
    const { findByTestId } = renderWithProviders(
      <KeepsakePreviewModal visible={true} onClose={jest.fn()} />,
    );

    const swap0 = await findByTestId('keepsake-swap-0');
    fireEvent.press(swap0);

    await act(async () => {
      pressAlertButton('Choose from Library');
    });

    await waitFor(() => {
      expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledTimes(2);
    });
  });

  it('library launch canceled — does not call setPhotoOverride', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({ canceled: true, assets: [] });
    const svc = getService();
    const { findByTestId } = renderWithProviders(
      <KeepsakePreviewModal visible={true} onClose={jest.fn()} />,
    );

    const swap0 = await findByTestId('keepsake-swap-0');
    fireEvent.press(swap0);

    await act(async () => {
      pressAlertButton('Choose from Library');
    });

    await waitFor(() => {
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      expect(svc.setPhotoOverride).not.toHaveBeenCalled();
    });
  });

  it('save — shows permission denied alert when saveToLibrary throws PERMISSION_DENIED', async () => {
    const svc = getService();
    svc.saveKeepsakeToLibrary.mockRejectedValueOnce(new Error('PERMISSION_DENIED'));

    const { findByTestId } = renderWithProviders(
      <KeepsakePreviewModal visible={true} onClose={jest.fn()} />,
    );

    const saveBtn = await findByTestId('keepsake-save-btn');
    fireEvent.press(saveBtn);

    await waitFor(() => {
      // Permission denied alert has 2 buttons (Cancel + Open Settings)
      const lastCall = (Alert.alert as jest.Mock).mock.calls.at(-1);
      expect(lastCall).toBeDefined();
      const buttons = lastCall?.[2] as Array<{ text: string }>;
      expect(buttons?.some((b) => b.text === 'Open Settings')).toBe(true);
    });
  });

  it('save — shows captureFailed alert on generic capture error', async () => {
    const svc = getService();
    svc.captureKeepsake.mockRejectedValueOnce(new Error('capture error'));

    const { findByTestId } = renderWithProviders(
      <KeepsakePreviewModal visible={true} onClose={jest.fn()} />,
    );

    const saveBtn = await findByTestId('keepsake-save-btn');
    fireEvent.press(saveBtn);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
      const lastCall = (Alert.alert as jest.Mock).mock.calls.at(-1);
      // captureFailed alert has no buttons array (single OK)
      expect(lastCall?.[2]).toBeUndefined();
    });
  });

  it('share — shows captureFailed alert on error', async () => {
    const svc = getService();
    svc.captureKeepsake.mockRejectedValueOnce(new Error('capture error'));

    const { findByTestId } = renderWithProviders(
      <KeepsakePreviewModal visible={true} onClose={jest.fn()} />,
    );

    const shareBtn = await findByTestId('keepsake-share-btn');
    fireEvent.press(shareBtn);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  it('permission denied alert open-settings button calls Linking.openSettings', async () => {
    const openSettingsSpy = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false });
    const { findByTestId } = renderWithProviders(
      <KeepsakePreviewModal visible={true} onClose={jest.fn()} />,
    );

    const swap0 = await findByTestId('keepsake-swap-0');
    fireEvent.press(swap0);

    await act(async () => {
      pressAlertButton('Take Photo');
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      pressAlertButton('Open Settings');
    });

    expect(openSettingsSpy).toHaveBeenCalled();
    openSettingsSpy.mockRestore();
  });
});
