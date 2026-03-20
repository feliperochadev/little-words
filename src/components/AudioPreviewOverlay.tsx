import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { formatDateDMY } from '../utils/dateHelpers';

const WAVEFORM_BAR_COUNT = 20;
const WAVEFORM_BAR_WIDTH = 3;
const WAVEFORM_BAR_GAP = 2;
const WAVEFORM_MAX_HEIGHT = 24;
const WAVEFORM_MIN_HEIGHT = 3;

interface Props {
  visible: boolean;
  uri: string;
  name: string;
  createdAt: string;
  durationMs?: number | null;
  onClose: () => void;
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export function AudioPreviewOverlay({ visible, uri, name, createdAt, durationMs, onClose }: Readonly<Props>) {
  const { colors } = useTheme();
  const audioPlayer = useAudioPlayer();

  const barHeights = useRef(
    Array.from({ length: WAVEFORM_BAR_COUNT }, () => new Animated.Value(WAVEFORM_MIN_HEIGHT))
  ).current;
  const animTickRef = useRef(0);

  useEffect(() => {
    if (!audioPlayer.isPlaying) {
      barHeights.forEach(bar =>
        Animated.timing(bar, { toValue: WAVEFORM_MIN_HEIGHT, duration: 100, useNativeDriver: false }).start()
      );
      return () => {
        barHeights.forEach(bar => bar.stopAnimation());
      };
    }

    const intervalId = setInterval(() => {
      animTickRef.current += 1;
      const tick = animTickRef.current;
      barHeights.forEach((bar, i) => {
        const variation = 0.4 + (Math.sin(i * 1.5 + tick * 0.4 + Date.now() / 300) + 1) / 2 * 0.6;
        const height = WAVEFORM_MIN_HEIGHT + variation * (WAVEFORM_MAX_HEIGHT - WAVEFORM_MIN_HEIGHT);
        Animated.timing(bar, { toValue: height, duration: 120, useNativeDriver: false }).start();
      });
    }, 150);

    return () => {
      clearInterval(intervalId);
      barHeights.forEach(bar => bar.stopAnimation());
    };
  }, [audioPlayer.isPlaying, barHeights]);

  // Stop playback when overlay closes
  useEffect(() => {
    if (!visible) {
      audioPlayer.stop().catch(() => {});
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlayPress = () => {
    if (audioPlayer.isPlaying) {
      void audioPlayer.stop();
    } else {
      void audioPlayer.play(uri);
    }
  };

  const handleClose = () => {
    void audioPlayer.stop();
    onClose();
  };

  const dateStr = formatDateDMY(createdAt.split(/[T ]/)[0]);
  const duration = durationMs ?? 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      testID="audio-preview-modal"
    >
      {/* Backdrop: tap to dismiss */}
      <TouchableOpacity
        style={s.backdrop}
        activeOpacity={1}
        onPress={handleClose}
        testID="audio-preview-backdrop"
      />

      {/* Card */}
      <View style={s.cardWrapper} pointerEvents="box-none">
        <View style={[s.card, { backgroundColor: colors.background }]}>
          {/* Name + date */}
          <Text style={[s.name, { color: colors.text }]} numberOfLines={1} testID="audio-preview-name">
            {name}
          </Text>
          <Text style={[s.date, { color: colors.textSecondary }]} testID="audio-preview-date">
            {dateStr}
          </Text>

          {/* Waveform + play row */}
          <View style={s.playerRow}>
            <TouchableOpacity
              onPress={handlePlayPress}
              style={s.playBtn}
              testID="audio-preview-play"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={audioPlayer.isPlaying ? 'stop-circle' : 'play-circle'}
                size={40}
                color={colors.primary}
              />
            </TouchableOpacity>

            <View style={s.waveformContainer} testID="audio-preview-waveform">
              {barHeights.map((height, i) => (
                <Animated.View
                  key={`apbar-${i}`}
                  style={[
                    s.waveformBar,
                    {
                      height,
                      backgroundColor: colors.primary,
                      opacity: 0.4 + (i / WAVEFORM_BAR_COUNT) * 0.6,
                    },
                  ]}
                />
              ))}
            </View>

            {duration > 0 && (
              <Text style={[s.duration, { color: colors.textSecondary }]} testID="audio-preview-duration">
                {formatDuration(duration)}
              </Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  cardWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  date: {
    fontSize: 13,
    marginBottom: 16,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playBtn: {
    padding: 2,
  },
  waveformContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: WAVEFORM_BAR_GAP,
    height: WAVEFORM_MAX_HEIGHT,
  },
  waveformBar: {
    width: WAVEFORM_BAR_WIDTH,
    borderRadius: 2,
  },
  duration: {
    fontSize: 13,
    minWidth: 36,
    textAlign: 'right',
  },
});
