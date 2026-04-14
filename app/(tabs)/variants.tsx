import { withOpacity } from '../../src/utils/colorHelpers';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
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
  const router = useRouter();

  const sortOptions = buildDefaultSortOptions(t);
  const { initialSearch } = useLocalSearchParams<{ initialSearch?: string }>();

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

  const onRefresh = async () => { setRefreshing(true); try { await refetchVariants(); } finally { setRefreshing(false); } };

  // Set search from params
  useEffect(() => {
    if (initialSearch) {
      setSearch(initialSearch);
      router.setParams({ initialSearch: undefined });
    }
  }, [initialSearch, router]);

  // Clear search and scroll to top when leaving the screen
  useFocusEffect(
    useCallback(() => {
      return () => {
        setSearch('');
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      };
    }, [])
  );

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

  const renderVariant = ({ item, index }: { item: Variant; index: number }) => (
      <Card
        style={styles.variantCard}
        testID={`variant-pos-${index}-${item.variant}`}
      >
        <View style={styles.cardRow}>
          <View style={styles.variantMain}>
            <View style={styles.variantHeader}>
              <View style={[styles.variantBubble, { backgroundColor: withOpacity(colors.primaryLight, '30') }]}>
                <Text style={[styles.variantText, { color: colors.primaryDark }]}>&ldquo;{item.variant}&rdquo;</Text>
              </View>
              <Text style={[styles.arrow, { color: colors.textSecondary }]}>→</Text>
              <Text style={[styles.mainWord, { color: colors.text }]} numberOfLines={1}>{item.main_word}</Text>
            </View>
            {(item.asset_count ?? 0) > 0 && (
              <View style={styles.variantMeta}>
                <WordAssetChips parentType="variant" parentId={item.id} />
              </View>
            )}
            {item.notes && (
              <View style={styles.notesRow}>
                <Ionicons name="document-text-outline" size={11} color={colors.textMuted} />
                <Text style={[styles.notes, { color: colors.textSecondary }]} numberOfLines={2}>{item.notes}</Text>
              </View>
            )}
          </View>
          <View style={styles.cardRight}>
            <TouchableOpacity
              onPress={() => handleEditVariant(item)}
              style={[styles.editBtn, { borderColor: withOpacity(colors.textMuted, '40'), backgroundColor: withOpacity(colors.textMuted, '10') }]}
              testID={`variant-edit-btn-${item.variant}`}
            >
              <Ionicons name="pencil-outline" size={14} color={colors.textMuted} />
              <Text style={[styles.editBtnText, { color: colors.textMuted }]}>{t('common.edit')}</Text>
            </TouchableOpacity>
            <Text style={[styles.date, { color: colors.textSecondary }]}>{formatDateDMY(item.date_added)}</Text>
          </View>
        </View>
      </Card>
  );

  const openFirstVariant = () => {
    setSelectedWord(words[0] ?? null);
    setEditVariant(null);
    setShowAddVariant(true);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ListScreenControls
        colors={colors}
        title={t('variants.title')}
        titleIconName="chatbubble-outline"
        titleIconColor={colors.secondary}
        titleIconTestID="variants-title-icon"
        addButtonLabel={t('variants.addNew')}
        addButtonIcon={<Ionicons name="add" size={16} color={colors.textOnPrimary} />}
        addButtonTestID="variants-add-btn"
        showAddButton={variants.length > 0 || search.length > 0}
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

      {variants.length === 0 && !search && (
        <View style={[styles.hintBanner, { backgroundColor: withOpacity(colors.secondary, '15'), borderColor: withOpacity(colors.secondary, '30') }]} testID="variants-hint-banner">
          <Ionicons name="bulb-outline" size={16} color={colors.secondary} />
          <Text style={[styles.hintText, { color: colors.textSecondary }]}>{t('variants.hint')}</Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        testID="variants-flatlist"
        data={sorted}
        keyExtractor={item => item.id.toString()}
        renderItem={renderVariant}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
        ListEmptyComponent={
          search ? (
            <EmptyState
              icon={<Ionicons name="chatbubbles-outline" size={56} color={colors.textMuted} />}
              title={t('variants.emptySearchTitle')}
              subtitle={t('variants.emptySearchSubtitle', { search })}
            />
          ) : (
            <EmptyState
              icon={<Ionicons name="chatbubbles-outline" size={56} color={colors.textMuted} />}
              title={t('variants.emptyTitle')}
              subtitle={t('variants.emptySubtitle')}
              action={{
                label: t('variants.addFirst'),
                onPress: openFirstVariant,
                icon: <Ionicons name="add" size={16} color={colors.textOnPrimary} />,
                testID: 'variants-add-first-btn',
              }}
            />
          )
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
  variantCard: { marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  variantMain: { flex: 1 },
  cardRight: { alignItems: 'flex-end', marginLeft: 8 },
  variantHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' },
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
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, marginBottom: 5, borderWidth: 1, borderRadius: 8 },
  editBtnText: { fontSize: 12, fontWeight: '600' },
  addFirstBtn: { marginTop: 16, alignSelf: 'center' },
  hintBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 20, marginBottom: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  hintText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
