import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import RootLayout from '../../app/_layout';
import * as db from '../../src/database/database';

jest.mock('../../src/database/database', () => ({
  ...jest.requireActual('../../src/database/database'),
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
