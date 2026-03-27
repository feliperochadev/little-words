import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useI18n } from '../../i18n/i18n';
import { useTheme } from '../../hooks/useTheme';
import { useKeepsakeState } from '../../hooks/useKeepsake';
import { getKeepsakeFileUri } from '../../services/keepsakeService';

export function KeepsakeHomeCard() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const { data: state } = useKeepsakeState();

  if (state?.isGenerated) {
    return (
      <TouchableOpacity
        style={styles.thumbnailRow}
        onPress={() => router.push('/(tabs)/memories')}
        testID="home-keepsake-thumbnail"
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: `${getKeepsakeFileUri()}?t=${state.generatedAt ?? ''}` }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
        <View style={styles.thumbnailInfo}>
          <Text style={[styles.thumbnailLabel, { color: colors.text }]}>
            {t('keepsake.title')}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.hintRow}
      onPress={() => router.push('/(tabs)/memories')}
      testID="home-keepsake-hint"
      activeOpacity={0.7}
    >
      <Ionicons name="book-outline" size={16} color={colors.textMuted} />
      <Text style={[styles.hintText, { color: colors.textMuted }]}>
        {t('keepsake.homeHint')}
      </Text>
      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
    </TouchableOpacity>
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
  thumbnailInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  thumbnailLabel: {
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
