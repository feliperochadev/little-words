import { renderHook, act } from '@testing-library/react-native';
import { createAudioPlayer, AudioModule } from 'expo-audio';

import { useAudioPlayer } from '../../src/hooks/useAudioPlayer';

type MockPlayer = {
  play: jest.Mock;
  pause: jest.Mock;
  remove: jest.Mock;
  replace: jest.Mock;
  seekTo: jest.Mock;
  addListener: jest.Mock;
};

const mockPlayer = (globalThis as Record<string, unknown>).__mockPlayer as MockPlayer;
const mockCreateAudioPlayer = createAudioPlayer as jest.Mock;
const mockSetAudioModeAsync = AudioModule.setAudioModeAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateAudioPlayer.mockReturnValue(mockPlayer);
});

describe('useAudioPlayer', () => {
  describe('initial state', () => {
    it('returns isPlaying false and durationMs 0', () => {
      const { result } = renderHook(() => useAudioPlayer());

      expect(result.current.isPlaying).toBe(false);
      expect(result.current.durationMs).toBe(0);
    });

    it('exposes play, stop, and unload functions', () => {
      const { result } = renderHook(() => useAudioPlayer());

      expect(typeof result.current.play).toBe('function');
      expect(typeof result.current.stop).toBe('function');
      expect(typeof result.current.unload).toBe('function');
    });
  });

  describe('play(uri)', () => {
    it('sets audio mode, creates player, registers listener, sets isPlaying', async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play('file:///audio.m4a');
      });

      expect(mockSetAudioModeAsync).toHaveBeenCalledWith({
        allowsRecording: false,
        playsInSilentMode: true,
      });
      expect(mockCreateAudioPlayer).toHaveBeenCalledWith({ uri: 'file:///audio.m4a' });
      expect(mockPlayer.addListener).toHaveBeenCalledWith('playbackStatusUpdate', expect.any(Function));
      expect(mockPlayer.play).toHaveBeenCalled();
      expect(result.current.isPlaying).toBe(true);
    });

    it('sets durationMs when listener fires with isLoaded and duration', async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play('file:///audio.m4a');
      });

      const [, listenerCallback] = mockPlayer.addListener.mock.calls[0];

      await act(async () => {
        listenerCallback({ isLoaded: true, duration: 5, didJustFinish: false });
      });

      expect(result.current.durationMs).toBe(5000);
    });

    it('does not set durationMs when duration is falsy', async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play('file:///audio.m4a');
      });

      const [, listenerCallback] = mockPlayer.addListener.mock.calls[0];

      await act(async () => {
        listenerCallback({ isLoaded: true, duration: 0, didJustFinish: false });
      });

      expect(result.current.durationMs).toBe(0);
    });

    it('does not set durationMs when status is not loaded', async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play('file:///audio.m4a');
      });

      const [, listenerCallback] = mockPlayer.addListener.mock.calls[0];

      await act(async () => {
        listenerCallback({ isLoaded: false });
      });

      expect(result.current.durationMs).toBe(0);
    });

    it('unloads current player before playing new one', async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play('file:///first.m4a');
      });

      jest.clearAllMocks();
      mockCreateAudioPlayer.mockReturnValue(mockPlayer);

      await act(async () => {
        await result.current.play('file:///second.m4a');
      });

      expect(mockPlayer.remove).toHaveBeenCalled();
      expect(mockCreateAudioPlayer).toHaveBeenCalledWith({ uri: 'file:///second.m4a' });
    });

    it('swallows remove error when unloading before play', async () => {
      mockPlayer.remove.mockImplementationOnce(() => { throw new Error('already removed'); });
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play('file:///first.m4a');
      });

      // Should not throw
      await act(async () => {
        await result.current.play('file:///second.m4a');
      });

      expect(result.current.isPlaying).toBe(true);
    });
  });

  describe('playback status callback', () => {
    it('sets isPlaying to false and removes player when playback finishes', async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play('file:///audio.m4a');
      });

      expect(result.current.isPlaying).toBe(true);

      const [, listenerCallback] = mockPlayer.addListener.mock.calls[0];

      await act(async () => {
        listenerCallback({ isLoaded: true, didJustFinish: true });
      });

      expect(result.current.isPlaying).toBe(false);
      expect(mockPlayer.remove).toHaveBeenCalled();
    });

    it('does nothing when status is loaded but not finished', async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play('file:///audio.m4a');
      });

      const [, listenerCallback] = mockPlayer.addListener.mock.calls[0];

      jest.clearAllMocks();

      await act(async () => {
        listenerCallback({ isLoaded: true, didJustFinish: false });
      });

      expect(result.current.isPlaying).toBe(true);
      expect(mockPlayer.remove).not.toHaveBeenCalled();
    });

    it('does nothing when status is not loaded', async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play('file:///audio.m4a');
      });

      const [, listenerCallback] = mockPlayer.addListener.mock.calls[0];

      jest.clearAllMocks();

      await act(async () => {
        listenerCallback({ isLoaded: false });
      });

      expect(result.current.isPlaying).toBe(true);
      expect(mockPlayer.remove).not.toHaveBeenCalled();
    });
  });

  describe('stop()', () => {
    it('pauses and removes the current player, resets state', async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play('file:///audio.m4a');
      });

      jest.clearAllMocks();
      mockCreateAudioPlayer.mockReturnValue(mockPlayer);

      await act(async () => {
        await result.current.stop();
      });

      expect(mockPlayer.pause).toHaveBeenCalled();
      expect(mockPlayer.remove).toHaveBeenCalled();
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.durationMs).toBe(0);
    });

    it('is a no-op when nothing is playing', async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.stop();
      });

      expect(mockPlayer.pause).not.toHaveBeenCalled();
      expect(result.current.isPlaying).toBe(false);
    });

    it('swallows error when pause throws', async () => {
      mockPlayer.pause.mockImplementationOnce(() => { throw new Error('already stopped'); });

      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play('file:///audio.m4a');
      });

      await act(async () => {
        await result.current.stop();
      });

      expect(result.current.isPlaying).toBe(false);
    });
  });

  describe('unload()', () => {
    it('removes the current player and resets state', async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play('file:///audio.m4a');
      });

      // set duration via listener
      const [, listenerCallback] = mockPlayer.addListener.mock.calls[0];
      await act(async () => {
        listenerCallback({ isLoaded: true, duration: 5, didJustFinish: false });
      });

      expect(result.current.isPlaying).toBe(true);
      expect(result.current.durationMs).toBe(5000);

      jest.clearAllMocks();
      mockCreateAudioPlayer.mockReturnValue(mockPlayer);

      await act(async () => {
        await result.current.unload();
      });

      expect(mockPlayer.remove).toHaveBeenCalled();
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.durationMs).toBe(0);
    });

    it('is safe to call when no player is loaded', async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.unload();
      });

      expect(mockPlayer.remove).not.toHaveBeenCalled();
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.durationMs).toBe(0);
    });

    it('swallows error when remove throws', async () => {
      mockPlayer.remove.mockImplementationOnce(() => { throw new Error('already removed'); });

      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play('file:///audio.m4a');
      });

      await act(async () => {
        await result.current.unload();
      });

      expect(result.current.isPlaying).toBe(false);
      expect(result.current.durationMs).toBe(0);
    });
  });

  describe('cleanup on unmount', () => {
    it('calls remove on the current player when unmounted', async () => {
      const { result, unmount } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play('file:///audio.m4a');
      });

      jest.clearAllMocks();

      unmount();

      expect(mockPlayer.remove).toHaveBeenCalled();
    });

    it('does not throw when unmounted with no player loaded', () => {
      const { unmount } = renderHook(() => useAudioPlayer());

      expect(() => unmount()).not.toThrow();
      expect(mockPlayer.remove).not.toHaveBeenCalled();
    });
  });
});
