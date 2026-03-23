import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../helpers/renderWithProviders';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useFocusEffect: jest.fn(),
  Stack: ({ children }: { children: React.ReactNode }) => children,
  Tabs: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../src/services/settingsService', () => ({
  ...jest.requireActual('../../src/services/settingsService'),
  getSetting: jest.fn().mockResolvedValue(null),
}));

import { MoreTabButton } from '../../src/components/MoreTabButton';

describe('MoreTabButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the More tab button', () => {
    const { getByTestId } = renderWithProviders(<MoreTabButton />);
    expect(getByTestId('more-tab-btn')).toBeTruthy();
  });

  it('menu is not shown initially', () => {
    // Modal with visible=false is not in the RNTL tree
    const { queryByTestId } = renderWithProviders(<MoreTabButton />);
    expect(queryByTestId('more-menu-modal')).toBeNull();
    expect(queryByTestId('more-menu-card')).toBeNull();
  });

  it('opens the popup menu when button is pressed', async () => {
    const { getByTestId } = renderWithProviders(<MoreTabButton />);
    fireEvent.press(getByTestId('more-tab-btn'));
    await waitFor(() => {
      expect(getByTestId('more-menu-modal').props.visible).toBeTruthy();
    });
  });

  it('closes modal when backdrop is pressed', async () => {
    const { getByTestId, queryByTestId } = renderWithProviders(<MoreTabButton />);
    fireEvent.press(getByTestId('more-tab-btn'));
    await waitFor(() => getByTestId('more-menu-backdrop'));
    fireEvent.press(getByTestId('more-menu-backdrop'));
    await waitFor(() => {
      expect(queryByTestId('more-menu-modal')).toBeNull();
    });
  });

  it('closes modal on hardware back press (onRequestClose)', async () => {
    const { getByTestId, queryByTestId } = renderWithProviders(<MoreTabButton />);
    fireEvent.press(getByTestId('more-tab-btn'));
    await waitFor(() => getByTestId('more-menu-modal'));
    act(() => { getByTestId('more-menu-modal').props.onRequestClose(); });
    await waitFor(() => {
      expect(queryByTestId('more-menu-modal')).toBeNull();
    });
  });

  it('navigates to progress screen when progress option is pressed', async () => {
    const { getByTestId } = renderWithProviders(<MoreTabButton />);
    fireEvent.press(getByTestId('more-tab-btn'));
    await waitFor(() => getByTestId('more-progress-option'));
    fireEvent.press(getByTestId('more-progress-option'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/progress');
  });

  it('closes menu when progress option is pressed', async () => {
    const { getByTestId, queryByTestId } = renderWithProviders(<MoreTabButton />);
    fireEvent.press(getByTestId('more-tab-btn'));
    await waitFor(() => getByTestId('more-progress-option'));
    fireEvent.press(getByTestId('more-progress-option'));
    await waitFor(() => {
      expect(queryByTestId('more-menu-modal')).toBeNull();
    });
  });

  it('navigates to media screen when media option is pressed', async () => {
    const { getByTestId } = renderWithProviders(<MoreTabButton />);
    fireEvent.press(getByTestId('more-tab-btn'));
    await waitFor(() => getByTestId('more-media-option'));
    fireEvent.press(getByTestId('more-media-option'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/media');
  });

  it('closes menu when media option is pressed', async () => {
    const { getByTestId, queryByTestId } = renderWithProviders(<MoreTabButton />);
    fireEvent.press(getByTestId('more-tab-btn'));
    await waitFor(() => getByTestId('more-media-option'));
    fireEvent.press(getByTestId('more-media-option'));
    await waitFor(() => {
      expect(queryByTestId('more-menu-modal')).toBeNull();
    });
  });

  it('navigates to settings screen when settings option is pressed', async () => {
    const { getByTestId } = renderWithProviders(<MoreTabButton />);
    fireEvent.press(getByTestId('more-tab-btn'));
    await waitFor(() => getByTestId('more-settings-option'));
    fireEvent.press(getByTestId('more-settings-option'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/settings');
  });

  it('closes menu when settings option is pressed', async () => {
    const { getByTestId, queryByTestId } = renderWithProviders(<MoreTabButton />);
    fireEvent.press(getByTestId('more-tab-btn'));
    await waitFor(() => getByTestId('more-settings-option'));
    fireEvent.press(getByTestId('more-settings-option'));
    await waitFor(() => {
      expect(queryByTestId('more-menu-modal')).toBeNull();
    });
  });

  it('shows menu card with progress, media and settings options when open', async () => {
    const { getByTestId } = renderWithProviders(<MoreTabButton />);
    fireEvent.press(getByTestId('more-tab-btn'));
    await waitFor(() => {
      expect(getByTestId('more-menu-card')).toBeTruthy();
      expect(getByTestId('more-progress-option')).toBeTruthy();
      expect(getByTestId('more-media-option')).toBeTruthy();
      expect(getByTestId('more-settings-option')).toBeTruthy();
    });
  });

  it('can toggle menu open and closed multiple times', async () => {
    const { getByTestId, queryByTestId } = renderWithProviders(<MoreTabButton />);

    fireEvent.press(getByTestId('more-tab-btn'));
    await waitFor(() => expect(getByTestId('more-menu-modal')).toBeTruthy());

    fireEvent.press(getByTestId('more-tab-btn'));
    await waitFor(() => expect(queryByTestId('more-menu-modal')).toBeNull());

    fireEvent.press(getByTestId('more-tab-btn'));
    await waitFor(() => expect(getByTestId('more-menu-modal')).toBeTruthy());
  });
});
