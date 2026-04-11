import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n/i18n';
import { useTheme } from '../../hooks/useTheme';
import { useKeepsakeState } from '../../hooks/useKeepsake';
import { getKeepsakeFileUri } from '../../services/keepsakeService';
import { KeepsakePreviewModal } from './KeepsakePreviewModal';

export function getHomeCardTitle(
  locale: string,
  sex: 'boy' | 'girl' | null | undefined,
  t: (key: string, params?: Record<string, string>) => string,
  name: string,
): string {
  if (locale === 'pt-BR' && sex === 'girl') {
    return t('keepsake.sectionTitleFemale', { name });
  }
  return t('keepsake.sectionTitle', { name });
}

export function KeepsakeHomeCard() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { data: state } = useKeepsakeState();
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      {state?.isGenerated ? (
        <TouchableOpacity
          style={styles.generatedContainer}
          onPress={() => setShowModal(true)}
          testID="home-keepsake-thumbnail"
          activeOpacity={0.8}
        >
          <View style={styles.sectionLabelRow}>
            <Ionicons name="albums-outline" size={13} color={colors.textSecondary} />
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              {t('keepsake.sectionLabel')}
            </Text>
          </View>
          <Image
            source={{ uri: `${getKeepsakeFileUri()}?t=${state.generatedAt ?? ''}` }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.hintRow}
          onPress={() => setShowModal(true)}
          testID="home-keepsake-hint"
          activeOpacity={0.7}
        >
          <Ionicons name="albums-outline" size={16} color={colors.textMuted} />
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
  generatedContainer: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  thumbnail: {
    width: 80,
    height: 80 * (1920 / 1080),
    borderRadius: 8,
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
