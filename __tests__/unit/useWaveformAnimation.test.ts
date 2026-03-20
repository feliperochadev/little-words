import { renderHook, act } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { useWaveformAnimation } from '../../src/hooks/useWaveformAnimation';

// ── Tests ────────────────────────────────────────────────────────────

describe('useWaveformAnimation', () => {
  describe('initial structure', () => {
    it('returns array of 20 bar objects', () => {
      const { result } = renderHook(() => useWaveformAnimation(false));
      expect(result.current).toHaveLength(20);
    });

    it('each bar has an id and anim property', () => {
      const { result } = renderHook(() => useWaveformAnimation(false));
      result.current.forEach(bar => {
        expect(typeof bar.id).toBe('string');
        expect(bar.anim).toBeDefined();
      });
    });

    it('all bar ids are unique', () => {
      const { result } = renderHook(() => useWaveformAnimation(false));
      const ids = result.current.map(b => b.id);
      expect(new Set(ids).size).toBe(20);
    });

    it('each bar anim is an Animated.Value', () => {
      const { result } = renderHook(() => useWaveformAnimation(false));
      result.current.forEach(bar => {
        expect(bar.anim).toBeInstanceOf(Animated.Value);
      });
    });
  });

  describe('reference stability', () => {
    it('returns the same array reference across renders', () => {
      const { result, rerender } = renderHook(
        ({ isPlaying }: { isPlaying: boolean }) => useWaveformAnimation(isPlaying),
        { initialProps: { isPlaying: false } }
      );
      const firstRef = result.current;
      act(() => { rerender({ isPlaying: true }); });
      expect(result.current).toBe(firstRef);
    });

    it('returns the same bar anim references across renders', () => {
      const { result, rerender } = renderHook(
        ({ isPlaying }: { isPlaying: boolean }) => useWaveformAnimation(isPlaying),
        { initialProps: { isPlaying: false } }
      );
      const firstAnims = result.current.map(b => b.anim);
      act(() => { rerender({ isPlaying: true }); });
      result.current.forEach((bar, i) => {
        expect(bar.anim).toBe(firstAnims[i]);
      });
    });
  });

  describe('lifecycle', () => {
    it('does not throw when isPlaying changes from false to true', () => {
      const { rerender } = renderHook(
        ({ isPlaying }: { isPlaying: boolean }) => useWaveformAnimation(isPlaying),
        { initialProps: { isPlaying: false } }
      );
      expect(() => act(() => { rerender({ isPlaying: true }); })).not.toThrow();
    });

    it('does not throw when isPlaying changes from true to false', () => {
      const { rerender } = renderHook(
        ({ isPlaying }: { isPlaying: boolean }) => useWaveformAnimation(isPlaying),
        { initialProps: { isPlaying: true } }
      );
      expect(() => act(() => { rerender({ isPlaying: false }); })).not.toThrow();
    });

    it('does not throw when unmounted while idle (isPlaying=false)', () => {
      const { unmount } = renderHook(() => useWaveformAnimation(false));
      expect(() => unmount()).not.toThrow();
    });

    it('does not throw when unmounted during playback (isPlaying=true)', () => {
      const { unmount } = renderHook(() => useWaveformAnimation(true));
      expect(() => unmount()).not.toThrow();
    });

    it('does not throw when rendered multiple times with isPlaying=false', () => {
      const { rerender } = renderHook(
        ({ isPlaying }: { isPlaying: boolean }) => useWaveformAnimation(isPlaying),
        { initialProps: { isPlaying: false } }
      );
      expect(() => {
        act(() => { rerender({ isPlaying: false }); });
        act(() => { rerender({ isPlaying: false }); });
      }).not.toThrow();
    });
  });

  describe('interval callback (fake timers)', () => {
    beforeEach(() => { jest.useFakeTimers(); });
    afterEach(() => { jest.useRealTimers(); });

    it('interval fires after 150ms when isPlaying=true and does not throw', () => {
      const { unmount } = renderHook(() => useWaveformAnimation(true));
      expect(() => act(() => { jest.advanceTimersByTime(200); })).not.toThrow();
      act(() => { unmount(); });
    });

    it('interval fires multiple times and does not throw', () => {
      const { unmount } = renderHook(() => useWaveformAnimation(true));
      expect(() => act(() => { jest.advanceTimersByTime(500); })).not.toThrow();
      act(() => { unmount(); });
    });

    it('cleanup clears interval when isPlaying changes to false', () => {
      const { rerender, unmount } = renderHook(
        ({ isPlaying }: { isPlaying: boolean }) => useWaveformAnimation(isPlaying),
        { initialProps: { isPlaying: true } }
      );
      act(() => { jest.advanceTimersByTime(200); });
      act(() => { rerender({ isPlaying: false }); });
      // Should not throw after cleanup; further timer advances are no-ops
      expect(() => act(() => { jest.advanceTimersByTime(200); })).not.toThrow();
      act(() => { unmount(); });
    });

    it('cleanup clears interval on unmount during playback', () => {
      const { unmount } = renderHook(() => useWaveformAnimation(true));
      act(() => { jest.advanceTimersByTime(150); });
      expect(() => act(() => { unmount(); })).not.toThrow();
    });
  });
});
