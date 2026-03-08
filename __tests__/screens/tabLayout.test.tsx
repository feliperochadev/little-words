import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { I18nProvider } from '../../src/i18n/i18n';
import TabLayout from '../../app/(tabs)/_layout';

jest.mock('../../src/database/database', () => ({
  ...jest.requireActual('../../src/database/database'),
  getSetting: jest.fn().mockResolvedValue(null),
  setSetting: jest.fn().mockResolvedValue(undefined),
}));

describe('TabLayout', () => {
  it('renders without crashing', async () => {
    // TabLayout renders Tabs component which is mocked as a fragment
    const result = render(
      <I18nProvider><TabLayout /></I18nProvider>
    );
    await waitFor(() => {
      // The component renders with mocked Tabs which returns null children
      expect(result).toBeTruthy();
    });
  });
});
