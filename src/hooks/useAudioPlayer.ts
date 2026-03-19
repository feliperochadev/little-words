import { useRef, useState, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';

export function useAudioPlayer() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [durationMs, setDurationMs] = useState(0);

  const unload = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch {
        // Already unloaded
      }
      soundRef.current = null;
    }
    setIsPlaying(false);
    setDurationMs(0);
  }, []);

  const play = useCallback(async (uri: string) => {
    await unload();

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    });

    const { sound, status } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true },
    );

    soundRef.current = sound;
    if (status.isLoaded) {
      setDurationMs(status.durationMillis ?? 0);
    }
    setIsPlaying(true);

    sound.setOnPlaybackStatusUpdate((playbackStatus) => {
      if (playbackStatus.isLoaded && playbackStatus.didJustFinish) {
        setIsPlaying(false);
        sound.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    });
  }, [unload]);

  const stop = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
      } catch {
        // Already stopped
      }
    }
    setIsPlaying(false);
    await unload();
  }, [unload]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  return { isPlaying, durationMs, play, stop, unload };
}
