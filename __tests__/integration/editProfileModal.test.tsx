import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, StyleSheet } from 'react-native';
import { I18nProvider } from '../../src/i18n/i18n';
import { EditProfileModal } from '../../src/components/EditProfileModal';
import { useSettingsStore } from '../../src/stores/settingsStore';
import * as settingsService from '../../src/services/settingsService';
import { getThemeForSex } from '../../src/theme/getThemeForSex';

jest.spyOn(Alert, 'alert');

jest.mock('../../src/services/settingsService', () => ({
  ...jest.requireActual('../../src/services/settingsService'),
  setSetting: jest.fn().mockResolvedValue(undefined),
  setChildProfile: jest.fn().mockResolvedValue(undefined),
  getSetting: jest.fn().mockResolvedValue(null),
}));

function renderModal(props: { visible?: boolean; onClose?: () => void; onSaved?: () => void } = {}) {
  const onClose = props.onClose ?? jest.fn();
  const result = render(
    <I18nProvider>
      <EditProfileModal visible={props.visible ?? true} onClose={onClose} onSaved={props.onSaved} />
    </I18nProvider>
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
});
