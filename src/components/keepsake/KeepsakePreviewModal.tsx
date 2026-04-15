import React, { useRef, useState, useCallback } from 'react';
import {
  View, Text, Modal, TouchableOpacity, ScrollView, Alert,
  StyleSheet, ActivityIndicator, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { KeepsakeCard } from './KeepsakeCard';
import { useI18n } from '../../i18n/i18n';
import { useTheme } from '../../hooks/useTheme';
import { useSettingsStore } from '../../stores/settingsStore';
import {
  useKeepsakeWords,
  useCaptureKeepsake,
  useSetPhotoOverride,
  useSaveKeepsakeToLibrary,
  useShareKeepsake,
} from '../../hooks/useKeepsake';
import type { KeepsakeWord } from '../../types/keepsake';

interface KeepsakePreviewModalProps {
  visible: boolean;
  onClose: () => void;
}

export function KeepsakePreviewModal({ visible, onClose }: Readonly<KeepsakePreviewModalProps>) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const cardRef = useRef<View>(null);
  const [capturing, setCapturing] = useState(false);
  const [captureVisible, setCaptureVisible] = useState(false);

  // Read name/sex at the modal level so the KeepsakeCard (inside Modal native layer)
  // always receives fresh values rather than reading from the store in a potentially
  // stale Fast-Refresh context.
  const storeName = useSettingsStore((s) => s.name);
  const storeSex = useSettingsStore((s) => s.sex);
  const isHydrated = useSettingsStore((s) => s.isHydrated);

  // Re-hydrate when the modal opens in case Fast Refresh reset the Zustand store.
  React.useEffect(() => {
    if (visible && !isHydrated) {
      void useSettingsStore.getState().hydrate();
    }
  }, [visible, isHydrated]);

  const { data: words = [], isLoading } = useKeepsakeWords();
  const captureKeepsake = useCaptureKeepsake();
  const setPhotoOverride = useSetPhotoOverride();
  const saveToLibrary = useSaveKeepsakeToLibrary();
  const shareKeepsake = useShareKeepsake();

  const handlePhotoSwap = useCallback(async (word: KeepsakeWord) => {
    Alert.alert(
      t('keepsake.changePhoto'),
      undefined,
      [
        {
          text: t('keepsake.takePhoto'),
          onPress: async () => {
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (!perm.granted) {
              showPermissionDenied(t);
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: 'images',
              quality: 0.8,
              allowsEditing: true,
              aspect: [1, 1],
            });
            if (!result.canceled && result.assets[0]) {
              await setPhotoOverride.mutateAsync({
                wordId: word.id,
                photoUri: result.assets[0].uri,
              });
            }
          },
        },
        {
          text: t('keepsake.chooseFromLibrary'),
          onPress: async () => {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!perm.granted) {
              showPermissionDenied(t);
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: 'images',
              quality: 0.8,
              allowsEditing: true,
              aspect: [1, 1],
            });
            if (!result.canceled && result.assets[0]) {
              await setPhotoOverride.mutateAsync({
                wordId: word.id,
                photoUri: result.assets[0].uri,
              });
            }
          },
        },
        { text: t('keepsake.cancel'), style: 'cancel' },
      ],
    );
  }, [setPhotoOverride, t]);

  const handleSave = useCallback(async () => {
    setCapturing(true);
    try {
      setCaptureVisible(true);
      await waitForCaptureCard(cardRef);
      await captureKeepsake.mutateAsync(cardRef);
      await saveToLibrary.mutateAsync();
      Alert.alert(t('keepsake.saved'));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'PERMISSION_DENIED') {
        showPermissionDenied(t);
      } else {
        Alert.alert(t('keepsake.captureFailed'));
      }
    } finally {
      setCaptureVisible(false);
      setCapturing(false);
    }
  }, [captureKeepsake, saveToLibrary, t]);

  const handleShare = useCallback(async () => {
    setCapturing(true);
    try {
      setCaptureVisible(true);
      await waitForCaptureCard(cardRef);
      await captureKeepsake.mutateAsync(cardRef);
      await shareKeepsake.mutateAsync();
    } catch {
      Alert.alert(t('keepsake.captureFailed'));
    } finally {
      setCaptureVisible(false);
      setCapturing(false);
    }
  }, [captureKeepsake, shareKeepsake, t]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      testID="keepsake-preview-modal"
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            testID="keepsake-close-btn"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* Preview (scrollable for tall card) */}
            <ScrollView
              style={styles.previewScroll}
              contentContainerStyle={styles.previewContent}
              testID="keepsake-preview-scroll"
            >
              {/* Tappable overlay for each word frame */}
              <View style={styles.previewWrapper}>
                <View style={styles.scaledPreview}>
                  <KeepsakeCard
                    words={words}
                    name={storeName}
                    sex={storeSex}
                    placeholderBadgeColor={colors.primary}
                    placeholderBadgeIconColor={colors.textOnPrimary}
                  />
                </View>
                {/* Touch targets over each polaroid */}
                {words.map((word, idx) => (
                  <TouchableOpacity
                    key={word.id}
                    style={[styles.frameTouchTarget, getFramePosition(words.length, idx)]}
                    onPress={() => handlePhotoSwap(word)}
                    testID={`keepsake-swap-${idx}`}
                    activeOpacity={0.85}
                  >
                    {!word.photoUri && (
                      <View
                        style={styles.swapBadgeHitArea}
                        testID={`keepsake-swap-badge-${idx}`}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Action buttons */}
            <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={handleSave}
                disabled={capturing || words.length === 0}
                testID="keepsake-save-btn"
              >
                {capturing ? (
                  <ActivityIndicator size="small" color={colors.textOnPrimary} />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={18} color={colors.textOnPrimary} />
                    <Text style={[styles.actionBtnText, { color: colors.textOnPrimary }]}>
                      {t('keepsake.saveToDevice')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.shareBtn, { borderColor: colors.primary }]}
                onPress={handleShare}
                disabled={capturing || words.length === 0}
                testID="keepsake-share-btn"
              >
                <Ionicons name="share-outline" size={18} color={colors.primary} />
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>
                  {t('keepsake.share')}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Hidden card for capture — opacity 0.01 keeps it rendered on Android GPU */}
      {words.length > 0 && captureVisible && (
        <View style={styles.captureContainer} pointerEvents="none">
          <KeepsakeCard ref={cardRef} words={words} name={storeName} sex={storeSex} elevated={false} />
        </View>
      )}
    </Modal>
  );
}

function showPermissionDenied(t: (key: string) => string) {
  Alert.alert(
    t('keepsake.permissionDenied'),
    t('keepsake.permissionDeniedMsg'),
    [
      { text: t('keepsake.cancel'), style: 'cancel' },
      { text: t('keepsake.openSettings'), onPress: () => void Linking.openSettings() },
    ],
  );
}

async function waitForCaptureCard(
  cardRef: React.RefObject<View | null>,
): Promise<void> {
  const timeoutMs = 1200;
  const start = Date.now();

  while (!cardRef.current && (Date.now() - start) < timeoutMs) {
    await delay(16);
  }

  if (!cardRef.current) {
    throw new Error('Keepsake capture view did not mount in time');
  }

  await delay(32);
}

async function delay(ms: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

// Position overlays approximately over each polaroid frame in the scaled-down preview
function getFramePosition(totalWords: number, index: number) {
  if (totalWords >= 3) {
    if (index === 0) return { top: '18%' as const, left: '5%' as const, width: '40%' as const, height: '30%' as const };
    if (index === 1) return { top: '18%' as const, left: '55%' as const, width: '40%' as const, height: '30%' as const };
    return { top: '52%' as const, left: '25%' as const, width: '50%' as const, height: '30%' as const };
  }
  if (totalWords === 2) {
    if (index === 0) return { top: '30%' as const, left: '5%' as const, width: '42%' as const, height: '35%' as const };
    return { top: '30%' as const, left: '53%' as const, width: '42%' as const, height: '35%' as const };
  }
  return { top: '25%' as const, left: '20%' as const, width: '60%' as const, height: '45%' as const };
}

// Scale factor to fit 1080px card into ~352dp preview (391 × 0.9 for iPhone 16/17 fit)
const PREVIEW_SCALE = 352 / 1080;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewScroll: {
    flex: 1,
  },
  previewContent: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
  },
  previewWrapper: {
    width: 352,
    height: 352 * (1920 / 1080),
    position: 'relative',
  },
  scaledPreview: {
    width: 1080,
    height: 1920,
    transform: [{ scale: PREVIEW_SCALE }],
    transformOrigin: 'top left',
  },
  frameTouchTarget: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  swapBadgeHitArea: {
    width: 44,
    height: 44,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  shareBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  captureContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    opacity: 0.01,
  },
});
