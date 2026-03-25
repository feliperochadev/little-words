import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../../src/components/UIComponents';
import { TimelineItem } from '../../src/components/TimelineItem';
import { AssetPreviewOverlays } from '../../src/components/AssetPreviewOverlays';
import { useI18n } from '../../src/i18n/i18n';
import { useTheme } from '../../src/hooks/useTheme';
import { useMemories } from '../../src/hooks/useMemories';
import { useTimelineHandlers } from '../../src/hooks/useTimelineHandlers';
import type { TimelineItem as TimelineItemModel } from '../../src/types/domain';

const EMPTY_MEMORIES: TimelineItemModel[] = [];

export default function MemoriesScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const {
    handlePlayAudio,
    handleViewPhoto,
    audioOverlay,
    photoOverlay,
    closeAudioOverlay,
    closePhotoOverlay,
  } = useTimelineHandlers();

  const {
    data: memories = EMPTY_MEMORIES,
    isLoading,
    isError,
    refetch,
  } = useMemories();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const renderItem = useCallback(({ item, index }: Readonly<{ item: TimelineItemModel; index: number }>) => (
    <TimelineItem
      item={item}
      index={index}
      isFirst={index === 0}
      isLast={index === memories.length - 1}
      onPlayAudio={handlePlayAudio}
      onViewPhoto={handleViewPhoto}
    />
  ), [handlePlayAudio, handleViewPhoto, memories.length]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <Ionicons name="gift-outline" size={20} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('tabs.memories')}</Text>
        </View>
        <EmptyState
          icon={<Ionicons name="alert-circle-outline" size={56} color={colors.textMuted} />}
          title={t('memories.errorTitle')}
          subtitle={t('memories.errorSubtitle')}
          action={{
            label: t('memories.retry'),
            onPress: () => { void refetch(); },
            icon: <Ionicons name="refresh" size={16} color={colors.textOnPrimary} />,
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Ionicons name="gift-outline" size={20} color={colors.primary} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('tabs.memories')}</Text>
      </View>

      <View style={styles.timelineContainer}>
        <FlatList
          testID="memories-flatlist"
          data={memories}
          keyExtractor={(item) => `${item.item_type}-${item.id}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          removeClippedSubviews
          ListEmptyComponent={
            <EmptyState
              icon={<Ionicons name="gift-outline" size={56} color={colors.textMuted} />}
              title={t('memories.emptyTitle')}
              subtitle={t('memories.emptySubtitle')}
            />
          }
        />
      </View>

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
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  timelineContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
  },
});
