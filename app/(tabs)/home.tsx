import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
  Modal, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatCard, Card } from '../../src/components/UIComponents';
import { BrandHeader } from '../../src/components/BrandHeader';
import { AddWordModal } from '../../src/components/AddWordModal';
import { ProfileAvatar } from '../../src/components/ProfileAvatar';
import { TimelineItem } from '../../src/components/TimelineItem';
import { AssetPreviewOverlays } from '../../src/components/AssetPreviewOverlays';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useI18n } from '../../src/i18n/i18n';
import { getAgeText, getGreeting } from '../../src/utils/dashboardHelpers';
import { useDashboardStats } from '../../src/hooks/useDashboard';
import { useMemories } from '../../src/hooks/useMemories';
import { useAssetPreviewOverlays } from '../../src/hooks/useAssetPreviewOverlays';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useTheme } from '../../src/hooks/useTheme';
import { useProfilePhoto, useSaveProfilePhoto } from '../../src/hooks/useAssets';
import { useProfilePhotoPicker } from '../../src/hooks/useProfilePhotoPicker';
import * as assetService from '../../src/services/assetService';
import type { TimelineItem as TimelineItemModel } from '../../src/types/domain';

const EMPTY_MEMORIES: TimelineItemModel[] = [];
const MAX_HOME_MEMORIES = 3;

export default function DashboardScreen() {
  const router = useRouter();
  const { action } = useLocalSearchParams<{ action?: string }>();
  const { t } = useI18n();
  const { data: stats, refetch } = useDashboardStats();
  const { data: allMemories = EMPTY_MEMORIES } = useMemories();
  const recentMemories = allMemories.slice(0, MAX_HOME_MEMORIES);
  const { name, sex, birth } = useSettingsStore();
  const [refreshing, setRefreshing] = useState(false);
  const [showAddWord, setShowAddWord] = useState(false);

  const {
    audioOverlay,
    photoOverlay,
    openAudioOverlay,
    openPhotoOverlay,
    closeAudioOverlay,
    closePhotoOverlay,
  } = useAssetPreviewOverlays();

  const handlePlayAudio = useCallback(async (item: TimelineItemModel) => {
    const audioAssets = await assetService.getAssetsByParentAndType(item.item_type, item.id, 'audio');
    const firstAudio = audioAssets[0];
    if (firstAudio) {
      openAudioOverlay(firstAudio);
    }
  }, [openAudioOverlay]);

  const handleViewPhoto = useCallback(async (item: TimelineItemModel) => {
    const photoAssets = await assetService.getAssetsByParentAndType(item.item_type, item.id, 'photo');
    const firstPhoto = photoAssets[0];
    if (firstPhoto) {
      openPhotoOverlay(firstPhoto);
    }
  }, [openPhotoOverlay]);

  // Auto-open AddWordModal when deep-linked via notification (action=add-word)
  useEffect(() => {
    if (action === 'add-word') {
      setShowAddWord(true);
    }
  }, [action]);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const { data: profilePhoto } = useProfilePhoto();
  const profilePhotoUri = profilePhoto?.uri ?? null;
  const saveProfilePhoto = useSaveProfilePhoto();
  const { handlePickPhoto, handleRemovePhoto } = useProfilePhotoPicker({
    onPhotoSelected: async (asset) => {
      await saveProfilePhoto.mutateAsync({
        sourceUri: asset.uri,
        mimeType: asset.mimeType ?? 'image/jpeg',
        fileSize: asset.fileSize ?? 0,
      });
    },
    onPhotoRemoved: () => setShowPhotoViewer(false),
  });

  const onRefresh = async () => { setRefreshing(true); try { await refetch(); } finally { setRefreshing(false); } };

  const { colors } = useTheme();
  const ageText = birth ? getAgeText(birth, t) : null;

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
              tapHint={profilePhotoUri ? undefined : t('onboarding.tapToAddPhoto')}
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

        {/* Progress frame — only when there are words */}
        {stats && stats.totalWords > 0 && (
          <Card
            onPress={() => router.push('/(tabs)/progress')}
            testID="home-progress-frame"
          >
            <View style={styles.progressFrameHeader}>
              <Text style={[styles.progressFrameTitle, { color: colors.textSecondary }]}>
                {t('dashboard.progressTitle')}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>
            <View style={styles.statsGrid}>
              <StatCard variant="iconValue" icon={<Ionicons name="create-outline" size={22} color={colors.primary} />} value={stats.totalWords} label={t('dashboard.totalWords')} color={colors.primary} testID="stat-total-words" />
              <StatCard variant="iconValue" icon={<Ionicons name="chatbubbles-outline" size={22} color={colors.secondary} />} value={stats.totalVariants} label={t('dashboard.variants')} color={colors.secondary} testID="stat-total-variants" />
            </View>
            <View style={[styles.statsGrid, styles.statsGridLast]}>
              <StatCard variant="iconValue" icon={<Ionicons name="today-outline" size={22} color={colors.accent} />} value={stats.wordsToday} label={t('dashboard.today')} color={colors.accent} testID="stat-words-today" />
              <StatCard variant="iconValue" icon={<Ionicons name="calendar-outline" size={22} color={colors.success} />} value={stats.wordsThisWeek} label={t('dashboard.thisWeek')} color={colors.success} testID="stat-words-week" />
              <StatCard variant="iconValue" icon={<Ionicons name="calendar-clear-outline" size={22} color={colors.info} />} value={stats.wordsThisMonth} label={t('dashboard.thisMonth')} color={colors.info} testID="stat-words-month" />
            </View>
          </Card>
        )}

        {/* Memories mini-timeline — only when there are words */}
        {stats && stats.totalWords > 0 && (
          <Card testID="home-memories-frame">
            <TouchableOpacity
              style={styles.progressFrameHeader}
              onPress={() => router.push('/(tabs)/memories')}
              testID="home-memories-header"
            >
              <Text style={[styles.progressFrameTitle, { color: colors.textSecondary }]}>
                {t('dashboard.memoriesTitle')}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
            <View style={styles.miniTimeline}>
              {recentMemories.map((item, idx) => (
                <TimelineItem
                  key={`${item.item_type}-${item.id}`}
                  item={item}
                  index={idx}
                  isFirst={idx === 0}
                  isLast={idx === recentMemories.length - 1}
                  compact
                  onPlayAudio={(ti) => { void handlePlayAudio(ti); }}
                  onViewPhoto={(ti) => { void handleViewPhoto(ti); }}
                />
              ))}
            </View>
            <TouchableOpacity
              style={[styles.seeAllBtn, { borderTopColor: colors.border }]}
              onPress={() => router.push('/(tabs)/memories')}
              testID="home-memories-see-all"
            >
              <Ionicons name="chevron-down" size={16} color={colors.primary} />
              <Text style={[styles.seeAllText, { color: colors.primary }]}>{t('dashboard.seeAllMemories')}</Text>
            </TouchableOpacity>
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
              <Text style={[styles.viewerBtnText, { color: colors.textOnPrimary }]}>{t('onboarding.changePhoto')}</Text>
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

      <AssetPreviewOverlays
        audioOverlay={audioOverlay}
        photoOverlay={photoOverlay}
        onCloseAudio={closeAudioOverlay}
        onClosePhoto={closePhotoOverlay}
      />
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
  statsGridLast: { marginBottom: 0 },
  emptyHero: { alignItems: 'center', paddingVertical: 20 },
  progressFrameHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  progressFrameTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
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
  miniTimeline: { marginTop: 8 },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingTop: 10, marginTop: 2, borderTopWidth: StyleSheet.hairlineWidth },
  seeAllText: { fontSize: 13, fontWeight: '700' },
});
