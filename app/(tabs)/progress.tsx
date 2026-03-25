import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, StatCard } from '../../src/components/UIComponents';
import { useI18n, useCategoryName } from '../../src/i18n/i18n';
import { formatMonth } from '../../src/utils/dashboardHelpers';
import { useDashboardStats } from '../../src/hooks/useDashboard';
import { useTheme } from '../../src/hooks/useTheme';
import { useRouter, useFocusEffect } from 'expo-router';

export default function ProgressScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const categoryName = useCategoryName();
  const { data: stats, refetch } = useDashboardStats();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const scrollViewRef = useRef<React.ElementRef<typeof ScrollView>>(null);

  const onRefresh = async () => { setRefreshing(true); try { await refetch(); } finally { setRefreshing(false); } };

  // Scroll to top when leaving the screen
  useFocusEffect(
    useCallback(() => {
      return () => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      };
    }, [])
  );

  const visibleCategoryCounts = stats?.categoryCounts.filter(c => c.count > 0) ?? [];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']} testID="progress-safe-area">
      <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} testID="progress-back-btn" style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Ionicons name="trending-up-outline" size={20} color={colors.primary} style={styles.headerIcon} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('dashboard.progressTitle')}</Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        testID="progress-scroll"
      >
        {/* Summary counters */}
        {stats && (
          <Card testID="progress-stats-section">
            <View style={styles.statsGrid}>
              <StatCard variant="iconValue" icon={<Ionicons name="create-outline" size={22} color={colors.primary} />} value={stats.totalWords} label={t('dashboard.totalWords')} color={colors.primary} testID="progress-stat-total-words" />
              <StatCard variant="iconValue" icon={<Ionicons name="chatbubbles-outline" size={22} color={colors.secondary} />} value={stats.totalVariants} label={t('dashboard.variants')} color={colors.secondary} testID="progress-stat-total-variants" />
            </View>
            <View style={[styles.statsGrid, styles.statsGridLast]}>
              <StatCard variant="iconValue" icon={<Ionicons name="today-outline" size={22} color={colors.accent} />} value={stats.wordsToday} label={t('dashboard.today')} color={colors.accent} testID="progress-stat-words-today" />
              <StatCard variant="iconValue" icon={<Ionicons name="calendar-outline" size={22} color={colors.success} />} value={stats.wordsThisWeek} label={t('dashboard.thisWeek')} color={colors.success} testID="progress-stat-words-week" />
              <StatCard variant="iconValue" icon={<Ionicons name="calendar-clear-outline" size={22} color={colors.info} />} value={stats.wordsThisMonth} label={t('dashboard.thisMonth')} color={colors.info} testID="progress-stat-words-month" />
            </View>
          </Card>
        )}

        {/* Monthly progress */}
        {stats && stats.monthlyProgress.length > 0 && (
          <Card style={styles.chartCard} testID="progress-monthly-section">
            <View style={styles.sectionTitleRow}>
              <Ionicons name="bar-chart-outline" size={16} color={colors.primary} testID="progress-monthly-progress-icon" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('dashboard.monthlyProgress')}</Text>
            </View>
            <View style={styles.barChart}>
              {(() => {
                const last6 = stats.monthlyProgress.slice(-6);
                const showYear = new Set(last6.map(m => m.month.split('-')[0])).size > 1;
                const max = Math.max(...last6.map(m => m.count), 1);
                return last6.map(m => (
                  <View key={m.month} style={styles.barItem}>
                    <View style={styles.barWrapper}>
                      <View style={[styles.bar, { height: Math.max((m.count / max) * 100, 4), backgroundColor: colors.primaryLight }]} />
                    </View>
                    <Text style={[styles.barLabel, { color: colors.textSecondary }]} testID={`bar-label-${m.month}`}>{formatMonth(m.month, showYear, t)}</Text>
                    <Text style={[styles.barValue, { color: colors.primary }]} testID={`bar-value-${m.month}`}>{m.count}</Text>
                  </View>
                ));
              })()}
            </View>
          </Card>
        )}

        {/* Categories breakdown */}
        {visibleCategoryCounts.length > 0 && (
          <Card testID="progress-categories-section">
            <View style={styles.sectionTitleRow}>
              <Ionicons name="pricetags-outline" size={16} color={colors.secondary} testID="progress-category-icon" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('dashboard.byCategory')}</Text>
            </View>
            {visibleCategoryCounts.map(cat => {
              const max = visibleCategoryCounts[0]?.count || 1;
              return (
                <View key={cat.name} style={styles.categoryRow}>
                  <Text style={styles.catEmoji}>{cat.emoji}</Text>
                  <View style={styles.catInfo}>
                    <View style={styles.catHeader}>
                      <Text style={[styles.catName, { color: colors.text }]}>{categoryName(cat.name)}</Text>
                      <Text style={[styles.catCount, { color: cat.color }]} testID={`cat-count-${cat.name}`}>{cat.count}</Text>
                    </View>
                    <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
                      <View style={[styles.progressFill, { width: `${(cat.count / max) * 100}%`, backgroundColor: cat.color }]} />
                    </View>
                  </View>
                </View>
              );
            })}
          </Card>
        )}

        {/* Recent words */}
        {stats && stats.recentWords.length > 0 && (
          <Card testID="progress-recent-words-section">
            <View style={styles.sectionTitleRow}>
              <Ionicons name="sparkles-outline" size={16} color={colors.accent} testID="progress-recent-words-icon" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('dashboard.recentWords')}</Text>
            </View>
            <View style={styles.wordCloud}>
              {stats.recentWords.map((w, i) => (
                <View
                  key={w.id}
                  style={[styles.wordChip, { backgroundColor: `${w.category_color || colors.primary}20` }]}
                  testID={`recent-word-${i}-${w.word.replaceAll(/\s+/g, '-').replaceAll(/[^a-zA-Z0-9-_]/g, '')}`}
                >
                  <Text style={[styles.wordChipText, { color: w.category_color || colors.primary }]}>
                    {w.word}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Coming soon */}
        <Card testID="progress-coming-soon">
          <View style={styles.comingSoonRow}>
            <Ionicons name="analytics-outline" size={20} color={colors.textMuted} />
            <Text style={[styles.comingSoonTitle, { color: colors.textMuted }]}>
              {t('dashboard.comingSoonTitle')}
            </Text>
          </View>
          <Text style={[styles.comingSoonDesc, { color: colors.textMuted }]}>
            {t('dashboard.comingSoonDesc')}
          </Text>
        </Card>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { padding: 4, marginRight: 8 },
  headerIcon: { marginRight: 6 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  container: { flex: 1 },
  content: { padding: 20 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  statsGrid: { flexDirection: 'row', marginBottom: 8 },
  statsGridLast: { marginBottom: 0 },
  chartCard: { marginBottom: 12 },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 120 },
  barItem: { alignItems: 'center', flex: 1 },
  barWrapper: { height: 100, justifyContent: 'flex-end', width: '100%', paddingHorizontal: 4 },
  bar: { borderRadius: 6, width: '100%', minHeight: 4 },
  barLabel: { fontSize: 10, marginTop: 4 },
  barValue: { fontSize: 11, fontWeight: '700' },
  categoryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  catEmoji: { fontSize: 22, marginRight: 12 },
  catInfo: { flex: 1 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  catName: { fontSize: 14, fontWeight: '600' },
  catCount: { fontSize: 14, fontWeight: '800' },
  progressBg: { height: 6, borderRadius: 3 },
  progressFill: { height: 6, borderRadius: 3 },
  wordCloud: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  wordChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  wordChipText: { fontSize: 14, fontWeight: '600' },
  comingSoonRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  comingSoonTitle: { fontSize: 15, fontWeight: '700', fontStyle: 'italic', flex: 1 },
  comingSoonDesc: { fontSize: 14, fontStyle: 'italic', lineHeight: 20, opacity: 0.75 },
  bottomSpacer: { height: 20 },
});
