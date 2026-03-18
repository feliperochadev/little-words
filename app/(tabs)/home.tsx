import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
  Modal, Image, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatCard, Card } from '../../src/components/UIComponents';
import { BrandHeader } from '../../src/components/BrandHeader';
import { AddWordModal } from '../../src/components/AddWordModal';
import { ProfileAvatar } from '../../src/components/ProfileAvatar';
import { useRouter } from 'expo-router';
import { useI18n, useCategoryName } from '../../src/i18n/i18n';
import { getAgeText, getGreeting } from '../../src/utils/dashboardHelpers';
import { useDashboardStats } from '../../src/hooks/useDashboard';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useTheme } from '../../src/hooks/useTheme';
import { useProfilePhoto, useSaveProfilePhoto, useRemoveProfilePhoto } from '../../src/hooks/useAssets';

export default function DashboardScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const categoryName = useCategoryName();
  const { data: stats, refetch } = useDashboardStats();
  const { name, sex, birth } = useSettingsStore();
  const [refreshing, setRefreshing] = useState(false);
  const [showAddWord, setShowAddWord] = useState(false);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const { data: profilePhoto } = useProfilePhoto();
  const profilePhotoUri = profilePhoto?.uri ?? null;
  const saveProfilePhoto = useSaveProfilePhoto();
  const removeProfilePhoto = useRemoveProfilePhoto();

  const onRefresh = async () => { setRefreshing(true); try { await refetch(); } finally { setRefreshing(false); } };

  const launchPicker = async (source: 'camera' | 'library') => {
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert(t('common.error'), t('settings.photoPermissionDenied')); setPickingPhoto(false); return; }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        await saveProfilePhoto.mutateAsync({ sourceUri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg', fileSize: asset.fileSize ?? 0 });
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert(t('common.error'), t('settings.photoPermissionDenied')); setPickingPhoto(false); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        await saveProfilePhoto.mutateAsync({ sourceUri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg', fileSize: asset.fileSize ?? 0 });
      }
    }
    setPickingPhoto(false);
  };

  const handlePickPhoto = () => {
    if (pickingPhoto) return;
    setPickingPhoto(true);
    Alert.alert(
      t('settings.photoSourceTitle'),
      undefined,
      [
        { text: t('settings.photoSourceCamera'), onPress: () => { void launchPicker('camera'); } },
        { text: t('settings.photoSourceGallery'), onPress: () => { void launchPicker('library'); } },
        { text: t('common.cancel'), style: 'cancel', onPress: () => setPickingPhoto(false) },
      ]
    );
  };

  const handleRemovePhoto = () => {
    Alert.alert(
      t('settings.removePhoto'),
      t('settings.removePhotoConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.removePhoto'),
          style: 'destructive',
          onPress: async () => {
            await removeProfilePhoto.mutateAsync();
            setShowPhotoViewer(false);
          },
        },
      ]
    );
  };

  // Map numeric month index (1-based) to the short label key
  const MONTH_KEYS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const formatMonth = (monthStr: string, showYear: boolean) => {
    const [year, month] = monthStr.split('-');
    const key = MONTH_KEYS[Number.parseInt(month, 10) - 1];
    const label = t(`dashboard.months.${key}`);
    return showYear ? `${label} '${year.slice(2)}` : label;
  };

  const { colors } = useTheme();
  const ageText = birth ? getAgeText(birth, t) : null;
  const visibleCategoryCounts = stats?.categoryCounts.filter(c => c.count > 0) ?? [];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']} testID="home-safe-area">
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        testID="home-scroll"
      >
        <View style={styles.headerRow}>
          <BrandHeader style={{ marginBottom: 0 }} />
          {(stats?.totalWords ?? 0) > 0 && (
            <TouchableOpacity
              style={[styles.addWordHeaderBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
              onPress={() => setShowAddWord(true)}
              testID="home-add-word-btn"
            >
              <Ionicons name="add" size={16} color={colors.textOnPrimary} />
              <Text style={[styles.addWordHeaderBtnText, { color: colors.textOnPrimary }]}>{t('words.newWord')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {!!name && (
          <View style={styles.profileBlock}>
            <ProfileAvatar
              size="lg"
              photoUri={profilePhotoUri}
              sex={sex}
              onPress={() => profilePhotoUri ? setShowPhotoViewer(true) : handlePickPhoto()}
              testID="home-profile-avatar"
            />
            <Text style={[styles.profileName, { color: colors.primary }]}>{name}</Text>
            {ageText && (
              <View style={styles.ageRow}>
                <Ionicons name="gift-outline" size={12} color={colors.textSecondary} />
                <Text style={[styles.profileAge, { color: colors.textSecondary }]}>{ageText}</Text>
              </View>
            )}
            <Text style={[styles.profileGreeting, { color: colors.textSecondary }]}>{getGreeting(name, sex, t)}</Text>
          </View>
        )}

        {!stats?.totalWords && (
          <View style={styles.emptyHero}>
            <Ionicons name="star-outline" size={64} color={colors.textMuted} style={styles.emptyIcon} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('dashboard.emptyTitle')}</Text>
            <TouchableOpacity
              style={[styles.addWordBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
              onPress={() => setShowAddWord(true)}
              testID="home-add-first-word-btn"
            >
              <Ionicons name="add" size={16} color={colors.textOnPrimary} />
              <Text style={[styles.addWordBtnText, { color: colors.textOnPrimary }]}>{t('words.addFirstWord')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Main stats */}
        <View style={styles.statsGrid}>
          <StatCard icon={<Ionicons name="create-outline" size={22} color={colors.primary} />} value={stats?.totalWords ?? 0} label={t('dashboard.totalWords')} color={colors.primary} testID="stat-total-words" />
          <StatCard icon={<Ionicons name="chatbubbles-outline" size={22} color={colors.secondary} />} value={stats?.totalVariants ?? 0} label={t('dashboard.variants')} color={colors.secondary} testID="stat-total-variants" />
        </View>
        <View style={styles.statsGrid}>
          <StatCard icon={<Ionicons name="today-outline" size={22} color={colors.accent} />} value={stats?.wordsToday ?? 0} label={t('dashboard.today')} color={colors.accent} testID="stat-words-today" />
          <StatCard icon={<Ionicons name="calendar-outline" size={22} color={colors.success} />} value={stats?.wordsThisWeek ?? 0} label={t('dashboard.thisWeek')} color={colors.success} testID="stat-words-week" />
          <StatCard icon={<Ionicons name="calendar-clear-outline" size={22} color={colors.info} />} value={stats?.wordsThisMonth ?? 0} label={t('dashboard.thisMonth')} color={colors.info} testID="stat-words-month" />
        </View>

        {/* Monthly progress */}
        {stats && stats.monthlyProgress.length > 0 && (
          <Card style={styles.chartCard}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="bar-chart-outline" size={16} color={colors.primary} testID="home-monthly-progress-icon" />
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
                      <View style={[styles.bar, { height: Math.max((m.count / max) * 100, 4), backgroundColor: colors.primary }]} />
                    </View>
                    <Text style={[styles.barLabel, { color: colors.textSecondary }]} testID={`bar-label-${m.month}`}>{formatMonth(m.month, showYear)}</Text>
                    <Text style={[styles.barValue, { color: colors.primary }]} testID={`bar-value-${m.month}`}>{m.count}</Text>
                  </View>
                ));
              })()}
            </View>
          </Card>
        )}

        {/* Categories breakdown */}
        {visibleCategoryCounts.length > 0 && (
          <Card>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="pricetags-outline" size={16} color={colors.secondary} testID="home-category-icon" />
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
          <Card testID="recent-words-section">
            <View style={styles.sectionTitleRow}>
              <Ionicons name="sparkles-outline" size={16} color={colors.accent} testID="home-recent-words-icon" />
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

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <AddWordModal
        visible={showAddWord}
        onClose={() => setShowAddWord(false)}
        onDeleted={() => setShowAddWord(false)}
        onSave={() => router.push('/(tabs)/words')}
        editWord={null}
      />

      <Modal
        visible={showPhotoViewer}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhotoViewer(false)}
        testID="home-photo-viewer"
      >
        <View style={styles.viewerBackdrop}>
          <TouchableOpacity style={styles.viewerClose} onPress={() => setShowPhotoViewer(false)} testID="home-photo-viewer-close">
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {profilePhotoUri ? (
            <Image source={{ uri: profilePhotoUri }} style={styles.viewerImage} resizeMode="contain" />
          ) : null}
          <View style={styles.viewerActions}>
            <TouchableOpacity
              style={[styles.viewerBtn, { backgroundColor: colors.primary }]}
              onPress={() => { setShowPhotoViewer(false); handlePickPhoto(); }}
              testID="home-photo-viewer-change"
            >
              <Text style={[styles.viewerBtnText, { color: colors.textOnPrimary }]}>{t('settings.changePhoto')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewerBtn, styles.viewerBtnDanger]}
              onPress={handleRemovePhoto}
              testID="home-photo-viewer-remove"
            >
              <Text style={[styles.viewerBtnText, { color: colors.error }]}>{t('settings.removePhoto')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 20 },
  profileBlock: { alignItems: 'center', marginBottom: 20 },
  profileName: { fontSize: 20, fontWeight: '900', marginTop: 8 },
  ageRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  profileAge: { fontSize: 12, fontWeight: '600' },
  profileGreeting: { fontSize: 13, textAlign: 'center', lineHeight: 18, marginTop: 8 },
  statsGrid: { flexDirection: 'row', marginBottom: 8 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
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
  emptyHero: { alignItems: 'center', paddingVertical: 20 },
  emptyIcon: { marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  bottomSpacer: { height: 20 },
  viewerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  viewerClose: { position: 'absolute', top: 56, right: 20, padding: 8, zIndex: 10 },
  viewerImage: { width: '90%', height: '60%' },
  viewerActions: { position: 'absolute', bottom: 60, flexDirection: 'row', gap: 12, paddingHorizontal: 20 },
  viewerBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  viewerBtnDanger: { backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1.5, borderColor: 'rgba(255,100,100,0.6)' },
  viewerBtnText: { fontSize: 15, fontWeight: '700' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  addWordHeaderBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  addWordHeaderBtnText: { fontSize: 15, fontWeight: '700' },
  addWordBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, minHeight: 48 },
  addWordBtnText: { fontSize: 16, fontWeight: '700' },
});
