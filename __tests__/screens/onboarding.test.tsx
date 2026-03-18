import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import OnboardingScreen from '../../app/onboarding';
import * as db from '../../src/services/settingsService';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { renderWithProviders } from '../helpers/renderWithProviders';
import * as ImagePicker from 'expo-image-picker';

jest.spyOn(Alert, 'alert');

jest.mock('../../src/services/settingsService', () => ({
  ...jest.requireActual('../../src/services/settingsService'),
  setSetting: jest.fn().mockResolvedValue(undefined),
  getSetting: jest.fn().mockResolvedValue(null),
  setChildProfile: jest.fn().mockResolvedValue(undefined),
  getChildProfile: jest.fn().mockResolvedValue({ name: '', sex: null, birth: '' }),
}));

jest.mock('../../src/services/assetService', () => ({
  ...jest.requireActual('../../src/services/assetService'),
  getProfilePhoto: jest.fn().mockResolvedValue(null),
  saveProfilePhoto: jest.fn().mockResolvedValue({
    id: 1, parent_type: 'profile', parent_id: 1, asset_type: 'photo',
    filename: 'asset_1.jpg', mime_type: 'image/jpeg', file_size: 1024,
    duration_ms: null, width: null, height: null, created_at: '2024-01-01T00:00:00.000Z',
  }),
  deleteProfilePhoto: jest.fn().mockResolvedValue(undefined),
  getAssetsByParent: jest.fn().mockResolvedValue([]),
  getAssetsByParentAndType: jest.fn().mockResolvedValue([]),
}));

function renderOnboarding() {
  return renderWithProviders(<OnboardingScreen />);
}

describe('OnboardingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSettingsStore.setState({ name: '', sex: null, birth: '', isOnboardingDone: false, isHydrated: true });
  });

  // ─── Normal (create) mode ───────────────────────────────────────────────

  it('renders welcome text', async () => {
    const { findByText } = renderOnboarding();
    expect(await findByText(/Welcome/)).toBeTruthy();
  });

  it('renders language selector', async () => {
    const { findByText } = renderOnboarding();
    expect(await findByText('English')).toBeTruthy();
    expect(await findByText('Português')).toBeTruthy();
  });

  it('renders name input with placeholder', async () => {
    const { findByPlaceholderText } = renderOnboarding();
    expect(await findByPlaceholderText(/Sofia/)).toBeTruthy();
  });

  it('renders sex selection buttons', async () => {
    const { findByText } = renderOnboarding();
    expect(await findByText('Girl')).toBeTruthy();
    expect(await findByText('Boy')).toBeTruthy();
  });

  it('renders date selection button', async () => {
    const { findByText } = renderOnboarding();
    expect(await findByText(/Select date/)).toBeTruthy();
  });

  it('renders baby emoji based on no selection', async () => {
    const { findByText } = renderOnboarding();
    expect(await findByText('👶')).toBeTruthy();
  });

  it('changes emoji when girl is selected', async () => {
    const { findByText, findAllByText } = renderOnboarding();
    fireEvent.press(await findByText('Girl'));
    await waitFor(async () => {
      const emojis = await findAllByText('👧');
      expect(emojis.length).toBeGreaterThan(0);
    });
  });

  it('changes emoji when boy is selected', async () => {
    const { findByText, findAllByText } = renderOnboarding();
    fireEvent.press(await findByText('Boy'));
    await waitFor(async () => {
      const emojis = await findAllByText('👦');
      expect(emojis.length).toBeGreaterThan(0);
    });
  });

  it('opens date picker modal', async () => {
    const { findByText } = renderOnboarding();
    fireEvent.press(await findByText(/Select date/));
    expect(await findByText(/Cancel/)).toBeTruthy();
  });

  it('confirms date from picker', async () => {
    const { findByText } = renderOnboarding();
    fireEvent.press(await findByText(/Select date/));
    fireEvent.press(await findByText(/Confirm/));
  });

  it('cancels date picker', async () => {
    const { findByText, findAllByText } = renderOnboarding();
    fireEvent.press(await findByText(/Select date/));
    const cancelBtns = await findAllByText(/Cancel/);
    fireEvent.press(cancelBtns[0]);
    expect(await findByText(/Select date/)).toBeTruthy();
  });

  it('completes full onboarding flow', async () => {
    const { findByText, findByPlaceholderText } = renderOnboarding();
    const input = await findByPlaceholderText(/Sofia/);
    fireEvent.changeText(input, 'Luna');
    fireEvent.press(await findByText('Girl'));
    fireEvent.press(await findByText(/Select date/));
    fireEvent.press(await findByText(/Confirm/));
    const continueBtn = await findByText(/Start with Luna/);
    await act(async () => { fireEvent.press(continueBtn); });
    await waitFor(() => {
      expect(db.setChildProfile).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Luna', sex: 'girl' }),
      );
      expect(db.setSetting).toHaveBeenCalledWith('onboarding_done', '1');
    });
  });

  it('switches language to Português', async () => {
    const { findByText } = renderOnboarding();
    fireEvent.press(await findByText('Português'));
    expect(await findByText(/Bem-vindo/)).toBeTruthy();
  });

  it('alerts when continue pressed without name', async () => {
    jest.useFakeTimers();
    const { findByText, findByPlaceholderText } = renderOnboarding();
    fireEvent.press(await findByText('Girl'));
    fireEvent.press(await findByText(/Select date/));
    fireEvent.press(await findByText(/Confirm/));
    act(() => { jest.advanceTimersByTime(200); });
    const input = await findByPlaceholderText(/Sofia/);
    fireEvent.changeText(input, '  ');
    expect(await findByText('Girl')).toBeTruthy();
    jest.useRealTimers();
  });

  // ─── Photo picker (avatar at top) ───────────────────────────────────────

  it('shows profile avatar at top', async () => {
    const { findByTestId } = renderOnboarding();
    expect(await findByTestId('onboarding-profile-avatar')).toBeTruthy();
  });

  // Helper: invoke a button from the last Alert.alert call by matching text
  function pressLastAlertButton(text: string) {
    const calls = (Alert.alert as jest.Mock).mock.calls;
    const lastCall = calls[calls.length - 1];
    const buttons = lastCall[2] as Array<{ text: string; onPress?: () => void }>;
    const btn = buttons.find((b) => b.text === text);
    btn?.onPress?.();
  }

  async function fillAllFields(helpers: ReturnType<typeof renderOnboarding>) {
    const { findByText, findByPlaceholderText } = helpers;
    fireEvent.changeText(await findByPlaceholderText(/Sofia/), 'Luna');
    fireEvent.press(await findByText('Girl'));
    fireEvent.press(await findByText(/Select date/));
    fireEvent.press(await findByText(/Confirm/));
  }

  it('tapping avatar shows source picker alert', async () => {
    const helpers = renderOnboarding();
    await act(async () => { fireEvent.press(await helpers.findByTestId('onboarding-profile-avatar')); });
    expect(Alert.alert).toHaveBeenCalled();
  });

  it('tapping avatar then choosing gallery opens image library', async () => {
    const launchMock = ImagePicker.launchImageLibraryAsync as jest.Mock;
    launchMock.mockResolvedValueOnce({ canceled: true, assets: [] });
    const helpers = renderOnboarding();
    await act(async () => { fireEvent.press(await helpers.findByTestId('onboarding-profile-avatar')); });
    await act(async () => { pressLastAlertButton('Choose from Library'); });
    expect(launchMock).toHaveBeenCalled();
  });

  it('tapping avatar then choosing camera opens camera', async () => {
    const launchMock = ImagePicker.launchCameraAsync as jest.Mock;
    launchMock.mockResolvedValueOnce({ canceled: true, assets: [] });
    const helpers = renderOnboarding();
    await act(async () => { fireEvent.press(await helpers.findByTestId('onboarding-profile-avatar')); });
    await act(async () => { pressLastAlertButton('Take Photo'); });
    expect(launchMock).toHaveBeenCalled();
  });

  it('shows permission denied alert when media library permission denied', async () => {
    const permMock = ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
    permMock.mockResolvedValueOnce({ granted: false, status: 'denied' });
    const helpers = renderOnboarding();
    await act(async () => { fireEvent.press(await helpers.findByTestId('onboarding-profile-avatar')); });
    await act(async () => { pressLastAlertButton('Choose from Library'); });
    expect(Alert.alert).toHaveBeenCalledTimes(2); // source picker + permission denied
  });

  it('saves profile photo on continue when photo is selected', async () => {
    const launchMock = ImagePicker.launchImageLibraryAsync as jest.Mock;
    launchMock.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///tmp/photo.jpg', mimeType: 'image/jpeg', fileSize: 1024 }],
    });
    const assetService = require('../../src/services/assetService');
    const helpers = renderOnboarding();
    await act(async () => { fireEvent.press(await helpers.findByTestId('onboarding-profile-avatar')); });
    await act(async () => { pressLastAlertButton('Choose from Library'); });
    await fillAllFields(helpers);
    const continueBtn = await helpers.findByText(/Start with Luna/);
    await act(async () => { fireEvent.press(continueBtn); });
    await waitFor(() => {
      expect(assetService.saveProfilePhoto).toHaveBeenCalledWith(
        'file:///tmp/photo.jpg',
        'image/jpeg',
        1024,
        undefined,
        undefined,
      );
    });
  });

  it('does not save photo on continue when no photo selected (skip)', async () => {
    const assetService = require('../../src/services/assetService');
    const { findByText, findByPlaceholderText } = renderOnboarding();
    const input = await findByPlaceholderText(/Sofia/);
    fireEvent.changeText(input, 'Luna');
    fireEvent.press(await findByText('Girl'));
    fireEvent.press(await findByText(/Select date/));
    fireEvent.press(await findByText(/Confirm/));
    const continueBtn = await findByText(/Start with Luna/);
    await act(async () => { fireEvent.press(continueBtn); });
    await waitFor(() => {
      expect(db.setChildProfile).toHaveBeenCalled();
      expect(assetService.saveProfilePhoto).not.toHaveBeenCalled();
    });
  });
});
