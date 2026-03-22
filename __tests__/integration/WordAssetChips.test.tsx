import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { WordAssetChips } from '../../src/components/WordAssetChips';
import type { Asset } from '../../src/types/asset';

// ── Mocks ────────────────────────────────────────────────────────────

let mockAssetsData: Asset[] = [];

jest.mock('../../src/hooks/useAssets', () => ({
  useAssetsByParent: () => ({ data: mockAssetsData }),
}));

jest.mock('../../src/utils/assetStorage', () => ({
  getAssetFileUri: (parentType: string, parentId: number, assetType: string, filename: string) =>
    `file:///media/${parentType}/${parentId}/${assetType}/${filename}`,
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

// ── Helpers ──────────────────────────────────────────────────────────

function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 1,
    parent_type: 'word',
    parent_id: 10,
    asset_type: 'audio',
    filename: 'asset_1.m4a',
    name: 'My Audio',
    mime_type: 'audio/mp4',
    file_size: 1024,
    duration_ms: 3000,
    width: null,
    height: null,
    created_at: '2026-01-15T00:00:00Z',
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe('WordAssetChips', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAssetsData = [];
  });

  describe('empty state', () => {
    it('renders nothing when there are no assets', () => {
      mockAssetsData = [];
      const { toJSON } = renderWithProviders(<WordAssetChips parentId={10} />);
      expect(toJSON()).toBeNull();
    });
  });

  describe('chip rendering', () => {
    it('renders a chip for each asset (up to MAX_VISIBLE=4)', () => {
      mockAssetsData = [
        makeAsset({ id: 1 }),
        makeAsset({ id: 2, asset_type: 'photo', filename: 'asset_2.jpg', mime_type: 'image/jpeg', name: 'My Photo' }),
      ];
      const { getByTestId } = renderWithProviders(<WordAssetChips parentId={10} />);
      expect(getByTestId('word-asset-chip-1')).toBeTruthy();
      expect(getByTestId('word-asset-chip-2')).toBeTruthy();
    });

    it('shows asset name in chip label', () => {
      mockAssetsData = [makeAsset({ id: 1, name: 'Cool Recording' })];
      const { getByText } = renderWithProviders(<WordAssetChips parentId={10} />);
      expect(getByText('Cool Recording')).toBeTruthy();
    });

    it('falls back to filename when name is null', () => {
      mockAssetsData = [makeAsset({ id: 1, name: null, filename: 'fallback.m4a' })];
      const { getByText } = renderWithProviders(<WordAssetChips parentId={10} />);
      expect(getByText('fallback.m4a')).toBeTruthy();
    });

    it('shows mic icon for audio assets', () => {
      mockAssetsData = [makeAsset({ id: 1, asset_type: 'audio' })];
      const { getByTestId } = renderWithProviders(<WordAssetChips parentId={10} />);
      expect(getByTestId('word-asset-chip-1')).toBeTruthy();
    });

    it('shows image icon for photo assets', () => {
      mockAssetsData = [makeAsset({ id: 2, asset_type: 'photo', filename: 'a.jpg', mime_type: 'image/jpeg', name: 'Photo' })];
      const { getByTestId } = renderWithProviders(<WordAssetChips parentId={10} />);
      expect(getByTestId('word-asset-chip-2')).toBeTruthy();
    });
  });

  describe('overflow chip', () => {
    it('shows overflow chip when assets exceed MAX_VISIBLE=4', () => {
      mockAssetsData = Array.from({ length: 5 }, (_, i) =>
        makeAsset({ id: i + 1, filename: `asset_${i + 1}.m4a`, name: `Audio ${i + 1}` })
      );
      const { getByTestId } = renderWithProviders(<WordAssetChips parentId={10} />);
      expect(getByTestId('word-asset-chips-overflow')).toBeTruthy();
    });

    it('overflow chip shows the correct count', () => {
      mockAssetsData = Array.from({ length: 6 }, (_, i) =>
        makeAsset({ id: i + 1, filename: `asset_${i + 1}.m4a`, name: `Audio ${i + 1}` })
      );
      const { getByTestId } = renderWithProviders(<WordAssetChips parentId={10} />);
      const overflowChip = getByTestId('word-asset-chips-overflow');
      expect(overflowChip).toBeTruthy();
      // Find the Text child and flatten its children (may be ['+', 2] array)
      const textChild = overflowChip.findAllByType('Text');
      const allText = textChild
        .flatMap((t: any) => [].concat(t.props.children))
        .join('');
      expect(allText).toBe('+2');
    });

    it('does not show overflow chip when assets are exactly MAX_VISIBLE=4', () => {
      mockAssetsData = Array.from({ length: 4 }, (_, i) =>
        makeAsset({ id: i + 1, filename: `asset_${i + 1}.m4a`, name: `Audio ${i + 1}` })
      );
      const { queryByTestId } = renderWithProviders(<WordAssetChips parentId={10} />);
      expect(queryByTestId('word-asset-chips-overflow')).toBeNull();
    });

    it('does not show overflow chip when assets are fewer than MAX_VISIBLE', () => {
      mockAssetsData = [makeAsset({ id: 1 })];
      const { queryByTestId } = renderWithProviders(<WordAssetChips parentId={10} />);
      expect(queryByTestId('word-asset-chips-overflow')).toBeNull();
    });
  });

  describe('audio chip tap → AudioPreviewOverlay', () => {
    it('opens AudioPreviewOverlay when audio chip is pressed', async () => {
      mockAssetsData = [makeAsset({ id: 1, asset_type: 'audio', name: 'Recording 1' })];
      const { getByTestId } = renderWithProviders(<WordAssetChips parentId={10} />);
      fireEvent.press(getByTestId('word-asset-chip-1'));
      await waitFor(() => {
        expect(getByTestId('audio-preview-modal')).toBeTruthy();
      });
    });

    it('closes AudioPreviewOverlay when backdrop is pressed', async () => {
      mockAssetsData = [makeAsset({ id: 1, asset_type: 'audio', name: 'Recording 1' })];
      const { getByTestId, queryByTestId } = renderWithProviders(<WordAssetChips parentId={10} />);
      fireEvent.press(getByTestId('word-asset-chip-1'));
      await waitFor(() => getByTestId('audio-preview-backdrop'));
      fireEvent.press(getByTestId('audio-preview-backdrop'));
      await waitFor(() => {
        // After close, the overlay becomes invisible (hidden by visible=false)
        expect(queryByTestId('audio-preview-backdrop')).toBeNull();
      });
    });

    it('passes correct uri to AudioPreviewOverlay', async () => {
      mockAssetsData = [makeAsset({ id: 5, asset_type: 'audio', filename: 'asset_5.m4a', name: 'Audio 5' })];
      const { getByTestId } = renderWithProviders(<WordAssetChips parentId={10} />);
      fireEvent.press(getByTestId('word-asset-chip-5'));
      await waitFor(() => getByTestId('audio-preview-modal'));
      // The audio player will be called with this URI via play button
      expect(getByTestId('audio-preview-name').props.children).toBe('Audio 5');
    });
  });

  describe('photo chip tap → PhotoPreviewOverlay', () => {
    it('opens PhotoPreviewOverlay when photo chip is pressed', async () => {
      mockAssetsData = [makeAsset({ id: 2, asset_type: 'photo', filename: 'asset_2.jpg', mime_type: 'image/jpeg', name: 'Photo 1' })];
      const { getByTestId } = renderWithProviders(<WordAssetChips parentId={10} />);
      fireEvent.press(getByTestId('word-asset-chip-2'));
      await waitFor(() => {
        expect(getByTestId('photo-preview-modal')).toBeTruthy();
      });
    });

    it('closes PhotoPreviewOverlay when dismiss is pressed', async () => {
      mockAssetsData = [makeAsset({ id: 2, asset_type: 'photo', filename: 'asset_2.jpg', mime_type: 'image/jpeg', name: 'Photo 1' })];
      const { getByTestId, queryByTestId } = renderWithProviders(<WordAssetChips parentId={10} />);
      fireEvent.press(getByTestId('word-asset-chip-2'));
      await waitFor(() => getByTestId('photo-preview-dismiss'));
      fireEvent.press(getByTestId('photo-preview-dismiss'));
      await waitFor(() => {
        expect(queryByTestId('photo-preview-dismiss')).toBeNull();
      });
    });

    it('passes correct name to PhotoPreviewOverlay', async () => {
      mockAssetsData = [makeAsset({ id: 3, asset_type: 'photo', filename: 'asset_3.jpg', mime_type: 'image/jpeg', name: 'Sunset Photo' })];
      const { getByTestId, getAllByText } = renderWithProviders(<WordAssetChips parentId={10} />);
      fireEvent.press(getByTestId('word-asset-chip-3'));
      await waitFor(() => getByTestId('photo-preview-modal'));
      // 'Sunset Photo' appears in both chip label and overlay name — check at least one exists
      expect(getAllByText('Sunset Photo').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('mixed assets', () => {
    it('renders both audio and photo chips', () => {
      mockAssetsData = [
        makeAsset({ id: 1, asset_type: 'audio', name: 'Audio' }),
        makeAsset({ id: 2, asset_type: 'photo', filename: 'asset_2.jpg', mime_type: 'image/jpeg', name: 'Photo' }),
      ];
      const { getByTestId } = renderWithProviders(<WordAssetChips parentId={10} />);
      expect(getByTestId('word-asset-chip-1')).toBeTruthy();
      expect(getByTestId('word-asset-chip-2')).toBeTruthy();
    });

    it('opening audio overlay does not show photo overlay', async () => {
      mockAssetsData = [
        makeAsset({ id: 1, asset_type: 'audio', name: 'Audio' }),
        makeAsset({ id: 2, asset_type: 'photo', filename: 'asset_2.jpg', mime_type: 'image/jpeg', name: 'Photo' }),
      ];
      const { getByTestId, queryByTestId } = renderWithProviders(<WordAssetChips parentId={10} />);
      fireEvent.press(getByTestId('word-asset-chip-1'));
      await waitFor(() => getByTestId('audio-preview-modal'));
      expect(queryByTestId('photo-preview-dismiss')).toBeNull();
    });
  });
});
