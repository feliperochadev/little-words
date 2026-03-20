import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import { WAVEFORM } from '../utils/animationConstants';

/**
 * Manages a set of animated waveform bars that react to playback state.
 * When isPlaying is true, bars animate continuously to simulate a waveform.
 * When false, bars settle to their minimum height.
 *
 * Returns a stable array of {id, anim} objects — use bar.id as the React key
 * and bar.anim as the Animated.View height value.
 */
export function useWaveformAnimation(isPlaying: boolean): { id: string; anim: Animated.Value }[] {
  const barHeights = useRef(
    Array.from({ length: WAVEFORM.BAR_COUNT }, (_, i) => ({
      id: `wbar-${i}`,
      anim: new Animated.Value(WAVEFORM.MIN_HEIGHT),
    }))
  ).current;
  const animTickRef = useRef(0);

  useEffect(() => {
    if (!isPlaying) {
      barHeights.forEach(bar =>
        Animated.timing(bar.anim, { toValue: WAVEFORM.MIN_HEIGHT, duration: 100, useNativeDriver: false }).start()
      );
      return () => {
        barHeights.forEach(bar => bar.anim.stopAnimation());
      };
    }

    const intervalId = setInterval(() => {
      animTickRef.current += 1;
      const tick = animTickRef.current;
      barHeights.forEach((bar, i) => {
        const variation = 0.4 + (Math.sin(i * 1.5 + tick * 0.4 + Date.now() / 300) + 1) / 2 * 0.6;
        const height = WAVEFORM.MIN_HEIGHT + variation * (WAVEFORM.PLAYBACK_MAX_HEIGHT - WAVEFORM.MIN_HEIGHT);
        Animated.timing(bar.anim, { toValue: height, duration: 120, useNativeDriver: false }).start();
      });
    }, 150);

    return () => {
      clearInterval(intervalId);
      barHeights.forEach(bar => bar.anim.stopAnimation());
    };
  }, [isPlaying, barHeights]);

  return barHeights;
}
