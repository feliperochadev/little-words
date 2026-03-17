import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../helpers/renderWithProviders';

jest.mock('../../src/services/variantService', () => ({
  ...jest.requireActual('../../src/services/variantService'),
  getAllVariants: jest.fn(),
}));

jest.mock('../../src/services/wordService', () => ({
  ...jest.requireActual('../../src/services/wordService'),
  getWords: jest.fn().mockResolvedValue([
    { id: 1, word: 'mamãe', category_id: 1, date_added: '2024-01-15', notes: null, created_at: '2024-01-15' },
  ]),
}));

jest.mock('../../src/services/settingsService', () => ({
  ...jest.requireActual('../../src/services/settingsService'),
  getSetting: jest.fn().mockResolvedValue(null),
  setSetting: jest.fn().mockResolvedValue(undefined),
}));

import VariantsScreen from '../../app/(tabs)/variants';
import * as db from '../../src/services/variantService';

const sampleVariants = [
  { id: 1, word_id: 1, variant: 'mamá', date_added: '2024-01-15', notes: 'close', created_at: '2024-01-15', main_word: 'mamãe' },
  { id: 2, word_id: 1, variant: 'mama', date_added: '2024-02-01', notes: null, created_at: '2024-02-01', main_word: 'mamãe' },
];

describe('VariantsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (db.getAllVariants as jest.Mock).mockResolvedValue(sampleVariants);
  });

  it('renders variants list', async () => {
    const { findByText } = renderWithProviders(<VariantsScreen />);
    expect(await findByText(/mamá/)).toBeTruthy();
  });

  it('renders main word reference', async () => {
    const { findAllByText } = renderWithProviders(<VariantsScreen />);
    const mainWords = await findAllByText('mamãe');
    expect(mainWords.length).toBeGreaterThan(0);
  });

  it('renders add new button', async () => {
    const { findByText } = renderWithProviders(<VariantsScreen />);
    expect(await findByText('+ New')).toBeTruthy();
  });

  it('renders variant count', async () => {
    const { findByText } = renderWithProviders(<VariantsScreen />);
    expect(await findByText(/2 variants/)).toBeTruthy();
  });

  it('shows empty state when no variants', async () => {
    (db.getAllVariants as jest.Mock).mockResolvedValue([]);
    const { findByText } = renderWithProviders(<VariantsScreen />);
    expect(await findByText(/No variants yet/)).toBeTruthy();
  });

  it('renders notes on variant', async () => {
    const { findByText } = renderWithProviders(<VariantsScreen />);
    expect(await findByText(/close/)).toBeTruthy();
  });

  it('renders search bar', async () => {
    const { findByPlaceholderText } = renderWithProviders(<VariantsScreen />);
    expect(await findByPlaceholderText(/Search variants/)).toBeTruthy();
  });

  it('renders sort button', async () => {
    const { findByText } = renderWithProviders(<VariantsScreen />);
    expect(await findByText(/Most recent/)).toBeTruthy();
  });

  it('renders date formatted', async () => {
    const { findByText } = renderWithProviders(<VariantsScreen />);
    expect(await findByText('15/01/2024')).toBeTruthy();
  });

  it('renders hint text', async () => {
    const { findByText } = renderWithProviders(<VariantsScreen />);
    expect(await findByText(/Variants are how the child/i)).toBeTruthy();
  });

  it('filters variants by search', async () => {
    const { findByPlaceholderText, findByText } = renderWithProviders(<VariantsScreen />);
    // Wait for data to load
    await findByText(/mamá/);
    const searchInput = await findByPlaceholderText(/Search variants/);
    fireEvent.changeText(searchInput, 'mamá');
    expect(await findByText(/mamá/)).toBeTruthy();
    // 'mama' (without accent) should be filtered out if search is strict
  });

  it('toggles sort menu and selects option', async () => {
    const { findByText } = renderWithProviders(<VariantsScreen />);
    fireEvent.press(await findByText(/Most recent/));
    expect(await findByText(/A → Z/)).toBeTruthy();
    fireEvent.press(await findByText(/A → Z/));
  });

  it('opens add variant modal', async () => {
    const { findByText } = renderWithProviders(<VariantsScreen />);
    fireEvent.press(await findByText('+ New'));
    expect(await findByText(/New Variant/)).toBeTruthy();
  });

  it('opens edit variant modal on variant press', async () => {
    const { findByText } = renderWithProviders(<VariantsScreen />);
    fireEvent.press(await findByText(/mamá/));
    // Should open AddVariantModal in edit mode
    expect(await findByText(/Edit Variant/)).toBeTruthy();
  });

  it('closes AddVariantModal via onClose callback (covers variants.tsx line 153)', async () => {
    const { findByText, queryByText } = renderWithProviders(<VariantsScreen />);
    // Open modal
    fireEvent.press(await findByText('+ New'));
    expect(await findByText(/New Variant/)).toBeTruthy();
    // Close via Cancel button — this calls the onClose prop from variants.tsx
    fireEvent.press(await findByText('Cancel'));
    await waitFor(() => {
      expect(queryByText(/New Variant/)).toBeNull();
    });
  });
});
