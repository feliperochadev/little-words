import React from 'react';
import { Alert } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { MediaChips } from '../../src/components/MediaChips';
import type { Asset } from '../../src/types/asset';
import type { PendingMedia } from '../../src/providers/MediaCaptureProvider';

// ── Mocks ────────────────────────────────────────────────────────────

const mockMutateAsync = jest.fn().mockResolvedValue(undefined);
let mockAssetsData: Asset[] = [];

jest.mock('../../src/hooks/useAssets', () => ({
  useAssetsByParent: () => ({ data: mockAssetsData }),
  useRemoveAsset: () => ({ mutateAsync: mockMutateAsync }),
}));

jest.mock('../../src/utils/assetStorage', () => ({
  getAssetFileUri: (parentType: string, parentId: number, assetType: string, filename: string) =>
    `file:///media/${parentType}/${parentId}/${assetType}/${filename}`,
}));

const mockAudioPlay = jest.fn().mockResolvedValue(undefined);
const mockAudioStop = jest.fn().mockResolvedValue(undefined);

jest.mock('../../src/hooks/useAudioPlayer', () => ({
  useAudioPlayer: () => ({
    isPlaying: false,
    durationMs: 0,
    play: mockAudioPlay,
    stop: mockAudioStop,
    unload: jest.fn(),
  }),
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
    name: 'audio_1',
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
    const photoAsset = makeAsset({ id: 8, asset_type: 'photo', filename: 'snap.jpg', mime_type: 'image/jpeg', name: 'photo_8' });
    mockAssetsData = [photoAsset];

    const { getByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} />
    );

    expect(getByTestId('media-chip-8')).toBeTruthy();
  });

  it('renders multiple asset chips', () => {
    mockAssetsData = [
      makeAsset({ id: 1, asset_type: 'audio' }),
      makeAsset({ id: 2, asset_type: 'photo', filename: 'pic.jpg', mime_type: 'image/jpeg', name: 'photo_2' }),
      makeAsset({ id: 3, asset_type: 'audio', filename: 'voice2.m4a', name: 'audio_3' }),
    ];

    const { getByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} />
    );

    expect(getByTestId('media-chip-1')).toBeTruthy();
    expect(getByTestId('media-chip-2')).toBeTruthy();
    expect(getByTestId('media-chip-3')).toBeTruthy();
  });

  // ── Audio chip tap → opens AudioPreviewOverlay ───────────────────

  it('opens AudioPreviewOverlay when audio chip is tapped', () => {
    mockAssetsData = [makeAsset({ id: 11, asset_type: 'audio', name: 'My Recording' })];

    const { getByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} />
    );

    fireEvent.press(getByTestId('media-chip-play-11'));
    expect(getByTestId('audio-preview-modal')).toBeTruthy();
  });

  // ── Photo chip tap → opens PhotoPreviewOverlay ───────────────────

  it('opens PhotoPreviewOverlay when photo chip is tapped', () => {
    const photoAsset = makeAsset({ id: 15, asset_type: 'photo', filename: 'sunset.jpg', mime_type: 'image/jpeg', name: 'Sunset' });
    mockAssetsData = [photoAsset];

    const { getByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} />
    );

    fireEvent.press(getByTestId('media-chip-play-15'));
    expect(getByTestId('photo-preview-modal')).toBeTruthy();
  });

  it('closes PhotoPreviewOverlay when dismiss is pressed', () => {
    const photoAsset = makeAsset({ id: 15, asset_type: 'photo', filename: 'sunset.jpg', mime_type: 'image/jpeg', name: 'Sunset' });
    mockAssetsData = [photoAsset];

    const { getByTestId, queryByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} />
    );

    fireEvent.press(getByTestId('media-chip-play-15'));
    expect(getByTestId('photo-preview-modal')).toBeTruthy();

    fireEvent.press(getByTestId('photo-preview-dismiss'));
    expect(queryByTestId('photo-preview-image')).toBeNull();
  });

  it('does not open overlay for video chip (noop)', () => {
    const videoAsset = makeAsset({
      id: 61,
      asset_type: 'video',
      filename: 'clip.mp4',
      mime_type: 'video/mp4',
      name: 'video_61',
    });
    mockAssetsData = [videoAsset];

    const { getByTestId, queryByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} />
    );

    fireEvent.press(getByTestId('media-chip-play-61'));

    expect(queryByTestId('audio-preview-modal')).toBeNull();
    expect(queryByTestId('photo-preview-modal')).toBeNull();
  });

  // ── Asset name display ───────────────────────────────────────────

  it('shows asset name in chip when name is set', () => {
    mockAssetsData = [makeAsset({ id: 99, name: 'My First Word' })];

    const { getByText } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} />
    );

    expect(getByText('My First Word')).toBeTruthy();
  });

  it('falls back to filename when name is null', () => {
    mockAssetsData = [makeAsset({ id: 99, name: null, filename: 'asset_99.m4a' })];

    const { getByText } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} />
    );

    expect(getByText('asset_99.m4a')).toBeTruthy();
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

    if (cancelBtn!.onPress) {
      cancelBtn!.onPress();
    }
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  // ── Pending media chip ───────────────────────────────────────────

  it('renders pending audio chip', () => {
    const { getByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} pendingMedia={pendingAudio} />
    );

    expect(getByTestId('media-chips')).toBeTruthy();
    expect(getByTestId('media-chip-pending')).toBeTruthy();
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

  it('shows container when only pending media exists (no saved assets)', () => {
    mockAssetsData = [];

    const { getByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} pendingMedia={pendingPhoto} />
    );

    expect(getByTestId('media-chips')).toBeTruthy();
    expect(getByTestId('media-chip-pending')).toBeTruthy();
  });

  it('renders video asset chip (non-audio, non-photo)', () => {
    const videoAsset = makeAsset({
      id: 60,
      asset_type: 'video',
      filename: 'clip.mp4',
      mime_type: 'video/mp4',
      name: 'video_60',
    });
    mockAssetsData = [videoAsset];

    const { getByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} />
    );

    expect(getByTestId('media-chip-60')).toBeTruthy();
  });

  it('renders assets when enabled is not provided (defaults to true)', () => {
    mockAssetsData = [makeAsset({ id: 70 })];

    const { getByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} />
    );

    expect(getByTestId('media-chip-70')).toBeTruthy();
  });

  it('does not crash with parentId=0 and no pending', () => {
    const { queryByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={0} />
    );

    expect(queryByTestId('media-chips')).toBeNull();
  });

  it('handles pendingMedia=null explicitly', () => {
    mockAssetsData = [makeAsset({ id: 80 })];

    const { getByTestId, queryByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} pendingMedia={null} />
    );

    expect(getByTestId('media-chip-80')).toBeTruthy();
    expect(queryByTestId('media-chip-pending')).toBeNull();
  });

  // ── Overflow chip (MAX_VISIBLE = 4) ──────────────────────────────

  it('shows overflow chip when assets exceed 4', () => {
    mockAssetsData = [
      makeAsset({ id: 1 }),
      makeAsset({ id: 2, name: 'audio_2' }),
      makeAsset({ id: 3, name: 'audio_3' }),
      makeAsset({ id: 4, name: 'audio_4' }),
      makeAsset({ id: 5, name: 'audio_5' }),
    ];

    const { getByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} />
    );

    expect(getByTestId('media-chips-overflow')).toBeTruthy();
    // Only first 4 visible
    expect(getByTestId('media-chip-1')).toBeTruthy();
    expect(getByTestId('media-chip-4')).toBeTruthy();
  });

  // ── separateRows layout ──────────────────────────────────────────

  it('renders audio row and photo row in separateRows mode', () => {
    mockAssetsData = [
      makeAsset({ id: 1, asset_type: 'audio', name: 'rec1' }),
      makeAsset({ id: 2, asset_type: 'photo', filename: 'pic.jpg', mime_type: 'image/jpeg', name: 'pic2' }),
    ];

    const { getByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} separateRows />
    );

    expect(getByTestId('media-chips-audio')).toBeTruthy();
    expect(getByTestId('media-chips-photos')).toBeTruthy();
  });

  it('renders pending audio chip in audio row (separateRows)', () => {
    const { getByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} pendingMedia={pendingAudio} separateRows />
    );

    expect(getByTestId('media-chips-audio')).toBeTruthy();
    expect(getByTestId('media-chip-pending')).toBeTruthy();
  });

  it('renders pending photo chip in photo row (separateRows)', () => {
    const { getByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} pendingMedia={pendingPhoto} separateRows />
    );

    expect(getByTestId('media-chips-photos')).toBeTruthy();
    expect(getByTestId('media-chip-pending')).toBeTruthy();
  });

  it('opens AudioPreviewOverlay in separateRows mode when audio chip is tapped', () => {
    mockAssetsData = [makeAsset({ id: 11, asset_type: 'audio', name: 'My Audio' })];

    const { getByTestId } = renderWithProviders(
      <MediaChips parentType="word" parentId={10} separateRows />
    );

    fireEvent.press(getByTestId('media-chip-play-11'));
    expect(getByTestId('audio-preview-modal')).toBeTruthy();
  });
});
