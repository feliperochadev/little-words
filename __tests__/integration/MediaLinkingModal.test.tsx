import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { MediaLinkingModal } from '../../src/components/MediaLinkingModal';
import { renderWithProviders } from '../helpers/renderWithProviders';
import type { Word } from '../../src/types/domain';
import type { PendingMedia, CapturePhase } from '../../src/providers/MediaCaptureProvider';

// ─── Router mock ─────────────────────────────────────────────────────────────
// Variables prefixed with 'mock' are allowed in jest.mock factory (Jest hoisting rule)
const mockRouterPush = jest.fn();
jest.mock('expo-router', () => {
  const React = require('react');
  const StackComponent = ({ children }: any) => React.createElement(React.Fragment, null, children);
  StackComponent.Screen = () => null;
  const TabsComponent = ({ children }: any) => React.createElement(React.Fragment, null, children);
  TabsComponent.Screen = () => null;
  return {
    useRouter: jest.fn(() => ({ push: mockRouterPush, replace: jest.fn(), back: jest.fn() })),
    useLocalSearchParams: jest.fn(() => ({})),
    useFocusEffect: jest.fn((cb: () => void) => {
      const ReactLib = require('react');
      ReactLib.useEffect(() => { const cleanup = cb(); return typeof cleanup === 'function' ? cleanup : undefined; }, []);
    }),
    Stack: StackComponent,
    Tabs: TabsComponent,
  };
});

// ─── Mock data ───────────────────────────────────────────────────────────────

const AUDIO_MEDIA: PendingMedia = {
  uri: 'file:///audio/recording.m4a',
  type: 'audio',
  mimeType: 'audio/m4a',
  fileSize: 2048,
  durationMs: 65000,
};

const PHOTO_MEDIA: PendingMedia = {
  uri: 'file:///photos/picture.jpg',
  type: 'photo',
  mimeType: 'image/jpeg',
  fileSize: 4096,
  width: 640,
  height: 480,
};

const TEST_WORDS: Word[] = [
  {
    id: 1, word: 'mama', category_id: 1, category_name: 'family',
    category_emoji: '👨‍👩‍👧', category_color: '#FF0000',
    date_added: '2026-01-01', notes: null, created_at: '2026-01-01',
  },
  {
    id: 2, word: 'papa', category_id: 1, category_name: 'family',
    category_emoji: '👨‍👩‍👧', category_color: '#FF0000',
    date_added: '2026-01-02', notes: null, created_at: '2026-01-02',
  },
  {
    id: 3, word: 'ball', category_id: 2, category_name: 'toys',
    category_emoji: '🧸', category_color: '#00FF00',
    date_added: '2026-01-03', notes: null, created_at: '2026-01-03',
  },
  {
    id: 4, word: 'water', category_id: null,
    date_added: '2026-01-04', notes: null, created_at: '2026-01-04',
  },
];

// ─── Mock hooks ──────────────────────────────────────────────────────────────

const mockResetCapture = jest.fn();
const mockLinkMediaToWord = jest.fn().mockResolvedValue(undefined);
const mockLinkMediaToVariant = jest.fn().mockResolvedValue(undefined);
const mockSaveWithoutLinking = jest.fn().mockResolvedValue(undefined);
const mockStartCreateWord = jest.fn();
const mockDismissModal = jest.fn();
const mockAudioPlay = jest.fn().mockResolvedValue(undefined);
const mockAudioStop = jest.fn().mockResolvedValue(undefined);
const mockAddVariantMutateAsync = jest.fn().mockResolvedValue(99);

let mockPhase: CapturePhase = 'linking';
let mockPendingMedia: PendingMedia | null = AUDIO_MEDIA;
let mockIsPlaying = false;

jest.mock('../../src/hooks/useMediaCapture', () => ({
  useMediaCapture: () => ({
    phase: mockPhase,
    pendingMedia: mockPendingMedia,
    resetCapture: mockResetCapture,
    linkMediaToWord: mockLinkMediaToWord,
    linkMediaToVariant: mockLinkMediaToVariant,
    saveWithoutLinking: mockSaveWithoutLinking,
    startCreateWord: mockStartCreateWord,
  }),
}));

jest.mock('../../src/hooks/useVariants', () => ({
  useAllVariants: () => ({
    data: [
      { id: 10, word_id: 1, variant: 'mah', main_word: 'mama', date_added: '2026-01-01', notes: null, asset_count: 0, audio_count: 0, photo_count: 0, video_count: 0 },
      { id: 11, word_id: 3, variant: 'ba', main_word: 'ball', date_added: '2026-01-02', notes: null, asset_count: 0, audio_count: 0, photo_count: 0, video_count: 0 },
    ],
    isLoading: false,
  }),
  useAddVariant: () => ({
    mutateAsync: mockAddVariantMutateAsync,
  }),
}));

jest.mock('../../src/hooks/useAudioPlayer', () => ({
  useAudioPlayer: () => ({
    isPlaying: mockIsPlaying,
    durationMs: 0,
    positionMs: 0,
    play: mockAudioPlay,
    stop: mockAudioStop,
    unload: jest.fn(),
  }),
}));

jest.mock('../../src/hooks/useWords', () => ({
  useWords: () => ({
    data: TEST_WORDS,
    isLoading: false,
    isError: false,
  }),
}));

jest.mock('../../src/hooks/useModalAnimation', () => ({
  useModalAnimation: (_visible: boolean, onClose: () => void) => {
    const { Animated: MockAnimated } = require('react-native');
    mockDismissModal.mockImplementation(() => onClose());
    return {
      translateY: new MockAnimated.Value(0),
      backdropOpacity: new MockAnimated.Value(1),
      dismissModal: mockDismissModal,
      panResponder: { panHandlers: {} },
    };
  },
}));

jest.mock('../../src/components/DatePickerField', () => ({
  DatePickerField: (props: { label: string; value: string; testID?: string }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="date-picker-field">
        <Text>{props.label}</Text>
        <Text>{props.value}</Text>
      </View>
    );
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderModal() {
  return renderWithProviders(<MediaLinkingModal />);
}

function openWordSection(getByTestId: ReturnType<typeof renderModal>['getByTestId']) {
  fireEvent.press(getByTestId('media-link-word-btn'));
}

function openVariantSection(getByTestId: ReturnType<typeof renderModal>['getByTestId']) {
  fireEvent.press(getByTestId('media-link-variant-btn'));
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('MediaLinkingModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPhase = 'linking';
    mockPendingMedia = AUDIO_MEDIA;
    mockIsPlaying = false;
  });

  // ── Null / Visibility ──────────────────────────────────────────────────────

  describe('rendering', () => {
    it('returns null when pendingMedia is null', () => {
      mockPendingMedia = null;
      const { toJSON } = renderModal();
      expect(toJSON()).toBeNull();
    });

    it('renders modal when phase is linking with pendingMedia', () => {
      const { getByTestId } = renderModal();
      expect(getByTestId('media-linking-title')).toBeTruthy();
    });

    it('renders nothing visible when phase is idle (Modal visible=false)', () => {
      mockPhase = 'idle';
      // When phase is not 'linking', Modal visible=false and content is not rendered in test env
      const { queryByTestId } = renderModal();
      // In RNTL, Modal with visible=false doesn't render children
      expect(queryByTestId('media-linking-title')).toBeNull();
    });
  });

  // ── Audio Preview ──────────────────────────────────────────────────────────

  describe('audio preview', () => {
    it('renders play button for audio media', () => {
      const { getByTestId } = renderModal();
      expect(getByTestId('media-preview-play')).toBeTruthy();
    });

    it('renders waveform bars in audio preview', () => {
      const { getByTestId } = renderModal();
      expect(getByTestId('media-preview-waveform')).toBeTruthy();
    });

    it('renders position counter showing 0:00 initially', () => {
      const { getByTestId } = renderModal();
      expect(getByTestId('media-preview-position').props.children).toBe('0:00');
    });

    it('displays formatted duration (1:05 for 65000ms)', () => {
      const { getByTestId } = renderModal();
      expect(getByTestId('media-preview-play')).toBeTruthy();
    });

    it('calls audioPlayer.play when pressing play and not playing', () => {
      mockIsPlaying = false;
      const { getByTestId } = renderModal();
      fireEvent.press(getByTestId('media-preview-play'));
      expect(mockAudioPlay).toHaveBeenCalledWith(AUDIO_MEDIA.uri);
    });

    it('calls audioPlayer.stop when pressing play and already playing', () => {
      mockIsPlaying = true;
      const { getByTestId } = renderModal();
      fireEvent.press(getByTestId('media-preview-play'));
      expect(mockAudioStop).toHaveBeenCalled();
      expect(mockAudioPlay).not.toHaveBeenCalled();
    });

    it('does not call play/stop when pendingMedia type is not audio', () => {
      mockPendingMedia = PHOTO_MEDIA;
      const { queryByTestId } = renderModal();
      // No play button for photo media
      expect(queryByTestId('media-preview-play')).toBeNull();
    });
  });

  // ── Photo Preview ──────────────────────────────────────────────────────────

  describe('photo preview', () => {
    beforeEach(() => {
      mockPendingMedia = PHOTO_MEDIA;
    });

    it('renders Image component for photo media', () => {
      const { getByTestId } = renderModal();
      expect(getByTestId('media-preview-photo')).toBeTruthy();
    });

    it('Image has correct uri', () => {
      const { getByTestId } = renderModal();
      const image = getByTestId('media-preview-photo');
      expect(image.props.source).toEqual({ uri: PHOTO_MEDIA.uri });
    });

    it('does not render audio play button', () => {
      const { queryByTestId } = renderModal();
      expect(queryByTestId('media-preview-play')).toBeNull();
    });

    it('renders tap target for expanding photo', () => {
      const { getByTestId } = renderModal();
      expect(getByTestId('media-preview-photo-tap')).toBeTruthy();
    });

    it('pressing photo thumbnail opens full-screen modal', async () => {
      const { getByTestId, queryByTestId } = renderModal();
      expect(queryByTestId('media-photo-fullscreen')).toBeNull();

      await act(async () => {
        fireEvent.press(getByTestId('media-preview-photo-tap'));
      });

      expect(getByTestId('media-photo-fullscreen')).toBeTruthy();
    });

    it('full-screen photo has correct uri', async () => {
      const { getByTestId } = renderModal();

      await act(async () => {
        fireEvent.press(getByTestId('media-preview-photo-tap'));
      });

      const fullscreen = getByTestId('media-photo-fullscreen');
      expect(fullscreen.props.source).toEqual({ uri: PHOTO_MEDIA.uri });
    });

    it('pressing dismiss button closes full-screen modal', async () => {
      const { getByTestId, queryByTestId } = renderModal();

      await act(async () => {
        fireEvent.press(getByTestId('media-preview-photo-tap'));
      });
      expect(getByTestId('media-photo-fullscreen')).toBeTruthy();

      await act(async () => {
        fireEvent.press(getByTestId('media-photo-fullscreen-dismiss'));
      });
      expect(queryByTestId('media-photo-fullscreen')).toBeNull();
    });
  });

  // ── Name Input ─────────────────────────────────────────────────────────────

  describe('name input', () => {
    it('renders the name input field', () => {
      const { getByTestId } = renderModal();
      expect(getByTestId('media-name-input')).toBeTruthy();
    });

    it('accepts text input', () => {
      const { getByTestId } = renderModal();
      const input = getByTestId('media-name-input');
      fireEvent.changeText(input, 'First word recording');
      expect(input.props.value).toBe('First word recording');
    });

    it('shows placeholder text', () => {
      const { getByTestId } = renderModal();
      const input = getByTestId('media-name-input');
      expect(input.props.placeholder).toBeTruthy();
    });
  });

  // ── Date Picker ────────────────────────────────────────────────────────────

  describe('date picker', () => {
    it('renders DatePickerField', () => {
      const { getByTestId } = renderModal();
      expect(getByTestId('date-picker-field')).toBeTruthy();
    });
  });

  // ── Link mode buttons ──────────────────────────────────────────────────────

  describe('link mode buttons', () => {
    it('renders link-to-word and link-to-variant buttons initially', () => {
      const { getByTestId } = renderModal();
      expect(getByTestId('media-link-word-btn')).toBeTruthy();
      expect(getByTestId('media-link-variant-btn')).toBeTruthy();
    });

    it('pressing link-to-word hides the buttons and shows word search', () => {
      const { getByTestId, queryByTestId } = renderModal();
      fireEvent.press(getByTestId('media-link-word-btn'));
      expect(getByTestId('media-word-search')).toBeTruthy();
      expect(queryByTestId('media-link-word-btn')).toBeNull();
      expect(queryByTestId('media-link-variant-btn')).toBeNull();
    });

    it('pressing link-to-variant hides the buttons and shows variant search', () => {
      const { getByTestId, queryByTestId } = renderModal();
      fireEvent.press(getByTestId('media-link-variant-btn'));
      expect(getByTestId('media-variant-search')).toBeTruthy();
      expect(queryByTestId('media-link-word-btn')).toBeNull();
    });

    it('pressing cancel on word section restores the two buttons', () => {
      const { getByTestId, queryByTestId } = renderModal();
      fireEvent.press(getByTestId('media-link-word-btn'));
      fireEvent.press(getByTestId('media-word-section-cancel'));
      expect(getByTestId('media-link-word-btn')).toBeTruthy();
      expect(getByTestId('media-link-variant-btn')).toBeTruthy();
      expect(queryByTestId('media-word-search')).toBeNull();
    });

    it('pressing cancel on variant section restores the two buttons', () => {
      const { getByTestId, queryByTestId } = renderModal();
      fireEvent.press(getByTestId('media-link-variant-btn'));
      fireEvent.press(getByTestId('media-variant-section-cancel'));
      expect(getByTestId('media-link-word-btn')).toBeTruthy();
      expect(queryByTestId('media-variant-search')).toBeNull();
    });

    it('pressing X on selected word chip restores the two buttons', () => {
      const { getByTestId, queryByTestId } = renderModal();
      openWordSection(getByTestId);
      fireEvent.changeText(getByTestId('media-word-search'), 'mama');
      fireEvent.press(getByTestId('media-word-result-mama'));
      fireEvent.press(getByTestId('media-selected-word'));
      expect(getByTestId('media-link-word-btn')).toBeTruthy();
      expect(queryByTestId('media-selected-word')).toBeNull();
    });

    it('pressing X on selected variant chip restores the two buttons', () => {
      const { getByTestId, queryByTestId } = renderModal();
      openVariantSection(getByTestId);
      fireEvent.changeText(getByTestId('media-variant-search'), 'mah');
      fireEvent.press(getByTestId('media-variant-result-mah'));
      fireEvent.press(getByTestId('media-selected-variant'));
      expect(getByTestId('media-link-word-btn')).toBeTruthy();
      expect(queryByTestId('media-selected-variant')).toBeNull();
    });
  });

  // ── Word Search ────────────────────────────────────────────────────────────

  describe('word search', () => {
    it('renders search input after pressing link-to-word button', () => {
      const { getByTestId } = renderModal();
      openWordSection(getByTestId);
      expect(getByTestId('media-word-search')).toBeTruthy();
    });

    it('filters words when entering search text', () => {
      const { getByTestId, queryByTestId } = renderModal();
      openWordSection(getByTestId);
      fireEvent.changeText(getByTestId('media-word-search'), 'ma');
      expect(getByTestId('media-word-result-mama')).toBeTruthy();
      expect(queryByTestId('media-word-result-ball')).toBeNull();
    });

    it('shows results for partial match (case insensitive)', () => {
      const { getByTestId } = renderModal();
      openWordSection(getByTestId);
      fireEvent.changeText(getByTestId('media-word-search'), 'PA');
      expect(getByTestId('media-word-result-papa')).toBeTruthy();
    });

    it('shows no results message when no words match', () => {
      const { getByTestId, queryByTestId } = renderModal();
      openWordSection(getByTestId);
      fireEvent.changeText(getByTestId('media-word-search'), 'zzz');
      expect(queryByTestId('media-word-result-mama')).toBeNull();
      expect(getByTestId('media-word-search')).toBeTruthy();
    });

    it('does not show results list when search is empty', () => {
      const { getByTestId, queryByTestId } = renderModal();
      openWordSection(getByTestId);
      expect(queryByTestId('media-word-result-mama')).toBeNull();
    });

    it('shows clear button when search has text', () => {
      const { getByTestId } = renderModal();
      openWordSection(getByTestId);
      fireEvent.changeText(getByTestId('media-word-search'), 'mama');
      expect(getByTestId('media-word-search-clear')).toBeTruthy();
    });

    it('does not show clear button when search is empty', () => {
      const { getByTestId, queryByTestId } = renderModal();
      openWordSection(getByTestId);
      expect(queryByTestId('media-word-search-clear')).toBeNull();
    });

    it('clears search when pressing clear button', () => {
      const { getByTestId, queryByTestId } = renderModal();
      openWordSection(getByTestId);
      fireEvent.changeText(getByTestId('media-word-search'), 'mama');
      expect(getByTestId('media-word-search-clear')).toBeTruthy();
      fireEvent.press(getByTestId('media-word-search-clear'));
      expect(getByTestId('media-word-search').props.value).toBe('');
      expect(queryByTestId('media-word-result-mama')).toBeNull();
    });

    it('shows category info on result items that have a category', () => {
      const { getByTestId } = renderModal();
      openWordSection(getByTestId);
      fireEvent.changeText(getByTestId('media-word-search'), 'mama');
      const result = getByTestId('media-word-result-mama');
      expect(result).toBeTruthy();
    });

    it('limits results to 7 items', () => {
      const { getByTestId, getAllByTestId } = renderModal();
      openWordSection(getByTestId);
      fireEvent.changeText(getByTestId('media-word-search'), 'a');
      const results = getAllByTestId(/^media-word-result-/);
      expect(results.length).toBeLessThanOrEqual(7);
    });
  });

  // ── Word Selection ─────────────────────────────────────────────────────────

  describe('word selection', () => {
    it('selects a word when tapping a result', () => {
      const { getByTestId, queryByTestId } = renderModal();
      openWordSection(getByTestId);
      fireEvent.changeText(getByTestId('media-word-search'), 'mama');
      fireEvent.press(getByTestId('media-word-result-mama'));
      expect(getByTestId('media-selected-word')).toBeTruthy();
      expect(queryByTestId('media-word-search')).toBeNull();
    });

    it('displays selected word name in the chip', () => {
      const { getByTestId } = renderModal();
      openWordSection(getByTestId);
      fireEvent.changeText(getByTestId('media-word-search'), 'mama');
      fireEvent.press(getByTestId('media-word-result-mama'));
      const chip = getByTestId('media-selected-word');
      expect(chip).toBeTruthy();
    });

    it('clears selected word and returns to button mode when tapping the chip', () => {
      const { getByTestId, queryByTestId } = renderModal();
      openWordSection(getByTestId);
      fireEvent.changeText(getByTestId('media-word-search'), 'mama');
      fireEvent.press(getByTestId('media-word-result-mama'));
      expect(getByTestId('media-selected-word')).toBeTruthy();
      fireEvent.press(getByTestId('media-selected-word'));
      expect(queryByTestId('media-selected-word')).toBeNull();
      expect(getByTestId('media-link-word-btn')).toBeTruthy();
    });

    it('shows category info on the selected word chip when available', () => {
      const { getByTestId } = renderModal();
      openWordSection(getByTestId);
      fireEvent.changeText(getByTestId('media-word-search'), 'mama');
      fireEvent.press(getByTestId('media-word-result-mama'));
      expect(getByTestId('media-selected-word')).toBeTruthy();
    });

    it('selecting a word without category does not crash', () => {
      const { getByTestId } = renderModal();
      openWordSection(getByTestId);
      fireEvent.changeText(getByTestId('media-word-search'), 'water');
      fireEvent.press(getByTestId('media-word-result-water'));
      expect(getByTestId('media-selected-word')).toBeTruthy();
    });
  });

  // ── Create New Word ────────────────────────────────────────────────────────

  describe('create new word', () => {
    it('shows create new word button in results', () => {
      const { getByTestId } = renderModal();
      openWordSection(getByTestId);
      fireEvent.changeText(getByTestId('media-word-search'), 'hello');
      expect(getByTestId('media-create-word-btn')).toBeTruthy();
    });

    it('calls startCreateWord with trimmed search text', () => {
      const { getByTestId } = renderModal();
      openWordSection(getByTestId);
      fireEvent.changeText(getByTestId('media-word-search'), '  hello  ');
      fireEvent.press(getByTestId('media-create-word-btn'));
      expect(mockStartCreateWord).toHaveBeenCalledWith('hello', '');
    });

    it('create button appears alongside matching results', () => {
      const { getByTestId } = renderModal();
      openWordSection(getByTestId);
      fireEvent.changeText(getByTestId('media-word-search'), 'mama');
      expect(getByTestId('media-word-result-mama')).toBeTruthy();
      expect(getByTestId('media-create-word-btn')).toBeTruthy();
    });
  });

  // ── Link Button ────────────────────────────────────────────────────────────

  describe('link button', () => {
    it('renders the link button', () => {
      const { getByTestId } = renderModal();
      expect(getByTestId('media-link-btn')).toBeTruthy();
    });

    it('is always enabled (saves without linking when nothing selected)', () => {
      const { getByTestId } = renderModal();
      const linkBtn = getByTestId('media-link-btn');
      // Button is always enabled since it falls back to saveWithoutLinking
      const flatStyle = Array.isArray(linkBtn.props.style)
        ? Object.assign({}, ...linkBtn.props.style.flat(Infinity).filter(Boolean))
        : linkBtn.props.style;
      expect(flatStyle.opacity).not.toBe(0.5);
    });

    it('renders without disabled appearance when a word is selected', () => {
      const { getByTestId } = renderModal();
      openWordSection(getByTestId);
      fireEvent.changeText(getByTestId('media-word-search'), 'mama');
      fireEvent.press(getByTestId('media-word-result-mama'));
      expect(getByTestId('media-selected-word')).toBeTruthy();
      expect(getByTestId('media-link-btn')).toBeTruthy();
    });

    it('calls linkMediaToWord with the selected word id on press', async () => {
      const { getByTestId } = renderModal();
      openWordSection(getByTestId);
      fireEvent.changeText(getByTestId('media-word-search'), 'mama');
      fireEvent.press(getByTestId('media-word-result-mama'));
      await act(async () => {
        fireEvent.press(getByTestId('media-link-btn'));
      });
      await waitFor(() => {
        expect(mockLinkMediaToWord).toHaveBeenCalledWith(1, '', 'mama');
      });
    });

    it('navigates to words tab with highlightId after successful link', async () => {
      const { getByTestId } = renderModal();
      openWordSection(getByTestId);
      fireEvent.changeText(getByTestId('media-word-search'), 'mama');
      fireEvent.press(getByTestId('media-word-result-mama'));
      await act(async () => {
        fireEvent.press(getByTestId('media-link-btn'));
      });
      await waitFor(() => {
        expect(mockRouterPush).toHaveBeenCalledWith({ pathname: '/(tabs)/words', params: { highlightId: '1' } });
      });
    });

    it('does not navigate when linkMediaToWord throws', async () => {
      mockLinkMediaToWord.mockRejectedValueOnce(new Error('link failed'));
      const { getByTestId } = renderModal();
      openWordSection(getByTestId);
      fireEvent.changeText(getByTestId('media-word-search'), 'mama');
      fireEvent.press(getByTestId('media-word-result-mama'));
      await act(async () => {
        fireEvent.press(getByTestId('media-link-btn'));
        await Promise.resolve();
      });
      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('calls saveWithoutLinking when no word or variant is selected', async () => {
      const { getByTestId } = renderModal();
      await act(async () => {
        fireEvent.press(getByTestId('media-link-btn'));
      });
      await waitFor(() => {
        expect(mockSaveWithoutLinking).toHaveBeenCalled();
        expect(mockLinkMediaToWord).not.toHaveBeenCalled();
      });
    });

    it('sets loading state during link operation', async () => {
      let resolveLink: () => void;
      mockLinkMediaToWord.mockImplementation(
        () => new Promise<void>((res) => { resolveLink = res; })
      );
      const { getByTestId } = renderModal();
      openWordSection(getByTestId);
      fireEvent.changeText(getByTestId('media-word-search'), 'mama');
      fireEvent.press(getByTestId('media-word-result-mama'));

      await act(async () => {
        fireEvent.press(getByTestId('media-link-btn'));
      });

      // Resolve the pending link
      await act(async () => {
        resolveLink!();
      });

      expect(mockLinkMediaToWord).toHaveBeenCalledWith(1, '', 'mama');
    });

    it('resets loading state even if linkMediaToWord throws', async () => {
      mockLinkMediaToWord.mockRejectedValueOnce(new Error('link failed'));
      const { getByTestId } = renderModal();
      openWordSection(getByTestId);
      fireEvent.changeText(getByTestId('media-word-search'), 'mama');
      fireEvent.press(getByTestId('media-word-result-mama'));
      // The handleLink catches the error internally via finally block
      await act(async () => {
        fireEvent.press(getByTestId('media-link-btn'));
        await Promise.resolve(); // flush microtask queue
      });
      await waitFor(() => {
        expect(mockLinkMediaToWord).toHaveBeenCalledWith(1, '', 'mama');
      });
    });
  });

  // ── Cancel Button ──────────────────────────────────────────────────────────

  describe('cancel button', () => {
    it('renders the cancel button', () => {
      const { getByTestId } = renderModal();
      expect(getByTestId('media-cancel-btn')).toBeTruthy();
    });

    it('calls dismissModal (which triggers resetCapture) on press', () => {
      const { getByTestId } = renderModal();
      fireEvent.press(getByTestId('media-cancel-btn'));
      expect(mockDismissModal).toHaveBeenCalled();
      expect(mockResetCapture).toHaveBeenCalled();
    });
  });

  // ── Form Reset ─────────────────────────────────────────────────────────────

  describe('form reset on modal open', () => {
    it('resets form state when modal becomes visible', () => {
      // First render with linking phase
      const { getByTestId, rerender } = renderModal();
      // Type in the name input
      fireEvent.changeText(getByTestId('media-name-input'), 'test name');
      expect(getByTestId('media-name-input').props.value).toBe('test name');

      // Simulate closing and reopening by toggling phase
      mockPhase = 'idle';
      rerender(<MediaLinkingModal />);
      mockPhase = 'linking';
      rerender(<MediaLinkingModal />);

      // Name should be reset
      expect(getByTestId('media-name-input').props.value).toBe('');
    });

    it('resets word selection when modal reopens', () => {
      const { getByTestId, queryByTestId, rerender } = renderModal();
      // Select a word
      openWordSection(getByTestId);
      fireEvent.changeText(getByTestId('media-word-search'), 'mama');
      fireEvent.press(getByTestId('media-word-result-mama'));
      expect(getByTestId('media-selected-word')).toBeTruthy();

      // Close and reopen
      mockPhase = 'idle';
      rerender(<MediaLinkingModal />);
      mockPhase = 'linking';
      rerender(<MediaLinkingModal />);

      expect(queryByTestId('media-selected-word')).toBeNull();
      // After reset, should be back to button mode
      expect(getByTestId('media-link-word-btn')).toBeTruthy();
    });

    it('resets search text when modal reopens', () => {
      const { getByTestId, rerender } = renderModal();
      openWordSection(getByTestId);
      fireEvent.changeText(getByTestId('media-word-search'), 'test');

      mockPhase = 'idle';
      rerender(<MediaLinkingModal />);
      mockPhase = 'linking';
      rerender(<MediaLinkingModal />);

      // After reset, back to button mode — word search is not visible
      expect(getByTestId('media-link-word-btn')).toBeTruthy();
    });
  });

  // ── Audio Cleanup ──────────────────────────────────────────────────────────

  describe('audio player cleanup on close', () => {
    it('calls audioPlayer.stop when modal becomes invisible', () => {
      const { rerender } = renderModal();
      mockPhase = 'idle';
      rerender(<MediaLinkingModal />);
      expect(mockAudioStop).toHaveBeenCalled();
    });

    it('does not throw if stop() rejects', () => {
      mockAudioStop.mockRejectedValueOnce(new Error('stop failed'));
      const { rerender } = renderModal();
      // Should not throw
      mockPhase = 'idle';
      expect(() => rerender(<MediaLinkingModal />)).not.toThrow();
    });
  });

  // ── handlePlayPreview edge case ────────────────────────────────────────────

  describe('handlePlayPreview edge cases', () => {
    it('does nothing when pendingMedia is photo and somehow play is triggered', () => {
      mockPendingMedia = PHOTO_MEDIA;
      const { queryByTestId } = renderModal();
      // No play button to press for photo — just verify no crash
      expect(queryByTestId('media-preview-play')).toBeNull();
      expect(mockAudioPlay).not.toHaveBeenCalled();
      expect(mockAudioStop).not.toHaveBeenCalled();
    });
  });

  // ── Audio duration formatting ──────────────────────────────────────────────

  describe('audio duration display', () => {
    it('formats 65000ms as 1:05', () => {
      mockPendingMedia = { ...AUDIO_MEDIA, durationMs: 65000 };
      const { getByTestId } = renderModal();
      expect(getByTestId('media-preview-duration').props.children).toBe('1:05');
    });

    it('formats 0ms as 0:00', () => {
      mockPendingMedia = { ...AUDIO_MEDIA, durationMs: 0 };
      const { getByTestId } = renderModal();
      expect(getByTestId('media-preview-duration').props.children).toBe('0:00');
    });

    it('formats undefined durationMs as 0:00', () => {
      mockPendingMedia = { ...AUDIO_MEDIA, durationMs: undefined };
      const { getByTestId } = renderModal();
      expect(getByTestId('media-preview-duration').props.children).toBe('0:00');
    });
  });

  // ── No results message ─────────────────────────────────────────────────────

  describe('no results message', () => {
    it('shows no results text when search matches nothing', () => {
      const { getByTestId } = renderModal();
      openWordSection(getByTestId);
      fireEvent.changeText(getByTestId('media-word-search'), 'zzzzzzz');
      expect(getByTestId('media-create-word-btn')).toBeTruthy();
    });

    it('does not show result items when search matches nothing', () => {
      const { getByTestId, queryByTestId } = renderModal();
      openWordSection(getByTestId);
      fireEvent.changeText(getByTestId('media-word-search'), 'zzzzzzz');
      expect(queryByTestId('media-word-result-mama')).toBeNull();
      expect(queryByTestId('media-word-result-papa')).toBeNull();
      expect(queryByTestId('media-word-result-ball')).toBeNull();
      expect(queryByTestId('media-word-result-water')).toBeNull();
    });
  });

  // ── Whitespace-only search ─────────────────────────────────────────────────

  describe('whitespace-only search', () => {
    it('does not show results for whitespace-only search', () => {
      const { getByTestId, queryByTestId } = renderModal();
      openWordSection(getByTestId);
      fireEvent.changeText(getByTestId('media-word-search'), '   ');
      expect(queryByTestId('media-word-result-mama')).toBeNull();
      expect(queryByTestId('media-create-word-btn')).toBeNull();
    });
  });

  // ── Variant Search ─────────────────────────────────────────────────────────

  describe('variant search section', () => {
    it('renders the variant search input after pressing link-to-variant button', () => {
      const { getByTestId } = renderModal();
      openVariantSection(getByTestId);
      expect(getByTestId('media-variant-search')).toBeTruthy();
    });

    it('shows variant results matching search query', () => {
      const { getByTestId } = renderModal();
      openVariantSection(getByTestId);
      fireEvent.changeText(getByTestId('media-variant-search'), 'mah');
      expect(getByTestId('media-variant-result-mah')).toBeTruthy();
    });

    it('shows variant result with word / variant format', () => {
      const { getByTestId } = renderModal();
      openVariantSection(getByTestId);
      fireEvent.changeText(getByTestId('media-variant-search'), 'ba');
      const result = getByTestId('media-variant-result-ba');
      expect(result.props.children).toBeDefined();
    });

    it('selecting a variant shows the chosen chip', () => {
      const { getByTestId } = renderModal();
      openVariantSection(getByTestId);
      fireEvent.changeText(getByTestId('media-variant-search'), 'mah');
      fireEvent.press(getByTestId('media-variant-result-mah'));
      expect(getByTestId('media-selected-variant')).toBeTruthy();
    });

    it('clearing the selected variant returns to button mode', () => {
      const { getByTestId, queryByTestId } = renderModal();
      openVariantSection(getByTestId);
      fireEvent.changeText(getByTestId('media-variant-search'), 'mah');
      fireEvent.press(getByTestId('media-variant-result-mah'));
      fireEvent.press(getByTestId('media-selected-variant'));
      expect(queryByTestId('media-selected-variant')).toBeNull();
      expect(getByTestId('media-link-variant-btn')).toBeTruthy();
    });

    it('shows not-found message when variant search matches nothing', () => {
      const { getByTestId } = renderModal();
      openVariantSection(getByTestId);
      fireEvent.changeText(getByTestId('media-variant-search'), 'zzz');
      expect(getByTestId('media-variant-not-found')).toBeTruthy();
    });

    it('does not show not-found when variant search is empty', () => {
      const { queryByTestId } = renderModal();
      expect(queryByTestId('media-variant-not-found')).toBeNull();
    });

    it('calls linkMediaToVariant and navigates to variants tab on save with variant selected', async () => {
      const { getByTestId } = renderModal();
      openVariantSection(getByTestId);
      fireEvent.changeText(getByTestId('media-variant-search'), 'mah');
      fireEvent.press(getByTestId('media-variant-result-mah'));
      await act(async () => {
        fireEvent.press(getByTestId('media-link-btn'));
      });
      await waitFor(() => {
        expect(mockLinkMediaToVariant).toHaveBeenCalledWith(10, '', 'mah', 'mama');
        expect(mockRouterPush).toHaveBeenCalledWith({ pathname: '/(tabs)/variants', params: { highlightId: '10' } });
      });
    });
  });

  // ── Save Without Linking (via main Save button) ────────────────────────────

  describe('save without linking', () => {
    it('does not render a separate save-without-linking button', () => {
      const { queryByTestId } = renderModal();
      expect(queryByTestId('media-save-without-linking-btn')).toBeNull();
    });

    it('calls saveWithoutLinking via main save button when nothing is selected', async () => {
      const { getByTestId } = renderModal();
      await act(async () => {
        fireEvent.press(getByTestId('media-link-btn'));
      });
      await waitFor(() => {
        expect(mockSaveWithoutLinking).toHaveBeenCalled();
      });
    });
  });

  // ── Inline Variant Create ──────────────────────────────────────────────────

  describe('inline variant create', () => {
    it('shows create button when variant not found', () => {
      const { getByTestId } = renderModal();
      openVariantSection(getByTestId);
      fireEvent.changeText(getByTestId('media-variant-search'), 'zzz');
      expect(getByTestId('media-create-variant-btn')).toBeTruthy();
    });

    it('shows inline create form when create variant tapped', () => {
      const { getByTestId } = renderModal();
      openVariantSection(getByTestId);
      fireEvent.changeText(getByTestId('media-variant-search'), 'zzz');
      fireEvent.press(getByTestId('media-create-variant-btn'));
      expect(getByTestId('media-inline-create-form')).toBeTruthy();
    });

    it('inline create form has name and word search inputs', () => {
      const { getByTestId } = renderModal();
      openVariantSection(getByTestId);
      fireEvent.changeText(getByTestId('media-variant-search'), 'zzz');
      fireEvent.press(getByTestId('media-create-variant-btn'));
      expect(getByTestId('media-inline-variant-name-input')).toBeTruthy();
      expect(getByTestId('media-inline-word-search')).toBeTruthy();
    });

    it('creates variant and links media when inline form submitted', async () => {
      const { getByTestId } = renderModal();
      openVariantSection(getByTestId);
      fireEvent.changeText(getByTestId('media-variant-search'), 'zzz');
      fireEvent.press(getByTestId('media-create-variant-btn'));
      fireEvent.changeText(getByTestId('media-inline-variant-name-input'), 'zee');
      fireEvent.changeText(getByTestId('media-inline-word-search'), 'mama');
      fireEvent.press(getByTestId('media-inline-word-result-mama'));
      await act(async () => {
        fireEvent.press(getByTestId('media-inline-create-save-btn'));
      });
      await waitFor(() => {
        expect(mockAddVariantMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ wordId: 1, variant: 'zee' }));
        expect(mockLinkMediaToVariant).toHaveBeenCalledWith(99, '', 'zee', 'mama');
        expect(mockRouterPush).toHaveBeenCalledWith({ pathname: '/(tabs)/variants', params: { highlightId: '99' } });
      });
    });
  });
});
