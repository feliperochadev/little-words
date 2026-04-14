import { withOpacity } from '../../src/utils/colorHelpers';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Card, CategoryBadge, EmptyState } from '../../src/components/UIComponents';
import { ListScreenControls } from '../../src/components/ListScreenControls';
import { AddWordModal } from '../../src/components/AddWordModal';
import { AddVariantModal } from '../../src/components/AddVariantModal';
import { AddCategoryModal, CategoryToEdit } from '../../src/components/AddCategoryModal';
import { useI18n, useCategoryName } from '../../src/i18n/i18n';
import { sortWords, SortKey } from '../../src/utils/sortHelpers';
import { formatDateDMY } from '../../src/utils/dateHelpers';
import { buildDefaultSortOptions } from '../../src/utils/sortOptions';
import { useWords } from '../../src/hooks/useWords';
import { useTheme } from '../../src/hooks/useTheme';
import type { Word, Variant } from '../../src/types/domain';
import { WordAssetChips } from '../../src/components/WordAssetChips';

const EMPTY_WORDS: Word[] = [];

export default function WordsScreen() {
  const { t, tc } = useI18n();
  const categoryName = useCategoryName();
  const { colors } = useTheme();
  const router = useRouter();

  const sortOptions = buildDefaultSortOptions(t);

  const { initialSearch } = useLocalSearchParams<{ initialSearch?: string }>();
  const listRef = useRef<FlatList<Word>>(null);

  // Local UI state only — no server state managed here
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('date_desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showAddWord, setShowAddWord] = useState(false);
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editCategory, setEditCategory] = useState<CategoryToEdit | null>(null);
  const [editWord, setEditWord] = useState<Word | null>(null);
  const [editVariant, setEditVariant] = useState<Variant | null>(null);

  // Server state via TanStack Query — caching, dedup, auto-refresh on focus
  const { data: words = EMPTY_WORDS, refetch } = useWords(search);
  const [refreshing, setRefreshing] = useState(false);

  const sortedWords = sortWords(words, sort);
  const currentSortLabel = sortOptions.find(o => o.key === sort)?.label ?? '';

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
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
      };
    }, [])
  );

  const onRefresh = async () => { setRefreshing(true); try { await refetch(); } finally { setRefreshing(false); } };

  const handleSearch = (text: string) => { setSearch(text); };

  const closeWordModal = () => { setShowAddWord(false); setEditWord(null); };

  const renderWord = ({ item, index }: { item: Word; index: number }) => (
    <Card style={[styles.wordCard]} testID={`word-item-${item.word}`}>
      <View style={styles.cardRow}>
        <View style={styles.wordMain}>
          <Text style={[styles.wordText, { color: colors.text }]} testID={`word-pos-${index}-${item.word}`}>{item.word}</Text>
          <View style={styles.wordMeta}>
        {(() => {
          const categoryId = item.category_id;
          const categoryNameValue = item.category_name;
          if (!categoryNameValue || categoryId === null) return null;
          return (
          <TouchableOpacity
            onLongPress={() => setEditCategory({
              id: categoryId,
              name: categoryName(categoryNameValue),
              color: item.category_color || colors.primary,
              emoji: item.category_emoji || '🏷️',
            })}
            delayLongPress={400}
            activeOpacity={1}
          >
            <CategoryBadge
              name={categoryName(categoryNameValue)}
              color={item.category_color || colors.primary}
              emoji={item.category_emoji || '📝'}
              size="small"
            />
          </TouchableOpacity>
          );
        })()}
        {item.variant_texts?.split('|||').map((v: string) => (
          <View key={v} style={[styles.variantChip, { backgroundColor: withOpacity(colors.secondary, '20') }]} testID={`word-variant-chip-${v}`}>
            <Ionicons name="chatbubble" size={12} color={colors.secondary} style={styles.variantChipIcon} testID={`word-variant-icon-${v}`} />
            <Text style={[styles.variantChipText, { color: colors.primaryDark }]} testID={`word-variant-text-${v}`}>{v}</Text>
          </View>
        ))}
        {(item.asset_count ?? 0) > 0 && (
          <WordAssetChips parentId={item.id} />
        )}
          </View>
          {item.notes && (
            <View style={styles.noteRow}>
              <Ionicons name="document-text-outline" size={11} color={colors.textMuted} />
              <Text style={[styles.notePreview, { color: colors.textSecondary }]} numberOfLines={1}>{item.notes}</Text>
            </View>
          )}
        </View>
        <View style={styles.cardRight}>
          <TouchableOpacity
            onPress={() => { setEditWord(item); setShowAddWord(true); }}
            style={[styles.editBtn, { borderColor: withOpacity(colors.textMuted, '40'), backgroundColor: withOpacity(colors.textMuted, '10') }]}
            testID={`word-edit-btn-${item.word}`}
          >
            <Ionicons name="pencil-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.editBtnText, { color: colors.textMuted }]}>{t('common.edit')}</Text>
          </TouchableOpacity>
          <Text style={[styles.wordDate, { color: colors.textSecondary }]} testID={`word-date-${item.word}`}>{formatDateDMY(item.date_added)}</Text>
        </View>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ListScreenControls
        colors={colors}
        title={t('words.title')}
        titleIconName="book-outline"
        titleIconColor={colors.primary}
        titleIconTestID="words-title-icon"
        addButtonLabel={t('words.addWord')}
        addButtonIcon={<Ionicons name="add" size={16} color={colors.textOnPrimary} />}
        addButtonTestID="words-add-btn"
        showAddButton={words.length > 0 || search.length > 0}
        onPressAdd={() => { setEditWord(null); setShowAddWord(true); }}
        searchValue={search}
        onChangeSearch={handleSearch}
        searchPlaceholder={t('words.searchPlaceholder')}
        searchTestID="words-search"
        showSortMenu={showSortMenu}
        onToggleSortMenu={() => setShowSortMenu(!showSortMenu)}
        sortButtonTestID="words-sort-btn"
        sortIconTestID="words-sort-icon"
        currentSortLabel={currentSortLabel}
        countLabel={tc('words.count', words.length)}
        sortOptions={sortOptions}
        selectedSort={sort}
        selectedSortColor={colors.primary}
        selectedSortBackgroundColor={colors.primary}
        onSelectSort={(nextSort: SortKey) => {
          setSort(nextSort);
          setShowSortMenu(false);
        }}
      />

      <FlatList
        ref={listRef}
        testID="words-flatlist"
        data={sortedWords}
        keyExtractor={item => item.id.toString()}
        renderItem={renderWord}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name={search ? 'search-outline' : 'create-outline'} size={56} color={colors.textMuted} />}
            title={search ? t('words.emptySearchTitle') : t('words.emptyTitle')}
            subtitle={search ? t('words.emptySearchSubtitle', { search }) : t('words.emptySubtitle')}
            action={search ? undefined : { label: t('words.addFirstWord'), onPress: () => setShowAddWord(true), icon: <Ionicons name="add" size={16} color="#fff" /> }}
          />
        }
      />

      <AddWordModal
        visible={showAddWord}
        onClose={closeWordModal}
        onDeleted={closeWordModal}
        editWord={editWord}
        onEditDuplicate={(w) => { setShowAddWord(false); setTimeout(() => { setEditWord(w); setShowAddWord(true); }, 300); }}
      />

      <AddVariantModal
        visible={showAddVariant}
        onClose={() => { setShowAddVariant(false); setEditVariant(null); }}
        onSave={() => {}}
        onDeleted={() => { setShowAddVariant(false); setEditVariant(null); }}
        word={null}
        editVariant={editVariant}
      />

      <AddCategoryModal
        visible={showAddCategory || !!editCategory}
        onClose={() => { setShowAddCategory(false); setEditCategory(null); }}
        onSave={() => { setEditCategory(null); }}
        onDeleted={() => { setEditCategory(null); }}
        editCategory={editCategory}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  wordCard: { marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  wordMain: { flex: 1 },
  cardRight: { alignItems: 'flex-end', marginLeft: 8 },
  wordText: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  wordMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  wordDate: { fontSize: 12 },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  notePreview: { fontSize: 12, flex: 1 },
  variantChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  variantChipIcon: { marginRight: 3 },
  variantChipText: { fontSize: 11, fontWeight: '700' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, marginBottom: 5, borderWidth: 1, borderRadius: 8 },
  editBtnText: { fontSize: 12, fontWeight: '600' },
});
