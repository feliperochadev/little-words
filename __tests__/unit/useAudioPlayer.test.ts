import { renderHook, act } from '@testing-library/react-native';
import { Audio } from 'expo-av';

import { useAudioPlayer } from '../../src/hooks/useAudioPlayer';

const mockSound = (globalThis as Record<string, unknown>).__mockSound as {
  unloadAsync: jest.Mock;
  playAsync: jest.Mock;
  stopAsync: jest.Mock;
  pauseAsync: jest.Mock;
  setOnPlaybackStatusUpdate: jest.Mock;
};

const mockCreateAsync = Audio.Sound.createAsync as jest.Mock;
const mockSetAudioModeAsync = Audio.setAudioModeAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateAsync.mockResolvedValue({
    sound: mockSound,
    status: { isLoaded: true, durationMillis: 5000 },
  });
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
    it('sets audio mode, creates sound, sets isPlaying and durationMs', async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play('file:///audio.m4a');
      });

      expect(mockSetAudioModeAsync).toHaveBeenCalledWith({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
      expect(mockCreateAsync).toHaveBeenCalledWith(
        { uri: 'file:///audio.m4a' },
        { shouldPlay: true },
      );
      expect(mockSound.setOnPlaybackStatusUpdate).toHaveBeenCalledWith(
        expect.any(Function),
      );
      expect(result.current.isPlaying).toBe(true);
      expect(result.current.durationMs).toBe(5000);
    });

    it('sets durationMs to 0 when durationMillis is undefined', async () => {
      mockCreateAsync.mockResolvedValueOnce({
        sound: mockSound,
        status: { isLoaded: true, durationMillis: undefined },
      });

      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play('file:///audio.m4a');
      });

      expect(result.current.durationMs).toBe(0);
    });

    it('does not set durationMs when status is not loaded', async () => {
      mockCreateAsync.mockResolvedValueOnce({
        sound: mockSound,
        status: { isLoaded: false },
      });

      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play('file:///audio.m4a');
      });

      // durationMs stays at 0 because isLoaded is false
      expect(result.current.durationMs).toBe(0);
      // isPlaying is still set regardless
      expect(result.current.isPlaying).toBe(true);
    });

    it('unloads current sound before playing new one', async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play('file:///first.m4a');
      });

      jest.clearAllMocks();
      mockCreateAsync.mockResolvedValueOnce({
        sound: mockSound,
        status: { isLoaded: true, durationMillis: 3000 },
      });

      await act(async () => {
        await result.current.play('file:///second.m4a');
      });

      // unloadAsync was called to clean up the first sound
      expect(mockSound.unloadAsync).toHaveBeenCalled();
      expect(mockCreateAsync).toHaveBeenCalledWith(
        { uri: 'file:///second.m4a' },
        { shouldPlay: true },
      );
      expect(result.current.durationMs).toBe(3000);
    });

    it('propagates error when createAsync throws', async () => {
      const error = new Error('createAsync failed');
      mockCreateAsync.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useAudioPlayer());

      await expect(
        act(async () => {
          await result.current.play('file:///bad.m4a');
        }),
      ).rejects.toThrow('createAsync failed');
    });
  });

  describe('playback status callback', () => {
    it('sets isPlaying to false and unloads when playback finishes', async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play('file:///audio.m4a');
      });

      expect(result.current.isPlaying).toBe(true);

      const statusCallback =
        mockSound.setOnPlaybackStatusUpdate.mock.calls[0][0];

      await act(async () => {
        statusCallback({ isLoaded: true, didJustFinish: true });
      });

      expect(result.current.isPlaying).toBe(false);
      expect(mockSound.unloadAsync).toHaveBeenCalled();
    });

    it('does nothing when status is loaded but not finished', async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play('file:///audio.m4a');
      });

      const statusCallback =
        mockSound.setOnPlaybackStatusUpdate.mock.calls[0][0];

      jest.clearAllMocks();

      await act(async () => {
        statusCallback({ isLoaded: true, didJustFinish: false });
      });

      expect(result.current.isPlaying).toBe(true);
      expect(mockSound.unloadAsync).not.toHaveBeenCalled();
    });

    it('does nothing when status is not loaded', async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play('file:///audio.m4a');
      });

      const statusCallback =
        mockSound.setOnPlaybackStatusUpdate.mock.calls[0][0];

      jest.clearAllMocks();

      await act(async () => {
        statusCallback({ isLoaded: false });
      });

      expect(result.current.isPlaying).toBe(true);
      expect(mockSound.unloadAsync).not.toHaveBeenCalled();
    });

    it('swallows error when unloadAsync fails in status callback', async () => {
      mockSound.unloadAsync.mockRejectedValueOnce(
        new Error('unload failed in callback'),
      );

      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play('file:///audio.m4a');
      });

      const statusCallback =
        mockSound.setOnPlaybackStatusUpdate.mock.calls[0][0];

      // Should not throw — the .catch(() => {}) in the hook swallows it
      await act(async () => {
        statusCallback({ isLoaded: true, didJustFinish: true });
      });

      expect(result.current.isPlaying).toBe(false);
    });
  });

  describe('stop()', () => {
    it('stops and unloads the current sound', async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play('file:///audio.m4a');
      });

      jest.clearAllMocks();

      await act(async () => {
        await result.current.stop();
      });

      expect(mockSound.stopAsync).toHaveBeenCalled();
      expect(mockSound.unloadAsync).toHaveBeenCalled();
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.durationMs).toBe(0);
    });

    it('is a no-op when nothing is playing', async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.stop();
      });

      expect(mockSound.stopAsync).not.toHaveBeenCalled();
      expect(result.current.isPlaying).toBe(false);
    });

    it('swallows error when stopAsync throws', async () => {
      mockSound.stopAsync.mockRejectedValueOnce(
        new Error('already stopped'),
      );

      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play('file:///audio.m4a');
      });

      // Should not throw — the try/catch swallows it
      await act(async () => {
        await result.current.stop();
      });

      expect(result.current.isPlaying).toBe(false);
    });
  });

  describe('unload()', () => {
    it('unloads the current sound and resets state', async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play('file:///audio.m4a');
      });

      expect(result.current.isPlaying).toBe(true);
      expect(result.current.durationMs).toBe(5000);

      jest.clearAllMocks();

      await act(async () => {
        await result.current.unload();
      });

      expect(mockSound.unloadAsync).toHaveBeenCalled();
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.durationMs).toBe(0);
    });

    it('is safe to call when no sound is loaded', async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.unload();
      });

      expect(mockSound.unloadAsync).not.toHaveBeenCalled();
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.durationMs).toBe(0);
    });

    it('swallows error when unloadAsync throws', async () => {
      mockSound.unloadAsync.mockRejectedValueOnce(
        new Error('already unloaded'),
      );

      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play('file:///audio.m4a');
      });

      // Should not throw — the try/catch swallows it
      await act(async () => {
        await result.current.unload();
      });

      expect(result.current.isPlaying).toBe(false);
      expect(result.current.durationMs).toBe(0);
    });
  });

  describe('cleanup on unmount', () => {
    it('calls unloadAsync on the current sound when unmounted', async () => {
      const { result, unmount } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play('file:///audio.m4a');
      });

      jest.clearAllMocks();

      unmount();

      expect(mockSound.unloadAsync).toHaveBeenCalled();
    });

    it('does not throw when unmounted with no sound loaded', () => {
      const { unmount } = renderHook(() => useAudioPlayer());

      // Should not throw
      expect(() => unmount()).not.toThrow();
      expect(mockSound.unloadAsync).not.toHaveBeenCalled();
    });

    it('swallows error when unloadAsync fails on unmount', async () => {
      const { result, unmount } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play('file:///audio.m4a');
      });

      mockSound.unloadAsync.mockRejectedValueOnce(
        new Error('unmount unload fail'),
      );

      // Should not throw — the .catch(() => {}) in the cleanup swallows it
      expect(() => unmount()).not.toThrow();
    });
  });
});
