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

export type RecordingState = 'idle' | 'recording' | 'stopped';

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
        isStoppingRef.current = false;
        return null;
      }

      const elapsed = Date.now() - startTimeRef.current;
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
      isStoppingRef.current = false;
      return recordingResult;
    } catch {
      recordingRef.current = null;
      setState('idle');
      isStoppingRef.current = false;
      return null;
    }
  }, [clearTimers]);

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
      setState('recording');
      setAmplitude(0);
      setDurationMs(0);
      setResult(null);

      amplitudeTimerRef.current = setInterval(async () => {
        if (!recordingRef.current || isStoppingRef.current) return;
        try {
          const status = await recordingRef.current.getStatusAsync();
          if (status.isRecording) {
            setAmplitude(normalizeAmplitude(status.metering ?? -160));
            const elapsed = Date.now() - startTimeRef.current;
            setDurationMs(elapsed);

            if (elapsed >= MAX_DURATION_MS) {
              await stopAndFinalize();
            }
          }
        } catch {
          // Recording may have been stopped externally
        }
      }, AMPLITUDE_POLL_INTERVAL);

      return true;
    } catch {
      setState('idle');
      return false;
    }
  }, [t, stopAndFinalize]);

  const stopRecording = useCallback(async (): Promise<AudioRecordingResult | null> => {
    return stopAndFinalize();
  }, [stopAndFinalize]);

  const discardRecording = useCallback(async () => {
    clearTimers();
    isStoppingRef.current = true;
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
    discardRecording,
    reset,
  };
}
