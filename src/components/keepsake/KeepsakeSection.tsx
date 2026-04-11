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

  const sectionLabelRow = (
    <View style={styles.sectionLabelRow}>
      <Ionicons name="albums-outline" size={13} color={colors.textSecondary} />
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        {t('keepsake.sectionLabel')}
      </Text>
    </View>
  );

  return (
    <View testID="keepsake-section">
      {/* ── Keepsake Book section ──────────────────────────── */}
      {state?.isGenerated ? (
        <TouchableOpacity
          onPress={() => setShowModal(true)}
          style={styles.keepsakeContainer}
          testID="keepsake-thumbnail-btn"
          activeOpacity={0.8}
        >
          {sectionLabelRow}
          <Image
            source={{ uri: `${getKeepsakeFileUri()}?t=${state.generatedAt ?? ''}` }}
            style={styles.thumbnail}
            resizeMode="cover"
            testID="keepsake-thumbnail"
          />
        </TouchableOpacity>
      ) : (
        <View style={styles.keepsakeContainer}>
          {sectionLabelRow}
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowModal(true)}
            testID="keepsake-create-btn"
            activeOpacity={0.8}
          >
            <Ionicons name="albums-outline" size={18} color={colors.textOnPrimary} />
            <Text style={[styles.createBtnText, { color: colors.textOnPrimary }]}>
              {t('keepsake.createBtn')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Timeline section label ──────────────────────────── */}
      <View style={[styles.timelineHeader, { borderTopColor: colors.border }]}>
        <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
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
    alignItems: 'center',
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  thumbnail: {
    width: 110,
    height: 110 * (1920 / 1080),
    borderRadius: 10,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
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
