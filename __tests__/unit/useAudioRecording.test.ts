import { renderHook, act } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { AudioModule } from 'expo-audio';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from '../../src/i18n/i18n';
import { MediaCaptureProvider } from '../../src/providers/MediaCaptureProvider';
import {
  normalizeAmplitude,
  MAX_DURATION_MS,
  useAudioRecording,
} from '../../src/hooks/useAudioRecording';
import type { RecordingState, AudioRecordingResult } from '../../src/hooks/useAudioRecording';

// ── Helpers ────────────────────────────────────────────────────────────────────

type MockRecorder = {
  prepareToRecordAsync: jest.Mock;
  record: jest.Mock;
  pause: jest.Mock;
  stop: jest.Mock;
  uri: string | null;
  isRecording: boolean;
  currentTime: number;
};

const mockRecorder = (globalThis as Record<string, unknown>).__mockRecorder as MockRecorder;

const mockRequestRecordingPermissions = AudioModule.requestRecordingPermissionsAsync as jest.Mock;
const mockSetAudioModeAsync = AudioModule.setAudioModeAsync as jest.Mock;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(
        I18nProvider,
        null,
        React.createElement(MediaCaptureProvider, null, children),
      ),
    );
}

function resetRecorderState(overrides: Partial<{
  isRecording: boolean; durationMillis: number; metering: number;
}> = {}) {
  (globalThis as Record<string, unknown>).__mockRecorderState = {
    isRecording: false,
    durationMillis: 0,
    metering: -30,
    ...overrides,
  };
}

// ── Pure function tests ────────────────────────────────────────────────────────

describe('normalizeAmplitude', () => {
  it('returns 0 for values below -60 dB', () => {
    expect(normalizeAmplitude(-160)).toBe(0);
    expect(normalizeAmplitude(-100)).toBe(0);
    expect(normalizeAmplitude(-61)).toBe(0);
  });

  it('returns 0 at exactly -60 dB', () => {
    expect(normalizeAmplitude(-60)).toBe(0);
  });

  it('returns 1 at exactly 0 dB', () => {
    expect(normalizeAmplitude(0)).toBe(1);
  });

  it('returns 1 for values above 0 dB', () => {
    expect(normalizeAmplitude(1)).toBe(1);
    expect(normalizeAmplitude(10)).toBe(1);
  });

  it('returns 0.5 at -30 dB (midpoint)', () => {
    expect(normalizeAmplitude(-30)).toBe(0.5);
  });

  it('returns correct interpolation for -45 dB', () => {
    expect(normalizeAmplitude(-45)).toBe(0.25);
  });

  it('returns correct interpolation for -15 dB', () => {
    expect(normalizeAmplitude(-15)).toBe(0.75);
  });
});

// ── Constant tests ─────────────────────────────────────────────────────────────

describe('MAX_DURATION_MS', () => {
  it('equals 60000 (one minute)', () => {
    expect(MAX_DURATION_MS).toBe(60000);
  });
});

// ── Hook tests ─────────────────────────────────────────────────────────────────

describe('useAudioRecording', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetRecorderState();

    mockRecorder.prepareToRecordAsync = jest.fn(() => Promise.resolve());
    mockRecorder.record = jest.fn();
    mockRecorder.pause = jest.fn();
    mockRecorder.stop = jest.fn(() => Promise.resolve());
    mockRecorder.uri = 'file:///mock/recording.m4a';
    mockRecorder.isRecording = false;

    mockRequestRecordingPermissions.mockResolvedValue({ granted: true, status: 'granted' });
    mockSetAudioModeAsync.mockResolvedValue(undefined);
  });

  // ── Initial state ────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('returns idle state with zeroed values', () => {
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      expect(result.current.state).toBe('idle');
      expect(result.current.amplitude).toBe(0);
      expect(result.current.durationMs).toBe(0);
      expect(result.current.result).toBeNull();
    });

    it('exposes all expected functions', () => {
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      expect(typeof result.current.startRecording).toBe('function');
      expect(typeof result.current.stopRecording).toBe('function');
      expect(typeof result.current.pauseRecording).toBe('function');
      expect(typeof result.current.resumeRecording).toBe('function');
      expect(typeof result.current.discardRecording).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  // ── startRecording ────────────────────────────────────────────────────────

  describe('startRecording', () => {
    it('requests permission, sets audio mode, prepares and starts recording', async () => {
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      let started: boolean | undefined;
      await act(async () => {
        started = await result.current.startRecording();
      });

      expect(started).toBe(true);
      expect(mockRequestRecordingPermissions).toHaveBeenCalledTimes(1);
      expect(mockSetAudioModeAsync).toHaveBeenCalledWith({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      expect(mockRecorder.prepareToRecordAsync).toHaveBeenCalledWith(
        expect.objectContaining({ isMeteringEnabled: true }),
      );
      expect(mockRecorder.record).toHaveBeenCalledTimes(1);
      expect(result.current.state).toBe('recording');
      expect(result.current.amplitude).toBe(0);
      expect(result.current.durationMs).toBe(0);
      expect(result.current.result).toBeNull();
    });

    it('returns false and shows alert when permission is denied', async () => {
      mockRequestRecordingPermissions.mockResolvedValue({ granted: false, status: 'denied' });
      const alertSpy = jest.spyOn(Alert, 'alert');

      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      let started: boolean | undefined;
      await act(async () => {
        started = await result.current.startRecording();
      });

      expect(started).toBe(false);
      expect(alertSpy).toHaveBeenCalledTimes(1);
      expect(mockRecorder.prepareToRecordAsync).not.toHaveBeenCalled();
      expect(result.current.state).toBe('idle');

      alertSpy.mockRestore();
    });

    it('returns false and sets idle state when an error is thrown', async () => {
      mockSetAudioModeAsync.mockRejectedValueOnce(new Error('Audio mode failed'));

      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      let started: boolean | undefined;
      await act(async () => {
        started = await result.current.startRecording();
      });

      expect(started).toBe(false);
      expect(result.current.state).toBe('idle');
    });

    it('returns false when prepareToRecordAsync throws', async () => {
      mockRecorder.prepareToRecordAsync = jest.fn(() => Promise.reject(new Error('Prepare failed')));

      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      let started: boolean | undefined;
      await act(async () => {
        started = await result.current.startRecording();
      });

      expect(started).toBe(false);
      expect(result.current.state).toBe('idle');
    });
  });

  // ── stopRecording ─────────────────────────────────────────────────────────

  describe('stopRecording', () => {
    it('calls recorder.stop(), builds result with uri and duration, sets state to stopped', async () => {
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      // Start recording then update capturedDuration via recorderState
      await act(async () => {
        await result.current.startRecording();
      });

      // Simulate native layer reporting 3000ms duration
      (globalThis as Record<string, unknown>).__mockRecorderState = {
        isRecording: true,
        durationMillis: 3000,
        metering: -30,
      };

      const wrapper = createWrapper();
      const { result: result2, rerender } = renderHook(() => useAudioRecording(), { wrapper });

      await act(async () => {
        await result2.current.startRecording();
      });

      // Drive recorderState update to capture duration
      act(() => {
        (globalThis as Record<string, unknown>).__mockRecorderState = {
          isRecording: true,
          durationMillis: 3000,
          metering: -30,
        };
        rerender({});
      });

      let recordingResult: AudioRecordingResult | null = null;
      await act(async () => {
        recordingResult = await result2.current.stopRecording();
      });

      expect(mockRecorder.stop).toHaveBeenCalled();
      expect(recordingResult).not.toBeNull();
      expect(recordingResult!.uri).toBe('file:///mock/recording.m4a');
      expect(recordingResult!.mimeType).toBe('audio/mp4');
      expect(recordingResult!.fileSize).toBeGreaterThan(0);
      expect(result2.current.state).toBe('stopped');
    });

    it('returns null when called from idle state', async () => {
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      let res: AudioRecordingResult | null | undefined;
      await act(async () => {
        res = await result.current.stopRecording();
      });

      expect(res).toBeNull();
      expect(mockRecorder.stop).not.toHaveBeenCalled();
    });

    it('returns null when recorder.uri is null after stop', async () => {
      mockRecorder.uri = null;
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });

      let res: AudioRecordingResult | null | undefined;
      await act(async () => {
        res = await result.current.stopRecording();
      });

      expect(res).toBeNull();
      expect(result.current.state).toBe('idle');
    });

    it('returns null and sets idle when recorder.stop() throws', async () => {
      mockRecorder.stop = jest.fn(() => Promise.reject(new Error('stop failed')));
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });

      let res: AudioRecordingResult | null | undefined;
      await act(async () => {
        res = await result.current.stopRecording();
      });

      expect(res).toBeNull();
      expect(result.current.state).toBe('idle');
    });

    it('uses fileSize = 1 when FSFile constructor throws', async () => {
      const { File: FSFileMock } = require('expo-file-system');
      FSFileMock.mockImplementationOnce(() => { throw new Error('FS error'); });

      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });

      let res: AudioRecordingResult | null | undefined;
      await act(async () => {
        res = await result.current.stopRecording();
      });

      expect(res).not.toBeNull();
      expect(res!.fileSize).toBe(1);
    });

    it('uses fileSize = 1 when file.size is null/0', async () => {
      const { File: FSFileMock } = require('expo-file-system');
      FSFileMock.mockImplementationOnce(() => ({ size: null }));

      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });

      let res: AudioRecordingResult | null | undefined;
      await act(async () => {
        res = await result.current.stopRecording();
      });

      expect(res).not.toBeNull();
      expect(res!.fileSize).toBe(1);
    });

    it('returns null when called twice (isStoppingRef guard)', async () => {
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });

      // Make stop take a long time
      let resolveStop: () => void;
      mockRecorder.stop = jest.fn(
        () => new Promise<void>((resolve) => { resolveStop = resolve; })
      );

      let firstResult: AudioRecordingResult | null | undefined;
      let secondResult: AudioRecordingResult | null | undefined;

      await act(async () => {
        const p1 = result.current.stopRecording().then((r) => { firstResult = r; });
        const p2 = result.current.stopRecording().then((r) => { secondResult = r; });
        resolveStop!();
        await Promise.all([p1, p2]);
      });

      // Second call should be guarded by isStoppingRef
      expect(secondResult).toBeNull();
    });
  });

  // ── pauseRecording ────────────────────────────────────────────────────────

  describe('pauseRecording', () => {
    it('calls recorder.pause() and sets state to paused', async () => {
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.pauseRecording();
      });

      expect(mockRecorder.pause).toHaveBeenCalledTimes(1);
      expect(result.current.state).toBe('paused');
      expect(result.current.amplitude).toBe(0);
    });

    it('is a no-op when state is idle', async () => {
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.pauseRecording();
      });

      expect(mockRecorder.pause).not.toHaveBeenCalled();
    });

    it('is a no-op when already paused', async () => {
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.pauseRecording();
      });

      expect(result.current.state).toBe('paused');

      jest.clearAllMocks();
      mockSetAudioModeAsync.mockResolvedValue(undefined);

      await act(async () => {
        await result.current.pauseRecording();
      });

      // Should be no-op since stateRef is 'paused', not 'recording'
      expect(mockRecorder.pause).not.toHaveBeenCalled();
    });

    it('stays recording when recorder.pause() throws (graceful degradation)', async () => {
      mockRecorder.pause = jest.fn(() => { throw new Error('Pause not supported'); });

      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.pauseRecording();
      });

      // State should remain 'recording' on pause failure
      expect(result.current.state).toBe('recording');
    });
  });

  // ── resumeRecording ───────────────────────────────────────────────────────

  describe('resumeRecording', () => {
    it('calls recorder.record() and sets state to recording', async () => {
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.pauseRecording();
      });

      expect(result.current.state).toBe('paused');

      jest.clearAllMocks();
      mockSetAudioModeAsync.mockResolvedValue(undefined);

      await act(async () => {
        await result.current.resumeRecording();
      });

      expect(mockRecorder.record).toHaveBeenCalledTimes(1);
      expect(result.current.state).toBe('recording');
    });

    it('is a no-op when not paused', async () => {
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.resumeRecording();
      });

      expect(mockRecorder.record).not.toHaveBeenCalled();
    });

    it('transitions to idle when recorder.record() throws', async () => {
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.pauseRecording();
      });

      mockRecorder.record = jest.fn(() => { throw new Error('Record failed'); });

      await act(async () => {
        await result.current.resumeRecording();
      });

      expect(result.current.state).toBe('idle');
    });
  });

  // ── discardRecording ──────────────────────────────────────────────────────

  describe('discardRecording', () => {
    it('stops active recording and resets all state', async () => {
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.state).toBe('recording');

      await act(async () => {
        await result.current.discardRecording();
      });

      expect(mockRecorder.stop).toHaveBeenCalled();
      expect(result.current.state).toBe('idle');
      expect(result.current.amplitude).toBe(0);
      expect(result.current.durationMs).toBe(0);
      expect(result.current.result).toBeNull();
    });

    it('discards while paused', async () => {
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.pauseRecording();
      });

      await act(async () => {
        await result.current.discardRecording();
      });

      expect(mockRecorder.stop).toHaveBeenCalled();
      expect(result.current.state).toBe('idle');
    });

    it('is safe when not recording', async () => {
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.discardRecording();
      });

      // recorder.stop should NOT be called since wasActive is false
      expect(mockRecorder.stop).not.toHaveBeenCalled();
      expect(result.current.state).toBe('idle');
    });

    it('swallows error when recorder.stop() throws during discard', async () => {
      mockRecorder.stop = jest.fn(() => Promise.reject(new Error('Already stopped')));
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });

      // Should not throw
      await act(async () => {
        await result.current.discardRecording();
      });

      expect(result.current.state).toBe('idle');
    });
  });

  // ── reset ─────────────────────────────────────────────────────────────────

  describe('reset', () => {
    it('resets state to idle and clears all values', async () => {
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.state).toBe('recording');

      act(() => {
        result.current.reset();
      });

      expect(result.current.state).toBe('idle');
      expect(result.current.amplitude).toBe(0);
      expect(result.current.durationMs).toBe(0);
      expect(result.current.result).toBeNull();
    });
  });

  // ── recorderState effects (amplitude / duration / auto-stop) ─────────────

  describe('recorderState reactive effects', () => {
    it('updates amplitude and durationMs from recorderState while recording', async () => {
      const { result, rerender } = renderHook(() => useAudioRecording(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.state).toBe('recording');

      act(() => {
        (globalThis as Record<string, unknown>).__mockRecorderState = {
          isRecording: true,
          durationMillis: 5000,
          metering: -30,
        };
        rerender({});
      });

      expect(result.current.durationMs).toBe(5000);
      expect(result.current.amplitude).toBeCloseTo(0.5);
    });

    it('normalizes amplitude from metering value', async () => {
      const { result, rerender } = renderHook(() => useAudioRecording(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.startRecording();
      });

      act(() => {
        (globalThis as Record<string, unknown>).__mockRecorderState = {
          isRecording: true,
          durationMillis: 1000,
          metering: -15,
        };
        rerender({});
      });

      expect(result.current.amplitude).toBeCloseTo(0.75);
    });

    it('does not update state when not recording (idle state)', async () => {
      const { result, rerender } = renderHook(() => useAudioRecording(), {
        wrapper: createWrapper(),
      });

      // Do NOT call startRecording — state is idle
      act(() => {
        (globalThis as Record<string, unknown>).__mockRecorderState = {
          isRecording: true,
          durationMillis: 5000,
          metering: -30,
        };
        rerender({});
      });

      // State should remain idle because stateRef is 'idle'
      expect(result.current.state).toBe('idle');
      expect(result.current.durationMs).toBe(0);
    });

    it('auto-stops when durationMillis >= MAX_DURATION_MS', async () => {
      const { result, rerender } = renderHook(() => useAudioRecording(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.state).toBe('recording');

      await act(async () => {
        (globalThis as Record<string, unknown>).__mockRecorderState = {
          isRecording: true,
          durationMillis: MAX_DURATION_MS,
          metering: -30,
        };
        rerender({});
      });

      expect(mockRecorder.stop).toHaveBeenCalled();
      expect(result.current.state).toBe('stopped');
    });

    it('uses metering ?? -160 fallback for null metering', async () => {
      const { result, rerender } = renderHook(() => useAudioRecording(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.startRecording();
      });

      act(() => {
        (globalThis as Record<string, unknown>).__mockRecorderState = {
          isRecording: true,
          durationMillis: 1000,
          metering: null,
        };
        rerender({});
      });

      // -160 normalized → 0
      expect(result.current.amplitude).toBe(0);
    });
  });

  // ── type exports ──────────────────────────────────────────────────────────

  describe('type exports', () => {
    it('RecordingState type includes all expected states', () => {
      const states: RecordingState[] = ['idle', 'recording', 'paused', 'stopped'];
      expect(states).toHaveLength(4);
    });

    it('AudioRecordingResult has expected shape', () => {
      const res: AudioRecordingResult = {
        uri: 'file:///test.m4a',
        durationMs: 1000,
        fileSize: 512,
        mimeType: 'audio/mp4',
      };
      expect(res.mimeType).toBe('audio/mp4');
    });
  });
});
