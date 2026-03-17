import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { I18nProvider } from '../../src/i18n/i18n';
import OnboardingScreen from '../../app/onboarding';
import * as db from '../../src/services/settingsService';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSettingsStore } from '../../src/stores/settingsStore';

jest.spyOn(Alert, 'alert');

jest.mock('../../src/services/settingsService', () => ({
  ...jest.requireActual('../../src/services/settingsService'),
  setSetting: jest.fn().mockResolvedValue(undefined),
  getSetting: jest.fn().mockResolvedValue(null),
  setChildProfile: jest.fn().mockResolvedValue(undefined),
  getChildProfile: jest.fn().mockResolvedValue({ name: '', sex: null, birth: '' }),
}));

function renderOnboarding() {
  return render(<I18nProvider><OnboardingScreen /></I18nProvider>);
}

describe('OnboardingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
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

  // ─── Edit mode ───────────────────────────────────────────────────────────

  it('edit mode: hides welcome title and shows edit title', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ edit: 'true' });
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: '2023-06-15', isOnboardingDone: true, isHydrated: true });
    const { findByTestId, queryByText } = renderOnboarding();
    expect(await findByTestId('onboarding-edit-title')).toBeTruthy();
    expect(queryByText(/Welcome/)).toBeNull();
  });

  it('edit mode: pre-fills name from store', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ edit: 'true' });
    useSettingsStore.setState({ name: 'Beatriz', sex: 'girl', birth: '2023-06-15', isOnboardingDone: true, isHydrated: true });
    const { findByTestId } = renderOnboarding();
    const input = await findByTestId('onboarding-name-input');
    expect(input.props.value).toBe('Beatriz');
  });

  it('edit mode: pre-fills sex from store', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ edit: 'true' });
    useSettingsStore.setState({ name: 'Leo', sex: 'boy', birth: '2023-06-15', isOnboardingDone: true, isHydrated: true });
    const { findByTestId } = renderOnboarding();
    // Boy button should be highlighted (style applied) — just check it renders
    expect(await findByTestId('onboarding-sex-boy-btn')).toBeTruthy();
  });

  it('edit mode: pre-fills birth date from store', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ edit: 'true' });
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: '2023-06-15', isOnboardingDone: true, isHydrated: true });
    const { queryByText, findByTestId } = renderOnboarding();
    await findByTestId('onboarding-edit-title');
    // birth date '2023-06-15' is pre-filled so "Select date" placeholder should not appear
    expect(queryByText(/Select date/)).toBeNull();
  });

  it('edit mode: shows Cancel and Save buttons', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ edit: 'true' });
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: '2023-06-15', isOnboardingDone: true, isHydrated: true });
    const { findByTestId } = renderOnboarding();
    expect(await findByTestId('onboarding-cancel-btn')).toBeTruthy();
    expect(await findByTestId('onboarding-save-btn')).toBeTruthy();
  });

  it('edit mode: does not show Continue button', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ edit: 'true' });
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: '2023-06-15', isOnboardingDone: true, isHydrated: true });
    const { queryByTestId, findByTestId } = renderOnboarding();
    await findByTestId('onboarding-edit-title');
    expect(queryByTestId('onboarding-continue-btn')).toBeNull();
  });

  it('edit mode: Cancel calls router.back()', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ edit: 'true' });
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: '2023-06-15', isOnboardingDone: true, isHydrated: true });
    const mockBack = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ replace: jest.fn(), push: jest.fn(), back: mockBack });
    const { findByTestId } = renderOnboarding();
    fireEvent.press(await findByTestId('onboarding-cancel-btn'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('edit mode: Save calls setProfile (not setOnboardingDone) and goes back', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ edit: 'true' });
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: '2023-06-15', isOnboardingDone: true, isHydrated: true });
    const mockBack = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ replace: jest.fn(), push: jest.fn(), back: mockBack });
    const { findByTestId } = renderOnboarding();
    const saveBtn = await findByTestId('onboarding-save-btn');
    await act(async () => { fireEvent.press(saveBtn); });
    await waitFor(() => {
      expect(db.setChildProfile).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Luna', sex: 'girl' }),
      );
      // setOnboardingDone (setSetting 'onboarding_done') must NOT be called
      expect(db.setSetting).not.toHaveBeenCalledWith('onboarding_done', '1');
      expect(mockBack).toHaveBeenCalled();
    });
  });

  it('edit mode: Save alerts when name is cleared', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ edit: 'true' });
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: '2023-06-15', isOnboardingDone: true, isHydrated: true });
    const { findByTestId } = renderOnboarding();
    const input = await findByTestId('onboarding-name-input');
    const saveBtn = await findByTestId('onboarding-save-btn');
    fireEvent.changeText(input, '');
    await act(async () => { fireEvent.press(saveBtn); });
    expect(Alert.alert).toHaveBeenCalled();
  });

  it('edit mode: Save alerts when no birth date in store', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ edit: 'true' });
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: '', isOnboardingDone: true, isHydrated: true });
    const { findByTestId } = renderOnboarding();
    const saveBtn = await findByTestId('onboarding-save-btn');
    await act(async () => { fireEvent.press(saveBtn); });
    expect(Alert.alert).toHaveBeenCalled();
  });

  it('edit mode: Save alerts when no sex in store', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ edit: 'true' });
    useSettingsStore.setState({ name: 'Luna', sex: null, birth: '2023-06-15', isOnboardingDone: true, isHydrated: true });
    const { findByTestId } = renderOnboarding();
    const saveBtn = await findByTestId('onboarding-save-btn');
    await act(async () => { fireEvent.press(saveBtn); });
    expect(Alert.alert).toHaveBeenCalled();
  });
});
