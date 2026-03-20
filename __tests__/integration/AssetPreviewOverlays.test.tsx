import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { AssetPreviewOverlays } from '../../src/components/AssetPreviewOverlays';
import type { AudioOverlayState, PhotoOverlayState } from '../../src/types/asset';

// ── Mocks ────────────────────────────────────────────────────────────

jest.mock('../../src/hooks/useAudioPlayer', () => ({
  useAudioPlayer: () => ({
    isPlaying: false,
    durationMs: 0,
    play: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    unload: jest.fn(),
  }),
}));

// ── Fixtures ─────────────────────────────────────────────────────────

const audioOverlay: AudioOverlayState = {
  uri: 'file:///media/word/1/audio/rec.m4a',
  name: 'My Recording',
  createdAt: '2026-01-15T00:00:00Z',
  durationMs: 5000,
};

const photoOverlay: PhotoOverlayState = {
  uri: 'file:///media/word/1/photo/pic.jpg',
  name: 'My Photo',
  createdAt: '2026-01-15T00:00:00Z',
};

// ── Tests ────────────────────────────────────────────────────────────

describe('AssetPreviewOverlays', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('AudioPreviewOverlay slot', () => {
    it('renders AudioPreviewOverlay when audioOverlay is set', () => {
      const { getByTestId } = renderWithProviders(
        <AssetPreviewOverlays
          audioOverlay={audioOverlay}
          photoOverlay={null}
          onCloseAudio={jest.fn()}
          onClosePhoto={jest.fn()}
        />
      );
      expect(getByTestId('audio-preview-modal')).toBeTruthy();
    });

    it('does not render AudioPreviewOverlay content when audioOverlay is null', () => {
      const { queryByTestId } = renderWithProviders(
        <AssetPreviewOverlays
          audioOverlay={null}
          photoOverlay={null}
          onCloseAudio={jest.fn()}
          onClosePhoto={jest.fn()}
        />
      );
      expect(queryByTestId('audio-preview-backdrop')).toBeNull();
    });

    it('passes name to AudioPreviewOverlay', () => {
      const { getByTestId } = renderWithProviders(
        <AssetPreviewOverlays
          audioOverlay={audioOverlay}
          photoOverlay={null}
          onCloseAudio={jest.fn()}
          onClosePhoto={jest.fn()}
        />
      );
      expect(getByTestId('audio-preview-name').props.children).toBe('My Recording');
    });

    it('calls onCloseAudio when audio overlay backdrop is pressed', () => {
      const onCloseAudio = jest.fn();
      const { getByTestId } = renderWithProviders(
        <AssetPreviewOverlays
          audioOverlay={audioOverlay}
          photoOverlay={null}
          onCloseAudio={onCloseAudio}
          onClosePhoto={jest.fn()}
        />
      );
      fireEvent.press(getByTestId('audio-preview-backdrop'));
      expect(onCloseAudio).toHaveBeenCalledTimes(1);
    });

    it('passes durationMs to AudioPreviewOverlay', () => {
      const { getByTestId } = renderWithProviders(
        <AssetPreviewOverlays
          audioOverlay={{ ...audioOverlay, durationMs: 65000 }}
          photoOverlay={null}
          onCloseAudio={jest.fn()}
          onClosePhoto={jest.fn()}
        />
      );
      expect(getByTestId('audio-preview-duration').props.children).toBe('1:05');
    });

    it('renders waveform in AudioPreviewOverlay', () => {
      const { getByTestId } = renderWithProviders(
        <AssetPreviewOverlays
          audioOverlay={audioOverlay}
          photoOverlay={null}
          onCloseAudio={jest.fn()}
          onClosePhoto={jest.fn()}
        />
      );
      expect(getByTestId('audio-preview-waveform')).toBeTruthy();
    });
  });

  describe('PhotoPreviewOverlay slot', () => {
    it('renders PhotoPreviewOverlay when photoOverlay is set', () => {
      const { getByTestId } = renderWithProviders(
        <AssetPreviewOverlays
          audioOverlay={null}
          photoOverlay={photoOverlay}
          onCloseAudio={jest.fn()}
          onClosePhoto={jest.fn()}
        />
      );
      expect(getByTestId('photo-preview-modal')).toBeTruthy();
    });

    it('does not render PhotoPreviewOverlay content when photoOverlay is null', () => {
      const { queryByTestId } = renderWithProviders(
        <AssetPreviewOverlays
          audioOverlay={null}
          photoOverlay={null}
          onCloseAudio={jest.fn()}
          onClosePhoto={jest.fn()}
        />
      );
      expect(queryByTestId('photo-preview-image')).toBeNull();
    });

    it('calls onClosePhoto when photo overlay dismiss is pressed', () => {
      const onClosePhoto = jest.fn();
      const { getByTestId } = renderWithProviders(
        <AssetPreviewOverlays
          audioOverlay={null}
          photoOverlay={photoOverlay}
          onCloseAudio={jest.fn()}
          onClosePhoto={onClosePhoto}
        />
      );
      fireEvent.press(getByTestId('photo-preview-dismiss'));
      expect(onClosePhoto).toHaveBeenCalledTimes(1);
    });
  });

  describe('both overlays', () => {
    it('can render both overlays simultaneously', () => {
      const { getByTestId } = renderWithProviders(
        <AssetPreviewOverlays
          audioOverlay={audioOverlay}
          photoOverlay={photoOverlay}
          onCloseAudio={jest.fn()}
          onClosePhoto={jest.fn()}
        />
      );
      expect(getByTestId('audio-preview-modal')).toBeTruthy();
      expect(getByTestId('photo-preview-modal')).toBeTruthy();
    });

    it('onCloseAudio does not affect photo overlay', () => {
      const onCloseAudio = jest.fn();
      const { getByTestId } = renderWithProviders(
        <AssetPreviewOverlays
          audioOverlay={audioOverlay}
          photoOverlay={photoOverlay}
          onCloseAudio={onCloseAudio}
          onClosePhoto={jest.fn()}
        />
      );
      fireEvent.press(getByTestId('audio-preview-backdrop'));
      // photo overlay modal still present
      expect(getByTestId('photo-preview-modal')).toBeTruthy();
    });

    it('renders neither overlay when both are null', () => {
      const { queryByTestId } = renderWithProviders(
        <AssetPreviewOverlays
          audioOverlay={null}
          photoOverlay={null}
          onCloseAudio={jest.fn()}
          onClosePhoto={jest.fn()}
        />
      );
      expect(queryByTestId('audio-preview-backdrop')).toBeNull();
      expect(queryByTestId('photo-preview-image')).toBeNull();
    });
  });
});
