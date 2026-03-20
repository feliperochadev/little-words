import { renderHook, act, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { Audio } from 'expo-av';
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

const mockRecording = (globalThis as Record<string, unknown>).__mockRecording as {
  prepareToRecordAsync: jest.Mock;
  startAsync: jest.Mock;
  stopAndUnloadAsync: jest.Mock;
  pauseAsync: jest.Mock;
  getStatusAsync: jest.Mock;
  getURI: jest.Mock;
};

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
    // (-45 - (-60)) / (0 - (-60)) = 15 / 60 = 0.25
    expect(normalizeAmplitude(-45)).toBe(0.25);
  });

  it('returns correct interpolation for -15 dB', () => {
    // (-15 - (-60)) / 60 = 45 / 60 = 0.75
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
    jest.useRealTimers();

    // Reset mocks to default successful behavior
    mockRecording.prepareToRecordAsync.mockResolvedValue(undefined);
    mockRecording.startAsync.mockResolvedValue(undefined);
    mockRecording.stopAndUnloadAsync.mockResolvedValue(undefined);
    mockRecording.pauseAsync.mockResolvedValue(undefined);
    mockRecording.getStatusAsync.mockResolvedValue({ isRecording: true, metering: -30 });
    mockRecording.getURI.mockReturnValue('file:///mock/recording.m4a');
    (Audio.requestPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true, status: 'granted' });
    (Audio.setAudioModeAsync as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('returns idle state with zeroed values', () => {
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      expect(result.current.state).toBe('idle');
      expect(result.current.amplitude).toBe(0);
      expect(result.current.durationMs).toBe(0);
      expect(result.current.result).toBeNull();
    });
  });

  // ── startRecording ─────────────────────────────────────────────────────────

  describe('startRecording', () => {
    it('requests permission, sets audio mode, and starts recording', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      let started: boolean | undefined;
      await act(async () => {
        started = await result.current.startRecording();
      });

      expect(started).toBe(true);
      expect(Audio.requestPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(Audio.setAudioModeAsync).toHaveBeenCalledWith({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      expect(mockRecording.prepareToRecordAsync).toHaveBeenCalledWith(
        expect.objectContaining({ isMeteringEnabled: true }),
      );
      expect(mockRecording.startAsync).toHaveBeenCalledTimes(1);
      expect(result.current.state).toBe('recording');
      expect(result.current.amplitude).toBe(0);
      expect(result.current.durationMs).toBe(0);
      expect(result.current.result).toBeNull();
    });

    it('returns false and shows alert when permission is denied', async () => {
      (Audio.requestPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false, status: 'denied' });
      const alertSpy = jest.spyOn(Alert, 'alert');

      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      let started: boolean | undefined;
      await act(async () => {
        started = await result.current.startRecording();
      });

      expect(started).toBe(false);
      expect(alertSpy).toHaveBeenCalledTimes(1);
      expect(alertSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Microphone'),
      );
      expect(mockRecording.prepareToRecordAsync).not.toHaveBeenCalled();
      expect(result.current.state).toBe('idle');

      alertSpy.mockRestore();
    });

    it('returns false and sets idle state when an error is thrown', async () => {
      (Audio.setAudioModeAsync as jest.Mock).mockRejectedValue(new Error('Audio mode failed'));

      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      let started: boolean | undefined;
      await act(async () => {
        started = await result.current.startRecording();
      });

      expect(started).toBe(false);
      expect(result.current.state).toBe('idle');
    });

    it('returns false when prepareToRecordAsync throws', async () => {
      mockRecording.prepareToRecordAsync.mockRejectedValue(new Error('Prepare failed'));

      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      let started: boolean | undefined;
      await act(async () => {
        started = await result.current.startRecording();
      });

      expect(started).toBe(false);
      expect(result.current.state).toBe('idle');
    });

    it('returns false when startAsync throws', async () => {
      mockRecording.startAsync.mockRejectedValue(new Error('Start failed'));

      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      let started: boolean | undefined;
      await act(async () => {
        started = await result.current.startRecording();
      });

      expect(started).toBe(false);
      expect(result.current.state).toBe('idle');
    });
  });

  // ── stopRecording ──────────────────────────────────────────────────────────

  describe('stopRecording', () => {
    it('stops recording and returns AudioRecordingResult', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });

      let recordingResult: AudioRecordingResult | null = null;
      await act(async () => {
        recordingResult = await result.current.stopRecording();
      });

      expect(mockRecording.stopAndUnloadAsync).toHaveBeenCalledTimes(1);
      expect(mockRecording.getURI).toHaveBeenCalledTimes(1);
      expect(recordingResult).not.toBeNull();
      expect(recordingResult!.uri).toBe('file:///mock/recording.m4a');
      expect(recordingResult!.mimeType).toBe('audio/mp4');
      expect(recordingResult!.fileSize).toBeGreaterThanOrEqual(1);
      expect(recordingResult!.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.current.state).toBe('stopped');
      expect(result.current.result).toEqual(recordingResult);
    });

    it('returns null when no recording exists', async () => {
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      let recordingResult: AudioRecordingResult | null = null;
      await act(async () => {
        recordingResult = await result.current.stopRecording();
      });

      expect(recordingResult).toBeNull();
      expect(mockRecording.stopAndUnloadAsync).not.toHaveBeenCalled();
    });

    it('returns null when URI is null', async () => {
      jest.useFakeTimers();
      mockRecording.getURI.mockReturnValue(null);

      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });

      let recordingResult: AudioRecordingResult | null = null;
      await act(async () => {
        recordingResult = await result.current.stopRecording();
      });

      expect(recordingResult).toBeNull();
      expect(result.current.state).toBe('idle');
    });

    it('returns null and resets to idle when stopAndUnloadAsync throws', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });

      mockRecording.stopAndUnloadAsync.mockRejectedValueOnce(new Error('Stop failed'));

      let recordingResult: AudioRecordingResult | null = null;
      await act(async () => {
        recordingResult = await result.current.stopRecording();
      });

      expect(recordingResult).toBeNull();
      expect(result.current.state).toBe('idle');
    });
  });

  // ── Double-stop guard ──────────────────────────────────────────────────────

  describe('double-stop guard (isStoppingRef)', () => {
    it('returns null for second concurrent stop call', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });

      // Make stopAndUnloadAsync slow so isStoppingRef stays true
      let resolveStop: (() => void) | undefined;
      mockRecording.stopAndUnloadAsync.mockImplementation(
        () => new Promise<void>((resolve) => { resolveStop = resolve; }),
      );

      let firstResult: AudioRecordingResult | null = null;
      let secondResult: AudioRecordingResult | null = null;

      await act(async () => {
        const firstPromise = result.current.stopRecording();
        // Second call while first is in-flight
        secondResult = await result.current.stopRecording();
        // Now resolve the first
        resolveStop?.();
        firstResult = await firstPromise;
      });

      expect(secondResult).toBeNull();
      expect(firstResult).not.toBeNull();
      expect(mockRecording.stopAndUnloadAsync).toHaveBeenCalledTimes(1);
    });
  });

  // ── discardRecording ───────────────────────────────────────────────────────

  describe('discardRecording', () => {
    it('stops recording and resets state to idle', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });
      expect(result.current.state).toBe('recording');

      await act(async () => {
        await result.current.discardRecording();
      });

      expect(mockRecording.stopAndUnloadAsync).toHaveBeenCalledTimes(1);
      expect(result.current.state).toBe('idle');
      expect(result.current.amplitude).toBe(0);
      expect(result.current.durationMs).toBe(0);
      expect(result.current.result).toBeNull();
    });

    it('handles no active recording gracefully', async () => {
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.discardRecording();
      });

      expect(result.current.state).toBe('idle');
      expect(mockRecording.stopAndUnloadAsync).not.toHaveBeenCalled();
    });

    it('handles stopAndUnloadAsync throwing during discard', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });

      mockRecording.stopAndUnloadAsync.mockRejectedValueOnce(new Error('Already stopped'));

      await act(async () => {
        await result.current.discardRecording();
      });

      // Should still reset state despite the error
      expect(result.current.state).toBe('idle');
      expect(result.current.amplitude).toBe(0);
    });
  });

  // ── reset ──────────────────────────────────────────────────────────────────

  describe('reset', () => {
    it('resets state without touching recording', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      // Start and stop to get into "stopped" state with a result
      await act(async () => {
        await result.current.startRecording();
      });
      await act(async () => {
        await result.current.stopRecording();
      });
      expect(result.current.state).toBe('stopped');
      expect(result.current.result).not.toBeNull();

      // Clear stopAndUnloadAsync call count
      mockRecording.stopAndUnloadAsync.mockClear();

      act(() => {
        result.current.reset();
      });

      expect(result.current.state).toBe('idle');
      expect(result.current.amplitude).toBe(0);
      expect(result.current.durationMs).toBe(0);
      expect(result.current.result).toBeNull();
      // reset() should NOT call stopAndUnloadAsync
      expect(mockRecording.stopAndUnloadAsync).not.toHaveBeenCalled();
    });
  });

  // ── Amplitude polling ──────────────────────────────────────────────────────

  describe('amplitude polling', () => {
    it('polls getStatusAsync on interval and updates amplitude/duration', async () => {
      jest.useFakeTimers();
      const now = 1000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });

      // Advance time so elapsed > 0
      (Date.now as jest.Mock).mockReturnValue(now + 300);
      mockRecording.getStatusAsync.mockResolvedValue({ isRecording: true, metering: -30 });

      await act(async () => {
        jest.advanceTimersByTime(150);
      });

      // Allow the async getStatusAsync promise to resolve
      await act(async () => {
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(result.current.amplitude).toBe(0.5); // normalizeAmplitude(-30) = 0.5
      });
      expect(result.current.durationMs).toBeGreaterThan(0);
    });

    it('uses -160 metering when metering is undefined', async () => {
      jest.useFakeTimers();
      const now = 1000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });

      (Date.now as jest.Mock).mockReturnValue(now + 200);
      mockRecording.getStatusAsync.mockResolvedValue({ isRecording: true, metering: undefined });

      await act(async () => {
        jest.advanceTimersByTime(150);
      });
      await act(async () => {
        await Promise.resolve();
      });

      await waitFor(() => {
        // normalizeAmplitude(-160) = 0
        expect(result.current.amplitude).toBe(0);
      });
    });

    it('does not update amplitude when isRecording is false', async () => {
      jest.useFakeTimers();
      const now = 1000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });

      mockRecording.getStatusAsync.mockResolvedValue({ isRecording: false, metering: -10 });

      await act(async () => {
        jest.advanceTimersByTime(150);
      });
      await act(async () => {
        await Promise.resolve();
      });

      // Amplitude stays at 0 since isRecording is false
      expect(result.current.amplitude).toBe(0);
    });

    it('swallows errors from getStatusAsync in polling', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });

      mockRecording.getStatusAsync.mockRejectedValueOnce(new Error('Status check failed'));

      // Should not throw
      await act(async () => {
        jest.advanceTimersByTime(150);
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.state).toBe('recording');
    });
  });

  // ── Auto-stop at MAX_DURATION_MS ───────────────────────────────────────────

  describe('auto-stop at MAX_DURATION_MS', () => {
    it('calls stopAndFinalize when elapsed reaches MAX_DURATION_MS', async () => {
      jest.useFakeTimers();
      const startTime = 1000;
      jest.spyOn(Date, 'now').mockReturnValue(startTime);

      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.state).toBe('recording');

      // Simulate elapsed time exceeding MAX_DURATION_MS
      (Date.now as jest.Mock).mockReturnValue(startTime + MAX_DURATION_MS + 100);
      mockRecording.getStatusAsync.mockResolvedValue({ isRecording: true, metering: -20 });

      await act(async () => {
        jest.advanceTimersByTime(150);
      });
      await act(async () => {
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(result.current.state).toBe('stopped');
      });
      expect(result.current.result).not.toBeNull();
      expect(result.current.result!.uri).toBe('file:///mock/recording.m4a');
    });
  });

  // ── Cleanup on unmount ─────────────────────────────────────────────────────

  describe('cleanup on unmount', () => {
    it('clears timers and stops recording on unmount', async () => {
      jest.useFakeTimers();
      const { result, unmount } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });
      expect(result.current.state).toBe('recording');

      mockRecording.stopAndUnloadAsync.mockClear();

      unmount();

      expect(mockRecording.stopAndUnloadAsync).toHaveBeenCalledTimes(1);
    });

    it('does not throw on unmount when no recording is active', () => {
      const { unmount } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      // Should not throw
      expect(() => unmount()).not.toThrow();
      expect(mockRecording.stopAndUnloadAsync).not.toHaveBeenCalled();
    });

    it('handles stopAndUnloadAsync error on unmount gracefully', async () => {
      jest.useFakeTimers();
      const { result, unmount } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });

      mockRecording.stopAndUnloadAsync.mockRejectedValueOnce(new Error('Unmount stop fail'));

      // Should not throw
      expect(() => unmount()).not.toThrow();
    });
  });

  // ── clearTimers coverage ───────────────────────────────────────────────────

  describe('clearTimers', () => {
    it('clears interval timer when stopping recording', async () => {
      jest.useFakeTimers();
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });

      clearIntervalSpy.mockClear();

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(clearIntervalSpy).toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
    });

    it('is a no-op when called without active timer (via discard with no recording)', async () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.discardRecording();
      });

      // clearInterval should not be called since no timer was active
      expect(clearIntervalSpy).not.toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
    });
  });

  // ── File size fallback ─────────────────────────────────────────────────────

  describe('file size handling', () => {
    it('uses file.size from FSFile when available', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });

      let recordingResult: AudioRecordingResult | null = null;
      await act(async () => {
        recordingResult = await result.current.stopRecording();
      });

      // The mock FSFile has size: 1024 (from jest.setup.js _fileMock)
      expect(recordingResult).not.toBeNull();
      expect(recordingResult!.fileSize).toBe(1024);
    });

    it('falls back to 1 when FSFile constructor throws', async () => {
      jest.useFakeTimers();
      // Temporarily make File constructor throw
      const FSModule = require('expo-file-system');
      const originalFile = FSModule.File;
      FSModule.File = jest.fn(() => { throw new Error('File not found'); });

      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });

      let recordingResult: AudioRecordingResult | null = null;
      await act(async () => {
        recordingResult = await result.current.stopRecording();
      });

      expect(recordingResult).not.toBeNull();
      expect(recordingResult!.fileSize).toBe(1);

      // Restore
      FSModule.File = originalFile;
    });

    it('uses 1 when file.size is null', async () => {
      jest.useFakeTimers();
      const FSModule = require('expo-file-system');
      const originalFile = FSModule.File;
      FSModule.File = jest.fn(() => ({ size: null }));

      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });

      let recordingResult: AudioRecordingResult | null = null;
      await act(async () => {
        recordingResult = await result.current.stopRecording();
      });

      expect(recordingResult).not.toBeNull();
      // Math.max(null ?? 1, 1) = Math.max(1, 1) = 1
      expect(recordingResult!.fileSize).toBe(1);

      FSModule.File = originalFile;
    });

    it('uses 1 when file.size is 0', async () => {
      jest.useFakeTimers();
      const FSModule = require('expo-file-system');
      const originalFile = FSModule.File;
      FSModule.File = jest.fn(() => ({ size: 0 }));

      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });

      let recordingResult: AudioRecordingResult | null = null;
      await act(async () => {
        recordingResult = await result.current.stopRecording();
      });

      expect(recordingResult).not.toBeNull();
      // Math.max(0 ?? 1, 1) = Math.max(0, 1) = 1
      expect(recordingResult!.fileSize).toBe(1);

      FSModule.File = originalFile;
    });
  });

  // ── pauseRecording ─────────────────────────────────────────────────────────

  describe('pauseRecording', () => {
    it('pauses recording and transitions state to paused', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });
      expect(result.current.state).toBe('recording');

      await act(async () => {
        await result.current.pauseRecording();
      });

      expect(mockRecording.pauseAsync).toHaveBeenCalledTimes(1);
      expect(result.current.state).toBe('paused');
      expect(result.current.amplitude).toBe(0);
    });

    it('clears amplitude polling interval when pausing', async () => {
      jest.useFakeTimers();
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });

      clearIntervalSpy.mockClear();

      await act(async () => {
        await result.current.pauseRecording();
      });

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    it('is a no-op when no recording is active', async () => {
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.pauseRecording();
      });

      expect(mockRecording.pauseAsync).not.toHaveBeenCalled();
      expect(result.current.state).toBe('idle');
    });

    it('is a no-op when already paused', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });
      await act(async () => {
        await result.current.pauseRecording();
      });
      expect(result.current.state).toBe('paused');

      mockRecording.pauseAsync.mockClear();

      await act(async () => {
        await result.current.pauseRecording();
      });

      expect(mockRecording.pauseAsync).not.toHaveBeenCalled();
    });

    it('restarts polling without pausing when pauseAsync throws', async () => {
      jest.useFakeTimers();
      mockRecording.pauseAsync.mockRejectedValueOnce(new Error('Not supported'));

      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.pauseRecording();
      });

      // State remains recording (graceful degradation)
      expect(result.current.state).toBe('recording');
    });
  });

  // ── resumeRecording ────────────────────────────────────────────────────────

  describe('resumeRecording', () => {
    it('resumes recording and transitions state back to recording', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });
      await act(async () => {
        await result.current.pauseRecording();
      });
      expect(result.current.state).toBe('paused');

      await act(async () => {
        await result.current.resumeRecording();
      });

      expect(mockRecording.startAsync).toHaveBeenCalledTimes(2); // once start, once resume
      expect(result.current.state).toBe('recording');
    });

    it('restarts amplitude polling after resuming', async () => {
      jest.useFakeTimers();
      const now = 1000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });
      await act(async () => {
        await result.current.pauseRecording();
      });
      await act(async () => {
        await result.current.resumeRecording();
      });

      (Date.now as jest.Mock).mockReturnValue(now + 300);
      mockRecording.getStatusAsync.mockResolvedValue({ isRecording: true, metering: -30 });

      await act(async () => {
        jest.advanceTimersByTime(150);
      });
      await act(async () => {
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(result.current.amplitude).toBe(0.5);
      });
    });

    it('is a no-op when not paused', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });
      expect(result.current.state).toBe('recording');

      mockRecording.startAsync.mockClear();

      await act(async () => {
        await result.current.resumeRecording();
      });

      // startAsync should NOT be called again (we're already recording, not paused)
      expect(mockRecording.startAsync).not.toHaveBeenCalled();
      expect(result.current.state).toBe('recording');
    });

    it('transitions to idle when startAsync throws during resume', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });
      await act(async () => {
        await result.current.pauseRecording();
      });

      mockRecording.startAsync.mockRejectedValueOnce(new Error('Resume failed'));

      await act(async () => {
        await result.current.resumeRecording();
      });

      expect(result.current.state).toBe('idle');
    });
  });

  // ── Paused time excluded from elapsed ──────────────────────────────────────

  describe('paused time exclusion', () => {
    it('elapsed time does not include time spent paused', async () => {
      jest.useFakeTimers();
      const startTime = 1000;
      jest.spyOn(Date, 'now').mockReturnValue(startTime);

      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });

      // Advance 5 seconds of recording
      (Date.now as jest.Mock).mockReturnValue(startTime + 5000);

      // Pause at 5s
      await act(async () => {
        await result.current.pauseRecording();
      });

      // Advance 10 more seconds while paused
      (Date.now as jest.Mock).mockReturnValue(startTime + 15000);

      // Resume
      await act(async () => {
        await result.current.resumeRecording();
      });

      // Advance 3 more seconds of recording
      (Date.now as jest.Mock).mockReturnValue(startTime + 18000);

      // Stop and check result duration: should be 5s + 3s = 8s (10s pause excluded)
      let recordingResult: AudioRecordingResult | null = null;
      await act(async () => {
        recordingResult = await result.current.stopRecording();
      });

      expect(recordingResult).not.toBeNull();
      // durationMs = 8000 (5s + 3s, excluding 10s pause)
      expect(recordingResult!.durationMs).toBe(8000);
    });

    it('auto-stop counts only active recording time', async () => {
      jest.useFakeTimers();
      const startTime = 1000;
      jest.spyOn(Date, 'now').mockReturnValue(startTime);

      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });

      // Pause after 30s
      (Date.now as jest.Mock).mockReturnValue(startTime + 30000);
      await act(async () => {
        await result.current.pauseRecording();
      });

      // Wait 120s while paused (way beyond 60s limit)
      (Date.now as jest.Mock).mockReturnValue(startTime + 150000);

      // Resume: now elapsed = 30s (pause time excluded), so should NOT auto-stop immediately
      await act(async () => {
        await result.current.resumeRecording();
      });
      expect(result.current.state).toBe('recording');

      // Advance another 25s of recording (30 + 25 = 55s total active, under limit)
      (Date.now as jest.Mock).mockReturnValue(startTime + 175000);
      mockRecording.getStatusAsync.mockResolvedValue({ isRecording: true, metering: -20 });

      await act(async () => {
        jest.advanceTimersByTime(150);
      });
      await act(async () => {
        await Promise.resolve();
      });

      // Should still be recording (55s < 60s)
      expect(result.current.state).toBe('recording');
    });
  });

  // ── Polling guard: no-op when recording ref cleared or isStopping ──────────

  describe('polling guard', () => {
    it('does nothing when isStoppingRef is true during interval callback', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useAudioRecording(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.startRecording();
      });

      // Start a stop that is slow (sets isStoppingRef = true)
      let resolveStop: (() => void) | undefined;
      mockRecording.stopAndUnloadAsync.mockImplementation(
        () => new Promise<void>((resolve) => { resolveStop = resolve; }),
      );

      mockRecording.getStatusAsync.mockClear();

      // Start stopping (sets isStoppingRef = true)
      let stopPromise: Promise<AudioRecordingResult | null>;
      await act(async () => {
        stopPromise = result.current.stopRecording();
      });

      // Trigger interval while isStopping
      await act(async () => {
        jest.advanceTimersByTime(150);
      });

      // getStatusAsync should NOT have been called because of the isStopping guard
      expect(mockRecording.getStatusAsync).not.toHaveBeenCalled();

      // Clean up
      await act(async () => {
        resolveStop?.();
        await stopPromise!;
      });
    });
  });
});
