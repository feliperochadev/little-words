import { useRef, useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { Audio } from 'expo-av';
import { File as FSFile } from 'expo-file-system';
import { useI18n } from '../i18n/i18n';

export const MAX_DURATION_MS = 60_000;
const AMPLITUDE_POLL_INTERVAL = 150;
const MIN_DB = -60;

/** Normalize metering dB (-60..0) to 0..1 range */
export function normalizeAmplitude(db: number): number {
  return Math.max(0, Math.min(1, (db - MIN_DB) / (0 - MIN_DB)));
}

export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

export interface AudioRecordingResult {
  uri: string;
  durationMs: number;
  fileSize: number;
  mimeType: string;
}

export function useAudioRecording() {
  const { t } = useI18n();
  const recordingRef = useRef<Audio.Recording | null>(null);
  const amplitudeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const isStoppingRef = useRef(false);
  const isPausedRef = useRef(false);
  const pauseStartTimeRef = useRef(0);
  const totalPausedMsRef = useRef(0);

  const [state, setState] = useState<RecordingState>('idle');
  const [amplitude, setAmplitude] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [result, setResult] = useState<AudioRecordingResult | null>(null);

  const clearTimers = useCallback(() => {
    if (amplitudeTimerRef.current) {
      clearInterval(amplitudeTimerRef.current);
      amplitudeTimerRef.current = null;
    }
  }, []);

  /** Returns active recording duration excluding all paused time */
  const getActiveDuration = useCallback((): number => {
    const currentPausedSoFar = isPausedRef.current
      ? Date.now() - pauseStartTimeRef.current
      : 0;
    return Date.now() - startTimeRef.current - totalPausedMsRef.current - currentPausedSoFar;
  }, []);

  const stopAndFinalize = useCallback(async (): Promise<AudioRecordingResult | null> => {
    if (isStoppingRef.current) return null;
    isStoppingRef.current = true;
    clearTimers();

    const recording = recordingRef.current;
    if (!recording) {
      isStoppingRef.current = false;
      return null;
    }

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;

      if (!uri) {
        setState('idle');
        isPausedRef.current = false;
        isStoppingRef.current = false;
        return null;
      }

      const elapsed = getActiveDuration();
      let fileSize = 1;
      try {
        const file = new FSFile(uri);
        fileSize = Math.max(file.size ?? 1, 1);
      } catch {
        // Best-effort — use default
      }

      const recordingResult: AudioRecordingResult = {
        uri,
        durationMs: elapsed,
        fileSize,
        mimeType: 'audio/mp4',
      };

      setState('stopped');
      setResult(recordingResult);
      isPausedRef.current = false;
      isStoppingRef.current = false;
      return recordingResult;
    } catch {
      recordingRef.current = null;
      setState('idle');
      isPausedRef.current = false;
      isStoppingRef.current = false;
      return null;
    }
  }, [clearTimers, getActiveDuration]);

  const startPollInterval = useCallback(() => {
    if (amplitudeTimerRef.current) {
      clearInterval(amplitudeTimerRef.current);
      amplitudeTimerRef.current = null;
    }
    amplitudeTimerRef.current = setInterval(async () => {
      if (!recordingRef.current || isStoppingRef.current) return;
      try {
        const status = await recordingRef.current.getStatusAsync();
        if (status.isRecording) {
          setAmplitude(normalizeAmplitude(status.metering ?? -160));
          const elapsed = getActiveDuration();
          setDurationMs(elapsed);

          if (elapsed >= MAX_DURATION_MS) {
            await stopAndFinalize();
          }
        }
      } catch {
        // Recording may have been stopped externally
      }
    }, AMPLITUDE_POLL_INTERVAL);
  }, [stopAndFinalize, getActiveDuration]);

  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert(t('common.error'), t('mediaCapture.micPermDenied'));
        return false;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });
      await recording.startAsync();

      recordingRef.current = recording;
      startTimeRef.current = Date.now();
      isStoppingRef.current = false;
      isPausedRef.current = false;
      totalPausedMsRef.current = 0;
      pauseStartTimeRef.current = 0;
      setState('recording');
      setAmplitude(0);
      setDurationMs(0);
      setResult(null);

      startPollInterval();

      return true;
    } catch {
      setState('idle');
      return false;
    }
  }, [t, startPollInterval]);

  const stopRecording = useCallback(async (): Promise<AudioRecordingResult | null> => {
    return stopAndFinalize();
  }, [stopAndFinalize]);

  const pauseRecording = useCallback(async () => {
    if (!recordingRef.current || isStoppingRef.current || isPausedRef.current) return;
    clearTimers();
    pauseStartTimeRef.current = Date.now();
    try {
      await recordingRef.current.pauseAsync();
      isPausedRef.current = true;
      setState('paused');
      setAmplitude(0);
    } catch {
      // pauseAsync not supported (e.g., older iOS) — restart interval without pausing
      isPausedRef.current = false;
      startPollInterval();
    }
  }, [clearTimers, startPollInterval]);

  const resumeRecording = useCallback(async () => {
    if (!recordingRef.current || !isPausedRef.current) return;
    totalPausedMsRef.current += Date.now() - pauseStartTimeRef.current;
    isPausedRef.current = false;
    try {
      await recordingRef.current.startAsync();
      setState('recording');
      startPollInterval();
    } catch {
      // Failed to resume — transition to idle
      recordingRef.current = null;
      isPausedRef.current = false;
      setState('idle');
    }
  }, [startPollInterval]);

  const discardRecording = useCallback(async () => {
    clearTimers();
    isStoppingRef.current = true;
    isPausedRef.current = false;
    totalPausedMsRef.current = 0;
    pauseStartTimeRef.current = 0;
    const recording = recordingRef.current;
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
      } catch {
        // Already stopped
      }
      recordingRef.current = null;
    }
    isStoppingRef.current = false;
    setState('idle');
    setAmplitude(0);
    setDurationMs(0);
    setResult(null);
  }, [clearTimers]);

  const reset = useCallback(() => {
    setState('idle');
    setAmplitude(0);
    setDurationMs(0);
    setResult(null);
    isPausedRef.current = false;
    totalPausedMsRef.current = 0;
    pauseStartTimeRef.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
    };
  }, [clearTimers]);

  return {
    state,
    amplitude,
    durationMs,
    result,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    discardRecording,
    reset,
  };
}
