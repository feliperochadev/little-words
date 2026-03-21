import { useRef, useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useAudioRecorder, useAudioRecorderState, RecordingPresets, AudioModule } from 'expo-audio';
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

  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const recorderState = useAudioRecorderState(recorder, AMPLITUDE_POLL_INTERVAL);

  const isStoppingRef = useRef(false);
  const stateRef = useRef<RecordingState>('idle');
  const capturedDurationRef = useRef(0);

  const [state, setState] = useState<RecordingState>('idle');
  const [amplitude, setAmplitude] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [result, setResult] = useState<AudioRecordingResult | null>(null);

  const setStateTracked = useCallback((s: RecordingState) => {
    stateRef.current = s;
    setState(s);
  }, []);

  const stopAndFinalize = useCallback(async (): Promise<AudioRecordingResult | null> => {
    if (isStoppingRef.current) return null;
    if (stateRef.current !== 'recording' && stateRef.current !== 'paused') return null;
    isStoppingRef.current = true;

    try {
      await recorder.stop();
      const uri = recorder.uri;

      if (!uri) {
        setStateTracked('idle');
        isStoppingRef.current = false;
        return null;
      }

      const elapsed = capturedDurationRef.current;
      let fileSize = 1;
      try {
        const file = new FSFile(uri);
        fileSize = Math.max(file.size ?? 1, 1);
      } catch {
        // Best-effort
      }

      const recordingResult: AudioRecordingResult = {
        uri,
        durationMs: elapsed,
        fileSize,
        mimeType: 'audio/mp4',
      };

      setStateTracked('stopped');
      setResult(recordingResult);
      isStoppingRef.current = false;
      return recordingResult;
    } catch {
      setStateTracked('idle');
      isStoppingRef.current = false;
      return null;
    }
  }, [recorder, setStateTracked]);

  // Sync amplitude and duration from recorderState when actively recording
  useEffect(() => {
    if (stateRef.current !== 'recording') return;
    setAmplitude(normalizeAmplitude(recorderState.metering ?? -160));
    const dur = recorderState.durationMillis ?? 0;
    setDurationMs(dur);
    capturedDurationRef.current = dur;
    if (dur >= MAX_DURATION_MS && !isStoppingRef.current) {
      void stopAndFinalize();
    }
  }, [recorderState, stopAndFinalize]);

  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert(t('common.error'), t('mediaCapture.micPermDenied'));
        return false;
      }

      await AudioModule.setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
      recorder.record();

      isStoppingRef.current = false;
      capturedDurationRef.current = 0;
      setStateTracked('recording');
      setAmplitude(0);
      setDurationMs(0);
      setResult(null);
      return true;
    } catch {
      setStateTracked('idle');
      return false;
    }
  }, [t, recorder, setStateTracked]);

  const stopRecording = useCallback(async (): Promise<AudioRecordingResult | null> => {
    return stopAndFinalize();
  }, [stopAndFinalize]);

  const pauseRecording = useCallback(async () => {
    if (stateRef.current !== 'recording' || isStoppingRef.current) return;
    try {
      recorder.pause();
      setStateTracked('paused');
      setAmplitude(0);
    } catch {
      // pause not supported on this platform — remain recording
    }
  }, [recorder, setStateTracked]);

  const resumeRecording = useCallback(async () => {
    if (stateRef.current !== 'paused') return;
    try {
      recorder.record();
      setStateTracked('recording');
    } catch {
      setStateTracked('idle');
    }
  }, [recorder, setStateTracked]);

  const discardRecording = useCallback(async () => {
    isStoppingRef.current = true;
    const wasActive = stateRef.current === 'recording' || stateRef.current === 'paused';
    setStateTracked('idle');
    setAmplitude(0);
    setDurationMs(0);
    setResult(null);
    capturedDurationRef.current = 0;
    if (wasActive) {
      try {
        await recorder.stop();
      } catch {
        // Already stopped
      }
    }
    isStoppingRef.current = false;
  }, [recorder, setStateTracked]);

  const reset = useCallback(() => {
    setStateTracked('idle');
    setAmplitude(0);
    setDurationMs(0);
    setResult(null);
    capturedDurationRef.current = 0;
  }, [setStateTracked]);

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
