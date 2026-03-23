import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../helpers/renderWithProviders';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('../../src/services/settingsService', () => ({
  ...jest.requireActual('../../src/services/settingsService'),
  getSetting: jest.fn().mockResolvedValue(null),
}));

import MoreScreen from '../../app/(tabs)/more';

describe('MoreScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the more screen', async () => {
    const { getByTestId } = renderWithProviders(<MoreScreen />);
    await waitFor(() => {
      expect(getByTestId('more-screen-icon')).toBeTruthy();
    });
  });

  it('renders progress, media and settings options', async () => {
    const { getByTestId } = renderWithProviders(<MoreScreen />);
    await waitFor(() => {
      expect(getByTestId('more-progress-btn')).toBeTruthy();
      expect(getByTestId('more-media-btn')).toBeTruthy();
      expect(getByTestId('more-settings-btn')).toBeTruthy();
    });
  });

  it('navigates to progress screen when progress button pressed', async () => {
    const { getByTestId } = renderWithProviders(<MoreScreen />);
    await waitFor(() => getByTestId('more-progress-btn'));
    fireEvent.press(getByTestId('more-progress-btn'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/progress');
  });

  it('navigates to media screen when media button pressed', async () => {
    const { getByTestId } = renderWithProviders(<MoreScreen />);
    await waitFor(() => getByTestId('more-media-btn'));
    fireEvent.press(getByTestId('more-media-btn'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/media');
  });

  it('navigates to settings when settings button pressed', async () => {
    const { getByTestId } = renderWithProviders(<MoreScreen />);
    await waitFor(() => getByTestId('more-settings-btn'));
    fireEvent.press(getByTestId('more-settings-btn'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/settings');
  });
});
