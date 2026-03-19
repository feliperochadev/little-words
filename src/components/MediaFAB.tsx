import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, PanResponder, Keyboard,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../i18n/i18n';
import { useAudioRecording } from '../hooks/useAudioRecording';
import { useMediaCapture } from '../hooks/useMediaCapture';

const FAB_SIZE = 56;
const CAMERA_SIZE = 42; // 75% of FAB_SIZE
const DISCARD_THRESHOLD = -80;
const LONG_PRESS_DELAY = 400;
const WAVEFORM_BAR_COUNT = 20;
const WAVEFORM_BAR_WIDTH = 3;
const WAVEFORM_BAR_GAP = 2;
const WAVEFORM_MAX_HEIGHT = 28;
const WAVEFORM_MIN_HEIGHT = 3;

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
    pauseRecording,
    resumeRecording,
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

  const isRecording = recordingState === 'recording';
  const isPaused = recordingState === 'paused';
  const isActive = isRecording || isPaused; // recording or paused

  // Animate waveform bars based on amplitude
  useEffect(() => {
    if (recordingState === 'recording') {
      barHeights.forEach((bar, i) => {
        const variation = 0.3 + (Math.sin(i * 1.5 + Date.now() / 200) + 1) / 2 * 0.7;
        const height = WAVEFORM_MIN_HEIGHT + amplitude * variation * (WAVEFORM_MAX_HEIGHT - WAVEFORM_MIN_HEIGHT);
        Animated.timing(bar, { toValue: height, duration: 120, useNativeDriver: false }).start();
      });
    } else if (recordingState !== 'paused') {
      // Idle or stopped — settle to min (paused = freeze at last position)
      barHeights.forEach(bar =>
        Animated.timing(bar, { toValue: WAVEFORM_MIN_HEIGHT, duration: 100, useNativeDriver: false }).start()
      );
    }
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
    const current = recordingStateRef.current;
    if (current === 'recording' || current === 'paused') {
      void stopRecording();
      return;
    }
    // Idle — start recording
    void startRecording();
  }, [startRecording, stopRecording]);

  const handlePauseResume = useCallback(() => {
    const current = recordingStateRef.current;
    if (current === 'recording') {
      void pauseRecording();
    } else if (current === 'paused') {
      void resumeRecording();
    }
  }, [pauseRecording, resumeRecording]);

  // Stable ref so PanResponder (created once) always calls latest version
  const handleMicPressRef = useRef(handleMicPress);
  handleMicPressRef.current = handleMicPress;

  const handleDiscard = useCallback(() => {
    void discardRecording();
    setExpanded(false);
  }, [discardRecording]);

  const handleCameraButtonPress = useCallback(() => {
    setExpanded(prev => !prev);
  }, []);

  const handlePhotoPress = useCallback(() => {
    setExpanded(false);
    launchPhotoPicker();
  }, [launchPhotoPicker]);

  const handleVideoPress = useCallback(() => {
    // Alert: coming soon — handled by pressing the locked button
  }, []);

  // PanResponder on the FAB: swipe-left discards during recording/paused
  const fabPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10,
      onPanResponderGrant: () => {
        // Long press expands overlay without recording
        longPressTimerRef.current = setTimeout(() => {
          longPressTimerRef.current = null;
          if (recordingStateRef.current !== 'recording' && recordingStateRef.current !== 'paused') {
            setExpanded(prev => !prev);
          }
        }, LONG_PRESS_DELAY);
      },
      onPanResponderMove: (_, g) => {
        const cur = recordingStateRef.current;
        if (cur === 'recording' || cur === 'paused') {
          fabTranslateX.setValue(Math.min(0, g.dx));
        }
      },
      onPanResponderRelease: (_, g) => {
        if (longPressTimerRef.current) {
          // Short tap — released before long press delay
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
          handleMicPressRef.current();
        } else {
          const cur = recordingStateRef.current;
          if ((cur === 'recording' || cur === 'paused') && g.dx < DISCARD_THRESHOLD) {
            void discardRecording();
          }
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
        const cur = recordingStateRef.current;
        if (cur === 'recording' || cur === 'paused') {
          void stopRecording();
        }
        Animated.spring(fabTranslateX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  // Hide FAB during linking/creating-word or keyboard
  if (phase === 'linking' || phase === 'creating-word' || isKeyboardVisible) {
    return null;
  }

  const tabBarHeight = 62 + insets.bottom;

  const fabIcon = 'mic' as const;

  return (
    <>
      {/* Backdrop: dismiss expanded overlay on outside tap */}
      {expanded && !isActive && (
        <Pressable
          style={s.backdrop}
          onPress={() => setExpanded(false)}
          testID="media-fab-backdrop"
        />
      )}

      <Animated.View
        style={[
          s.container,
          { bottom: tabBarHeight + 12, transform: [{ translateX: fabTranslateX }] },
        ]}
        testID="media-fab"
      >
        {/* Left content: waveform pill (active) or empty spacer */}
        <View style={s.leftContent}>
          {isActive && (
            <View
              style={[s.waveformPill, { backgroundColor: '#FFFFFF' }]}
              testID="media-waveform"
            >
              {/* Trash: discard recording */}
              <TouchableOpacity
                onPress={handleDiscard}
                style={s.waveformAction}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                testID="media-waveform-discard"
              >
                <Ionicons name="trash-outline" size={22} color={colors.textSecondary} />
              </TouchableOpacity>

              {/* Waveform bars */}
              <View style={s.waveformBars} testID="media-waveform-bars">
                {barHeights.map((height, i) => (
                  <Animated.View
                    key={`bar-${i}`}
                    style={[
                      s.waveformBar,
                      {
                        height,
                        backgroundColor: isPaused ? colors.textMuted : colors.primary,
                        opacity: 0.4 + (i / WAVEFORM_BAR_COUNT) * 0.6,
                      },
                    ]}
                  />
                ))}
              </View>

              {/* Timer */}
              <Text style={[s.timer, { color: isPaused ? colors.textMuted : colors.primary }]} testID="media-timer">
                {formatTimer(durationMs)}
              </Text>

              {/* Pause / Resume */}
              <TouchableOpacity
                onPress={handlePauseResume}
                style={s.waveformAction}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                testID="media-waveform-pause"
              >
                <Ionicons name={isRecording ? 'pause' : 'play'} size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Camera button (hidden during recording/paused) */}
        {!isActive && (
          <View style={s.cameraContainer}>
            {/* Expanded overlay: Photo + Video options above camera (in-flow, not absolute) */}
            {expanded && (
              <View style={s.overlay}>
                <TouchableOpacity
                  style={[s.overlayBtn, s.overlayBtnLocked, s.overlayBtnColumn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={handleVideoPress}
                  testID="media-video-btn-locked"
                >
                  <View style={s.videoIconRow}>
                    <Ionicons name="videocam" size={18} color={colors.textMuted} />
                    <Ionicons name="lock-closed" size={10} color={colors.textMuted} style={s.lockIcon} />
                  </View>
                  <Text style={[s.overlayLabel, { color: colors.textMuted }]}>
                    {t('mediaCapture.videoLocked')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.overlayBtn, s.overlayBtnColumn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={handlePhotoPress}
                  testID="media-photo-btn"
                >
                  <Ionicons name="camera" size={18} color={colors.primary} />
                  <Text style={[s.overlayLabel, { color: colors.text }]}>
                    {t('mediaCapture.photo')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[s.cameraBtn, { backgroundColor: colors.primary }]}
              onPress={handleCameraButtonPress}
              testID="media-camera-btn"
            >
              <Ionicons name="camera" size={20} color={colors.textOnPrimary} />
            </TouchableOpacity>
          </View>
        )}

        {/* FAB button — mic / stop */}
        <View
          {...fabPanResponder.panHandlers}
          style={[
            s.fab,
            { backgroundColor: isActive ? '#FF3B30' : colors.primary },
            isActive && s.fabRecording,
          ]}
          testID="media-fab-mic"
        >
          {!isActive && (
            <Ionicons name={fabIcon} size={26} color={colors.textOnPrimary} />
          )}
        </View>
      </Animated.View>
    </>
  );
}

const s = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  leftContent: {
    flex: 1,
    marginRight: 8,
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
  cameraContainer: {
    marginRight: 8,
    alignItems: 'flex-end',
  },
  cameraBtn: {
    width: CAMERA_SIZE,
    height: CAMERA_SIZE,
    borderRadius: CAMERA_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  overlay: {
    gap: 6,
    alignItems: 'stretch',
    marginBottom: 14,
    minWidth: 120,
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
  overlayBtnColumn: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    minHeight: 64,
    justifyContent: 'center',
  },
  overlayBtnLocked: {
    opacity: 0.5,
  },
  overlayLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  lockIcon: {
    marginLeft: 3,
  },
  videoIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stopDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  waveformPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 10,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flex: 1,
  },
  waveformAction: {
    paddingHorizontal: 4,
  },
  waveformBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: WAVEFORM_BAR_GAP,
    height: WAVEFORM_MAX_HEIGHT,
    marginHorizontal: 6,
  },
  waveformBar: {
    width: WAVEFORM_BAR_WIDTH,
    borderRadius: 2,
  },
  timer: {
    fontSize: 13,
    fontWeight: '800',
    marginHorizontal: 4,
    minWidth: 36,
    textAlign: 'right',
  },
});
