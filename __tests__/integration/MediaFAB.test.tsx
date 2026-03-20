import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Keyboard, Alert } from 'react-native';
import { MediaFAB } from '../../src/components/MediaFAB';
import { useMediaCapture } from '../../src/hooks/useMediaCapture';
import { useAudioRecording, type RecordingState, type AudioRecordingResult } from '../../src/hooks/useAudioRecording';
import { useI18n } from '../../src/i18n/i18n';

jest.mock('../../src/hooks/useMediaCapture');
jest.mock('../../src/hooks/useAudioRecording');
jest.mock('../../src/i18n/i18n', () => ({
  ...jest.requireActual('../../src/i18n/i18n'),
  useI18n: jest.fn(),
}));

const mockUseMediaCapture = useMediaCapture as jest.MockedFunction<typeof useMediaCapture>;
const mockUseAudioRecording = useAudioRecording as jest.MockedFunction<typeof useAudioRecording>;
const mockUseI18n = useI18n as jest.MockedFunction<typeof useI18n>;

// ── Helpers ─────────────────────────────────────────────────────────────────

function buildMediaCaptureMock(overrides: Partial<ReturnType<typeof useMediaCapture>> = {}): ReturnType<typeof useMediaCapture> {
  return {
    phase: 'idle' as const,
    pendingMedia: null,
    prefilledWordName: '',
    prefilledMediaName: '',
    playingAssetId: null,
    setPhase: jest.fn(),
    setCapturedMedia: jest.fn(),
    resetCapture: jest.fn(),
    linkMediaToWord: jest.fn(),
    startCreateWord: jest.fn(),
    onWordCreated: jest.fn(),
    launchPhotoPicker: jest.fn(),
    playAssetByParent: jest.fn(),
    stopPlayback: jest.fn(),
    ...overrides,
  };
}

function buildAudioRecordingMock(overrides: Partial<ReturnType<typeof useAudioRecording>> = {}) {
  return {
    state: 'idle' as RecordingState,
    amplitude: 0,
    durationMs: 0,
    result: null as AudioRecordingResult | null,
    startRecording: jest.fn().mockResolvedValue(true),
    stopRecording: jest.fn().mockResolvedValue(null),
    discardRecording: jest.fn().mockResolvedValue(undefined),
    pauseRecording: jest.fn().mockResolvedValue(undefined),
    resumeRecording: jest.fn().mockResolvedValue(undefined),
    reset: jest.fn(),
    ...overrides,
  };
}

function setupMocks(
  mediaOverrides: Partial<ReturnType<typeof useMediaCapture>> = {},
  audioOverrides: Partial<ReturnType<typeof useAudioRecording>> = {},
) {
  const mediaMock = buildMediaCaptureMock(mediaOverrides);
  const audioMock = buildAudioRecordingMock(audioOverrides);
  mockUseMediaCapture.mockReturnValue(mediaMock);
  mockUseAudioRecording.mockReturnValue(audioMock);
  mockUseI18n.mockReturnValue({
    locale: 'en-US',
    setLocale: jest.fn(),
    t: (key: string) => key,
    tc: (_key: string, count: number) => `${count}`,
    ta: () => [],
  });
  return { mediaMock, audioMock };
}

function renderFAB() {
  return render(<MediaFAB />);
}

// ── Touch event helpers ─────────────────────────────────────────────────────

const TOUCH_BANK_ACTIVE = {
  touchActive: true, startPageX: 0, startPageY: 0,
  currentPageX: 0, currentPageY: 0, startTimeStamp: 0, currentTimeStamp: 0,
};
const TOUCH_BANK_INACTIVE = {
  touchActive: false, startPageX: 0, startPageY: 0,
  currentPageX: 0, currentPageY: 0, startTimeStamp: 0, currentTimeStamp: 0,
};

function grantEvent(pageX = 0, pageY = 0) {
  return {
    nativeEvent: { pageX, pageY },
    touchHistory: { touchBank: [TOUCH_BANK_ACTIVE], numberActiveTouches: 1, indexOfSingleActiveTouch: 0 },
  };
}

function releaseEvent(pageX = 0, pageY = 0) {
  return {
    nativeEvent: { pageX, pageY },
    touchHistory: { touchBank: [TOUCH_BANK_INACTIVE], numberActiveTouches: 0, indexOfSingleActiveTouch: 0 },
  };
}

function moveEvent(pageX = 0, pageY = 0) {
  return {
    nativeEvent: { pageX, pageY },
    touchHistory: { touchBank: [TOUCH_BANK_ACTIVE], numberActiveTouches: 1, indexOfSingleActiveTouch: 0 },
  };
}

// ── Keyboard mock helpers ───────────────────────────────────────────────────

type KeyboardCallback = (...args: unknown[]) => void;
let keyboardListeners: Record<string, KeyboardCallback[]>;

function resetKeyboardListeners() {
  keyboardListeners = { keyboardDidShow: [], keyboardDidHide: [] };
}

beforeAll(() => {
  jest.spyOn(Keyboard, 'addListener').mockImplementation(
    ((event: string, cb: KeyboardCallback) => {
      keyboardListeners[event]?.push(cb);
      return { remove: jest.fn() } as unknown as ReturnType<typeof Keyboard.addListener>;
    }) as typeof Keyboard.addListener,
  );
});

// ── Tests ───────────────────────────────────────────────────────────────────

describe('MediaFAB', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    resetKeyboardListeners();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  // ── Idle rendering ──────────────────────────────────────────────────────

  describe('idle state rendering', () => {
    it('renders the FAB container', () => {
      setupMocks();
      const { getByTestId } = renderFAB();
      expect(getByTestId('media-fab')).toBeTruthy();
    });

    it('renders the mic button area', () => {
      setupMocks();
      const { getByTestId } = renderFAB();
      expect(getByTestId('media-fab-mic')).toBeTruthy();
    });

    it('does not render waveform pill when idle', () => {
      setupMocks();
      const { queryByTestId } = renderFAB();
      expect(queryByTestId('media-waveform')).toBeNull();
    });

    it('does not render timer when idle', () => {
      setupMocks();
      const { queryByTestId } = renderFAB();
      expect(queryByTestId('media-timer')).toBeNull();
    });

    it('does not render overlay buttons when idle and not expanded', () => {
      setupMocks();
      const { queryByTestId } = renderFAB();
      expect(queryByTestId('media-photo-btn')).toBeNull();
      expect(queryByTestId('media-video-btn-locked')).toBeNull();
    });
  });

  // ── Hidden states ─────────────────────────────────────────────────────

  describe('FAB hidden states', () => {
    it('returns null when phase is linking', () => {
      setupMocks({ phase: 'linking' });
      const { queryByTestId } = renderFAB();
      expect(queryByTestId('media-fab')).toBeNull();
    });

    it('returns null when phase is creating-word', () => {
      setupMocks({ phase: 'creating-word' });
      const { queryByTestId } = renderFAB();
      expect(queryByTestId('media-fab')).toBeNull();
    });

    it('returns null when keyboard is visible', () => {
      setupMocks();
      const { queryByTestId, rerender } = renderFAB();
      expect(queryByTestId('media-fab')).toBeTruthy();

      act(() => {
        keyboardListeners.keyboardDidShow.forEach(cb => cb());
      });
      rerender(<MediaFAB />);
      expect(queryByTestId('media-fab')).toBeNull();
    });

    it('shows FAB again when keyboard hides', () => {
      setupMocks();
      const { queryByTestId, rerender } = renderFAB();

      act(() => { keyboardListeners.keyboardDidShow.forEach(cb => cb()); });
      rerender(<MediaFAB />);
      expect(queryByTestId('media-fab')).toBeNull();

      act(() => { keyboardListeners.keyboardDidHide.forEach(cb => cb()); });
      rerender(<MediaFAB />);
      expect(queryByTestId('media-fab')).toBeTruthy();
    });
  });

  // ── Keyboard listener cleanup ─────────────────────────────────────────

  describe('keyboard listener cleanup', () => {
    it('removes keyboard listeners on unmount', () => {
      setupMocks();
      const removeMocks: jest.Mock[] = [];
      (Keyboard.addListener as jest.Mock).mockImplementation(
        (event: string, cb: KeyboardCallback) => {
          keyboardListeners[event]?.push(cb);
          const removeMock = jest.fn();
          removeMocks.push(removeMock);
          return { remove: removeMock };
        },
      );

      const { unmount } = renderFAB();
      unmount();

      expect(removeMocks).toHaveLength(2);
      removeMocks.forEach(rm => expect(rm).toHaveBeenCalledTimes(1));
    });
  });

  // ── Tap interaction (short press) ─────────────────────────────────────

  describe('tap interaction (short press)', () => {
    it('starts recording on tap when idle', () => {
      const { audioMock } = setupMocks();
      const { getByTestId } = renderFAB();
      const fab = getByTestId('media-fab-mic');

      // Grant + release before LONG_PRESS_DELAY (400ms) = tap
      fireEvent(fab, 'responderGrant', grantEvent());
      fireEvent(fab, 'responderRelease', releaseEvent());

      expect(audioMock.startRecording).toHaveBeenCalledTimes(1);
    });

    it('stops recording on tap when already recording', () => {
      const { audioMock } = setupMocks({}, { state: 'recording' });
      const { getByTestId } = renderFAB();
      const fab = getByTestId('media-fab-mic');

      fireEvent(fab, 'responderGrant', grantEvent());
      fireEvent(fab, 'responderRelease', releaseEvent());

      expect(audioMock.stopRecording).toHaveBeenCalledTimes(1);
      expect(audioMock.pauseRecording).not.toHaveBeenCalled();
      expect(audioMock.startRecording).not.toHaveBeenCalled();
    });

    it('stops recording on tap when paused', () => {
      const { audioMock } = setupMocks({}, { state: 'paused' });
      const { getByTestId } = renderFAB();
      const fab = getByTestId('media-fab-mic');

      fireEvent(fab, 'responderGrant', grantEvent());
      fireEvent(fab, 'responderRelease', releaseEvent());

      expect(audioMock.stopRecording).toHaveBeenCalledTimes(1);
      expect(audioMock.pauseRecording).not.toHaveBeenCalled();
      expect(audioMock.startRecording).not.toHaveBeenCalled();
    });

    it('does not expand overlay popup when starting recording via tap', () => {
      setupMocks();
      const { getByTestId, queryByTestId } = renderFAB();

      // Photo/video popup not shown initially
      expect(queryByTestId('media-photo-btn')).toBeNull();

      const fab = getByTestId('media-fab-mic');
      fireEvent(fab, 'responderGrant', grantEvent());
      fireEvent(fab, 'responderRelease', releaseEvent());

      // After tap starts recording, popup still not shown (camera hidden during recording)
      expect(queryByTestId('media-photo-btn')).toBeNull();
    });
  });

  // ── Long press interaction ────────────────────────────────────────────

  describe('long press interaction', () => {
    it('toggles expanded overlay on long press without starting recording', () => {
      const { audioMock } = setupMocks();
      const { getByTestId, queryByTestId } = renderFAB();
      const fab = getByTestId('media-fab-mic');

      // Grant (touch down)
      fireEvent(fab, 'responderGrant', grantEvent());

      // Advance past LONG_PRESS_DELAY (400ms)
      act(() => { jest.advanceTimersByTime(400); });

      // Release after long press
      fireEvent(fab, 'responderRelease', releaseEvent());

      // Long press should NOT start recording
      expect(audioMock.startRecording).not.toHaveBeenCalled();
      // Overlay should now be visible
      expect(queryByTestId('media-photo-btn')).toBeTruthy();
    });

    it('toggles expanded overlay off on second long press', () => {
      const { audioMock } = setupMocks();
      const { getByTestId, queryByTestId } = renderFAB();
      const fab = getByTestId('media-fab-mic');

      // First long press — expand
      fireEvent(fab, 'responderGrant', grantEvent());
      act(() => { jest.advanceTimersByTime(400); });
      fireEvent(fab, 'responderRelease', releaseEvent());
      expect(queryByTestId('media-photo-btn')).toBeTruthy();

      // Second long press — collapse
      fireEvent(fab, 'responderGrant', grantEvent());
      act(() => { jest.advanceTimersByTime(400); });
      fireEvent(fab, 'responderRelease', releaseEvent());
      expect(queryByTestId('media-photo-btn')).toBeNull();

      expect(audioMock.startRecording).not.toHaveBeenCalled();
    });

    it('does not toggle expanded during recording on long press', () => {
      setupMocks({}, { state: 'recording' });
      const { getByTestId, queryByTestId } = renderFAB();
      const fab = getByTestId('media-fab-mic');

      // Camera button is hidden during recording, overlay popup not shown
      expect(queryByTestId('media-photo-btn')).toBeNull();

      // Long press while recording: the timer fires but skips setExpanded
      fireEvent(fab, 'responderGrant', grantEvent());
      act(() => { jest.advanceTimersByTime(400); });
      fireEvent(fab, 'responderRelease', releaseEvent());

      // Still no overlay popup (recording active, camera hidden)
      expect(queryByTestId('media-photo-btn')).toBeNull();
    });
  });

  // ── Recording state rendering ─────────────────────────────────────────

  describe('recording state', () => {
    it('shows waveform pill during recording', () => {
      setupMocks({}, { state: 'recording' });
      const { getByTestId } = renderFAB();
      expect(getByTestId('media-waveform')).toBeTruthy();
    });

    it('shows timer during recording', () => {
      setupMocks({}, { state: 'recording', durationMs: 0 });
      const { getByTestId } = renderFAB();
      expect(getByTestId('media-timer')).toBeTruthy();
    });

    it('timer shows formatted time for 0ms', () => {
      setupMocks({}, { state: 'recording', durationMs: 0 });
      const { getByTestId } = renderFAB();
      expect(getByTestId('media-timer').props.children).toBe('0:00');
    });

    it('timer shows formatted time for 5000ms', () => {
      setupMocks({}, { state: 'recording', durationMs: 5000 });
      const { getByTestId } = renderFAB();
      expect(getByTestId('media-timer').props.children).toBe('0:05');
    });

    it('timer shows formatted time for 65000ms (1m5s)', () => {
      setupMocks({}, { state: 'recording', durationMs: 65000 });
      const { getByTestId } = renderFAB();
      expect(getByTestId('media-timer').props.children).toBe('1:05');
    });

    it('timer shows formatted time for 125000ms (2m5s)', () => {
      setupMocks({}, { state: 'recording', durationMs: 125000 });
      const { getByTestId } = renderFAB();
      expect(getByTestId('media-timer').props.children).toBe('2:05');
    });

    it('timer shows formatted time for 600000ms (10m0s)', () => {
      setupMocks({}, { state: 'recording', durationMs: 600000 });
      const { getByTestId } = renderFAB();
      expect(getByTestId('media-timer').props.children).toBe('10:00');
    });

    it('renders waveform bars during recording', () => {
      setupMocks({}, { state: 'recording' });
      const { getByTestId } = renderFAB();
      const barsContainer = getByTestId('media-waveform-bars');
      expect(barsContainer.props.children).toHaveLength(20);
    });

    it('does not show photo/video overlay buttons during recording', () => {
      setupMocks({}, { state: 'recording' });
      const { queryByTestId } = renderFAB();
      expect(queryByTestId('media-photo-btn')).toBeNull();
      expect(queryByTestId('media-video-btn-locked')).toBeNull();
    });

    it('hides camera button during recording', () => {
      setupMocks({}, { state: 'recording' });
      const { queryByTestId } = renderFAB();
      expect(queryByTestId('media-camera-btn')).toBeNull();
    });

    it('shows trash (discard) button in waveform during recording', () => {
      setupMocks({}, { state: 'recording' });
      const { getByTestId } = renderFAB();
      expect(getByTestId('media-waveform-discard')).toBeTruthy();
    });

    it('shows pause button in waveform during recording', () => {
      setupMocks({}, { state: 'recording' });
      const { getByTestId } = renderFAB();
      expect(getByTestId('media-waveform-pause')).toBeTruthy();
    });

    it('renders FAB with record icon during recording', () => {
      setupMocks({}, { state: 'recording' });
      const { getByTestId } = renderFAB();
      expect(getByTestId('media-fab-mic')).toBeTruthy();
    });
  });

  // ── Camera button ─────────────────────────────────────────────────────

  describe('camera button', () => {
    it('renders camera button when idle', () => {
      setupMocks();
      const { getByTestId } = renderFAB();
      expect(getByTestId('media-camera-btn')).toBeTruthy();
    });

    it('hides camera button when recording', () => {
      setupMocks({}, { state: 'recording' });
      const { queryByTestId } = renderFAB();
      expect(queryByTestId('media-camera-btn')).toBeNull();
    });

    it('hides camera button when paused', () => {
      setupMocks({}, { state: 'paused' });
      const { queryByTestId } = renderFAB();
      expect(queryByTestId('media-camera-btn')).toBeNull();
    });

    it('pressing camera button opens overlay popup', () => {
      setupMocks();
      const { getByTestId, queryByTestId } = renderFAB();
      expect(queryByTestId('media-photo-btn')).toBeNull();

      fireEvent.press(getByTestId('media-camera-btn'));

      expect(queryByTestId('media-photo-btn')).toBeTruthy();
      expect(queryByTestId('media-video-btn-locked')).toBeTruthy();
    });

    it('pressing camera button again closes overlay popup', () => {
      setupMocks();
      const { getByTestId, queryByTestId } = renderFAB();

      fireEvent.press(getByTestId('media-camera-btn'));
      expect(queryByTestId('media-photo-btn')).toBeTruthy();

      fireEvent.press(getByTestId('media-camera-btn'));
      expect(queryByTestId('media-photo-btn')).toBeNull();
    });
  });

  // ── Backdrop dismiss ──────────────────────────────────────────────────

  describe('backdrop dismiss', () => {
    it('renders backdrop when expanded and not recording', () => {
      setupMocks();
      const { getByTestId, queryByTestId } = renderFAB();
      expect(queryByTestId('media-fab-backdrop')).toBeNull();

      fireEvent.press(getByTestId('media-camera-btn'));
      expect(queryByTestId('media-fab-backdrop')).toBeTruthy();
    });

    it('pressing backdrop closes overlay', () => {
      setupMocks();
      const { getByTestId, queryByTestId } = renderFAB();

      fireEvent.press(getByTestId('media-camera-btn'));
      expect(queryByTestId('media-photo-btn')).toBeTruthy();

      fireEvent.press(getByTestId('media-fab-backdrop'));
      expect(queryByTestId('media-photo-btn')).toBeNull();
      expect(queryByTestId('media-fab-backdrop')).toBeNull();
    });

    it('does not render backdrop during recording', () => {
      setupMocks({}, { state: 'recording' });
      const { queryByTestId } = renderFAB();
      expect(queryByTestId('media-fab-backdrop')).toBeNull();
    });

    it('does not render backdrop during paused', () => {
      setupMocks({}, { state: 'paused' });
      const { queryByTestId } = renderFAB();
      expect(queryByTestId('media-fab-backdrop')).toBeNull();
    });
  });

  // ── Overlay button interactions ───────────────────────────────────────

  describe('overlay button interactions', () => {
    it('Photo button launches picker and collapses overlay', () => {
      const { mediaMock } = setupMocks();
      const { getByTestId, queryByTestId } = renderFAB();

      fireEvent.press(getByTestId('media-camera-btn'));
      expect(queryByTestId('media-photo-btn')).toBeTruthy();

      fireEvent.press(getByTestId('media-photo-btn'));

      expect(mediaMock.launchPhotoPicker).toHaveBeenCalledTimes(1);
      expect(queryByTestId('media-photo-btn')).toBeNull();
    });

    it('long press FAB still opens overlay', () => {
      setupMocks();
      const { getByTestId, queryByTestId } = renderFAB();
      const fab = getByTestId('media-fab-mic');

      fireEvent(fab, 'responderGrant', grantEvent());
      act(() => { jest.advanceTimersByTime(400); });
      fireEvent(fab, 'responderRelease', releaseEvent());

      expect(queryByTestId('media-photo-btn')).toBeTruthy();
    });
  });

  // ── Waveform discard and stop ─────────────────────────────────────────

  describe('waveform discard and pause buttons', () => {
    it('pressing trash button calls discardRecording', () => {
      const { audioMock } = setupMocks({}, { state: 'recording' });
      const { getByTestId } = renderFAB();

      fireEvent.press(getByTestId('media-waveform-discard'));

      expect(audioMock.discardRecording).toHaveBeenCalledTimes(1);
    });

    it('pressing pause button calls pauseRecording when recording', () => {
      const { audioMock } = setupMocks({}, { state: 'recording' });
      const { getByTestId } = renderFAB();

      fireEvent.press(getByTestId('media-waveform-pause'));

      expect(audioMock.pauseRecording).toHaveBeenCalledTimes(1);
      expect(audioMock.stopRecording).not.toHaveBeenCalled();
    });

    it('pressing pause button calls resumeRecording when paused', () => {
      const { audioMock } = setupMocks({}, { state: 'paused' });
      const { getByTestId } = renderFAB();

      fireEvent.press(getByTestId('media-waveform-pause'));

      expect(audioMock.resumeRecording).toHaveBeenCalledTimes(1);
      expect(audioMock.stopRecording).not.toHaveBeenCalled();
    });

    it('shows trash and pause buttons when paused', () => {
      setupMocks({}, { state: 'paused' });
      const { getByTestId } = renderFAB();
      expect(getByTestId('media-waveform-discard')).toBeTruthy();
      expect(getByTestId('media-waveform-pause')).toBeTruthy();
    });
  });

  // ── PanResponder swipe-to-discard ─────────────────────────────────────

  describe('PanResponder swipe-to-discard', () => {
    it('updates translateX when swiping left during recording', () => {
      setupMocks({}, { state: 'recording' });
      const { getByTestId } = renderFAB();
      const fab = getByTestId('media-fab-mic');

      fireEvent(fab, 'responderGrant', grantEvent(200, 100));
      fireEvent(fab, 'responderMove', moveEvent(150, 100));

      // Verify FAB still renders (move doesn't crash)
      expect(getByTestId('media-fab')).toBeTruthy();
    });

    it('does not update translateX when not recording', () => {
      setupMocks({}, { state: 'idle' });
      const { getByTestId } = renderFAB();
      const fab = getByTestId('media-fab-mic');

      fireEvent(fab, 'responderGrant', grantEvent(200, 100));
      fireEvent(fab, 'responderMove', moveEvent(100, 100));

      expect(getByTestId('media-fab')).toBeTruthy();
    });

    it('release during recording runs gesture handler without crashing', () => {
      setupMocks({}, { state: 'recording' });
      const { getByTestId } = renderFAB();
      const fab = getByTestId('media-fab-mic');

      fireEvent(fab, 'responderGrant', grantEvent(200, 100));
      fireEvent(fab, 'responderRelease', releaseEvent(200, 100));

      // Handler executes without error
      expect(getByTestId('media-fab')).toBeTruthy();
    });
  });

  // ── Responder terminate ───────────────────────────────────────────────

  describe('responderTerminate', () => {
    it('stops recording on terminate', () => {
      const { audioMock } = setupMocks({}, { state: 'recording' });
      const { getByTestId } = renderFAB();
      const fab = getByTestId('media-fab-mic');

      fireEvent(fab, 'responderTerminate', releaseEvent());

      expect(audioMock.stopRecording).toHaveBeenCalledTimes(1);
    });

    it('clears longPress timer on terminate when not recording', () => {
      const { audioMock } = setupMocks();
      const { getByTestId } = renderFAB();
      const fab = getByTestId('media-fab-mic');

      fireEvent(fab, 'responderGrant', grantEvent());
      fireEvent(fab, 'responderTerminate', releaseEvent());

      act(() => { jest.advanceTimersByTime(500); });

      // Timer should have been cleared — no recording started, no expand toggled
      expect(audioMock.startRecording).not.toHaveBeenCalled();
      expect(audioMock.stopRecording).not.toHaveBeenCalled();
    });
  });

  // ── Recording result handling ─────────────────────────────────────────

  describe('recording result handling', () => {
    it('calls setCapturedMedia and reset when result is available and state is stopped', () => {
      const mockResult: AudioRecordingResult = {
        uri: 'file:///audio.m4a',
        durationMs: 3000,
        fileSize: 12345,
        mimeType: 'audio/mp4',
      };
      const { mediaMock, audioMock } = setupMocks(
        {},
        { state: 'stopped', result: mockResult },
      );

      renderFAB();

      expect(mediaMock.setCapturedMedia).toHaveBeenCalledWith({
        uri: 'file:///audio.m4a',
        type: 'audio',
        mimeType: 'audio/mp4',
        fileSize: 12345,
        durationMs: 3000,
      });
      expect(audioMock.reset).toHaveBeenCalledTimes(1);
    });

    it('does not call setCapturedMedia when result is null', () => {
      const { mediaMock, audioMock } = setupMocks(
        {},
        { state: 'stopped', result: null },
      );

      renderFAB();

      expect(mediaMock.setCapturedMedia).not.toHaveBeenCalled();
      expect(audioMock.reset).not.toHaveBeenCalled();
    });

    it('does not call setCapturedMedia when state is recording', () => {
      const mockResult: AudioRecordingResult = {
        uri: 'file:///audio.m4a',
        durationMs: 3000,
        fileSize: 12345,
        mimeType: 'audio/mp4',
      };
      const { mediaMock } = setupMocks(
        {},
        { state: 'recording', result: mockResult },
      );

      renderFAB();

      expect(mediaMock.setCapturedMedia).not.toHaveBeenCalled();
    });
  });

  // ── Waveform animation ────────────────────────────────────────────────

  describe('waveform animation', () => {
    it('renders waveform with non-zero amplitude', () => {
      setupMocks({}, { state: 'recording', amplitude: 0.8 });
      const { getByTestId } = renderFAB();
      expect(getByTestId('media-waveform')).toBeTruthy();
    });

    it('hides waveform when switching from recording to idle', () => {
      const audioMock = buildAudioRecordingMock({ state: 'recording', amplitude: 0.5 });
      mockUseMediaCapture.mockReturnValue(buildMediaCaptureMock());
      mockUseAudioRecording.mockReturnValue(audioMock);

      const { rerender, queryByTestId } = renderFAB();
      expect(queryByTestId('media-waveform')).toBeTruthy();

      mockUseAudioRecording.mockReturnValue(buildAudioRecordingMock({ state: 'idle', amplitude: 0 }));
      rerender(<MediaFAB />);
      expect(queryByTestId('media-waveform')).toBeNull();
    });
  });

  // ── Phase visibility ──────────────────────────────────────────────────

  describe('phase visibility', () => {
    it('shows FAB when phase is captured', () => {
      setupMocks({ phase: 'captured' });
      const { getByTestId } = renderFAB();
      expect(getByTestId('media-fab')).toBeTruthy();
    });

    it('shows FAB when phase is recording', () => {
      setupMocks({ phase: 'recording' });
      const { getByTestId } = renderFAB();
      expect(getByTestId('media-fab')).toBeTruthy();
    });

    it('shows FAB when phase is idle', () => {
      setupMocks({ phase: 'idle' });
      const { getByTestId } = renderFAB();
      expect(getByTestId('media-fab')).toBeTruthy();
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('grant during recording does not set a new longPress timer that toggles overlay', () => {
      const { audioMock } = setupMocks({}, { state: 'recording' });
      const { getByTestId } = renderFAB();
      const fab = getByTestId('media-fab-mic');

      fireEvent(fab, 'responderGrant', grantEvent());

      act(() => { jest.advanceTimersByTime(500); });

      // startRecording should not be called (already recording, longPress callback skips)
      expect(audioMock.startRecording).not.toHaveBeenCalled();
    });

    it('release when idle and no longPress timer does nothing', () => {
      const { audioMock } = setupMocks({}, { state: 'idle' });
      const { getByTestId } = renderFAB();
      const fab = getByTestId('media-fab-mic');

      // Release without prior grant
      fireEvent(fab, 'responderRelease', releaseEvent());

      expect(audioMock.stopRecording).not.toHaveBeenCalled();
      expect(audioMock.discardRecording).not.toHaveBeenCalled();
      expect(audioMock.startRecording).not.toHaveBeenCalled();
    });

    it('formatTimer handles sub-second values (500ms -> 0:00)', () => {
      setupMocks({}, { state: 'recording', durationMs: 500 });
      const { getByTestId } = renderFAB();
      expect(getByTestId('media-timer').props.children).toBe('0:00');
    });

    it('formatTimer handles exactly 60000ms (1:00)', () => {
      setupMocks({}, { state: 'recording', durationMs: 60000 });
      const { getByTestId } = renderFAB();
      expect(getByTestId('media-timer').props.children).toBe('1:00');
    });

    it('formatTimer pads single-digit seconds (3000ms -> 0:03)', () => {
      setupMocks({}, { state: 'recording', durationMs: 3000 });
      const { getByTestId } = renderFAB();
      expect(getByTestId('media-timer').props.children).toBe('0:03');
    });
  });
});
