import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { KeepsakeHomeCard, getHomeCardTitle } from '../../src/components/keepsake/KeepsakeHomeCard';
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

const mockT = (key: string, params?: Record<string, string>) => {
  const name = params?.name ?? 'Baby';
  if (key === 'keepsake.sectionTitleFemale') return `Livro da ${name}`;
  if (key === 'keepsake.sectionTitle') return `Livro de ${name}`;
  return key;
};

beforeEach(() => {
  jest.clearAllMocks();
  useSettingsStore.setState({ name: 'Noah', sex: 'boy', birth: undefined, isOnboardingDone: true });
});

describe('getHomeCardTitle', () => {
  it('uses female gendered title in pt-BR for girl', () => {
    expect(getHomeCardTitle('pt-BR', 'girl', mockT, 'Sofia')).toBe('Livro da Sofia');
  });

  it('uses neutral title in pt-BR for boy', () => {
    expect(getHomeCardTitle('pt-BR', 'boy', mockT, 'Miguel')).toBe('Livro de Miguel');
  });

  it('uses neutral title in pt-BR for unknown sex', () => {
    expect(getHomeCardTitle('pt-BR', null, mockT, 'Alex')).toBe('Livro de Alex');
  });

  it('uses sectionTitle for en-US regardless of sex', () => {
    expect(getHomeCardTitle('en-US', 'girl', mockT, 'Emma')).toBe('Livro de Emma');
  });
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

  it('shows thumbnail and section label when keepsake is generated', async () => {
    loadKeepsakeState.mockResolvedValue({
      isGenerated: true,
      generatedAt: '2026-01-15T12:00:00Z',
      photoOverrides: {},
    });

    const { findByTestId, findByText } = renderWithProviders(<KeepsakeHomeCard />);
    const thumbnail = await findByTestId('home-keepsake-thumbnail');
    expect(thumbnail).toBeTruthy();

    // Section label is shown above the thumbnail
    const label = await findByText('Keepsake Book');
    expect(label).toBeTruthy();
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
});
