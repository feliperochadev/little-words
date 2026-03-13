import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { useSettingsStore } from '../../src/stores/settingsStore';

jest.spyOn(Alert, 'alert');

jest.mock('../../src/database/database', () => {
  const actual = jest.requireActual('../../src/database/database');
  return {
    ...actual,
    getSetting: jest.fn().mockResolvedValue(null),
    setSetting: jest.fn().mockResolvedValue(undefined),
    getCategories: jest.fn().mockResolvedValue([
      { id: 1, name: 'animals', color: '#FF6B9D', emoji: '🐾', created_at: '2024-01-01' },
    ]),
    clearAllData: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock('../../src/utils/csvExport', () => ({
  buildCategoryResolver: jest.fn(() => (name: string) => name),
  buildCSVHeader: jest.fn(() => 'word,category,date,variant'),
  shareCSV: jest.fn().mockResolvedValue({ success: true }),
  saveCSVToDevice: jest.fn().mockResolvedValue({ success: true }),
}));

import SettingsScreen from '../../app/(tabs)/settings';
import * as csvExport from '../../src/utils/csvExport';

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (csvExport.shareCSV as jest.Mock).mockResolvedValue({ success: true });
    (csvExport.saveCSVToDevice as jest.Mock).mockResolvedValue({ success: true });
    const database = require('../../src/database/database');
    (database.getSetting as jest.Mock).mockResolvedValue(null);
    (database.getCategories as jest.Mock).mockResolvedValue([
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

  it('opens import modal', async () => {
    const { findByTestId, findByPlaceholderText } = renderWithProviders(<SettingsScreen />);
    fireEvent.press(await findByTestId('settings-import-btn'));
    expect(await findByPlaceholderText(/mamãe/)).toBeTruthy();
  });

  it('opens add category modal', async () => {
    const { findByText } = renderWithProviders(<SettingsScreen />);
    fireEvent.press(await findByText(/\+ Category/));
    expect(await findByText(/New Category/)).toBeTruthy();
  });

  it('changes language when selecting another locale', async () => {
    const { findByText } = renderWithProviders(<SettingsScreen />);
    fireEvent.press(await findByText('Português'));
    expect(await findByText('English')).toBeTruthy();
  });

  it('handles clear data double confirmation', async () => {
    const database = require('../../src/database/database');
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
      expect(database.clearAllData).toHaveBeenCalled();
    });
  });
});
