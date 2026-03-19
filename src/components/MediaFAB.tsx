import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, PanResponder, Keyboard,
  Dimensions, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../i18n/i18n';
import { useAudioRecording } from '../hooks/useAudioRecording';
import { useMediaCapture } from '../hooks/useMediaCapture';

const FAB_SIZE = 56;
const DISCARD_THRESHOLD = -80;
const LONG_PRESS_DELAY = 400;
const WAVEFORM_BAR_COUNT = 20;
const WAVEFORM_BAR_WIDTH = 3;
const WAVEFORM_BAR_GAP = 2;
const WAVEFORM_MAX_HEIGHT = 28;
const WAVEFORM_MIN_HEIGHT = 3;

const SCREEN_WIDTH = Dimensions.get('window').width;
const WAVEFORM_WIDTH = SCREEN_WIDTH - FAB_SIZE - 16 - 16 - 12;

function formatTimer(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export function MediaFAB() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useI18n();
  const { phase, setCapturedMedia, launchPhotoPicker } = useMediaCapture();
  const {
    state: recordingState,
    amplitude,
    durationMs,
    result,
    startRecording,
    stopRecording,
    discardRecording,
    reset: resetRecording,
  } = useAudioRecording();

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const fabTranslateX = useRef(new Animated.Value(0)).current;
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingStateRef = useRef(recordingState);
  recordingStateRef.current = recordingState;

  // Waveform bar animated values
  const barHeights = useRef(
    Array.from({ length: WAVEFORM_BAR_COUNT }, () => new Animated.Value(WAVEFORM_MIN_HEIGHT))
  ).current;

  // Animate waveform bars based on amplitude
  useEffect(() => {
    if (recordingState !== 'recording') {
      barHeights.forEach(bar =>
        Animated.timing(bar, { toValue: WAVEFORM_MIN_HEIGHT, duration: 100, useNativeDriver: false }).start()
      );
      return;
    }

    barHeights.forEach((bar, i) => {
      const variation = 0.3 + (Math.sin(i * 1.5 + Date.now() / 200) + 1) / 2 * 0.7;
      const height = WAVEFORM_MIN_HEIGHT + amplitude * variation * (WAVEFORM_MAX_HEIGHT - WAVEFORM_MIN_HEIGHT);
      Animated.timing(bar, { toValue: height, duration: 120, useNativeDriver: false }).start();
    });
  }, [amplitude, recordingState, barHeights]);

  // Handle recording result -> transition to linking
  useEffect(() => {
    if (result && recordingState === 'stopped') {
      setCapturedMedia({
        uri: result.uri,
        type: 'audio',
        mimeType: result.mimeType,
        fileSize: result.fileSize,
        durationMs: result.durationMs,
      });
      resetRecording();
      setExpanded(false);
    }
  }, [result, recordingState, setCapturedMedia, resetRecording]);

  // Keyboard listeners
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const handleMicPress = useCallback(() => {
    if (recordingStateRef.current === 'recording') {
      void stopRecording();
      return;
    }
    // If expanded (overlay shown), start recording
    // If not expanded, start recording directly (tap)
    void startRecording();
    setExpanded(true);
  }, [startRecording, stopRecording]);

  // PanResponder on the FAB: swipe-left discards during recording
  const fabPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10,
      onPanResponderGrant: () => {
        // Long press expands overlay without recording
        longPressTimerRef.current = setTimeout(() => {
          longPressTimerRef.current = null;
          if (recordingStateRef.current !== 'recording') {
            setExpanded(prev => !prev);
          }
        }, LONG_PRESS_DELAY);
      },
      onPanResponderMove: (_, g) => {
        if (recordingStateRef.current === 'recording') {
          fabTranslateX.setValue(Math.min(0, g.dx));
        }
      },
      onPanResponderRelease: (_, g) => {
        if (longPressTimerRef.current) {
          // Short tap — released before long press delay
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
          handleMicPress();
        } else if (recordingStateRef.current === 'recording') {
          // Was a long press AND recording — check swipe
          if (g.dx < DISCARD_THRESHOLD) {
            void discardRecording();
          }
          // Don't stop on release after long press — user must tap again to stop
        }

        Animated.spring(fabTranslateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderTerminate: () => {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        if (recordingStateRef.current === 'recording') {
          void stopRecording();
        }
        Animated.spring(fabTranslateX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  const handleCameraPress = () => {
    if (recordingState === 'recording') {
      void discardRecording();
    }
    setExpanded(false);
    launchPhotoPicker();
  };

  const handleVideoPress = () => {
    Alert.alert(t('mediaCapture.videoLocked'));
  };

  // Hide FAB during linking/creating-word or keyboard
  if (phase === 'linking' || phase === 'creating-word' || isKeyboardVisible) {
    return null;
  }

  const isRecording = recordingState === 'recording';
  const tabBarHeight = 62 + insets.bottom;
  const showOverlay = expanded || isRecording;

  return (
    <Animated.View
      style={[
        s.container,
        { bottom: tabBarHeight + 12, transform: [{ translateX: fabTranslateX }] },
      ]}
      testID="media-fab"
    >
      {/* FAB button — mic only */}
      <View
        {...fabPanResponder.panHandlers}
        style={[
          s.fab,
          { backgroundColor: colors.primary },
          isRecording && s.fabRecording,
        ]}
        testID="media-fab-mic"
      >
        <Ionicons
          name={isRecording ? 'radio-button-on' : 'mic'}
          size={26}
          color={isRecording ? '#FF3B30' : colors.textOnPrimary}
        />
      </View>

      {/* Waveform pill (visible during recording) */}
      {isRecording && (
        <View
          style={[s.waveformPill, { backgroundColor: '#FFFFFF', width: WAVEFORM_WIDTH }]}
          testID="media-waveform"
        >
          <View style={s.waveformBars}>
            {barHeights.map((height, i) => (
              <Animated.View
                key={`bar-${i}`}
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
          <Text style={[s.timer, { color: colors.primary }]} testID="media-timer">
            {formatTimer(durationMs)}
          </Text>
        </View>
      )}

      {/* Expanded overlay: Photo + Video options above FAB */}
      {showOverlay && (
        <View style={s.overlay}>
          <TouchableOpacity
            style={[s.overlayBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleCameraPress}
            testID="media-photo-btn"
          >
            <Ionicons name="camera" size={18} color={colors.primary} />
            <Text style={[s.overlayLabel, { color: colors.text }]}>
              {t('mediaCapture.photo')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.overlayBtn, s.overlayBtnLocked, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleVideoPress}
            testID="media-video-btn-locked"
          >
            <Ionicons name="videocam" size={18} color={colors.textMuted} />
            <Ionicons name="lock-closed" size={10} color={colors.textMuted} style={s.lockIcon} />
            <Text style={[s.overlayLabel, { color: colors.textMuted }]}>
              {t('mediaCapture.videoLocked')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 100,
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  fabRecording: {
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  overlay: {
    position: 'absolute',
    bottom: FAB_SIZE + 8,
    right: 0,
    gap: 6,
    alignItems: 'flex-end',
  },
  overlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  overlayBtnLocked: {
    opacity: 0.5,
  },
  overlayLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  lockIcon: {
    marginLeft: -2,
  },
  waveformPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  waveformBars: {
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
  timer: {
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 10,
    minWidth: 36,
    textAlign: 'right',
  },
});
