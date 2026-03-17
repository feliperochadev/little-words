import { withOpacity } from '../../src/utils/colorHelpers';
import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SearchBar, Card, CategoryBadge, EmptyState } from '../../src/components/UIComponents';
import { AddWordModal } from '../../src/components/AddWordModal';
import { AddVariantModal } from '../../src/components/AddVariantModal';
import { AddCategoryModal, CategoryToEdit } from '../../src/components/AddCategoryModal';
import { useI18n, useCategoryName } from '../../src/i18n/i18n';
import { sortWords, SortKey } from '../../src/utils/sortHelpers';
import { useWords } from '../../src/hooks/useWords';
import { useTheme } from '../../src/hooks/useTheme';
import type { Word, Variant } from '../../src/types/domain';

export default function WordsScreen() {
  const { t, tc } = useI18n();
  const categoryName = useCategoryName();
  const { colors } = useTheme();

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'date_desc', label: t('words.sortRecent') },
    { key: 'date_asc',  label: t('words.sortOldest') },
    { key: 'alpha_asc', label: t('words.sortAZ') },
    { key: 'alpha_desc',label: t('words.sortZA') },
  ];

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
  const { data: words = [], refetch } = useWords(search);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => { setRefreshing(true); try { await refetch(); } finally { setRefreshing(false); } };

  const handleSearch = (text: string) => { setSearch(text); };

  const closeWordModal = () => { setShowAddWord(false); setEditWord(null); };

  const formatDate = (date: string) => {
    if (!date) return '';
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  };

  const sortedWords = sortWords(words, sort);
  const currentSortLabel = SORT_OPTIONS.find(o => o.key === sort)?.label ?? '';

  const renderWord = ({ item, index }: { item: Word; index: number }) => (
    <Card style={[styles.wordCard]} testID={`word-item-${item.word}`}>
      <TouchableOpacity onPress={() => { setEditWord(item); setShowAddWord(true); }} activeOpacity={0.8}>
        <View style={styles.wordRow}>
          <View style={styles.wordMain}>
            <View style={styles.wordHeader}>
              <Text style={[styles.wordText, { color: colors.text }]} testID={`word-pos-${index}-${item.word}`}>{item.word}</Text>
              <Text style={[styles.wordDate, { color: colors.textSecondary }]} testID={`word-date-${item.word}`}>{formatDate(item.date_added)}</Text>
            </View>
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
            </View>
            {item.notes && (
              <View style={styles.noteRow}>
                <Ionicons name="document-text-outline" size={11} color={colors.textMuted} />
                <Text style={[styles.notePreview, { color: colors.textSecondary }]} numberOfLines={1}>{item.notes}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Card>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="book-outline" size={22} color={colors.primary} testID="words-title-icon" />
          <Text style={[styles.title, { color: colors.text }]}>{t('words.title')}</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
            onPress={() => { setEditWord(null); setShowAddWord(true); }}
            testID="words-add-btn"
          >
            <Text style={[styles.addBtnText, { color: colors.textOnPrimary }]}>{t('words.addWord')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <SearchBar value={search} onChangeText={handleSearch} placeholder={t('words.searchPlaceholder')} testID="words-search" />
      </View>

      <View style={styles.sortBar}>
        <TouchableOpacity style={[styles.sortBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowSortMenu(!showSortMenu)} testID="words-sort-btn">
          <View style={styles.sortBtnContent}>
            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} style={styles.sortBtnIcon} testID="words-sort-icon" />
            <Text style={[styles.sortBtnText, { color: colors.text }]}>{currentSortLabel} ▾</Text>
          </View>
        </TouchableOpacity>
        <Text style={[styles.countText, { color: colors.textSecondary }]}>{tc('words.count', words.length)}</Text>
      </View>

      {showSortMenu && (
        <View style={[styles.sortMenu, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.text }]}>
          {SORT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.sortMenuItem, { borderBottomColor: colors.border }, sort === opt.key && { backgroundColor: withOpacity(colors.primary, '10') }]}
              onPress={() => { setSort(opt.key); setShowSortMenu(false); }}
              testID={`sort-option-${opt.key}`}
            >
              <Text style={[styles.sortMenuText, { color: colors.text }, sort === opt.key && { color: colors.primary, fontWeight: '700' }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
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
            action={search ? undefined : { label: t('words.addFirstWord'), onPress: () => setShowAddWord(true) }}
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
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 26, fontWeight: '900' },
  headerButtons: { flexDirection: 'row', gap: 8 },
  addBtn: {
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  addBtnText: { fontWeight: '700', fontSize: 15 },
  searchContainer: { paddingHorizontal: 20 },
  sortBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 6,
  },
  sortBtn: {
    borderRadius: 12, borderWidth: 1.5,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  sortBtnContent: { flexDirection: 'row', alignItems: 'center' },
  sortBtnIcon: { marginRight: 6 },
  sortBtnText: { fontSize: 13, fontWeight: '600' },
  countText: { fontSize: 12 },
  sortMenu: {
    marginHorizontal: 20, borderRadius: 14,
    borderWidth: 1.5,
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
    marginBottom: 6, overflow: 'hidden',
  },
  sortMenuItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  sortMenuText: { fontSize: 14 },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  wordCard: { marginBottom: 10 },
  wordRow: { flexDirection: 'row', alignItems: 'flex-start' },
  wordMain: { flex: 1 },
  wordHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 },
  wordText: { fontSize: 20, fontWeight: '800' },
  wordMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  wordDate: { fontSize: 12 },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  notePreview: { fontSize: 12, flex: 1 },
  variantChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  variantChipIcon: { marginRight: 3 },
  variantChipText: { fontSize: 11, fontWeight: '700' },
});
