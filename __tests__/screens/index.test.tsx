import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import Index from '../../app/index';
import * as db from '../../src/database/database';
import { useRouter } from 'expo-router';

jest.mock('../../src/database/database', () => ({
  ...jest.requireActual('../../src/database/database'),
  initDatabase: jest.fn().mockResolvedValue(undefined),
  getSetting: jest.fn().mockResolvedValue(null),
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
});
