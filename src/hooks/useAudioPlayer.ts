import { useRef, useState, useCallback, useEffect } from 'react';
import { createAudioPlayer, AudioModule } from 'expo-audio';
import type { AudioPlayer as ExpoAudioPlayer } from 'expo-audio';

export function useAudioPlayer() {
  const playerRef = useRef<ExpoAudioPlayer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [positionMs, setPositionMs] = useState(0);

  const unload = useCallback(async () => {
    if (playerRef.current) {
      try {
        playerRef.current.remove();
      } catch {
        // Already removed
      }
      playerRef.current = null;
    }
    setIsPlaying(false);
    setDurationMs(0);
    setPositionMs(0);
  }, []);

  const play = useCallback(async (uri: string) => {
    await unload();

    await AudioModule.setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
    });

    const player = createAudioPlayer({ uri });
    playerRef.current = player;

    player.addListener('playbackStatusUpdate', (status) => {
      if (status.isLoaded) {
        if (status.duration) {
          setDurationMs(status.duration * 1000);
        }
        if (status.currentTime !== undefined) {
          setPositionMs(status.currentTime * 1000);
        }
        if (status.didJustFinish) {
          setIsPlaying(false);
          setPositionMs(0);
          player.remove();
          if (playerRef.current === player) playerRef.current = null;
        }
      }
    });

    player.play();
    setIsPlaying(true);
  }, [unload]);

  const stop = useCallback(async () => {
    if (playerRef.current) {
      try {
        playerRef.current.pause();
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
      playerRef.current?.remove();
    };
  }, []);

  return { isPlaying, durationMs, positionMs, play, stop, unload };
}
