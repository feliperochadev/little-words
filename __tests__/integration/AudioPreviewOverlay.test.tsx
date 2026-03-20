import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { AudioPreviewOverlay } from '../../src/components/AudioPreviewOverlay';

// ── Mocks ────────────────────────────────────────────────────────────

const mockPlay = jest.fn().mockResolvedValue(undefined);
const mockStop = jest.fn().mockResolvedValue(undefined);
let mockIsPlaying = false;

jest.mock('../../src/hooks/useAudioPlayer', () => ({
  useAudioPlayer: () => ({
    isPlaying: mockIsPlaying,
    durationMs: 0,
    play: mockPlay,
    stop: mockStop,
    unload: jest.fn(),
  }),
}));

// ── Helpers ──────────────────────────────────────────────────────────

interface OverlayProps {
  visible?: boolean;
  uri?: string;
  name?: string;
  createdAt?: string;
  durationMs?: number | null;
  onClose?: () => void;
}

const DEFAULT_PROPS: Required<OverlayProps> = {
  visible: true,
  uri: 'file:///media/word/1/audio/asset_1.m4a',
  name: 'My Recording',
  createdAt: '2026-01-15T00:00:00Z',
  durationMs: 65000,
  onClose: jest.fn(),
};

function renderOverlay(props: OverlayProps = {}) {
  const merged = { ...DEFAULT_PROPS, ...props };
  return renderWithProviders(
    <AudioPreviewOverlay {...merged} />
  );
}

// ── Tests ────────────────────────────────────────────────────────────

describe('AudioPreviewOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPlaying = false;
  });

  describe('visibility', () => {
    it('renders modal when visible=true', () => {
      const { getByTestId } = renderOverlay();
      expect(getByTestId('audio-preview-modal')).toBeTruthy();
    });

    it('hides modal when visible=false', () => {
      const { queryByTestId } = renderOverlay({ visible: false });
      // Modal with visible=false does not render children
      expect(queryByTestId('audio-preview-backdrop')).toBeNull();
    });
  });

  describe('content display', () => {
    it('shows the asset name', () => {
      const { getByTestId } = renderOverlay();
      expect(getByTestId('audio-preview-name').props.children).toBe('My Recording');
    });

    it('shows formatted date', () => {
      const { getByTestId } = renderOverlay({ createdAt: '2026-01-15T00:00:00Z' });
      const dateEl = getByTestId('audio-preview-date');
      // formatDateDMY returns DD/MM/YYYY
      expect(dateEl.props.children).toMatch(/15/);
    });

    it('shows duration for audio with durationMs > 0', () => {
      const { getByTestId } = renderOverlay({ durationMs: 65000 });
      expect(getByTestId('audio-preview-duration').props.children).toBe('1:05');
    });

    it('hides duration when durationMs is 0', () => {
      // duration > 0 required to show element
      const { queryByTestId } = renderOverlay({ durationMs: 0 });
      expect(queryByTestId('audio-preview-duration')).toBeNull();
    });

    it('hides duration when durationMs is null', () => {
      const { queryByTestId } = renderOverlay({ durationMs: null });
      expect(queryByTestId('audio-preview-duration')).toBeNull();
    });

    it('hides duration when durationMs is undefined', () => {
      const { queryByTestId } = renderOverlay({ durationMs: undefined });
      expect(queryByTestId('audio-preview-duration')).toBeNull();
    });

    it('renders waveform container', () => {
      const { getByTestId } = renderOverlay();
      expect(getByTestId('audio-preview-waveform')).toBeTruthy();
    });

    it('renders play button', () => {
      const { getByTestId } = renderOverlay();
      expect(getByTestId('audio-preview-play')).toBeTruthy();
    });

    it('renders backdrop', () => {
      const { getByTestId } = renderOverlay();
      expect(getByTestId('audio-preview-backdrop')).toBeTruthy();
    });
  });

  describe('play button interaction', () => {
    it('calls play with the uri when not playing', async () => {
      mockIsPlaying = false;
      const { getByTestId } = renderOverlay();
      fireEvent.press(getByTestId('audio-preview-play'));
      await waitFor(() => {
        expect(mockPlay).toHaveBeenCalledWith(DEFAULT_PROPS.uri);
      });
    });

    it('calls stop when already playing', async () => {
      mockIsPlaying = true;
      const { getByTestId } = renderOverlay();
      fireEvent.press(getByTestId('audio-preview-play'));
      await waitFor(() => {
        expect(mockStop).toHaveBeenCalled();
      });
    });
  });

  describe('dismiss behavior', () => {
    it('calls onClose when backdrop is pressed', async () => {
      const onClose = jest.fn();
      const { getByTestId } = renderOverlay({ onClose });
      fireEvent.press(getByTestId('audio-preview-backdrop'));
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('stops audio when backdrop is pressed', async () => {
      const { getByTestId } = renderOverlay();
      fireEvent.press(getByTestId('audio-preview-backdrop'));
      await waitFor(() => {
        expect(mockStop).toHaveBeenCalled();
      });
    });

    it('stops audio when visibility changes to false', async () => {
      const { rerender } = renderOverlay({ visible: true });
      rerender(
        <AudioPreviewOverlay {...DEFAULT_PROPS} visible={false} />
      );
      await waitFor(() => {
        expect(mockStop).toHaveBeenCalled();
      });
    });
  });
});
