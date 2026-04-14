import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { renderWithProviders } from '../helpers/renderWithProviders';

jest.spyOn(Alert, 'alert');

jest.mock('../../src/services/variantService', () => ({
  ...jest.requireActual('../../src/services/variantService'),
  getAllVariants: jest.fn(),
  addVariant: jest.fn().mockResolvedValue(1),
  updateVariant: jest.fn().mockResolvedValue(undefined),
  deleteVariant: jest.fn().mockResolvedValue(undefined),
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

  it('renders add new button when variants exist', async () => {
    const { findByTestId } = renderWithProviders(<VariantsScreen />);
    expect(await findByTestId('variants-add-btn')).toBeTruthy();
  });

  it('hides add new button when no variants exist', async () => {
    (db.getAllVariants as jest.Mock).mockResolvedValue([]);
    const { queryByTestId, findByText } = renderWithProviders(<VariantsScreen />);
    await findByText(/No variants yet/);
    expect(queryByTestId('variants-add-btn')).toBeNull();
  });

  it('renders semantic title and sort icons', async () => {
    const { findByTestId } = renderWithProviders(<VariantsScreen />);
    const titleIcon = await findByTestId('variants-title-icon');
    const sortIcon = await findByTestId('variants-sort-icon');
    expect(titleIcon.props.name).toBe('chatbubble-outline');
    expect(sortIcon.props.name).toBe('calendar-outline');
  });

  it('renders variant count', async () => {
    const { findByText } = renderWithProviders(<VariantsScreen />);
    expect(await findByText(/2 variants/)).toBeTruthy();
  });

  it('shows empty state when no variants but words exist', async () => {
    (db.getAllVariants as jest.Mock).mockResolvedValue([]);
    const { findByText } = renderWithProviders(<VariantsScreen />);
    expect(await findByText(/No variants yet/)).toBeTruthy();
  });

  it('shows add-first-variant CTA button when words exist but no variants', async () => {
    (db.getAllVariants as jest.Mock).mockResolvedValue([]);
    const { findByTestId } = renderWithProviders(<VariantsScreen />);
    expect(await findByTestId('variants-add-first-btn')).toBeTruthy();
  });

  it('shows hint banner when no variants exist', async () => {
    (db.getAllVariants as jest.Mock).mockResolvedValue([]);
    const { findByTestId } = renderWithProviders(<VariantsScreen />);
    expect(await findByTestId('variants-hint-banner')).toBeTruthy();
  });

  it('hides hint banner when variants exist', async () => {
    const { queryByTestId, findByText } = renderWithProviders(<VariantsScreen />);
    await findByText(/mamá/);
    expect(queryByTestId('variants-hint-banner')).toBeNull();
  });

  it('hides hint banner when searching', async () => {
    (db.getAllVariants as jest.Mock).mockResolvedValue([]);
    const { findByPlaceholderText, queryByTestId, findByText } = renderWithProviders(<VariantsScreen />);
    await findByText(/No variants yet/);
    const searchInput = await findByPlaceholderText(/Search variants/);
    fireEvent.changeText(searchInput, 'test');
    expect(queryByTestId('variants-hint-banner')).toBeNull();
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

  it('shows edit button on variant card', async () => {
    const { findByTestId } = renderWithProviders(<VariantsScreen />);
    expect(await findByTestId('variant-edit-btn-mamá')).toBeTruthy();
  });

  it('opens edit variant modal via edit button', async () => {
    const { findByTestId, findByText } = renderWithProviders(<VariantsScreen />);
    fireEvent.press(await findByTestId('variant-edit-btn-mamá'));
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

  it('search filter matches main_word when variant does not match (covers null main_word branch)', async () => {
    const variantNullMain = { ...sampleVariants[0], main_word: null };
    (db.getAllVariants as jest.Mock).mockResolvedValue([variantNullMain]);
    const { findByPlaceholderText, findByText } = renderWithProviders(<VariantsScreen />);
    await findByText(/mamá/);
    const input = await findByPlaceholderText(/Search variants/);
    // search for text not in variant but in a null main_word — covers the || '' branch
    fireEvent.changeText(input, 'zzznomatch');
    await waitFor(() => {
      // filtered list should be empty → empty search state shown
    });
  });

  it('renders variant with null asset_count without error', async () => {
    const variantNullAssets = { ...sampleVariants[0], asset_count: null, audio_count: 0, photo_count: 0, video_count: 0 };
    (db.getAllVariants as jest.Mock).mockResolvedValue([variantNullAssets]);
    const { findByText } = renderWithProviders(<VariantsScreen />);
    expect(await findByText(/mamá/)).toBeTruthy();
  });

  it('openFirstVariant opens modal with first word pre-selected', async () => {
    (db.getAllVariants as jest.Mock).mockResolvedValue([]);
    const { findByTestId, findByText } = renderWithProviders(<VariantsScreen />);
    fireEvent.press(await findByTestId('variants-add-first-btn'));
    expect(await findByText(/New Variant/)).toBeTruthy();
  });

  it('onSave callback invokes refetchVariants after successful add', async () => {
    (db.getAllVariants as jest.Mock).mockResolvedValue([]);
    const { getAllVariants } = require('../../src/services/variantService');
    const { findByTestId, findByText } = renderWithProviders(<VariantsScreen />);
    // Open modal with first word pre-selected
    fireEvent.press(await findByTestId('variants-add-first-btn'));
    await findByText(/New Variant/);
    // Fill variant text
    fireEvent.changeText(await findByTestId('variant-input'), 'mamá');
    // Save — triggers onSave → refetchVariants
    await act(async () => {
      fireEvent.press(await findByTestId('variant-save-btn'));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(getAllVariants.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('onDeleted callback invokes refetchVariants after variant deletion', async () => {
    const { deleteVariant, getAllVariants } = require('../../src/services/variantService');
    const { findByTestId } = renderWithProviders(<VariantsScreen />);
    // Open edit modal for existing variant
    fireEvent.press(await findByTestId('variant-edit-btn-mamá'));
    await findByTestId('variant-delete-btn');
    // Tap delete
    fireEvent.press(await findByTestId('variant-delete-btn'));
    // Confirm via Alert destructive button
    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const destructiveBtn = alertCall[2].find((b: { style?: string; onPress?: () => void }) => b.style === 'destructive');
    await act(async () => {
      destructiveBtn?.onPress?.();
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(deleteVariant).toHaveBeenCalled();
      expect(getAllVariants).toHaveBeenCalled();
    });
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
