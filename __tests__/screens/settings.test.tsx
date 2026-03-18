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

jest.mock('../../src/utils/csvExport', () => ({
  buildCategoryResolver: jest.fn(() => (name: string) => name),
  buildCSVHeader: jest.fn(() => 'word,category,date,variant'),
  shareCSV: jest.fn().mockResolvedValue({ success: true }),
  saveCSVToDevice: jest.fn().mockResolvedValue({ success: true }),
}));

import SettingsScreen from '../../app/(tabs)/settings';
import * as csvExport from '../../src/utils/csvExport';
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
    const { findAllByText } = renderWithProviders(<SettingsScreen />);
    const shareButtons = await findAllByText(/Share/);
    fireEvent.press(shareButtons[0]);
    await waitFor(() => {
      expect(csvExport.shareCSV).toHaveBeenCalled();
    });
  });

  it('shows alert when share fails', async () => {
    (csvExport.shareCSV as jest.Mock).mockResolvedValue({ success: false, error: 'share failed' });
    const { findAllByText } = renderWithProviders(<SettingsScreen />);
    const shareButtons = await findAllByText(/Share/);
    fireEvent.press(shareButtons[0]);
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  it('handles save to device success', async () => {
    const { findByText } = renderWithProviders(<SettingsScreen />);
    fireEvent.press(await findByText(/Save/));
    await waitFor(() => {
      expect(csvExport.saveCSVToDevice).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  it('does not alert when save to device is cancelled', async () => {
    (csvExport.saveCSVToDevice as jest.Mock).mockResolvedValue({ success: false, error: 'cancelled' });
    const { findByText } = renderWithProviders(<SettingsScreen />);
    fireEvent.press(await findByText(/Save/));
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
    const { findByTestId, findByPlaceholderText } = renderWithProviders(<SettingsScreen />);
    fireEvent.press(await findByTestId('settings-import-btn'));
    expect(await findByPlaceholderText(/mamãe/)).toBeTruthy();
  });

  it('closes import modal via onClose', async () => {
    const { findByTestId, queryByPlaceholderText } = renderWithProviders(<SettingsScreen />);
    fireEvent.press(await findByTestId('settings-import-btn'));
    const closeBtn = await findByTestId('import-close-btn');
    fireEvent.press(closeBtn);
    await waitFor(() => {
      expect(queryByPlaceholderText(/mamãe/)).toBeNull();
    });
  });

  it('opens add category modal', async () => {
    const { findByText } = renderWithProviders(<SettingsScreen />);
    fireEvent.press(await findByText(/\+ Category/));
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
    const { findByText, queryByText } = renderWithProviders(<SettingsScreen />);
    fireEvent.press(await findByText(/\+ Category/));
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

  it('renders boy emoji in profile name row', async () => {
    useSettingsStore.setState({ name: 'Leo', sex: 'boy', birth: '', isOnboardingDone: true, isHydrated: true });
    const { findByTestId } = renderWithProviders(<SettingsScreen />);
    const nameEl = await findByTestId('settings-profile-name');
    const children = nameEl.props.children;
    const text = Array.isArray(children) ? children.join('') : String(children);
    expect(text).toContain('👦');
    expect(text).toContain('Leo');
  });

  it('renders neutral emoji when sex is null', async () => {
    useSettingsStore.setState({ name: 'Baby', sex: null, birth: '', isOnboardingDone: true, isHydrated: true });
    const { findByTestId } = renderWithProviders(<SettingsScreen />);
    const nameEl = await findByTestId('settings-profile-name');
    const children = nameEl.props.children;
    const text = Array.isArray(children) ? children.join('') : String(children);
    expect(text).toContain('👶');
    expect(text).toContain('Baby');
  });

  it('renders girl emoji when sex is girl', async () => {
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: '', isOnboardingDone: true, isHydrated: true });
    const { findByTestId } = renderWithProviders(<SettingsScreen />);
    const nameEl = await findByTestId('settings-profile-name');
    const children = nameEl.props.children;
    const text = Array.isArray(children) ? children.join('') : String(children);
    expect(text).toContain('👧');
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
