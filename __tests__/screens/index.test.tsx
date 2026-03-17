import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import Index from '../../app/index';
import { useRouter } from 'expo-router';
import * as initModule from '../../src/db/init';
import * as settingsService from '../../src/services/settingsService';

jest.mock('../../src/db/init', () => ({
  initDatabase: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/db/migrator', () => ({
  runMigrations: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/services/settingsService', () => ({
  ...jest.requireActual('../../src/services/settingsService'),
  getSetting: jest.fn().mockResolvedValue(null),
  setSetting: jest.fn().mockResolvedValue(undefined),
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
    (initModule.initDatabase as jest.Mock).mockResolvedValue(undefined);
    (settingsService.getSetting as jest.Mock).mockResolvedValue(null);
    render(<Index />);
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/onboarding');
    });
  });

  it('navigates to home when onboarding done', async () => {
    const replace = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ replace, push: jest.fn(), back: jest.fn() });
    (initModule.initDatabase as jest.Mock).mockResolvedValue(undefined);
    (settingsService.getSetting as jest.Mock).mockResolvedValue('1');
    render(<Index />);
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/(tabs)/home');
    });
  });
});
