import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { KeepsakeHomeCard } from '../../src/components/keepsake/KeepsakeHomeCard';
import { useSettingsStore } from '../../src/stores/settingsStore';

jest.mock('../../src/services/keepsakeService', () => ({
  loadKeepsakeState: jest.fn(),
  getKeepsakeFileUri: jest.fn(() => 'file:///mock/keepsake.jpg'),
  getKeepsakeWords: jest.fn(() => Promise.resolve([])),
  captureKeepsake: jest.fn(() => Promise.resolve()),
  saveKeepsakeToLibrary: jest.fn(() => Promise.resolve()),
  shareKeepsake: jest.fn(() => Promise.resolve()),
  setPhotoOverride: jest.fn(() => Promise.resolve()),
}));

const { loadKeepsakeState } = require('../../src/services/keepsakeService') as {
  loadKeepsakeState: jest.Mock;
};

beforeEach(() => {
  jest.clearAllMocks();
  useSettingsStore.setState({ name: 'Noah', sex: 'boy', birth: undefined, isOnboardingDone: true });
});

describe('KeepsakeHomeCard', () => {
  it('shows hint text when keepsake not generated', async () => {
    loadKeepsakeState.mockResolvedValue({
      isGenerated: false,
      generatedAt: null,
      photoOverrides: {},
    });

    const { findByTestId } = renderWithProviders(<KeepsakeHomeCard />);
    const hint = await findByTestId('home-keepsake-hint');
    expect(hint).toBeTruthy();
  });

  it('shows thumbnail with name-based title when keepsake is generated', async () => {
    loadKeepsakeState.mockResolvedValue({
      isGenerated: true,
      generatedAt: '2026-01-15T12:00:00Z',
      photoOverrides: {},
    });

    const { findByTestId, findByText } = renderWithProviders(<KeepsakeHomeCard />);
    const thumbnail = await findByTestId('home-keepsake-thumbnail');
    expect(thumbnail).toBeTruthy();

    const title = await findByText("Noah's Keepsake Book");
    expect(title).toBeTruthy();
  });

  it('opens modal when hint is pressed (no keepsake)', async () => {
    loadKeepsakeState.mockResolvedValue({
      isGenerated: false,
      generatedAt: null,
      photoOverrides: {},
    });

    const { findByTestId } = renderWithProviders(<KeepsakeHomeCard />);
    const hint = await findByTestId('home-keepsake-hint');
    fireEvent.press(hint);

    const modal = await findByTestId('keepsake-preview-modal');
    expect(modal).toBeTruthy();
  });

  it('opens modal when thumbnail is pressed (keepsake generated)', async () => {
    loadKeepsakeState.mockResolvedValue({
      isGenerated: true,
      generatedAt: '2026-01-15T12:00:00Z',
      photoOverrides: {},
    });

    const { findByTestId } = renderWithProviders(<KeepsakeHomeCard />);
    const thumbnail = await findByTestId('home-keepsake-thumbnail');
    fireEvent.press(thumbnail);

    const modal = await findByTestId('keepsake-preview-modal');
    expect(modal).toBeTruthy();
  });

  it('does not show chevron-forward arrow', async () => {
    loadKeepsakeState.mockResolvedValue({
      isGenerated: true,
      generatedAt: '2026-01-15T12:00:00Z',
      photoOverrides: {},
    });

    const { findByTestId, queryAllByTestId } = renderWithProviders(<KeepsakeHomeCard />);
    await findByTestId('home-keepsake-thumbnail');
    // No chevron arrow rendered inside the home keepsake card
    expect(queryAllByTestId('home-keepsake-arrow')).toHaveLength(0);
  });
});
