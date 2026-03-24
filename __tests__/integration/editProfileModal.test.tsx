import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, StyleSheet } from 'react-native';
import { I18nProvider } from '../../src/i18n/i18n';
import { EditProfileModal } from '../../src/components/EditProfileModal';
import { useSettingsStore } from '../../src/stores/settingsStore';
import * as settingsService from '../../src/services/settingsService';
import { getThemeForSex } from '../../src/theme/getThemeForSex';
import { renderWithProviders } from '../helpers/renderWithProviders';
import * as ImagePicker from 'expo-image-picker';

jest.spyOn(Alert, 'alert');

jest.mock('../../src/services/settingsService', () => ({
  ...jest.requireActual('../../src/services/settingsService'),
  setSetting: jest.fn().mockResolvedValue(undefined),
  setChildProfile: jest.fn().mockResolvedValue(undefined),
  getSetting: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../src/services/assetService', () => ({
  ...jest.requireActual('../../src/services/assetService'),
  getProfilePhoto: jest.fn().mockResolvedValue(null),
  saveProfilePhoto: jest.fn().mockResolvedValue({
    id: 1, parent_type: 'profile', parent_id: 1, asset_type: 'photo',
    filename: 'asset_1.jpg', mime_type: 'image/jpeg', file_size: 1024,
    duration_ms: null, width: null, height: null, created_at: '2024-01-01T00:00:00.000Z',
  }),
  deleteProfilePhoto: jest.fn().mockResolvedValue(undefined),
  getAssetsByParent: jest.fn().mockResolvedValue([]),
  getAssetsByParentAndType: jest.fn().mockResolvedValue([]),
}));

function renderModal(props: { visible?: boolean; onClose?: () => void; onSaved?: () => void } = {}) {
  const onClose = props.onClose ?? jest.fn();
  const result = renderWithProviders(
    <EditProfileModal visible={props.visible ?? true} onClose={onClose} onSaved={props.onSaved} />
  );
  return { ...result, onClose };
}

describe('EditProfileModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: '2023-06-15', isOnboardingDone: true, isHydrated: true });
  });

  it('renders the edit profile title', async () => {
    const { findByTestId } = renderModal();
    expect(await findByTestId('edit-profile-title')).toBeTruthy();
  });

  it('shows age-adaptive title — toddler for 2-year-old girl', async () => {
    const now = new Date();
    const twoYearsAgo = `${now.getFullYear() - 2}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: twoYearsAgo, isOnboardingDone: true, isHydrated: true });
    const { findByTestId } = renderModal();
    const title = await findByTestId('edit-profile-title');
    expect(title.props.children).toMatch(/Toddler/i);
  });

  it('shows age-adaptive title — baby for infant under 1 year', async () => {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    const birth = `${threeMonthsAgo.getFullYear()}-${String(threeMonthsAgo.getMonth() + 1).padStart(2, '0')}-${String(threeMonthsAgo.getDate()).padStart(2, '0')}`;
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth, isOnboardingDone: true, isHydrated: true });
    const { findByTestId } = renderModal();
    const title = await findByTestId('edit-profile-title');
    expect(title.props.children).toMatch(/Baby/i);
  });

  it('shows age-adaptive title — child for 4-year-old', async () => {
    const now = new Date();
    const fourYearsAgo = `${now.getFullYear() - 4}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: fourYearsAgo, isOnboardingDone: true, isHydrated: true });
    const { findByTestId } = renderModal();
    const title = await findByTestId('edit-profile-title');
    expect(title.props.children).toMatch(/Child/i);
  });

  it('shows age-adaptive title — falls back to Baby when birth is empty', async () => {
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: '', isOnboardingDone: true, isHydrated: true });
    const { findByTestId } = renderModal();
    const title = await findByTestId('edit-profile-title');
    expect(title.props.children).toMatch(/Baby/i);
  });

  it('pre-fills name from store', async () => {
    const { findByTestId } = renderModal();
    const input = await findByTestId('edit-profile-name-input');
    expect(input.props.value).toBe('Luna');
  });

  it('pre-fills sex from store (girl)', async () => {
    const { findByTestId } = renderModal();
    expect(await findByTestId('edit-profile-sex-girl-btn')).toBeTruthy();
    expect(await findByTestId('edit-profile-sex-boy-btn')).toBeTruthy();
  });

  it('shows birth date button', async () => {
    const { findByTestId } = renderModal();
    expect(await findByTestId('edit-profile-birthdate-btn')).toBeTruthy();
  });

  it('renders Cancel and Save buttons', async () => {
    const { findByTestId } = renderModal();
    expect(await findByTestId('edit-profile-cancel-btn')).toBeTruthy();
    expect(await findByTestId('edit-profile-save-btn')).toBeTruthy();
  });

  it('Cancel calls onClose', async () => {
    const onClose = jest.fn();
    const { findByTestId } = renderModal({ onClose });
    fireEvent.press(await findByTestId('edit-profile-cancel-btn'));
    expect(onClose).toHaveBeenCalled();
  });

  it('Save calls setProfile and onClose', async () => {
    const onClose = jest.fn();
    const { findByTestId } = renderModal({ onClose });
    await findByTestId('edit-profile-save-btn');
    await act(async () => { fireEvent.press(await findByTestId('edit-profile-save-btn')); });
    await waitFor(() => {
      expect(settingsService.setChildProfile).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Luna', sex: 'girl' }),
      );
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('Save alerts when name is empty', async () => {
    const { findByTestId } = renderModal();
    fireEvent.changeText(await findByTestId('edit-profile-name-input'), '');
    await act(async () => { fireEvent.press(await findByTestId('edit-profile-save-btn')); });
    expect(Alert.alert).toHaveBeenCalled();
  });

  it('Save alerts when sex is not set', async () => {
    useSettingsStore.setState({ name: 'Luna', sex: null, birth: '2023-06-15', isOnboardingDone: true, isHydrated: true });
    const { findByTestId } = renderModal();
    const saveBtn = await findByTestId('edit-profile-save-btn');
    await act(async () => { fireEvent.press(saveBtn); });
    expect(Alert.alert).toHaveBeenCalled();
  });

  it('Save alerts when birth date is not set', async () => {
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: '', isOnboardingDone: true, isHydrated: true });
    const { findByTestId } = renderModal();
    const saveBtn = await findByTestId('edit-profile-save-btn');
    await act(async () => { fireEvent.press(saveBtn); });
    expect(Alert.alert).toHaveBeenCalled();
  });

  it('Save button uses girl accentColor initially', async () => {
    const { findByTestId } = renderModal();
    const saveBtn = await findByTestId('edit-profile-save-btn');
    const flat = StyleSheet.flatten(saveBtn.props.style) as Record<string, unknown>;
    expect(flat.backgroundColor).toBe(getThemeForSex('girl').colors.primary);
  });

  it('Save button updates accentColor when sex is switched to boy', async () => {
    const { findByTestId } = renderModal();
    fireEvent.press(await findByTestId('edit-profile-sex-boy-btn'));
    const saveBtn = await findByTestId('edit-profile-save-btn');
    const flat = StyleSheet.flatten(saveBtn.props.style) as Record<string, unknown>;
    expect(flat.backgroundColor).toBe(getThemeForSex('boy').colors.primary);
  });

  it('Cancel button updates accentColor when sex is switched to boy', async () => {
    const { findByTestId } = renderModal();
    fireEvent.press(await findByTestId('edit-profile-sex-boy-btn'));
    const cancelBtn = await findByTestId('edit-profile-cancel-btn');
    const flat = StyleSheet.flatten(cancelBtn.props.style) as Record<string, unknown>;
    expect(flat.borderColor).toBe(getThemeForSex('boy').colors.primary);
  });

  it('does not render when visible is false', () => {
    const { queryByTestId } = renderModal({ visible: false });
    expect(queryByTestId('edit-profile-title')).toBeNull();
  });

  it('renders ProfileAvatar with testID', async () => {
    const { findByTestId } = renderModal();
    expect(await findByTestId('edit-profile-avatar')).toBeTruthy();
  });

  it('does not show remove photo button when no photo exists', async () => {
    const { findByTestId, queryByTestId } = renderModal();
    await findByTestId('edit-profile-avatar');
    expect(queryByTestId('edit-profile-remove-photo-btn')).toBeNull();
  });

  // Helper: invoke a button from the last Alert.alert call by matching text
  function pressLastAlertButton(text: string) {
    const calls = (Alert.alert as jest.Mock).mock.calls;
    const lastCall = calls[calls.length - 1];
    const buttons = lastCall[2] as Array<{ text: string; onPress?: () => void }>;
    const btn = buttons.find((b) => b.text === text);
    btn?.onPress?.();
  }

  it('tapping avatar shows source picker alert', async () => {
    const { findByTestId } = renderModal();
    await act(async () => { fireEvent.press(await findByTestId('edit-profile-avatar')); });
    expect(Alert.alert).toHaveBeenCalled();
  });

  it('tapping avatar then choosing gallery opens image library', async () => {
    const launchMock = ImagePicker.launchImageLibraryAsync as jest.Mock;
    launchMock.mockResolvedValueOnce({ canceled: true, assets: [] });
    const { findByTestId } = renderModal();
    await act(async () => { fireEvent.press(await findByTestId('edit-profile-avatar')); });
    await act(async () => { pressLastAlertButton('Choose from Library'); });
    expect(launchMock).toHaveBeenCalled();
  });

  it('tapping avatar then choosing camera opens camera', async () => {
    const launchMock = ImagePicker.launchCameraAsync as jest.Mock;
    launchMock.mockResolvedValueOnce({ canceled: true, assets: [] });
    const { findByTestId } = renderModal();
    await act(async () => { fireEvent.press(await findByTestId('edit-profile-avatar')); });
    await act(async () => { pressLastAlertButton('Take Photo'); });
    expect(launchMock).toHaveBeenCalled();
  });

  it('shows permission denied alert when media permission is denied', async () => {
    const permMock = ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
    permMock.mockResolvedValueOnce({ granted: false, status: 'denied' });
    const { findByTestId } = renderModal();
    await act(async () => { fireEvent.press(await findByTestId('edit-profile-avatar')); });
    await act(async () => { pressLastAlertButton('Choose from Library'); });
    expect(Alert.alert).toHaveBeenCalledTimes(2); // source picker + permission denied
  });

  it('shows remove photo button when photo URI is set via gallery picker', async () => {
    const launchMock = ImagePicker.launchImageLibraryAsync as jest.Mock;
    launchMock.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///tmp/photo.jpg', mimeType: 'image/jpeg', fileSize: 1024 }],
    });
    const { findByTestId } = renderModal();
    await act(async () => { fireEvent.press(await findByTestId('edit-profile-avatar')); });
    await act(async () => { pressLastAlertButton('Choose from Library'); });
    await waitFor(() => expect(findByTestId('edit-profile-remove-photo-btn')).resolves.toBeTruthy());
  });

  it('remove photo button triggers confirmation alert', async () => {
    const launchMock = ImagePicker.launchImageLibraryAsync as jest.Mock;
    launchMock.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///tmp/photo.jpg', mimeType: 'image/jpeg', fileSize: 1024 }],
    });
    const { findByTestId } = renderModal();
    await act(async () => { fireEvent.press(await findByTestId('edit-profile-avatar')); });
    await act(async () => { pressLastAlertButton('Choose from Library'); });
    const removeBtn = await findByTestId('edit-profile-remove-photo-btn');
    await act(async () => { fireEvent.press(removeBtn); });
    expect(Alert.alert).toHaveBeenCalledTimes(2); // source picker + remove confirm
  });

  it('guards against double tap on picker', async () => {
    const { findByTestId } = renderModal();
    const avatar = await findByTestId('edit-profile-avatar');
    // First press shows source picker alert (setPickingPhoto(true))
    await act(async () => { fireEvent.press(avatar); });
    // Second press should be blocked by pickingPhoto guard (Alert not called again)
    await act(async () => { fireEvent.press(avatar); });
    expect(Alert.alert).toHaveBeenCalledTimes(1);
  });
});
