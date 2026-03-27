import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n/i18n';
import { useTheme } from '../../hooks/useTheme';
import { useKeepsakeState } from '../../hooks/useKeepsake';
import { getKeepsakeFileUri } from '../../services/keepsakeService';
import { KeepsakePreviewModal } from './KeepsakePreviewModal';

interface KeepsakeSectionProps {
  totalWords: number;
}

export function KeepsakeSection({ totalWords }: Readonly<KeepsakeSectionProps>) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { data: state } = useKeepsakeState();
  const [showModal, setShowModal] = useState(false);

  if (totalWords === 0) return null;

  return (
    <View style={styles.container} testID="keepsake-section">
      {state?.isGenerated ? (
        <TouchableOpacity
          onPress={() => setShowModal(true)}
          style={styles.thumbnailContainer}
          testID="keepsake-thumbnail-btn"
          activeOpacity={0.8}
        >
          <Image
            source={{ uri: `${getKeepsakeFileUri()}?t=${state.generatedAt ?? ''}` }}
            style={styles.thumbnail}
            resizeMode="cover"
            testID="keepsake-thumbnail"
          />
          <View style={styles.thumbnailOverlay}>
            <Ionicons name="eye-outline" size={20} color="#fff" />
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: colors.primary }]}
          onPress={() => setShowModal(true)}
          testID="keepsake-create-btn"
          activeOpacity={0.8}
        >
          <Ionicons name="book-outline" size={18} color={colors.textOnPrimary} />
          <Text style={[styles.createBtnText, { color: colors.textOnPrimary }]}>
            {t('keepsake.createBtn')}
          </Text>
        </TouchableOpacity>
      )}

      <KeepsakePreviewModal
        visible={showModal}
        onClose={() => setShowModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingBottom: 16,
    alignItems: 'center',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  createBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  thumbnailContainer: {
    width: 120,
    height: 120 * (1920 / 1080),
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 4,
  },
});
