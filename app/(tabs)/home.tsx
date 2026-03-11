import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../src/utils/theme';
import { StatCard, Card } from '../../src/components/UIComponents';
import { BrandHeader } from '../../src/components/BrandHeader';
import { useI18n, useCategoryName } from '../../src/i18n/i18n';
import { getAgeText, getGreeting } from '../../src/utils/dashboardHelpers';
import { useDashboardStats } from '../../src/hooks/useDashboard';
import { useSettingsStore } from '../../src/stores/settingsStore';

export default function DashboardScreen() {
  const { t } = useI18n();
  const categoryName = useCategoryName();
  const { data: stats, refetch } = useDashboardStats();
  const { name, sex, birth } = useSettingsStore();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => { setRefreshing(true); try { await refetch(); } finally { setRefreshing(false); } };

  // Map numeric month index (1-based) to the short label key
  const MONTH_KEYS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const formatMonth = (monthStr: string, showYear: boolean) => {
    const [year, month] = monthStr.split('-');
    const key = MONTH_KEYS[parseInt(month) - 1];
    const label = t(`dashboard.months.${key}`);
    return showYear ? `${label} '${year.slice(2)}` : label;
  };

  const emoji = sex === 'girl' ? '👧' : sex === 'boy' ? '👦' : '👶';
  const accentColor = sex === 'girl' ? '#FF6B9D' : sex === 'boy' ? '#74B9FF' : COLORS.primary;
  const ageText = birth ? getAgeText(birth, t) : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
      >
        <BrandHeader />

        {!!name && (
          <View style={styles.profileBlock}>
            <View style={styles.profileRow}>
              <Text style={styles.profileEmoji}>{emoji}</Text>
              <View>
                <Text style={[styles.profileName, { color: accentColor }]}>{name}</Text>
                {ageText && <Text style={styles.profileAge}>🎂 {ageText}</Text>}
              </View>
            </View>
            <Text style={styles.profileGreeting}>{getGreeting(name, sex, t)}</Text>
          </View>
        )}

        {/* Main stats */}
        <View style={styles.statsGrid}>
          <StatCard emoji="📝" value={stats?.totalWords ?? 0} label={t('dashboard.totalWords')} color={accentColor} testID="stat-total-words" />
          <StatCard emoji="🗣️" value={stats?.totalVariants ?? 0} label={t('dashboard.variants')} color={COLORS.secondary} testID="stat-total-variants" />
        </View>
        <View style={styles.statsGrid}>
          <StatCard emoji="📅" value={stats?.wordsToday ?? 0} label={t('dashboard.today')} color={COLORS.accent} testID="stat-words-today" />
          <StatCard emoji="📆" value={stats?.wordsThisWeek ?? 0} label={t('dashboard.thisWeek')} color={COLORS.success} testID="stat-words-week" />
          <StatCard emoji="🗓️" value={stats?.wordsThisMonth ?? 0} label={t('dashboard.thisMonth')} color="#6C5CE7" testID="stat-words-month" />
        </View>

        {/* Monthly progress */}
        {stats && stats.monthlyProgress.length > 0 && (
          <Card style={styles.chartCard}>
            <Text style={styles.sectionTitle}>{t('dashboard.monthlyProgress')}</Text>
            <View style={styles.barChart}>
              {(() => {
                const last6 = stats.monthlyProgress.slice(-6);
                const showYear = new Set(last6.map(m => m.month.split('-')[0])).size > 1;
                const max = Math.max(...last6.map(m => m.count), 1);
                return last6.map((m, i) => (
                  <View key={i} style={styles.barItem}>
                    <View style={styles.barWrapper}>
                      <View style={[styles.bar, { height: Math.max((m.count / max) * 100, 4), backgroundColor: accentColor }]} />
                    </View>
                    <Text style={styles.barLabel} testID={`bar-label-${m.month}`}>{formatMonth(m.month, showYear)}</Text>
                    <Text style={[styles.barValue, { color: accentColor }]} testID={`bar-value-${m.month}`}>{m.count}</Text>
                  </View>
                ));
              })()}
            </View>
          </Card>
        )}

        {/* Categories breakdown */}
        {stats && stats.categoryCounts.filter(c => c.count > 0).length > 0 && (
          <Card>
            <Text style={styles.sectionTitle}>{t('dashboard.byCategory')}</Text>
            {stats.categoryCounts.filter(c => c.count > 0).map((cat, i) => {
              const max = stats.categoryCounts[0].count || 1;
              return (
                <View key={i} style={styles.categoryRow}>
                  <Text style={styles.catEmoji}>{cat.emoji}</Text>
                  <View style={styles.catInfo}>
                    <View style={styles.catHeader}>
                      <Text style={styles.catName}>{categoryName(cat.name)}</Text>
                      <Text style={[styles.catCount, { color: cat.color }]} testID={`cat-count-${cat.name}`}>{cat.count}</Text>
                    </View>
                    <View style={styles.progressBg}>
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
          <Card testID="recent-words-section">
            <Text style={styles.sectionTitle}>{t('dashboard.recentWords')}</Text>
            <View style={styles.wordCloud}>
              {stats.recentWords.map((w, i) => (
                <View key={i} style={[styles.wordChip, { backgroundColor: (w.category_color || accentColor) + '20' }]} testID={`recent-word-${i}-${w.word.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '')}`}>
                  <Text style={[styles.wordChipText, { color: w.category_color || accentColor }]}>
                    {w.word}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {!stats?.totalWords && (
          <View style={styles.emptyHero}>
            <Text style={styles.emptyEmoji}>🌟</Text>
            <Text style={styles.emptyTitle}>{t('dashboard.emptyTitle')}</Text>
            <Text style={styles.emptyText}>
              {!!name
                ? t('dashboard.emptyTextWithName', { name })
                : t('dashboard.emptyText')}
            </Text>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20 },
  profileBlock: { alignItems: 'center', marginBottom: 20 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  profileEmoji: { fontSize: 40 },
  profileName: { fontSize: 20, fontWeight: '900', color: COLORS.text },
  profileAge: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, fontWeight: '600' },
  profileGreeting: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 18 },
  statsGrid: { flexDirection: 'row', marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 16 },
  chartCard: { marginBottom: 12 },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 120 },
  barItem: { alignItems: 'center', flex: 1 },
  barWrapper: { height: 100, justifyContent: 'flex-end', width: '100%', paddingHorizontal: 4 },
  bar: { borderRadius: 6, width: '100%', minHeight: 4 },
  barLabel: { fontSize: 10, color: COLORS.textSecondary, marginTop: 4 },
  barValue: { fontSize: 11, fontWeight: '700' },
  categoryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  catEmoji: { fontSize: 22, marginRight: 12 },
  catInfo: { flex: 1 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  catName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  catCount: { fontSize: 14, fontWeight: '800' },
  progressBg: { height: 6, backgroundColor: COLORS.border, borderRadius: 3 },
  progressFill: { height: 6, borderRadius: 3 },
  wordCloud: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  wordChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  wordChipText: { fontSize: 14, fontWeight: '600' },
  emptyHero: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
});
