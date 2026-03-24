import { withOpacity } from '../../src/utils/colorHelpers';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import type { Variant, Word } from '../../src/types/domain';
import { Card, EmptyState } from '../../src/components/UIComponents';
import { ListScreenControls } from '../../src/components/ListScreenControls';
import { AddVariantModal } from '../../src/components/AddVariantModal';
import { useI18n } from '../../src/i18n/i18n';
import { sortVariants, SortKey } from '../../src/utils/sortHelpers';
import { formatDateDMY } from '../../src/utils/dateHelpers';
import { buildDefaultSortOptions } from '../../src/utils/sortOptions';
import { useAllVariants } from '../../src/hooks/useVariants';
import { useWords } from '../../src/hooks/useWords';
import { useTheme } from '../../src/hooks/useTheme';
import { WordAssetChips } from '../../src/components/WordAssetChips';

const EMPTY_VARIANTS: Variant[] = [];
const EMPTY_WORDS: Word[] = [];

export default function VariantsScreen() {
  const { t, tc } = useI18n();
  const { colors } = useTheme();
  const { highlightId } = useLocalSearchParams<{ highlightId?: string }>();

  const sortOptions = buildDefaultSortOptions(t);

  const { data: variants = EMPTY_VARIANTS, refetch: refetchVariants } = useAllVariants();
  const { data: words = EMPTY_WORDS } = useWords();

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('date_desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [editVariant, setEditVariant] = useState<Variant | null>(null);
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);

  const flatListRef = useRef<FlatList<Variant>>(null);
  const scrolledHighlightRef = useRef<number | null>(null);

  const onRefresh = async () => { setRefreshing(true); try { await refetchVariants(); } finally { setRefreshing(false); } };

  const handleScrollToIndexFailed = useCallback((info: { index: number; averageItemLength: number }) => {
    flatListRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
  }, []);

  const handleSearch = (text: string) => setSearch(text);

  const filtered = search.trim()
    ? variants.filter(v =>
        v.variant.toLowerCase().includes(search.toLowerCase()) ||
        (v.main_word || '').toLowerCase().includes(search.toLowerCase()))
    : variants;

  const handleEditVariant = (variant: Variant) => {
    const parentWord = words.find(w => w.id === variant.word_id) || null;
    setSelectedWord(parentWord);
    setEditVariant(variant);
    setShowAddVariant(true);
  };

  const currentSortLabel = sortOptions.find(o => o.key === sort)?.label ?? '';
  const sorted = sortVariants(filtered, sort);

  // Clear search when navigating with highlightId so the target variant is never filtered out
  useEffect(() => {
    if (highlightId) setSearch('');
  }, [highlightId]);

  // Scroll to a variant when navigated with highlightId (no visual highlight)
  useEffect(() => {
    if (!highlightId) return;
    const id = Number(highlightId);
    if (scrolledHighlightRef.current === id) return;
    const idx = sorted.findIndex(v => v.id === id);
    if (idx < 0) return;
    scrolledHighlightRef.current = id;
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.3 });
    }, 150);
  }, [highlightId, sorted]);

  const renderVariant = ({ item, index }: { item: Variant; index: number }) => (
      <Card
        style={styles.variantCard}
        testID={`variant-pos-${index}-${item.variant}`}
      >
        <TouchableOpacity onPress={() => handleEditVariant(item)} activeOpacity={0.8} testID={`variant-item-${item.variant}`}>
          <View style={styles.variantMain}>
            <View style={styles.variantHeader}>
              <View style={[styles.variantBubble, { backgroundColor: withOpacity(colors.primaryLight, '30') }]}>
                <Text style={[styles.variantText, { color: colors.primaryDark }]}>&ldquo;{item.variant}&rdquo;</Text>
              </View>
              <Text style={[styles.arrow, { color: colors.textSecondary }]}>→</Text>
              <Text style={[styles.mainWord, { color: colors.text }]} numberOfLines={1}>{item.main_word}</Text>
              <Text style={[styles.date, { color: colors.textSecondary }]}>{formatDateDMY(item.date_added)}</Text>
            </View>
            {(item.asset_count ?? 0) > 0 && (
              <View style={styles.variantMeta}>
                <WordAssetChips parentType="variant" parentId={item.id} />
              </View>
            )}
          </View>
          {item.notes && (
            <View style={styles.notesRow}>
              <Ionicons name="document-text-outline" size={11} color={colors.textMuted} />
              <Text style={[styles.notes, { color: colors.textSecondary }]} numberOfLines={2}>{item.notes}</Text>
            </View>
          )}
        </TouchableOpacity>
      </Card>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ListScreenControls
        colors={colors}
        title={t('variants.title')}
        titleIconName="chatbubbles-outline"
        titleIconColor={colors.secondary}
        titleIconTestID="variants-title-icon"
        addButtonLabel={t('variants.addNew')}
        addButtonIcon={<Ionicons name="add" size={16} color={colors.textOnPrimary} />}
        addButtonTestID="variants-add-btn"
        onPressAdd={() => {
          setSelectedWord(null);
          setEditVariant(null);
          setShowAddVariant(true);
        }}
        searchValue={search}
        onChangeSearch={handleSearch}
        searchPlaceholder={t('variants.searchPlaceholder')}
        searchTestID="variants-search"
        showSortMenu={showSortMenu}
        onToggleSortMenu={() => setShowSortMenu(!showSortMenu)}
        sortButtonTestID="variants-sort-btn"
        sortIconTestID="variants-sort-icon"
        currentSortLabel={currentSortLabel}
        countLabel={tc('variants.count', filtered.length)}
        sortOptions={sortOptions}
        selectedSort={sort}
        selectedSortColor={colors.secondary}
        selectedSortBackgroundColor={colors.secondary}
        onSelectSort={(nextSort: SortKey) => {
          setSort(nextSort);
          setShowSortMenu(false);
        }}
      />

      <FlatList
        ref={flatListRef}
        data={sorted}
        keyExtractor={item => item.id.toString()}
        renderItem={renderVariant}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
        onScrollToIndexFailed={handleScrollToIndexFailed}
        ListHeaderComponent={
          <View style={[styles.hint, { backgroundColor: withOpacity(colors.secondary, '15') }]}>
            <Ionicons name="bulb-outline" size={14} color={colors.secondary} style={styles.hintIcon} testID="variants-hint-icon" />
            <Text style={[styles.hintText, { color: colors.textSecondary }]}>{t('variants.hint')}</Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="chatbubbles-outline" size={56} color={colors.textMuted} />}
            title={search ? t('variants.emptySearchTitle') : t('variants.emptyTitle')}
            subtitle={search ? t('variants.emptySearchSubtitle', { search }) : t('variants.emptySubtitle')}
          />
        }
      />

      <AddVariantModal
        visible={showAddVariant}
        onClose={() => { setShowAddVariant(false); setEditVariant(null); }}
        onSave={() => { refetchVariants(); }}
        onDeleted={() => { refetchVariants(); }}
        word={selectedWord}
        editVariant={editVariant}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  hint: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 12 },
  hintIcon: { marginRight: 6 },
  hintText: { fontSize: 13, lineHeight: 18, flex: 1 },
  variantCard: { marginBottom: 10 },
  variantMain: { flex: 1 },
  variantHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  variantBubble: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 16,
  },
  variantText: { fontSize: 18, fontWeight: '700', fontStyle: 'italic' },
  variantMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 2 },
  arrow: { fontSize: 14 },
  mainWord: { fontSize: 15, fontWeight: '700', flex: 1 },
  date: { fontSize: 12 },
  notesRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  notes: { fontSize: 12, flex: 1, lineHeight: 16 },
});
