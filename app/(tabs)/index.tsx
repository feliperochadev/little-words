import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDashboardStats, getSetting, DashboardStats } from '../../src/database/database';
import { COLORS } from '../../src/utils/theme';
import { StatCard, Card } from '../../src/components/UIComponents';
import { BrandHeader } from '../../src/components/BrandHeader';

interface ChildProfile {
  name: string;
  sex: 'boy' | 'girl' | null;
  birth: string; // YYYY-MM-01
}

function getAgeText(birth: string): string {
  const now = new Date();
  const [y, m, d] = birth.split('-').map(Number);
  const bDate = new Date(y, m - 1, d);

  let years = now.getFullYear() - bDate.getFullYear();
  let months = now.getMonth() - bDate.getMonth();

  // If we haven't reached the birth day this month yet, subtract a month
  if (now.getDate() < bDate.getDate()) months--;

  // Adjust if months went negative
  if (months < 0) { years--; months += 12; }

  if (years === 0) return `${months} ${months === 1 ? 'mês' : 'meses'}`;
  if (months === 0) return `${years} ${years === 1 ? 'ano' : 'anos'}`;
  return `${years} ${years === 1 ? 'ano' : 'anos'} e ${months} ${months === 1 ? 'mês' : 'meses'}`;
}

function getGreeting(name: string, sex: 'boy' | 'girl' | null): string {
  const hour = new Date().getHours();
  const period = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const article = sex === 'girl' ? 'da' : sex === 'boy' ? 'do' : 'de';
  return `${period}! Registre as palavras ${article} ${name} 💕`;
}

export default function DashboardScreen() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const [data, name, sex, birth] = await Promise.all([
      getDashboardStats(),
      getSetting('child_name'),
      getSetting('child_sex'),
      getSetting('child_birth'),
    ]);
    setStats(data);
    if (name) {
      setProfile({ name, sex: (sex as 'boy' | 'girl' | null), birth: birth || '' });
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const formatMonth = (monthStr: string) => {
    const [, month] = monthStr.split('-');
    return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][parseInt(month) - 1];
  };

  const emoji = profile?.sex === 'girl' ? '👧' : profile?.sex === 'boy' ? '👦' : '👶';
  const accentColor = profile?.sex === 'girl' ? '#FF6B9D' : profile?.sex === 'boy' ? '#74B9FF' : COLORS.primary;
  const ageText = profile?.birth ? getAgeText(profile.birth) : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
      >
        <BrandHeader />
        {profile && (
          <View style={styles.profileBlock}>
            <View style={styles.profileRow}>
              <Text style={styles.profileEmoji}>{emoji}</Text>
              <View>
                <Text style={[styles.profileName, { color: accentColor }]}>{profile.name}</Text>
                {ageText && <Text style={styles.profileAge}>🎂 {ageText}</Text>}
              </View>
            </View>
            <Text style={styles.profileGreeting}>{getGreeting(profile.name, profile.sex)}</Text>
          </View>
        )}

        {/* Main stats */}
        <View style={styles.statsGrid}>
          <StatCard emoji="📝" value={stats?.totalWords ?? 0} label="Total de palavras" color={accentColor} />
          <StatCard emoji="🗣️" value={stats?.totalVariants ?? 0} label="Variantes" color={COLORS.secondary} />
        </View>
        <View style={styles.statsGrid}>
          <StatCard emoji="📅" value={stats?.wordsToday ?? 0} label="Hoje" color={COLORS.accent} />
          <StatCard emoji="📆" value={stats?.wordsThisWeek ?? 0} label="Esta semana" color={COLORS.success} />
          <StatCard emoji="🗓️" value={stats?.wordsThisMonth ?? 0} label="Este mês" color="#6C5CE7" />
        </View>

        {/* Monthly progress */}
        {stats && stats.monthlyProgress.length > 0 && (
          <Card style={styles.chartCard}>
            <Text style={styles.sectionTitle}>📈 Progresso Mensal</Text>
            <View style={styles.barChart}>
              {(() => {
                const max = Math.max(...stats.monthlyProgress.map(m => m.count), 1);
                return stats.monthlyProgress.slice(-6).map((m, i) => (
                  <View key={i} style={styles.barItem}>
                    <View style={styles.barWrapper}>
                      <View style={[styles.bar, { height: Math.max((m.count / max) * 100, 4), backgroundColor: accentColor }]} />
                    </View>
                    <Text style={styles.barLabel}>{formatMonth(m.month)}</Text>
                    <Text style={[styles.barValue, { color: accentColor }]}>{m.count}</Text>
                  </View>
                ));
              })()}
            </View>
          </Card>
        )}

        {/* Categories breakdown */}
        {stats && stats.categoryCounts.filter(c => c.count > 0).length > 0 && (
          <Card>
            <Text style={styles.sectionTitle}>🏷️ Por Categoria</Text>
            {stats.categoryCounts.filter(c => c.count > 0).map((cat, i) => {
              const max = stats.categoryCounts[0].count || 1;
              return (
                <View key={i} style={styles.categoryRow}>
                  <Text style={styles.catEmoji}>{cat.emoji}</Text>
                  <View style={styles.catInfo}>
                    <View style={styles.catHeader}>
                      <Text style={styles.catName}>{cat.name}</Text>
                      <Text style={[styles.catCount, { color: cat.color }]}>{cat.count}</Text>
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
          <Card>
            <Text style={styles.sectionTitle}>🆕 Palavras Recentes</Text>
            <View style={styles.wordCloud}>
              {stats.recentWords.map((w, i) => (
                <View key={i} style={[styles.wordChip, { backgroundColor: (w.category_color || accentColor) + '20' }]}>
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
            <Text style={styles.emptyTitle}>Comece a registrar!</Text>
            <Text style={styles.emptyText}>
              {profile
                ? `Vá para "Palavras" e adicione a primeira palavra de ${profile.name}!`
                : 'Vá para a aba "Palavras" e adicione a primeira palavra do seu bebê.'}
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
  profileBlock: {
    alignItems: 'center', marginBottom: 20,
  },
  profileRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8,
  },
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