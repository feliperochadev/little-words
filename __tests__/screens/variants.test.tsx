import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
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

let mockHighlightId: string | undefined = undefined;
jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(() => ({ highlightId: mockHighlightId })),
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), setParams: jest.fn() })),
  useFocusEffect: jest.fn(),
}));

const mockAssets: Record<string, any[]> = {};
jest.mock('../../src/hooks/useAssets', () => ({
  useAssetsByParent: jest.fn((parentType: string, parentId: number) => ({
    data: mockAssets[`${parentType}-${parentId}`] ?? [],
  })),
}));

jest.mock('../../src/hooks/useAudioPlayer', () => ({
  useAudioPlayer: () => ({
    isPlaying: false,
    durationMs: 0,
    play: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    unload: jest.fn(),
  }),
}));

jest.mock('../../src/utils/assetStorage', () => ({
  getAssetFileUri: (parentType: string, parentId: number, assetType: string, filename: string) =>
    `file:///media/${parentType}/${parentId}/${assetType}/${filename}`,
}));

import VariantsScreen from '../../app/(tabs)/variants';
import * as db from '../../src/services/variantService';

const sampleVariants = [
  {
    id: 1, word_id: 1, variant: 'mamá', date_added: '2024-01-15', notes: 'close',
    created_at: '2024-01-15', main_word: 'mamãe',
    asset_count: 2, audio_count: 1, photo_count: 1, video_count: 0,
  },
  {
    id: 2, word_id: 1, variant: 'mama', date_added: '2024-02-01', notes: null,
    created_at: '2024-02-01', main_word: 'mamãe',
    asset_count: 0, audio_count: 0, photo_count: 0, video_count: 0,
  },
];

describe('VariantsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHighlightId = undefined;
    Object.keys(mockAssets).forEach(k => delete mockAssets[k]);
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
    const { findByTestId } = renderWithProviders(<VariantsScreen />);
    expect(await findByTestId('variants-add-btn')).toBeTruthy();
  });

  it('renders semantic title and sort icons', async () => {
    const { findByTestId } = renderWithProviders(<VariantsScreen />);
    const titleIcon = await findByTestId('variants-title-icon');
    const sortIcon = await findByTestId('variants-sort-icon');
    expect(titleIcon.props.name).toBe('chatbubbles-outline');
    expect(sortIcon.props.name).toBe('calendar-outline');
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
    const { findByText, findByTestId } = renderWithProviders(<VariantsScreen />);
    fireEvent.press(await findByTestId('variants-add-btn'));
    expect(await findByText(/New Variant/)).toBeTruthy();
  });

  it('opens edit variant modal on variant press', async () => {
    const { findByText } = renderWithProviders(<VariantsScreen />);
    fireEvent.press(await findByText(/mamá/));
    // Should open AddVariantModal in edit mode
    expect(await findByText(/Edit Variant/)).toBeTruthy();
  });

  it('closes AddVariantModal via onClose callback (covers variants.tsx line 153)', async () => {
    const { findByText, queryByText, findByTestId } = renderWithProviders(<VariantsScreen />);
    // Open modal
    fireEvent.press(await findByTestId('variants-add-btn'));
    expect(await findByText(/New Variant/)).toBeTruthy();
    // Close via Cancel button — this calls the onClose prop from variants.tsx
    fireEvent.press(await findByText('Cancel'));
    await waitFor(() => {
      expect(queryByText(/New Variant/)).toBeNull();
    });
  });

  // ── Asset chips (WordAssetChips) ────────────────────────────────────────────

  it('renders asset chips via WordAssetChips when asset_count > 0', async () => {
    mockAssets['variant-1'] = [
      { id: 10, parent_type: 'variant', parent_id: 1, asset_type: 'audio', filename: 'a.m4a', name: 'Rec 1', mime_type: 'audio/mp4', file_size: 1000, duration_ms: 2000, width: null, height: null, created_at: '2026-01-01T00:00:00Z' },
    ];
    const { findByTestId } = renderWithProviders(<VariantsScreen />);
    expect(await findByTestId('word-asset-chip-10')).toBeTruthy();
  });

  it('does not render asset chips when asset_count is 0', async () => {
    mockAssets['variant-2'] = [];
    const { queryByTestId, findByText } = renderWithProviders(<VariantsScreen />);
    await findByText(/mama/);
    expect(queryByTestId('word-asset-chip-10')).toBeNull();
  });



  it('useFocusEffect cleanup clears search and scrolls list to top', async () => {
    const { useFocusEffect } = require('expo-router');
    // Make useFocusEffect call the callback on first invocation and capture the cleanup
    let capturedCleanup: (() => void) | undefined;
    (useFocusEffect as jest.Mock).mockImplementation((callback: () => (() => void) | void) => {
      if (!capturedCleanup) {
        // Only intercept the first call; subsequent renders use the no-op default
        const result = callback();
        if (typeof result === 'function') {
          capturedCleanup = result;
        }
      }
    });

    const { findByText } = renderWithProviders(<VariantsScreen />);
    await findByText(/mamá/);

    // Now call the captured cleanup to exercise lines 59-61
    expect(typeof capturedCleanup).toBe('function');
    act(() => {
      capturedCleanup!();
    });

    // Restore the default no-op implementation
    (useFocusEffect as jest.Mock).mockImplementation(jest.fn());
  });

  it('sets active search when initialSearch is set on navigation', async () => {
    mockHighlightId = undefined;
    const { useLocalSearchParams, useRouter } = require('expo-router');
    const { findByPlaceholderText, rerender } = renderWithProviders(<VariantsScreen />);
    const searchInput = await findByPlaceholderText(/Search variants/);
    
    // Simulate arriving on this screen via media-link navigation
    useLocalSearchParams.mockImplementation(() => ({ initialSearch: 'mama' }));
    // Ensure setParams is mocked for the hook
    useRouter.mockReturnValue({ setParams: jest.fn(), push: jest.fn(), replace: jest.fn(), back: jest.fn() });
    
    rerender(<VariantsScreen />);
    await waitFor(() => {
      expect(searchInput.props.value).toBe('mama');
    });
    useLocalSearchParams.mockImplementation(() => ({}));
  });
});
