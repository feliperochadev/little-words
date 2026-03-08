import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
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
  beforeEach(() => jest.clearAllMocks());

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
});
