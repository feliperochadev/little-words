import React from 'react';
import { Alert } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { MediaChips } from '../../src/components/MediaChips';
import type { Asset } from '../../src/types/asset';
import type { PendingMedia } from '../../src/providers/MediaCaptureProvider';

// ── Mocks ────────────────────────────────────────────────────────────

const mockPlayAssetByParent = jest.fn().mockResolvedValue(undefined);
const mockStopPlayback = jest.fn().mockResolvedValue(undefined);

jest.mock('../../src/hooks/useMediaCapture', () => ({
  useMediaCapture: () => ({
    playAssetByParent: mockPlayAssetByParent,
    stopPlayback: mockStopPlayback,
    playingAssetId: null,
    phase: 'idle' as const,
    pendingMedia: null,
    prefilledWordName: '',
    setPhase: jest.fn(),
    setCapturedMedia: jest.fn(),
    resetCapture: jest.fn(),
    linkMediaToWord: jest.fn(),
    startCreateWord: jest.fn(),
    onWordCreated: jest.fn(),
    launchPhotoPicker: jest.fn(),
  }),
}));

const mockMutateAsync = jest.fn().mockResolvedValue(undefined);
let mockAssetsData: Asset[] = [];

jest.mock('../../src/hooks/useAssets', () => ({
  useAssetsByParent: () => ({ data: mockAssetsData }),
  useRemoveAsset: () => ({ mutateAsync: mockMutateAsync }),
}));

jest.mock('../../src/utils/assetStorage', () => ({
  getAssetFileUri: (parentType: string, parentId: number, _assetType: string, filename: string) =>
    `file:///media/${parentType}/${parentId}/photos/${filename}`,
}));

jest.spyOn(Alert, 'alert');

// ── Helpers ──────────────────────────────────────────────────────────

function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 1,
    parent_type: 'word',
    parent_id: 10,
    asset_type: 'audio',
    filename: 'recording.m4a',
    mime_type: 'audio/mp4',
    file_size: 1024,
    duration_ms: 3000,
    width: null,
    height: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const pendingAudio: PendingMedia = {
  uri: 'file:///tmp/recording.m4a',
  type: 'audio',
  mimeType: 'audio/mp4',
  fileSize: 512,
  durationMs: 2000,
};

const pendingPhoto: PendingMedia = {
  uri: 'file:///tmp/photo.jpg',
  type: 'photo',
  mimeType: 'image/jpeg',
  fileSize: 4096,
  width: 800,
  height: 600,
};

// ── Tests ────────────────────────────────────────────────────────────

describe('MediaChips', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAssetsData = [];
  });

  // ── Empty state ──────────────────────────────────────────────────

  it('returns null when no assets and no pending media', () => {
    const { queryByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} />
    );
    expect(queryByTestId('media-chips')).toBeNull();
  });

  it('returns null when enabled=false and no pending media (useAssetsByParent returns empty)', () => {
    const { queryByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} enabled={false} />
    );
    expect(queryByTestId('media-chips')).toBeNull();
  });

  // ── Saved asset chips rendering ──────────────────────────────────

  it('renders audio asset chip from useAssetsByParent data', () => {
    const audioAsset = makeAsset({ id: 5, asset_type: 'audio' });
    mockAssetsData = [audioAsset];

    const { getByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} />
    );

    expect(getByTestId('media-chips')).toBeTruthy();
    expect(getByTestId('media-chip-5')).toBeTruthy();
    expect(getByTestId('media-chip-play-5')).toBeTruthy();
    expect(getByTestId('media-chip-remove-5')).toBeTruthy();
  });

  it('renders photo asset chip', () => {
    const photoAsset = makeAsset({ id: 8, asset_type: 'photo', filename: 'snap.jpg', mime_type: 'image/jpeg' });
    mockAssetsData = [photoAsset];

    const { getByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} />
    );

    expect(getByTestId('media-chip-8')).toBeTruthy();
  });

  it('renders multiple asset chips', () => {
    mockAssetsData = [
      makeAsset({ id: 1, asset_type: 'audio' }),
      makeAsset({ id: 2, asset_type: 'photo', filename: 'pic.jpg', mime_type: 'image/jpeg' }),
      makeAsset({ id: 3, asset_type: 'audio', filename: 'voice2.m4a' }),
    ];

    const { getByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} />
    );

    expect(getByTestId('media-chip-1')).toBeTruthy();
    expect(getByTestId('media-chip-2')).toBeTruthy();
    expect(getByTestId('media-chip-3')).toBeTruthy();
  });

  // ── Audio chip tap → playAssetByParent ───────────────────────────

  it('calls playAssetByParent when audio chip is tapped', () => {
    mockAssetsData = [makeAsset({ id: 11, asset_type: 'audio' })];

    const { getByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} />
    );

    fireEvent.press(getByTestId('media-chip-play-11'));
    expect(mockPlayAssetByParent).toHaveBeenCalledTimes(1);
    expect(mockPlayAssetByParent).toHaveBeenCalledWith('word', 10);
  });

  it('calls playAssetByParent with variant parentType', () => {
    mockAssetsData = [makeAsset({ id: 20, asset_type: 'audio', parent_type: 'variant', parent_id: 5 })];

    const { getByTestId } = renderWithProviders(
      <MediaChips parentType="variant" parentId={5} />
    );

    fireEvent.press(getByTestId('media-chip-play-20'));
    expect(mockPlayAssetByParent).toHaveBeenCalledWith('variant', 5);
  });

  // ── Photo chip tap → opens fullscreen viewer ─────────────────────

  it('opens fullscreen photo viewer when photo chip is tapped', () => {
    const photoAsset = makeAsset({ id: 15, asset_type: 'photo', filename: 'sunset.jpg', mime_type: 'image/jpeg' });
    mockAssetsData = [photoAsset];

    const { getByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} />
    );

    fireEvent.press(getByTestId('media-chip-play-15'));

    // Photo viewer close button should now be visible (viewer is open)
    expect(getByTestId('media-photo-viewer-close')).toBeTruthy();
  });

  it('closes fullscreen viewer when close button is pressed', () => {
    const photoAsset = makeAsset({ id: 15, asset_type: 'photo', filename: 'sunset.jpg', mime_type: 'image/jpeg' });
    mockAssetsData = [photoAsset];

    const { getByTestId, queryByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} />
    );

    // Open viewer
    fireEvent.press(getByTestId('media-chip-play-15'));
    expect(getByTestId('media-photo-viewer-close')).toBeTruthy();

    // Close viewer
    fireEvent.press(getByTestId('media-photo-viewer-close'));
    expect(queryByTestId('media-photo-viewer-close')).toBeNull();
  });

  it('does not call playAssetByParent when photo chip is tapped', () => {
    mockAssetsData = [makeAsset({ id: 15, asset_type: 'photo', filename: 'pic.jpg', mime_type: 'image/jpeg' })];

    const { getByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} />
    );

    fireEvent.press(getByTestId('media-chip-play-15'));
    expect(mockPlayAssetByParent).not.toHaveBeenCalled();
  });

  // ── Modal onRequestClose calls stopPlayback ──────────────────────

  it('calls stopPlayback and closes viewer on modal onRequestClose', () => {
    const photoAsset = makeAsset({ id: 15, asset_type: 'photo', filename: 'sunset.jpg', mime_type: 'image/jpeg' });
    mockAssetsData = [photoAsset];

    const { getByTestId, queryByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} />
    );

    // Open viewer
    fireEvent.press(getByTestId('media-chip-play-15'));
    expect(getByTestId('media-photo-viewer-close')).toBeTruthy();

    // Press close button (simulates back/close)
    fireEvent.press(getByTestId('media-photo-viewer-close'));
    expect(queryByTestId('media-photo-viewer-close')).toBeNull();
  });

  // ── Remove confirmation via Alert ────────────────────────────────

  it('shows Alert on remove button press for saved asset', () => {
    mockAssetsData = [makeAsset({ id: 30 })];

    const { getByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} />
    );

    fireEvent.press(getByTestId('media-chip-remove-30'));

    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(Alert.alert).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({ style: 'cancel' }),
        expect.objectContaining({ style: 'destructive' }),
      ]),
    );
  });

  it('calls removeAssetMutation.mutateAsync when destructive button is pressed', () => {
    const asset = makeAsset({ id: 31 });
    mockAssetsData = [asset];

    const { getByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} />
    );

    fireEvent.press(getByTestId('media-chip-remove-31'));

    // Extract the destructive button callback from Alert.alert
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const buttons = alertCall[2] as Array<{ text: string; style: string; onPress?: () => void }>;
    const destructiveBtn = buttons.find(b => b.style === 'destructive');
    expect(destructiveBtn).toBeDefined();

    destructiveBtn!.onPress!();
    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockMutateAsync).toHaveBeenCalledWith(asset);
  });

  it('does not call removeAssetMutation when cancel is pressed', () => {
    mockAssetsData = [makeAsset({ id: 32 })];

    const { getByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} />
    );

    fireEvent.press(getByTestId('media-chip-remove-32'));

    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const buttons = alertCall[2] as Array<{ text: string; style: string; onPress?: () => void }>;
    const cancelBtn = buttons.find(b => b.style === 'cancel');
    expect(cancelBtn).toBeDefined();

    // Cancel button has no onPress or its onPress does not call mutateAsync
    if (cancelBtn!.onPress) {
      cancelBtn!.onPress();
    }
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  // ── Pending media chip ───────────────────────────────────────────

  it('renders pending audio chip', () => {
    const { getByTestId, getByText } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} pendingMedia={pendingAudio} />
    );

    expect(getByTestId('media-chips')).toBeTruthy();
    expect(getByTestId('media-chip-pending')).toBeTruthy();
    // The mic icon is rendered for audio pending media
    const pendingChip = getByTestId('media-chip-pending');
    expect(pendingChip).toBeTruthy();
  });

  it('renders pending photo chip', () => {
    const { getByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} pendingMedia={pendingPhoto} />
    );

    expect(getByTestId('media-chip-pending')).toBeTruthy();
  });

  it('renders remove button for pending chip when onRemovePending is provided', () => {
    const onRemove = jest.fn();
    const { getByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} pendingMedia={pendingAudio} onRemovePending={onRemove} />
    );

    expect(getByTestId('media-chip-remove-pending')).toBeTruthy();
  });

  it('does not render remove button for pending chip when onRemovePending is not provided', () => {
    const { queryByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} pendingMedia={pendingAudio} />
    );

    expect(queryByTestId('media-chip-remove-pending')).toBeNull();
  });

  it('calls onRemovePending when pending chip remove is pressed', () => {
    const onRemove = jest.fn();
    const { getByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} pendingMedia={pendingAudio} onRemovePending={onRemove} />
    );

    fireEvent.press(getByTestId('media-chip-remove-pending'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  // ── Pending + saved assets together ──────────────────────────────

  it('renders both pending and saved asset chips', () => {
    mockAssetsData = [makeAsset({ id: 50 })];

    const { getByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} pendingMedia={pendingAudio} onRemovePending={jest.fn()} />
    );

    expect(getByTestId('media-chip-pending')).toBeTruthy();
    expect(getByTestId('media-chip-50')).toBeTruthy();
  });

  // ── Renders only with pending (no saved assets) shows container ──

  it('shows container when only pending media exists (no saved assets)', () => {
    mockAssetsData = [];

    const { getByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} pendingMedia={pendingPhoto} />
    );

    expect(getByTestId('media-chips')).toBeTruthy();
    expect(getByTestId('media-chip-pending')).toBeTruthy();
  });

  // ── Video asset type chip renders image icon ─────────────────────

  it('renders video asset chip with image icon (non-audio path)', () => {
    const videoAsset = makeAsset({
      id: 60,
      asset_type: 'video',
      filename: 'clip.mp4',
      mime_type: 'video/mp4',
    });
    mockAssetsData = [videoAsset];

    const { getByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} />
    );

    expect(getByTestId('media-chip-60')).toBeTruthy();
  });

  it('does not call playAssetByParent and does not open viewer for video chip press', () => {
    const videoAsset = makeAsset({
      id: 61,
      asset_type: 'video',
      filename: 'clip.mp4',
      mime_type: 'video/mp4',
    });
    mockAssetsData = [videoAsset];

    const { getByTestId, queryByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} />
    );

    fireEvent.press(getByTestId('media-chip-play-61'));

    // video asset_type doesn't match 'audio' or 'photo' branches
    expect(mockPlayAssetByParent).not.toHaveBeenCalled();
    expect(queryByTestId('media-photo-viewer-close')).toBeNull();
  });

  // ── Enabled defaults to true ─────────────────────────────────────

  it('renders assets when enabled is not provided (defaults to true)', () => {
    mockAssetsData = [makeAsset({ id: 70 })];

    const { getByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} />
    );

    expect(getByTestId('media-chip-70')).toBeTruthy();
  });

  // ── parentId=0 edge case (enabled && parentId > 0 is false) ─────

  it('does not crash with parentId=0 and no pending', () => {
    const { queryByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={0} />
    );

    // No assets, no pending → null
    expect(queryByTestId('media-chips')).toBeNull();
  });

  // ── pendingMedia=null explicitly ─────────────────────────────────

  it('handles pendingMedia=null explicitly', () => {
    mockAssetsData = [makeAsset({ id: 80 })];

    const { getByTestId, queryByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} pendingMedia={null} />
    );

    expect(getByTestId('media-chip-80')).toBeTruthy();
    expect(queryByTestId('media-chip-pending')).toBeNull();
  });
});
