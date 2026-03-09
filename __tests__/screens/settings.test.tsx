import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { I18nProvider } from '../../src/i18n/i18n';

jest.spyOn(Alert, 'alert');

jest.mock('../../src/database/database', () => {
  const actual = jest.requireActual('../../src/database/database');
  return {
    ...actual,
    getSetting: jest.fn().mockImplementation((key: string) => {
      if (key === 'child_name') return Promise.resolve('Luna');
      if (key === 'child_sex') return Promise.resolve('girl');
      if (key === 'google_signed_in') return Promise.resolve(null);
      return Promise.resolve(null);
    }),
    setSetting: jest.fn().mockResolvedValue(undefined),
    getCategories: jest.fn().mockResolvedValue([
      { id: 1, name: 'animals', color: '#FF6B9D', emoji: '🐾', created_at: '2024-01-01' },
    ]),
    clearAllData: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock('../../src/utils/googleDrive', () => ({
  isGoogleConnected: jest.fn().mockResolvedValue(false),
  signInWithGoogle: jest.fn().mockResolvedValue({ success: true }),
  signOutGoogle: jest.fn().mockResolvedValue(undefined),
  performSync: jest.fn().mockResolvedValue({ success: true }),
  getGoogleUserEmail: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../src/utils/csvExport', () => ({
  buildCategoryResolver: jest.fn(() => (name: string) => name),
  shareCSV: jest.fn().mockResolvedValue({ success: true }),
  saveCSVToDevice: jest.fn().mockResolvedValue({ success: true }),
}));

import SettingsScreen from '../../app/(tabs)/settings';
import * as csvExport from '../../src/utils/csvExport';
import * as googleDrive from '../../src/utils/googleDrive';

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (googleDrive.isGoogleConnected as jest.Mock).mockResolvedValue(false);
    (googleDrive.signInWithGoogle as jest.Mock).mockResolvedValue({ success: true });
    (googleDrive.signOutGoogle as jest.Mock).mockResolvedValue(undefined);
    (googleDrive.performSync as jest.Mock).mockResolvedValue({ success: true });
    (googleDrive.getGoogleUserEmail as jest.Mock).mockResolvedValue(null);
    (csvExport.shareCSV as jest.Mock).mockResolvedValue({ success: true });
    (csvExport.saveCSVToDevice as jest.Mock).mockResolvedValue({ success: true });
    const database = require('../../src/database/database');
    (database.getSetting as jest.Mock).mockImplementation((key: string) => {
      if (key === 'child_name') return Promise.resolve('Luna');
      if (key === 'child_sex') return Promise.resolve('girl');
      return Promise.resolve(null);
    });
    (database.getCategories as jest.Mock).mockResolvedValue([
      { id: 1, name: 'animals', color: '#FF6B9D', emoji: '🐾', created_at: '2024-01-01' },
    ]);
  });

  it('renders settings title', async () => {
    const { findByText } = render(
      <I18nProvider><SettingsScreen /></I18nProvider>
    );
    expect(await findByText(/Settings/)).toBeTruthy();
  });

  it('renders baby profile', async () => {
    const { findByText } = render(
      <I18nProvider><SettingsScreen /></I18nProvider>
    );
    expect(await findByText(/Luna/)).toBeTruthy();
  });

  it('renders language section', async () => {
    const { findByText } = render(
      <I18nProvider><SettingsScreen /></I18nProvider>
    );
    expect(await findByText('English')).toBeTruthy();
    expect(await findByText('Português')).toBeTruthy();
  });

  it('renders categories section with category', async () => {
    const { findByText } = render(
      <I18nProvider><SettingsScreen /></I18nProvider>
    );
    expect(await findByText('Animals')).toBeTruthy();
  });

  it('renders export section', async () => {
    const { findAllByText } = render(
      <I18nProvider><SettingsScreen /></I18nProvider>
    );
    const exportElements = await findAllByText(/Export/);
    expect(exportElements.length).toBeGreaterThan(0);
  });

  it('renders danger zone', async () => {
    const { findByText } = render(
      <I18nProvider><SettingsScreen /></I18nProvider>
    );
    expect(await findByText(/Danger/)).toBeTruthy();
  });

  it('renders version info', async () => {
    const { findByText } = render(
      <I18nProvider><SettingsScreen /></I18nProvider>
    );
    expect(await findByText(/Version/)).toBeTruthy();
  });

  it('renders import section', async () => {
    const { findAllByText } = render(
      <I18nProvider><SettingsScreen /></I18nProvider>
    );
    const importElements = await findAllByText(/Import/);
    expect(importElements.length).toBeGreaterThan(0);
  });

  it('renders google drive section', async () => {
    const { findAllByText } = render(
      <I18nProvider><SettingsScreen /></I18nProvider>
    );
    const driveElements = await findAllByText(/Google Drive/);
    expect(driveElements.length).toBeGreaterThan(0);
  });

  it('handles share CSV', async () => {
    const { findAllByText } = render(
      <I18nProvider><SettingsScreen /></I18nProvider>
    );
    const shareButtons = await findAllByText(/Share/);
    fireEvent.press(shareButtons[0]);
    await waitFor(() => {
      expect(csvExport.shareCSV).toHaveBeenCalled();
    });
  });

  it('handles save to device', async () => {
    const { findByText } = render(
      <I18nProvider><SettingsScreen /></I18nProvider>
    );
    const saveBtn = await findByText(/Save/);
    fireEvent.press(saveBtn);
    await waitFor(() => {
      expect(csvExport.saveCSVToDevice).toHaveBeenCalled();
    });
  });

  it('handles google sign in', async () => {
    const { findByText } = render(
      <I18nProvider><SettingsScreen /></I18nProvider>
    );
    const connectBtn = await findByText(/Connect/);
    fireEvent.press(connectBtn);
    await waitFor(() => {
      expect(googleDrive.signInWithGoogle).toHaveBeenCalled();
    });
  });

  it('handles delete all data', async () => {
    const { findByText } = render(
      <I18nProvider><SettingsScreen /></I18nProvider>
    );
    const deleteBtn = await findByText(/Delete all/);
    fireEvent.press(deleteBtn);
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  it('renders google drive connected state', async () => {
    (googleDrive.isGoogleConnected as jest.Mock).mockResolvedValue(true);
    (googleDrive.getGoogleUserEmail as jest.Mock).mockResolvedValue('luna@gmail.com');
    const database = require('../../src/database/database');
    (database.getSetting as jest.Mock).mockImplementation((key: string) => {
      if (key === 'child_name') return Promise.resolve('Luna');
      if (key === 'child_sex') return Promise.resolve('girl');
      if (key === 'google_last_sync') return Promise.resolve('2024-06-01T10:00:00Z');
      return Promise.resolve(null);
    });
    const { findByText } = render(
      <I18nProvider><SettingsScreen /></I18nProvider>
    );
    expect(await findByText(/luna@gmail.com/)).toBeTruthy();
    expect(await findByText(/Sync/)).toBeTruthy();
    expect(await findByText(/Disconnect/)).toBeTruthy();
  });

  it('handles sync success', async () => {
    (googleDrive.isGoogleConnected as jest.Mock).mockResolvedValue(true);
    (googleDrive.getGoogleUserEmail as jest.Mock).mockResolvedValue('a@b.com');
    (googleDrive.performSync as jest.Mock).mockResolvedValue({ success: true, lastSync: '2024-07-01' });
    const { findByText } = render(
      <I18nProvider><SettingsScreen /></I18nProvider>
    );
    fireEvent.press(await findByText(/Sync/));
    await waitFor(() => {
      expect(googleDrive.performSync).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  it('handles sync error with expired token', async () => {
    (googleDrive.isGoogleConnected as jest.Mock).mockResolvedValue(true);
    (googleDrive.getGoogleUserEmail as jest.Mock).mockResolvedValue('a@b.com');
    (googleDrive.performSync as jest.Mock).mockResolvedValue({ success: false, error: 'Session expired' });
    const { findByText } = render(
      <I18nProvider><SettingsScreen /></I18nProvider>
    );
    fireEvent.press(await findByText(/Sync/));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  it('handles sign out flow', async () => {
    (googleDrive.isGoogleConnected as jest.Mock).mockResolvedValue(true);
    (googleDrive.getGoogleUserEmail as jest.Mock).mockResolvedValue('a@b.com');
    const { findByText } = render(
      <I18nProvider><SettingsScreen /></I18nProvider>
    );
    fireEvent.press(await findByText(/Disconnect/));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const destructiveBtn = alertCall[2].find((b: any) => b.style === 'destructive');
    await act(async () => { destructiveBtn.onPress(); });
    await waitFor(() => {
      expect(googleDrive.signOutGoogle).toHaveBeenCalled();
    });
  });

  it('handles clear data double confirmation', async () => {
    const database = require('../../src/database/database');
    const { findByText } = render(
      <I18nProvider><SettingsScreen /></I18nProvider>
    );
    fireEvent.press(await findByText(/Delete all/));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledTimes(1));
    // Press first destructive button
    const firstAlert = (Alert.alert as jest.Mock).mock.calls[0];
    const firstDestructive = firstAlert[2].find((b: any) => b.style === 'destructive');
    firstDestructive.onPress();
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledTimes(2));
    // Press second destructive button
    const secondAlert = (Alert.alert as jest.Mock).mock.calls[1];
    const secondDestructive = secondAlert[2].find((b: any) => b.style === 'destructive');
    await act(async () => { secondDestructive.onPress(); });
    await waitFor(() => {
      expect(database.clearAllData).toHaveBeenCalled();
    });
  });

  it('handles share CSV error', async () => {
    (csvExport.shareCSV as jest.Mock).mockResolvedValue({ success: false, error: 'share failed' });
    const { findAllByText } = render(
      <I18nProvider><SettingsScreen /></I18nProvider>
    );
    const shareButtons = await findAllByText(/Share/);
    fireEvent.press(shareButtons[0]);
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  it('handles save to device success', async () => {
    (csvExport.saveCSVToDevice as jest.Mock).mockResolvedValue({ success: true });
    const { findByText } = render(
      <I18nProvider><SettingsScreen /></I18nProvider>
    );
    fireEvent.press(await findByText(/Save/));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  it('handles save to device error', async () => {
    (csvExport.saveCSVToDevice as jest.Mock).mockResolvedValue({ success: false, error: 'disk full' });
    const { findByText } = render(
      <I18nProvider><SettingsScreen /></I18nProvider>
    );
    fireEvent.press(await findByText(/Save/));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  it('handles sign in error', async () => {
    (googleDrive.signInWithGoogle as jest.Mock).mockResolvedValue({ success: false, error: 'network error' });
    const { findByText } = render(
      <I18nProvider><SettingsScreen /></I18nProvider>
    );
    fireEvent.press(await findByText(/Connect/));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  it('opens import modal', async () => {
    const { findAllByText, findByPlaceholderText } = render(
      <I18nProvider><SettingsScreen /></I18nProvider>
    );
    const importBtns = await findAllByText(/Import Words/);
    fireEvent.press(importBtns[importBtns.length - 1]);
    // ImportModal should now be visible - check for its text input placeholder
    expect(await findByPlaceholderText(/mamãe/)).toBeTruthy();
  });

  it('opens category edit modal on category press', async () => {
    const { findByText } = render(
      <I18nProvider><SettingsScreen /></I18nProvider>
    );
    fireEvent.press(await findByText('Animals'));
    // AddCategoryModal should be visible
    expect(await findByText(/Edit Category/)).toBeTruthy();
  });

  it('opens add category modal', async () => {
    const { findByText } = render(
      <I18nProvider><SettingsScreen /></I18nProvider>
    );
    fireEvent.press(await findByText(/\+ Category/));
    expect(await findByText(/New Category/)).toBeTruthy();
  });

  it('renders edit profile button', async () => {
    const { findByText } = render(
      <I18nProvider><SettingsScreen /></I18nProvider>
    );
    const editBtn = await findByText(/Edit/);
    expect(editBtn).toBeTruthy();
    fireEvent.press(editBtn);
  });
});
