import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import Index from '../../app/index';
import * as db from '../../src/database/database';
import * as googleDrive from '../../src/utils/googleDrive';
import { useRouter } from 'expo-router';

jest.mock('../../src/database/database', () => ({
  ...jest.requireActual('../../src/database/database'),
  initDatabase: jest.fn().mockResolvedValue(undefined),
  getSetting: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../src/utils/googleDrive', () => ({
  isGoogleConnected: jest.fn().mockResolvedValue(false),
  performSync: jest.fn().mockResolvedValue({ success: true }),
  getGoogleUserEmail: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../src/i18n/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, locale: 'en-US', setLocale: jest.fn() }),
}));

describe('Index', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders splash screen', () => {
    const { toJSON } = render(<Index />);
    expect(toJSON()).toBeTruthy();
  });

  it('navigates to onboarding when not done', async () => {
    const replace = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ replace, push: jest.fn(), back: jest.fn() });
    (db.initDatabase as jest.Mock).mockResolvedValue(undefined);
    (db.getSetting as jest.Mock).mockResolvedValue(null);
    render(<Index />);
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/onboarding');
    });
  });

  it('navigates to home when onboarding done', async () => {
    const replace = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ replace, push: jest.fn(), back: jest.fn() });
    (db.initDatabase as jest.Mock).mockResolvedValue(undefined);
    (db.getSetting as jest.Mock).mockResolvedValue('1');
    render(<Index />);
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/(tabs)/home');
    });
  });

  it('calls performSync when google is connected', async () => {
    const replace = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ replace, push: jest.fn(), back: jest.fn() });
    (db.initDatabase as jest.Mock).mockResolvedValue(undefined);
    (db.getSetting as jest.Mock).mockResolvedValue('1');
    (googleDrive.isGoogleConnected as jest.Mock).mockResolvedValue(true);
    render(<Index />);
    await waitFor(() => {
      expect(googleDrive.performSync).toHaveBeenCalled();
    });
  });

  it('catches and swallows performSync errors', async () => {
    const replace = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ replace, push: jest.fn(), back: jest.fn() });
    (db.initDatabase as jest.Mock).mockResolvedValue(undefined);
    (db.getSetting as jest.Mock).mockResolvedValue('1');
    (googleDrive.isGoogleConnected as jest.Mock).mockResolvedValue(true);
    (googleDrive.performSync as jest.Mock).mockRejectedValue(new Error('sync fail'));
    render(<Index />);
    // Should navigate to home without crashing even when sync fails
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/(tabs)/home');
    });
  });
});
