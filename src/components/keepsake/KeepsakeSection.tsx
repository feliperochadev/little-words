import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n/i18n';
import { useTheme } from '../../hooks/useTheme';
import { useKeepsakeState } from '../../hooks/useKeepsake';
import { useSettingsStore } from '../../stores/settingsStore';
import { getKeepsakeFileUri } from '../../services/keepsakeService';
import { KeepsakePreviewModal } from './KeepsakePreviewModal';

interface KeepsakeSectionProps {
  totalWords: number;
}

export function KeepsakeSection({ totalWords }: Readonly<KeepsakeSectionProps>) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { data: state } = useKeepsakeState();
  const name = useSettingsStore((s) => s.name);
  const [showModal, setShowModal] = useState(false);

  if (totalWords === 0) return null;

  return (
    <View testID="keepsake-section">
      {/* ── Keepsake Book section ──────────────────────────── */}
      <View style={styles.keepsakeContainer}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          {t('keepsake.sectionLabel')}
        </Text>

        {state?.isGenerated ? (
          <TouchableOpacity
            onPress={() => setShowModal(true)}
            style={styles.generatedRow}
            testID="keepsake-thumbnail-btn"
            activeOpacity={0.8}
          >
            <View style={styles.generatedInfo}>
              <Text style={[styles.generatedTitle, { color: colors.text }]} numberOfLines={2}>
                {t('keepsake.sectionTitle', { name: name ?? 'Baby' })}
              </Text>
              <View style={styles.viewHint}>
                <Ionicons name="eye-outline" size={14} color={colors.primary} />
                <Text style={[styles.viewHintText, { color: colors.primary }]}>
                  {t('keepsake.share')}
                </Text>
              </View>
            </View>
            <Image
              source={{ uri: `${getKeepsakeFileUri()}?t=${state.generatedAt ?? ''}` }}
              style={styles.thumbnail}
              resizeMode="cover"
              testID="keepsake-thumbnail"
            />
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
      </View>

      {/* ── Timeline section label ──────────────────────────── */}
      <View style={[styles.timelineHeader, { borderTopColor: colors.border }]}>
        <Ionicons name="gift-outline" size={14} color={colors.textSecondary} />
        <Text style={[styles.timelineLabel, { color: colors.textSecondary }]}>
          {t('memories.timelineLabel')}
        </Text>
      </View>

      <KeepsakePreviewModal
        visible={showModal}
        onClose={() => setShowModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  keepsakeContainer: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  generatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  generatedInfo: {
    flex: 1,
    gap: 6,
  },
  generatedTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  viewHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewHintText: {
    fontSize: 13,
    fontWeight: '600',
  },
  thumbnail: {
    width: 72,
    height: 72 * (1920 / 1080),
    borderRadius: 8,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    alignSelf: 'flex-start',
  },
  createBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  timelineLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
