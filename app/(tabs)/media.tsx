import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useI18n } from '../../src/i18n/i18n';
import { useTheme } from '../../src/hooks/useTheme';
import { useAllAssets, useRemoveAsset } from '../../src/hooks/useAssets';
import { AudioPreviewOverlay } from '../../src/components/AudioPreviewOverlay';
import { PhotoPreviewOverlay } from '../../src/components/PhotoPreviewOverlay';
import { EditAssetModal } from '../../src/components/EditAssetModal';
import { SearchBar, EmptyState } from '../../src/components/UIComponents';
import { getAssetFileUri } from '../../src/utils/assetStorage';
import { theme } from '../../src/theme';
import { LIST_SCREEN_LAYOUT } from '../../src/theme/layout';
import { withOpacity } from '../../src/utils/colorHelpers';
import type { AssetType, AssetWithLink } from '../../src/types/asset';

type SortKey = 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc';
type FilterKey = AssetType | null;

const EMPTY_ASSETS: AssetWithLink[] = [];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();

  const [search, setSearch] = useState('');
  const [assetFilter, setAssetFilter] = useState<FilterKey>(null);
  const [sort, setSort] = useState<SortKey>('date_desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [editAsset, setEditAsset] = useState<AssetWithLink | null>(null);
  const [audioOverlay, setAudioOverlay] = useState<{ uri: string; name: string; createdAt: string; durationMs?: number | null } | null>(null);
  const [photoOverlay, setPhotoOverlay] = useState<{ uri: string; name: string; createdAt: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<FlatList<AssetWithLink>>(null);

  const { data: assets = EMPTY_ASSETS, refetch } = useAllAssets(search, assetFilter, sort);
  const removeAsset = useRemoveAsset();

  // Scroll to top when leaving the screen
  useFocusEffect(
    useCallback(() => {
      return () => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      };
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  };

  const handleRowPress = useCallback((item: AssetWithLink) => {
    const uri = getAssetFileUri(item.parent_type, item.parent_id, item.asset_type, item.filename);
    const name = item.name ?? item.filename;
    if (item.asset_type === 'audio') {
      setAudioOverlay({ uri, name, createdAt: item.created_at, durationMs: item.duration_ms });
    } else if (item.asset_type === 'photo') {
      setPhotoOverlay({ uri, name, createdAt: item.created_at });
    }
  }, []);

  const handleRemove = useCallback((item: AssetWithLink) => {
    Alert.alert(
      t('media.removeConfirmTitle'),
      t('media.removeConfirmMessage'),
      [
        { text: t('media.removeConfirmCancel'), style: 'cancel' },
        {
          text: t('media.removeConfirmOk'),
          style: 'destructive',
          onPress: () => { removeAsset.mutate(item); },
        },
      ]
    );
  }, [t, removeAsset]);

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'date_desc', label: t('media.sortOptions.dateDesc') },
    { key: 'date_asc', label: t('media.sortOptions.dateAsc') },
    { key: 'name_asc', label: t('media.sortOptions.nameAsc') },
    { key: 'name_desc', label: t('media.sortOptions.nameDesc') },
  ];

  const filterOptions: { key: FilterKey; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
    { key: null, label: t('media.filterAll'), icon: 'layers-outline' },
    { key: 'audio', label: t('media.filterAudio'), icon: 'musical-notes' },
    { key: 'photo', label: t('media.filterPhoto'), icon: 'image' },
    { key: 'video', label: t('media.filterVideo'), icon: 'videocam' },
  ];

  const renderAsset = useCallback((info: { item: AssetWithLink }) => {
    const { item } = info;
    const getTypeIcon = (): React.ComponentProps<typeof Ionicons>['name'] => {
      if (item.asset_type === 'audio') return 'musical-notes';
      if (item.asset_type === 'photo') return 'image';
      return 'videocam';
    };
    const typeIcon = getTypeIcon();
    const displayName = item.name ?? item.filename;
    const getLinkLabel = (): string | null => {
      if (item.parent_type === 'word' && item.linked_word) {
        return t('media.linkedWord').replace('{{name}}', item.linked_word);
      }
      if (item.parent_type === 'variant' && item.linked_variant) {
        return t('media.linkedVariant').replace('{{name}}', item.linked_variant);
      }
      return null;
    };
    const linkLabel = getLinkLabel();
    const dateStr = item.created_at.split(/[T ]/)[0];
    return (
      <TouchableOpacity
        style={[s.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        onPress={() => handleRowPress(item)}
        testID={`media-item-${item.id}`}
        activeOpacity={0.7}
      >
        <View style={[s.typeIconWrap, { backgroundColor: withOpacity(colors.primary, '1A') }]}>
          <Ionicons name={typeIcon} size={20} color={colors.primary} />
        </View>
        <View style={s.rowContent}>
          <Text style={[s.rowName, { color: theme.colors.text }]} numberOfLines={1}>{displayName}</Text>
          {linkLabel && (
            <View style={[s.linkBadge, { backgroundColor: withOpacity(colors.primary, '1E') }]}>
              <Text style={[s.linkBadgeText, { color: colors.primary }]} numberOfLines={1}>{linkLabel}</Text>
            </View>
          )}
          <Text style={[s.rowMeta, { color: theme.colors.textMuted }]}>
            {dateStr} · {formatFileSize(item.file_size)}
          </Text>
        </View>
        <View style={s.rowActions}>
          <TouchableOpacity
            onPress={() => setEditAsset(item)}
            style={[s.actionBtn, { borderColor: withOpacity(colors.textMuted, '40'), backgroundColor: withOpacity(colors.textMuted, '10') }]}
            testID={`media-edit-${item.id}`}
          >
            <Ionicons name="pencil-outline" size={13} color={colors.textMuted} />
            <Text style={[s.actionBtnText, { color: colors.textMuted }]}>{t('common.edit')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleRemove(item)}
            style={[s.actionBtn, { borderColor: withOpacity(colors.error, '50'), backgroundColor: withOpacity(colors.error, '10') }]}
            testID={`media-remove-${item.id}`}
          >
            <Ionicons name="trash-outline" size={13} color={colors.error} />
            <Text style={[s.actionBtnText, { color: colors.error }]}>{t('common.remove')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }, [colors, t, handleRowPress, handleRemove]);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={s.titleRow}>
        <Ionicons name="images-outline" size={22} color={colors.primary} testID="media-screen-icon" />
        <Text style={[s.title, { color: theme.colors.text }]}>{t('media.title')}</Text>
      </View>

      <View style={s.searchContainer}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={t('media.searchPlaceholder')}
          testID="media-search"
        />
      </View>

      <View style={s.filtersRow}>
        <View style={s.filters}>
          {filterOptions.map(f => (
            <TouchableOpacity
              key={f.key ?? 'all'}
              style={[
                s.filterBtn,
                { borderColor: theme.colors.border },
                assetFilter === f.key && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => setAssetFilter(f.key)}
              testID={`media-filter-${f.key ?? 'all'}`}
            >
              <Ionicons name={f.icon} size={14} color={assetFilter === f.key ? '#fff' : theme.colors.textMuted} />
              <Text style={[s.filterLabel, { color: assetFilter === f.key ? '#fff' : theme.colors.text }]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={() => setShowSortMenu(v => !v)} style={s.sortBtn} testID="media-sort-btn">
          <Ionicons name="funnel-outline" size={20} color={colors.primary} />
        </TouchableOpacity>

        {showSortMenu && (
          <View style={[s.sortMenu, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            {sortOptions.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[s.sortMenuItem, sort === opt.key && { backgroundColor: withOpacity(colors.primary, '1A') }]}
                onPress={() => { setSort(opt.key); setShowSortMenu(false); }}
                testID={`media-sort-${opt.key}`}
              >
                <Text style={[s.sortMenuLabel, { color: sort === opt.key ? colors.primary : theme.colors.text }]}>{opt.label}</Text>
                {sort === opt.key && <Ionicons name="checkmark" size={16} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={assets}
        keyExtractor={item => String(item.id)}
        renderItem={renderAsset}
        contentContainerStyle={assets.length === 0 ? s.emptyContainer : s.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View testID="media-empty">
            <EmptyState
              icon={<Ionicons name="images-outline" size={48} color={theme.colors.textMuted} />}
              title={t('media.emptyTitle')}
              subtitle={t('media.emptySubtitle')}
            />
          </View>
        }
      />

      <AudioPreviewOverlay
        visible={!!audioOverlay}
        uri={audioOverlay?.uri ?? ''}
        name={audioOverlay?.name ?? ''}
        createdAt={audioOverlay?.createdAt ?? ''}
        durationMs={audioOverlay?.durationMs}
        onClose={() => setAudioOverlay(null)}
      />
      <PhotoPreviewOverlay
        visible={!!photoOverlay}
        uri={photoOverlay?.uri ?? ''}
        name={photoOverlay?.name ?? ''}
        createdAt={photoOverlay?.createdAt ?? ''}
        onClose={() => setPhotoOverlay(null)}
      />
      <EditAssetModal
        visible={!!editAsset}
        asset={editAsset}
        onClose={() => setEditAsset(null)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: LIST_SCREEN_LAYOUT.paddingHorizontal, paddingTop: 12, paddingBottom: 4, gap: 8 },
  title: { fontSize: 20, fontWeight: '700', flex: 1 },
  filtersRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: LIST_SCREEN_LAYOUT.paddingHorizontal, marginBottom: 8, position: 'relative' },
  filters: { flexDirection: 'row', flex: 1, gap: 8, flexWrap: 'nowrap' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filterLabel: { fontSize: 12, fontWeight: '600' },
  sortBtn: { padding: 4, marginLeft: 4 },
  sortMenu: { position: 'absolute', top: '100%', right: 0, zIndex: 100, borderWidth: 1, borderRadius: 12, overflow: 'hidden', minWidth: 180 },
  sortMenuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 11 },
  sortMenuLabel: { fontSize: 14 },
  searchContainer: { paddingHorizontal: LIST_SCREEN_LAYOUT.paddingHorizontal },
  listContent: { paddingHorizontal: LIST_SCREEN_LAYOUT.paddingHorizontal, paddingBottom: 100 },
  emptyContainer: { flex: 1, paddingHorizontal: LIST_SCREEN_LAYOUT.paddingHorizontal },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 8, borderRadius: 12, borderWidth: 1, gap: 10 },
  typeIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rowContent: { flex: 1, gap: 3 },
  rowName: { fontSize: 15, fontWeight: '600' },
  linkBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  linkBadgeText: { fontSize: 11, fontWeight: '600' },
  rowMeta: { fontSize: 11 },
  rowActions: { flexDirection: 'column', gap: 4, alignItems: 'flex-end' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderWidth: 1, borderRadius: 8 },
  actionBtnText: { fontSize: 12, fontWeight: '600' },
});
