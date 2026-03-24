import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { useSettingsStore } from '../../src/stores/settingsStore';

jest.spyOn(Alert, 'alert');

jest.mock('../../src/services/settingsService', () => ({
  ...jest.requireActual('../../src/services/settingsService'),
  getSetting: jest.fn().mockResolvedValue(null),
  setSetting: jest.fn().mockResolvedValue(undefined),
  clearAllData: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/services/categoryService', () => ({
  ...jest.requireActual('../../src/services/categoryService'),
  getCategories: jest.fn().mockResolvedValue([
    { id: 1, name: 'animals', color: '#FF6B9D', emoji: '🐾', created_at: '2024-01-01' },
  ]),
}));

jest.mock('../../src/services/assetService', () => ({
  ...jest.requireActual('../../src/services/assetService'),
  getProfilePhoto: jest.fn().mockResolvedValue(null),
  getAssetsByParent: jest.fn().mockResolvedValue([]),
  getAssetsByParentAndType: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../src/utils/csvExport', () => ({
  buildCategoryResolver: jest.fn(() => (name: string) => name),
  buildCSVHeader: jest.fn(() => 'word,category,date,variant'),
  shareCSV: jest.fn().mockResolvedValue({ success: true }),
  saveCSVToDevice: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../../src/utils/backupExport', () => ({
  shareFullBackup: jest.fn().mockResolvedValue({ success: true }),
  saveFullBackupToDevice: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../../src/services/notificationService', () => ({
  isNotificationsEnabled: jest.fn().mockResolvedValue(false),
  cancelAllNotifications: jest.fn().mockResolvedValue(undefined),
  scheduleAll: jest.fn().mockResolvedValue(undefined),
  getPermissionStatus: jest.fn().mockResolvedValue({ granted: false, canAskAgain: true }),
}));

jest.mock('../../src/repositories/notificationRepository', () => ({
  setNotificationState: jest.fn().mockResolvedValue(undefined),
  getNotificationState: jest.fn().mockResolvedValue(null),
}));

import SettingsScreen from '../../app/(tabs)/settings';
import * as csvExport from '../../src/utils/csvExport';
import * as backupExport from '../../src/utils/backupExport';
import * as settingsService from '../../src/services/settingsService';
import * as categoryService from '../../src/services/categoryService';
import { getThemeForSex } from '../../src/theme/getThemeForSex';
import { withOpacity } from '../../src/utils/colorHelpers';

function flattenStyle(style: unknown): Record<string, unknown> {
  return Array.isArray(style) ? Object.assign({}, ...style) : (style as Record<string, unknown> ?? {});
}

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (csvExport.shareCSV as jest.Mock).mockResolvedValue({ success: true });
    (csvExport.saveCSVToDevice as jest.Mock).mockResolvedValue({ success: true });
    (settingsService.getSetting as jest.Mock).mockResolvedValue(null);
    (categoryService.getCategories as jest.Mock).mockResolvedValue([
      { id: 1, name: 'animals', color: '#FF6B9D', emoji: '🐾', created_at: '2024-01-01' },
    ]);
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: '', isOnboardingDone: true, isHydrated: true });
  });

  it('renders key settings sections', async () => {
    const { findByText, findByTestId } = renderWithProviders(<SettingsScreen />);
    expect(await findByText(/Settings/)).toBeTruthy();
    expect(await findByTestId('settings-categories-title')).toBeTruthy();
    expect(await findByTestId('settings-import-title')).toBeTruthy();
    expect(await findByTestId('settings-export-title')).toBeTruthy();
    expect(await findByText(/Danger/)).toBeTruthy();
  });

  it('renders semantic settings/import/export icons', async () => {
    const { findByTestId } = renderWithProviders(<SettingsScreen />);
    const titleIcon = await findByTestId('settings-title-icon');
    const importIcon = await findByTestId('settings-import-icon');
    const exportIcon = await findByTestId('settings-export-icon');
    expect(titleIcon.props.name).toBe('settings-outline');
    expect(importIcon.props.name).toBe('cloud-download-outline');
    expect(exportIcon.props.name).toBe('cloud-upload-outline');
  });

  it('uses breeze primary-tinted edit profile button background for boy profile', async () => {
    useSettingsStore.setState({ name: 'Leo', sex: 'boy', birth: '', isOnboardingDone: true, isHydrated: true });
    const { findByTestId } = renderWithProviders(<SettingsScreen />);
    const editBtn = await findByTestId('settings-edit-profile-btn');
    const style = flattenStyle(editBtn.props.style);
    expect(style.backgroundColor).toBe(withOpacity(getThemeForSex('boy').colors.primary, '15'));
  });

  it('uses breeze primary background on import and save buttons in boy profile', async () => {
    useSettingsStore.setState({ name: 'Leo', sex: 'boy', birth: '', isOnboardingDone: true, isHydrated: true });
    const { findByTestId } = renderWithProviders(<SettingsScreen />);
    const importStyle = flattenStyle((await findByTestId('settings-import-btn')).props.style);
    const saveStyle = flattenStyle((await findByTestId('settings-save-btn')).props.style);
    const breeze = getThemeForSex('boy').colors;
    expect(importStyle.backgroundColor).toBe(breeze.primary);
    expect(saveStyle.backgroundColor).toBe(breeze.primary);
  });

  it('uses breeze primary border on share outline button in boy profile', async () => {
    useSettingsStore.setState({ name: 'Leo', sex: 'boy', birth: '', isOnboardingDone: true, isHydrated: true });
    const { findByTestId } = renderWithProviders(<SettingsScreen />);
    const shareStyle = flattenStyle((await findByTestId('settings-share-btn')).props.style);
    expect(shareStyle.borderColor).toBe(getThemeForSex('boy').colors.primary);
  });

  it('renders semantic import/save/share button icons', async () => {
    const { findByTestId } = renderWithProviders(<SettingsScreen />);
    expect((await findByTestId('settings-import-btn-icon')).props.name).toBe('download-outline');
    expect((await findByTestId('settings-save-btn-icon')).props.name).toBe('save-outline');
    expect((await findByTestId('settings-share-btn-icon')).props.name).toBe('share-social-outline');
  });

  it('does not render the removed Google Drive section', async () => {
    const { findByText, queryByText } = renderWithProviders(<SettingsScreen />);
    await findByText(/Settings/);
    expect(queryByText(/Google Drive/)).toBeNull();
  });

  it('handles share CSV', async () => {
    const { findByTestId } = renderWithProviders(<SettingsScreen />);
    await act(async () => { fireEvent.press(await findByTestId('settings-export-mode-csv')); });
    await act(async () => { fireEvent.press(await findByTestId('settings-share-btn')); });
    await waitFor(() => {
      expect(csvExport.shareCSV).toHaveBeenCalled();
    });
  });

  it('shows alert when share fails', async () => {
    (csvExport.shareCSV as jest.Mock).mockResolvedValue({ success: false, error: 'share failed' });
    const { findByTestId } = renderWithProviders(<SettingsScreen />);
    await act(async () => { fireEvent.press(await findByTestId('settings-export-mode-csv')); });
    await act(async () => { fireEvent.press(await findByTestId('settings-share-btn')); });
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  it('handles save to device success', async () => {
    const { findByTestId } = renderWithProviders(<SettingsScreen />);
    await act(async () => { fireEvent.press(await findByTestId('settings-export-mode-csv')); });
    await act(async () => { fireEvent.press(await findByTestId('settings-save-btn')); });
    await waitFor(() => {
      expect(csvExport.saveCSVToDevice).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  it('does not alert when save to device is cancelled', async () => {
    (csvExport.saveCSVToDevice as jest.Mock).mockResolvedValue({ success: false, error: 'cancelled' });
    const { findByTestId } = renderWithProviders(<SettingsScreen />);
    await act(async () => { fireEvent.press(await findByTestId('settings-export-mode-csv')); });
    await act(async () => { fireEvent.press(await findByTestId('settings-save-btn')); });
    await waitFor(() => {
      expect(csvExport.saveCSVToDevice).toHaveBeenCalled();
    });
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('shows alert when save to device fails with non-cancelled error', async () => {
    (csvExport.saveCSVToDevice as jest.Mock).mockResolvedValue({ success: false, error: 'disk full' });
    const { findByText } = renderWithProviders(<SettingsScreen />);
    fireEvent.press(await findByText(/Save/));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  it('opens import modal', async () => {
    const { findByTestId } = renderWithProviders(<SettingsScreen />);
    fireEvent.press(await findByTestId('settings-import-btn'));
    expect(await findByTestId('import-zip-pick-btn')).toBeTruthy();
  });

  it('closes import modal via onClose', async () => {
    const { findByTestId, queryByTestId } = renderWithProviders(<SettingsScreen />);
    fireEvent.press(await findByTestId('settings-import-btn'));
    const closeBtn = await findByTestId('import-close-btn');
    fireEvent.press(closeBtn);
    await waitFor(() => {
      expect(queryByTestId('import-text-input')).toBeNull();
    });
  });

  it('opens add category modal', async () => {
    const { findByText, findByTestId } = renderWithProviders(<SettingsScreen />);
    fireEvent.press(await findByTestId('settings-add-category-btn'));
    expect(await findByText(/New Category/)).toBeTruthy();
  });

  it('opens edit category modal when tapping a category row', async () => {
    const { findByText } = renderWithProviders(<SettingsScreen />);
    await findByText(/Settings/);
    const categoryRow = await findByText('Animals');
    fireEvent.press(categoryRow);
    expect(await findByText(/Edit Category/)).toBeTruthy();
  });

  it('closes add category modal via onClose', async () => {
    const { findByText, queryByText, findByTestId } = renderWithProviders(<SettingsScreen />);
    fireEvent.press(await findByTestId('settings-add-category-btn'));
    await findByText(/New Category/);
    const cancelBtn = await findByText(/Cancel/);
    fireEvent.press(cancelBtn);
    await waitFor(() => {
      expect(queryByText(/New Category/)).toBeNull();
    });
  });

  it('changes language when selecting another locale', async () => {
    const { findByText } = renderWithProviders(<SettingsScreen />);
    fireEvent.press(await findByText('Português'));
    expect(await findByText('English')).toBeTruthy();
  });

  it('renders boy avatar in profile card', async () => {
    useSettingsStore.setState({ name: 'Leo', sex: 'boy', birth: '', isOnboardingDone: true, isHydrated: true });
    const { findByTestId, getByText } = renderWithProviders(<SettingsScreen />);
    // testID is on the ProfileAvatar wrapper View — just verify it renders
    expect(await findByTestId('settings-profile-emoji')).toBeTruthy();
    // Emoji fallback text should be present in the tree
    expect(getByText('👦')).toBeTruthy();
    const nameEl = await findByTestId('settings-profile-name');
    const nameText = Array.isArray(nameEl.props.children) ? nameEl.props.children.join('') : String(nameEl.props.children);
    expect(nameText).toContain('Leo');
  });

  it('renders neutral emoji when sex is null', async () => {
    useSettingsStore.setState({ name: 'Baby', sex: null, birth: '', isOnboardingDone: true, isHydrated: true });
    const { findByTestId, getByText } = renderWithProviders(<SettingsScreen />);
    expect(await findByTestId('settings-profile-emoji')).toBeTruthy();
    expect(getByText('👶')).toBeTruthy();
    const nameEl = await findByTestId('settings-profile-name');
    const nameText = Array.isArray(nameEl.props.children) ? nameEl.props.children.join('') : String(nameEl.props.children);
    expect(nameText).toContain('Baby');
  });

  it('renders girl avatar when sex is girl', async () => {
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: '', isOnboardingDone: true, isHydrated: true });
    const { findByTestId, getByText } = renderWithProviders(<SettingsScreen />);
    expect(await findByTestId('settings-profile-emoji')).toBeTruthy();
    expect(getByText('👧')).toBeTruthy();
  });

  it('renders birth date when birth is set', async () => {
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: '2023-06-15', isOnboardingDone: true, isHydrated: true });
    const { findByTestId } = renderWithProviders(<SettingsScreen />);
    expect(await findByTestId('settings-profile-birth')).toBeTruthy();
  });

  it('does not render birth date element when birth is empty', async () => {
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: '', isOnboardingDone: true, isHydrated: true });
    const { queryByTestId, findByTestId } = renderWithProviders(<SettingsScreen />);
    await findByTestId('settings-profile-name');
    expect(queryByTestId('settings-profile-birth')).toBeNull();
  });

  it('renders combined birth date and age line when birth is set', async () => {
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: '2023-06-15', isOnboardingDone: true, isHydrated: true });
    const { findByTestId } = renderWithProviders(<SettingsScreen />);
    const birthEl = await findByTestId('settings-profile-birth');
    const text = String(birthEl.props.children ?? '');
    expect(text).toMatch(/15\/06\/2023/);
  });

  it('renders no profile message when name is empty', async () => {
    useSettingsStore.setState({ name: '', sex: undefined, birth: '', isOnboardingDone: true, isHydrated: true });
    const { findByText } = renderWithProviders(<SettingsScreen />);
    expect(await findByText(/no profile/i)).toBeTruthy();
  });

  it('opens edit profile modal when edit profile button is pressed', async () => {
    const { findByTestId } = renderWithProviders(<SettingsScreen />);
    fireEvent.press(await findByTestId('settings-edit-profile-btn'));
    expect(await findByTestId('edit-profile-title')).toBeTruthy();
  });

  // ── Export mode selector ────────────────────────────────────────────────────
  it('renders export mode selector cards', async () => {
    const { findByTestId } = renderWithProviders(<SettingsScreen />);
    expect(await findByTestId('settings-export-mode-csv')).toBeTruthy();
    expect(await findByTestId('settings-export-mode-zip')).toBeTruthy();
  });

  it('defaults to ZIP export mode', async () => {
    const { findByTestId } = renderWithProviders(<SettingsScreen />);
    await act(async () => { fireEvent.press(await findByTestId('settings-share-btn')); });
    await waitFor(() => {
      expect(backupExport.shareFullBackup).toHaveBeenCalled();
      expect(csvExport.shareCSV).not.toHaveBeenCalled();
    });
  });

  it('switches to ZIP mode and calls shareFullBackup on share', async () => {
    (backupExport.shareFullBackup as jest.Mock).mockResolvedValue({ success: true });
    const { findByTestId } = renderWithProviders(<SettingsScreen />);
    await act(async () => { fireEvent.press(await findByTestId('settings-export-mode-zip')); });
    await act(async () => { fireEvent.press(await findByTestId('settings-share-btn')); });
    await waitFor(() => {
      expect(backupExport.shareFullBackup).toHaveBeenCalled();
      expect(csvExport.shareCSV).not.toHaveBeenCalled();
    });
  });

  it('switches to ZIP mode and calls saveFullBackupToDevice on save', async () => {
    (backupExport.saveFullBackupToDevice as jest.Mock).mockResolvedValue({ success: true });
    const { findByTestId } = renderWithProviders(<SettingsScreen />);
    await act(async () => { fireEvent.press(await findByTestId('settings-export-mode-zip')); });
    await act(async () => { fireEvent.press(await findByTestId('settings-save-btn')); });
    await waitFor(() => {
      expect(backupExport.saveFullBackupToDevice).toHaveBeenCalled();
      expect(csvExport.saveCSVToDevice).not.toHaveBeenCalled();
    });
  });

  it('shows alert when ZIP share fails', async () => {
    (backupExport.shareFullBackup as jest.Mock).mockResolvedValue({ success: false, error: 'zip error' });
    const { findByTestId } = renderWithProviders(<SettingsScreen />);
    await act(async () => { fireEvent.press(await findByTestId('settings-export-mode-zip')); });
    await act(async () => { fireEvent.press(await findByTestId('settings-share-btn')); });
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('zip error'));
    });
  });

  it('shows success alert when ZIP saved to device', async () => {
    (backupExport.saveFullBackupToDevice as jest.Mock).mockResolvedValue({ success: true });
    const { findByTestId } = renderWithProviders(<SettingsScreen />);
    await act(async () => { fireEvent.press(await findByTestId('settings-export-mode-zip')); });
    await act(async () => { fireEvent.press(await findByTestId('settings-save-btn')); });
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        expect.stringContaining('✅'),
        expect.any(String),
      );
    });
  });

  it('does not alert when ZIP save is cancelled', async () => {
    (backupExport.saveFullBackupToDevice as jest.Mock).mockResolvedValue({ success: false, error: 'cancelled' });
    const { findByTestId } = renderWithProviders(<SettingsScreen />);
    await act(async () => { fireEvent.press(await findByTestId('settings-export-mode-zip')); });
    await act(async () => { fireEvent.press(await findByTestId('settings-save-btn')); });
    await waitFor(() => {
      expect(Alert.alert).not.toHaveBeenCalled();
    });
  });

  // ── Notifications section ───────────────────────────────────────────────────
  it('renders notifications section', async () => {
    const { findByTestId } = renderWithProviders(<SettingsScreen />);
    expect(await findByTestId('settings-notifications-title')).toBeTruthy();
    expect(await findByTestId('settings-notifications-toggle')).toBeTruthy();
  });

  it('shows disabled hint when notifications are off', async () => {
    const { findByTestId } = renderWithProviders(<SettingsScreen />);
    expect(await findByTestId('settings-notifications-hint')).toBeTruthy();
  });

  it('calls setNotificationState and cancelAllNotifications when toggling off', async () => {
    const { isNotificationsEnabled } = require('../../src/services/notificationService');
    const { setNotificationState } = require('../../src/repositories/notificationRepository');
    const { cancelAllNotifications } = require('../../src/services/notificationService');
    (isNotificationsEnabled as jest.Mock).mockResolvedValueOnce(true);
    const { findByTestId } = renderWithProviders(<SettingsScreen />);
    const toggle = await findByTestId('settings-notifications-toggle');
    await act(async () => { fireEvent(toggle, 'valueChange', false); });
    await waitFor(() => {
      expect(setNotificationState).toHaveBeenCalledWith('notifications_enabled', '0');
      expect(cancelAllNotifications).toHaveBeenCalled();
    });
  });

  it('calls setNotificationState and scheduleAll when toggling on', async () => {
    const { setNotificationState } = require('../../src/repositories/notificationRepository');
    const { scheduleAll } = require('../../src/services/notificationService');
    const { findByTestId } = renderWithProviders(<SettingsScreen />);
    const toggle = await findByTestId('settings-notifications-toggle');
    await act(async () => { fireEvent(toggle, 'valueChange', true); });
    await waitFor(() => {
      expect(setNotificationState).toHaveBeenCalledWith('notifications_enabled', '1');
      expect(scheduleAll).toHaveBeenCalled();
    });
  });

  it('records last_backup_date when ZIP share succeeds', async () => {
    const { setNotificationState } = require('../../src/repositories/notificationRepository');
    (require('../../src/utils/backupExport').shareFullBackup as jest.Mock).mockResolvedValue({ success: true });
    const { findByTestId } = renderWithProviders(<SettingsScreen />);
    await act(async () => { fireEvent.press(await findByTestId('settings-share-btn')); });
    await waitFor(() => {
      expect(setNotificationState).toHaveBeenCalledWith('last_backup_date', expect.any(String));
    });
  });

  it('records last_backup_date when ZIP save to device succeeds', async () => {
    const { setNotificationState } = require('../../src/repositories/notificationRepository');
    (require('../../src/utils/backupExport').saveFullBackupToDevice as jest.Mock).mockResolvedValue({ success: true });
    const { findByTestId } = renderWithProviders(<SettingsScreen />);
    await act(async () => { fireEvent.press(await findByTestId('settings-save-btn')); });
    await waitFor(() => {
      expect(setNotificationState).toHaveBeenCalledWith('last_backup_date', expect.any(String));
    });
  });

  it('does NOT record last_backup_date when ZIP share fails', async () => {
    const { setNotificationState } = require('../../src/repositories/notificationRepository');
    (require('../../src/utils/backupExport').shareFullBackup as jest.Mock).mockResolvedValue({ success: false, error: 'oops' });
    const { findByTestId } = renderWithProviders(<SettingsScreen />);
    await act(async () => { fireEvent.press(await findByTestId('settings-share-btn')); });
    await waitFor(() => { expect(Alert.alert).toHaveBeenCalled(); });
    expect(setNotificationState).not.toHaveBeenCalledWith('last_backup_date', expect.any(String));
  });

  it('handles clear data double confirmation', async () => {
    const { findByTestId } = renderWithProviders(<SettingsScreen />);
    fireEvent.press(await findByTestId('settings-delete-all-btn'));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledTimes(1));

    const firstAlert = (Alert.alert as jest.Mock).mock.calls[0];
    const firstDestructive = firstAlert[2].find((b: { style?: string }) => b.style === 'destructive');
    firstDestructive.onPress();
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledTimes(2));

    const secondAlert = (Alert.alert as jest.Mock).mock.calls[1];
    const secondDestructive = secondAlert[2].find((b: { style?: string }) => b.style === 'destructive');
    await act(async () => { secondDestructive.onPress(); });

    await waitFor(() => {
      expect(settingsService.clearAllData).toHaveBeenCalled();
    });
  });
});
