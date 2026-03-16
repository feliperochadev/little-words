import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import RootLayout from '../../app/_layout';

jest.mock('../../src/services/settingsService', () => ({
  ...jest.requireActual('../../src/services/settingsService'),
  getSetting: jest.fn().mockResolvedValue(null),
  setSetting: jest.fn().mockResolvedValue(undefined),
}));

describe('RootLayout', () => {
  it('renders without crashing', async () => {
    const { toJSON } = render(<RootLayout />);
    await waitFor(() => {
      expect(toJSON()).toBeTruthy();
    });
  });
});
