import React, { useState } from 'react';
import { Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n/i18n';
import { useTheme } from '../../hooks/useTheme';
import { useKeepsakeState } from '../../hooks/useKeepsake';
import { useSettingsStore } from '../../stores/settingsStore';
import { getKeepsakeFileUri } from '../../services/keepsakeService';
import { KeepsakePreviewModal } from './KeepsakePreviewModal';

export function KeepsakeHomeCard() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { data: state } = useKeepsakeState();
  const name = useSettingsStore((s) => s.name);
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      {state?.isGenerated ? (
        <TouchableOpacity
          style={styles.thumbnailRow}
          onPress={() => setShowModal(true)}
          testID="home-keepsake-thumbnail"
          activeOpacity={0.8}
        >
          <Image
            source={{ uri: `${getKeepsakeFileUri()}?t=${state.generatedAt ?? ''}` }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
          <Text style={[styles.thumbnailLabel, { color: colors.text }]} numberOfLines={2}>
            {t('keepsake.sectionTitle', { name: name ?? 'Baby' })}
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.hintRow}
          onPress={() => setShowModal(true)}
          testID="home-keepsake-hint"
          activeOpacity={0.7}
        >
          <Ionicons name="book-outline" size={16} color={colors.textMuted} />
          <Text style={[styles.hintText, { color: colors.textMuted }]}>
            {t('keepsake.homeHint')}
          </Text>
        </TouchableOpacity>
      )}

      <KeepsakePreviewModal
        visible={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  thumbnailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  thumbnail: {
    width: 48,
    height: 48 * (1920 / 1080),
    borderRadius: 6,
  },
  thumbnailLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    marginBottom: 8,
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    fontStyle: 'italic',
  },
});
