import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { EmptyState } from '../../src/components/UIComponents';
import { TimelineItem } from '../../src/components/TimelineItem';
import { AssetPreviewOverlays } from '../../src/components/AssetPreviewOverlays';
import { KeepsakeSection } from '../../src/components/keepsake/KeepsakeSection';
import { useI18n } from '../../src/i18n/i18n';
import { useTheme } from '../../src/hooks/useTheme';
import { useMemoriesInfinite } from '../../src/hooks/useMemories';
import { useTimelineHandlers } from '../../src/hooks/useTimelineHandlers';
import type { TimelineItem as TimelineItemModel } from '../../src/types/domain';

const SCROLL_THRESHOLD = 200;

export default function MemoriesScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const flatListRef = useRef<FlatList<TimelineItemModel>>(null);

  const {
    handlePlayAudio,
    handleViewPhoto,
    audioOverlay,
    photoOverlay,
    closeAudioOverlay,
    closePhotoOverlay,
  } = useTimelineHandlers();

  const {
    items,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMemoriesInfinite();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = event.nativeEvent.contentOffset.y;
    const should = offset > SCROLL_THRESHOLD;
    setShowBackToTop(prev => (prev === should ? prev : should));
  }, []);

  const scrollToTop = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // Scroll to top when leaving the screen
  useFocusEffect(
    useCallback(() => {
      return () => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
        setShowBackToTop(false);
      };
    }, [])
  );

  const renderItem = useCallback(({ item, index }: Readonly<{ item: TimelineItemModel; index: number }>) => (
    <TimelineItem
      item={item}
      index={index}
      isFirst={index === 0}
      isLast={index === items.length - 1}
      onPlayAudio={handlePlayAudio}
      onViewPhoto={handleViewPhoto}
    />
  ), [handlePlayAudio, handleViewPhoto, items.length]);

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.loadMoreContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [isFetchingNextPage, colors.primary]);

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
          ref={flatListRef}
          testID="memories-flatlist"
          data={items}
          keyExtractor={(item) => `${item.item_type}-${item.id}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          onScroll={handleScroll}
          scrollEventThrottle={200}
          removeClippedSubviews
          ListHeaderComponent={<KeepsakeSection totalWords={items.length} />}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <EmptyState
              icon={<Ionicons name="gift-outline" size={56} color={colors.textMuted} />}
              title={t('memories.emptyTitle')}
              subtitle={t('memories.emptySubtitle')}
            />
          }
        />

        {showBackToTop && (
          <View style={[styles.backToTopContainer, { pointerEvents: 'box-none' }]}>
            <TouchableOpacity
              style={[styles.backToTopBtn, { backgroundColor: colors.primary }]}
              onPress={scrollToTop}
              testID="memories-back-to-top"
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-up" size={16} color={colors.textOnPrimary} />
              <Text style={[styles.backToTopText, { color: colors.textOnPrimary }]}>{t('memories.backToTop')}</Text>
            </TouchableOpacity>
          </View>
        )}
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
  loadMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  backToTopContainer: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  backToTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  backToTopText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
