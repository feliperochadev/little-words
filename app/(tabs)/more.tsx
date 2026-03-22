import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useI18n } from '../../src/i18n/i18n';
import { useTheme } from '../../src/hooks/useTheme';
import { theme } from '../../src/theme';
import { withOpacity } from '../../src/utils/colorHelpers';

export default function MoreScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={s.titleRow}>
        <Ionicons name="menu" size={22} color={colors.primary} testID="more-screen-icon" />
        <Text style={[s.title, { color: theme.colors.text }]}>{t('more.title')}</Text>
      </View>

      <View style={s.list}>
        <TouchableOpacity
          style={[s.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={() => router.push('/(tabs)/progress')}
          testID="more-progress-btn"
          activeOpacity={0.7}
        >
          <View style={[s.iconWrap, { backgroundColor: withOpacity(colors.primary, '1A') }]}>
            <Ionicons name="trending-up-outline" size={20} color={colors.primary} />
          </View>
          <Text style={[s.rowLabel, { color: theme.colors.text }]}>{t('more.progress')}</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={() => router.push('/(tabs)/media')}
          testID="more-media-btn"
          activeOpacity={0.7}
        >
          <View style={[s.iconWrap, { backgroundColor: withOpacity(colors.primary, '1A') }]}>
            <View style={s.mediaIcons}>
              <Ionicons name="musical-notes" size={12} color={colors.primary} />
              <Ionicons name="camera" size={12} color={colors.primary} />
            </View>
          </View>
          <Text style={[s.rowLabel, { color: theme.colors.text }]}>{t('more.media')}</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={() => router.push('/(tabs)/settings')}
          testID="more-settings-btn"
          activeOpacity={0.7}
        >
          <View style={[s.iconWrap, { backgroundColor: withOpacity(colors.primary, '1A') }]}>
            <Ionicons name="settings-sharp" size={20} color={colors.primary} />
          </View>
          <Text style={[s.rowLabel, { color: theme.colors.text }]}>{t('more.settings')}</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, gap: 8 },
  title: { fontSize: 20, fontWeight: '700' },
  list: { paddingHorizontal: 16, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14, borderWidth: 1, gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  mediaIcons: { flexDirection: 'row', gap: 2 },
  rowLabel: { flex: 1, fontSize: 16, fontWeight: '600' },
});
