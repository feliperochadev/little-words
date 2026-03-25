import React from 'react';
import { Alert } from 'react-native';
import { waitFor, fireEvent, act } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { AddWordModal } from '../../src/components/AddWordModal';

jest.mock('../../src/services/dashboardService', () => {
  const actual = jest.requireActual('../../src/services/dashboardService');
  return {
    ...actual,
    getDashboardStats: jest.fn(),
  };
});

jest.mock('../../src/services/settingsService', () => ({
  ...jest.requireActual('../../src/services/settingsService'),
  getSetting: jest.fn(),
  setSetting: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/services/categoryService', () => ({
  ...jest.requireActual('../../src/services/categoryService'),
  getCategories: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../src/services/assetService', () => ({
  ...jest.requireActual('../../src/services/assetService'),
  getProfilePhoto: jest.fn().mockResolvedValue(null),
  getAssetsByParent: jest.fn().mockResolvedValue([]),
  getAssetsByParentAndType: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../src/hooks/useAssets', () => ({
  useProfilePhoto: jest.fn().mockReturnValue({ data: null }),
  useSaveProfilePhoto: jest.fn(),
  useRemoveProfilePhoto: jest.fn(),
  useAssetsByParent: jest.fn().mockReturnValue({ data: [] }),
  useRemoveAsset: jest.fn().mockReturnValue({ mutateAsync: jest.fn() }),
}));

jest.mock('../../src/services/wordService', () => ({
  ...jest.requireActual('../../src/services/wordService'),
  addWord: jest.fn().mockResolvedValue(1),
  updateWord: jest.fn().mockResolvedValue(undefined),
  deleteWord: jest.fn().mockResolvedValue(undefined),
  findWordByName: jest.fn().mockResolvedValue(null),
  getWords: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../src/services/notificationService', () => ({
  handleWordAdded: jest.fn().mockResolvedValue(undefined),
  isNotificationsEnabled: jest.fn().mockResolvedValue(false),
  cancelAllNotifications: jest.fn().mockResolvedValue(undefined),
  scheduleAll: jest.fn().mockResolvedValue(undefined),
  initNotifications: jest.fn().mockResolvedValue(undefined),
  cancelRetentionNotifications: jest.fn().mockResolvedValue(undefined),
  getPermissionStatus: jest.fn().mockResolvedValue({ granted: false, canAskAgain: true }),
}));

import DashboardScreen from '../../app/(tabs)/home';
import * as db from '../../src/services/dashboardService';
import * as settingsService from '../../src/services/settingsService';
import { getThemeForSex } from '../../src/theme/getThemeForSex';

function flattenStyle(style: unknown): Record<string, unknown> {
  return Array.isArray(style) ? Object.assign({}, ...style) : (style as Record<string, unknown> ?? {});
}

const emptyStats = {
  totalWords: 0, totalVariants: 0, wordsToday: 0,
  wordsThisWeek: 0, wordsThisMonth: 0,
  categoryCounts: [], recentWords: [], monthlyProgress: [],
};

const fullStats = {
  totalWords: 10, totalVariants: 5, wordsToday: 2,
  wordsThisWeek: 4, wordsThisMonth: 8,
  categoryCounts: [{ name: 'animals', count: 3, color: '#FF6B9D', emoji: '🐾' }],
  recentWords: [{ id: 1, word: 'mamãe', category_color: '#FF6B9D' }],
  monthlyProgress: [{ month: '2024-01', count: 5 }, { month: '2024-02', count: 8 }],
};

const mockSaveProfilePhotoMutateAsync = jest.fn();
const mockRemoveProfilePhotoMutateAsync = jest.fn();

function pressLastAlertButton(text: string) {
  const calls = (Alert.alert as jest.Mock).mock.calls;
  const lastCall = calls[calls.length - 1];
  const buttons = lastCall[2] as Array<{ text: string; onPress?: () => void }>;
  const btn = buttons.find((b) => b.text === text);
  btn?.onPress?.();
}

describe('DashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert');
    (settingsService.getSetting as jest.Mock).mockResolvedValue(null);
    const useAssets = require('../../src/hooks/useAssets');
    (useAssets.useProfilePhoto as jest.Mock).mockReturnValue({ data: null });
    (useAssets.useSaveProfilePhoto as jest.Mock).mockReturnValue({ mutateAsync: mockSaveProfilePhotoMutateAsync });
    (useAssets.useRemoveProfilePhoto as jest.Mock).mockReturnValue({ mutateAsync: mockRemoveProfilePhotoMutateAsync });
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true, status: 'granted' });
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true, status: 'granted' });
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({ canceled: true, assets: [] });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: true, assets: [] });
    // Reset store to no-profile state
    useSettingsStore.setState({ name: '', sex: null, birth: '', isOnboardingDone: false, isHydrated: true });
  });

  it('renders empty dashboard', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    const { getByText } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => {
      expect(getByText(/Start recording/)).toBeTruthy();
    });
  });

  it('renders stats with profile', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(fullStats);
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: '2023-06-15', isOnboardingDone: true, isHydrated: true });
    const { findByText } = renderWithProviders(<DashboardScreen />);
    expect(await findByText('Luna')).toBeTruthy();
    expect(await findByText('10')).toBeTruthy();
  });

  it('renders boy profile', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    useSettingsStore.setState({ name: 'Miguel', sex: 'boy', birth: '2024-01-01', isOnboardingDone: true, isHydrated: true });
    const { getByText } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => {
      expect(getByText('Miguel')).toBeTruthy();
      expect(getByText('👦')).toBeTruthy();
    });
  });

  it('uses breeze background on home container for boy profile', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    useSettingsStore.setState({ name: 'Miguel', sex: 'boy', birth: '2024-01-01', isOnboardingDone: true, isHydrated: true });
    const { findByTestId } = renderWithProviders(<DashboardScreen />);
    const scroll = await findByTestId('home-scroll');
    const breezeBg = getThemeForSex('boy').colors.background;
    expect(flattenStyle(scroll.props.style).backgroundColor).toBe(breezeBg);
  });

  it('renders without profile', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    const { getByText } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => {
      expect(getByText(/Start recording/)).toBeTruthy();
    });
  });

  it('renders stat cards with testIDs', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(fullStats);
    const { getByTestId } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => {
      expect(getByTestId('stat-total-words').props.children).toBe(10);
      expect(getByTestId('stat-total-variants').props.children).toBe(5);
      expect(getByTestId('stat-words-today').props.children).toBe(2);
      expect(getByTestId('stat-words-week').props.children).toBe(4);
      expect(getByTestId('stat-words-month').props.children).toBe(8);
    });
  });

  it('shows progress frame when totalWords > 0', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(fullStats);
    const { findByTestId } = renderWithProviders(<DashboardScreen />);
    expect(await findByTestId('home-progress-frame')).toBeTruthy();
  });

  it('does not show progress frame when totalWords is 0', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    const { queryByTestId } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => {
      expect(queryByTestId('home-progress-frame')).toBeNull();
    });
  });

  it('pressing progress frame navigates without error', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(fullStats);
    const { findByTestId } = renderWithProviders(<DashboardScreen />);
    const frame = await findByTestId('home-progress-frame');
    expect(() => fireEvent.press(frame)).not.toThrow();
  });

  it('does not show add-word button when totalWords is 0', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    const { queryByTestId } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => {
      expect(queryByTestId('home-add-word-btn')).toBeNull();
    });
  });

  it('shows add-word button when totalWords > 0', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(fullStats);
    const { findByTestId } = renderWithProviders(<DashboardScreen />);
    expect(await findByTestId('home-add-word-btn')).toBeTruthy();
  });

  it('shows add-first-word button in empty state and pressing it opens AddWordModal', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    const { findByTestId } = renderWithProviders(<DashboardScreen />);
    const btn = await findByTestId('home-add-first-word-btn');
    expect(btn).toBeTruthy();
    fireEvent.press(btn);
    expect(await findByTestId('modal-title-new-word')).toBeTruthy();
  });

  it('renders ProfileAvatar with testID when name is set', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: '2023-06-15', isOnboardingDone: true, isHydrated: true });
    const { findByTestId } = renderWithProviders(<DashboardScreen />);
    expect(await findByTestId('home-profile-avatar')).toBeTruthy();
  });

  it('tapping profile avatar without photo opens source picker alert', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: '2023-06-15', isOnboardingDone: true, isHydrated: true });
    const { findByTestId } = renderWithProviders(<DashboardScreen />);
    jest.spyOn(Alert, 'alert');
    fireEvent.press(await findByTestId('home-profile-avatar'));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        expect.any(String),
        undefined,
        expect.arrayContaining([expect.objectContaining({ style: 'cancel' })])
      );
    });
  });

  it('canceling source picker allows opening it again', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: '2023-06-15', isOnboardingDone: true, isHydrated: true });
    const { findByTestId } = renderWithProviders(<DashboardScreen />);
    const avatar = await findByTestId('home-profile-avatar');
    fireEvent.press(avatar);
    await act(async () => {
      pressLastAlertButton('Cancel');
    });
    fireEvent.press(avatar);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledTimes(2);
    });
  });

  it('tapping profile avatar with photo opens photo viewer', async () => {
    const useAssets = require('../../src/hooks/useAssets');
    (useAssets.useProfilePhoto as jest.Mock).mockReturnValue({
      data: { id: 1, uri: 'file:///test.jpg', parent_type: 'profile', parent_id: 1, asset_type: 'photo', file_path: '/test.jpg', mime_type: 'image/jpeg', file_size: 100, created_at: '' },
    });
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: '2023-06-15', isOnboardingDone: true, isHydrated: true });
    const { findByTestId } = renderWithProviders(<DashboardScreen />);
    fireEvent.press(await findByTestId('home-profile-avatar'));
    expect(await findByTestId('home-photo-viewer-close')).toBeTruthy();
    expect(await findByTestId('home-photo-viewer-change')).toBeTruthy();
    expect(await findByTestId('home-photo-viewer-remove')).toBeTruthy();
  });

  it('choosing camera from source picker launches camera and saves photo', async () => {
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///tmp/camera.jpg', mimeType: 'image/jpeg', fileSize: 1234 }],
    });
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: '2023-06-15', isOnboardingDone: true, isHydrated: true });
    const { findByTestId } = renderWithProviders(<DashboardScreen />);

    fireEvent.press(await findByTestId('home-profile-avatar'));
    pressLastAlertButton('Take Photo');

    await waitFor(() => {
      expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
      expect(mockSaveProfilePhotoMutateAsync).toHaveBeenCalledWith({
        sourceUri: 'file:///tmp/camera.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1234,
      });
    });
  });

  it('choosing library from source picker launches image library and saves photo', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///tmp/library.jpg', mimeType: 'image/jpeg', fileSize: 987 }],
    });
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: '2023-06-15', isOnboardingDone: true, isHydrated: true });
    const { findByTestId } = renderWithProviders(<DashboardScreen />);

    fireEvent.press(await findByTestId('home-profile-avatar'));
    pressLastAlertButton('Choose from Library');

    await waitFor(() => {
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      expect(mockSaveProfilePhotoMutateAsync).toHaveBeenCalledWith({
        sourceUri: 'file:///tmp/library.jpg',
        mimeType: 'image/jpeg',
        fileSize: 987,
      });
    });
  });

  it('shows permission alert when camera permission is denied', async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false, status: 'denied' });
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: '2023-06-15', isOnboardingDone: true, isHydrated: true });
    const { findByTestId } = renderWithProviders(<DashboardScreen />);

    fireEvent.press(await findByTestId('home-profile-avatar'));
    pressLastAlertButton('Take Photo');

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledTimes(2);
      expect(mockSaveProfilePhotoMutateAsync).not.toHaveBeenCalled();
    });
  });

  it('shows permission alert when media permission is denied', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false, status: 'denied' });
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: '2023-06-15', isOnboardingDone: true, isHydrated: true });
    const { findByTestId } = renderWithProviders(<DashboardScreen />);

    fireEvent.press(await findByTestId('home-profile-avatar'));
    pressLastAlertButton('Choose from Library');

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledTimes(2);
      expect(mockSaveProfilePhotoMutateAsync).not.toHaveBeenCalled();
    });
  });

  it('change photo button in viewer reopens source picker', async () => {
    const useAssets = require('../../src/hooks/useAssets');
    (useAssets.useProfilePhoto as jest.Mock).mockReturnValue({
      data: { id: 1, uri: 'file:///test.jpg', parent_type: 'profile', parent_id: 1, asset_type: 'photo', file_path: '/test.jpg', mime_type: 'image/jpeg', file_size: 100, created_at: '' },
    });
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: '2023-06-15', isOnboardingDone: true, isHydrated: true });
    const { findByTestId } = renderWithProviders(<DashboardScreen />);

    fireEvent.press(await findByTestId('home-profile-avatar'));
    fireEvent.press(await findByTestId('home-photo-viewer-change'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        expect.any(String),
        undefined,
        expect.arrayContaining([expect.objectContaining({ style: 'cancel' })])
      );
    });
  });

  it('remove photo confirmation calls remove mutate action', async () => {
    const useAssets = require('../../src/hooks/useAssets');
    (useAssets.useProfilePhoto as jest.Mock).mockReturnValue({
      data: { id: 1, uri: 'file:///test.jpg', parent_type: 'profile', parent_id: 1, asset_type: 'photo', file_path: '/test.jpg', mime_type: 'image/jpeg', file_size: 100, created_at: '' },
    });
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: '2023-06-15', isOnboardingDone: true, isHydrated: true });
    const { findByTestId } = renderWithProviders(<DashboardScreen />);

    fireEvent.press(await findByTestId('home-profile-avatar'));
    fireEvent.press(await findByTestId('home-photo-viewer-remove'));
    pressLastAlertButton('Remove photo');

    await waitFor(() => {
      expect(mockRemoveProfilePhotoMutateAsync).toHaveBeenCalledTimes(1);
    });
  });

  it('pressing close button in viewer closes the modal', async () => {
    const useAssets = require('../../src/hooks/useAssets');
    (useAssets.useProfilePhoto as jest.Mock).mockReturnValue({
      data: { id: 1, uri: 'file:///test.jpg', parent_type: 'profile', parent_id: 1, asset_type: 'photo', file_path: '/test.jpg', mime_type: 'image/jpeg', file_size: 100, created_at: '' },
    });
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: '2023-06-15', isOnboardingDone: true, isHydrated: true });
    const { findByTestId, queryByTestId } = renderWithProviders(<DashboardScreen />);

    fireEvent.press(await findByTestId('home-profile-avatar'));
    fireEvent.press(await findByTestId('home-photo-viewer-close'));

    await waitFor(() => {
      expect(queryByTestId('home-photo-viewer-close')).toBeNull();
    });
  });

  it('modal onRequestClose closes the viewer', async () => {
    const useAssets = require('../../src/hooks/useAssets');
    (useAssets.useProfilePhoto as jest.Mock).mockReturnValue({
      data: { id: 1, uri: 'file:///test.jpg', parent_type: 'profile', parent_id: 1, asset_type: 'photo', file_path: '/test.jpg', mime_type: 'image/jpeg', file_size: 100, created_at: '' },
    });
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: '2023-06-15', isOnboardingDone: true, isHydrated: true });
    const { findByTestId, queryByTestId } = renderWithProviders(<DashboardScreen />);

    const avatar = await findByTestId('home-profile-avatar');
    fireEvent.press(avatar);
    fireEvent(await findByTestId('home-photo-viewer'), 'onRequestClose');

    await waitFor(() => {
      expect(queryByTestId('home-photo-viewer-close')).toBeNull();
    });
  });

  it('AddWordModal callbacks close modal and navigate to words tab', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(fullStats);
    const { findByTestId, queryByTestId, UNSAFE_getByType } = renderWithProviders(<DashboardScreen />);

    fireEvent.press(await findByTestId('home-add-word-btn'));
    expect(await findByTestId('modal-title-new-word')).toBeTruthy();

    const modal = UNSAFE_getByType(AddWordModal);
    await act(async () => {
      modal.props.onClose();
    });
    await waitFor(() => {
      expect(queryByTestId('modal-title-new-word')).toBeNull();
    });

    fireEvent.press(await findByTestId('home-add-word-btn'));
    const reopenedModal = UNSAFE_getByType(AddWordModal);
    await act(async () => {
      reopenedModal.props.onDeleted();
      reopenedModal.props.onSave();
    });

    await waitFor(() => {
      expect(queryByTestId('modal-title-new-word')).toBeNull();
    });
  });
});
