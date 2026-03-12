import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../src/utils/theme';
import { SearchBar, Card, CategoryBadge, EmptyState } from '../../src/components/UIComponents';
import { AddWordModal } from '../../src/components/AddWordModal';
import { AddVariantModal } from '../../src/components/AddVariantModal';
import { AddCategoryModal, CategoryToEdit } from '../../src/components/AddCategoryModal';
import { useI18n, useCategoryName } from '../../src/i18n/i18n';
import { sortWords, SortKey } from '../../src/utils/sortHelpers';
import { useWords } from '../../src/hooks/useWords';
import type { Word, Variant } from '../../src/database/database';

export default function WordsScreen() {
  const { t, tc } = useI18n();
  const categoryName = useCategoryName();

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
              <Text style={styles.wordText} testID={`word-pos-${index}-${item.word}`}>{item.word}</Text>
              <Text style={styles.wordDate} testID={`word-date-${item.word}`}>{formatDate(item.date_added)}</Text>
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
                    color: item.category_color || COLORS.primary,
                    emoji: item.category_emoji || '🏷️',
                  })}
                  delayLongPress={400}
                  activeOpacity={1}
                >
                  <CategoryBadge
                    name={categoryName(categoryNameValue)}
                    color={item.category_color || COLORS.primary}
                    emoji={item.category_emoji || '📝'}
                    size="small"
                  />
                </TouchableOpacity>
                );
              })()}
              {item.variant_texts?.split('|||').map((v) => (
                <View key={v} style={styles.variantChip} testID={`word-variant-chip-${v}`}>
                  <Text style={styles.variantChipText}>🗣️ {v}</Text>
                </View>
              ))}
            </View>
            {item.notes && (
              <Text style={styles.notePreview} numberOfLines={1}>💬 {item.notes}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('words.title')}</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => { setEditWord(null); setShowAddWord(true); }}
          >
            <Text style={styles.addBtnText}>{t('words.addWord')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <SearchBar value={search} onChangeText={handleSearch} placeholder={t('words.searchPlaceholder')} testID="words-search" />
      </View>

      <View style={styles.sortBar}>
        <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSortMenu(!showSortMenu)} testID="words-sort-btn">
          <Text style={styles.sortBtnText}>{currentSortLabel} ▾</Text>
        </TouchableOpacity>
        <Text style={styles.countText}>{tc('words.count', words.length)}</Text>
      </View>

      {showSortMenu && (
        <View style={styles.sortMenu}>
          {SORT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.sortMenuItem, sort === opt.key && styles.sortMenuItemActive]}
              onPress={() => { setSort(opt.key); setShowSortMenu(false); }}
              testID={`sort-option-${opt.key}`}
            >
              <Text style={[styles.sortMenuText, sort === opt.key && styles.sortMenuTextActive]}>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          <EmptyState
            emoji={search ? '🔍' : '📝'}
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
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8,
  },
  title: { fontSize: 26, fontWeight: '900', color: COLORS.text },
  headerButtons: { flexDirection: 'row', gap: 8 },
  addBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 20, shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  addBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  searchContainer: { paddingHorizontal: 20 },
  sortBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 6,
  },
  sortBtn: {
    backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1.5,
    borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 6,
  },
  sortBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  countText: { fontSize: 12, color: COLORS.textSecondary },
  sortMenu: {
    marginHorizontal: 20, backgroundColor: COLORS.white, borderRadius: 14,
    borderWidth: 1.5, borderColor: COLORS.border,
    shadowColor: COLORS.text, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
    marginBottom: 6, overflow: 'hidden',
  },
  sortMenuItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sortMenuItemActive: { backgroundColor: COLORS.primary + '10' },
  sortMenuText: { fontSize: 14, color: COLORS.text },
  sortMenuTextActive: { color: COLORS.primary, fontWeight: '700' },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  wordCard: { marginBottom: 10 },
  wordRow: { flexDirection: 'row', alignItems: 'flex-start' },
  wordMain: { flex: 1 },
  wordHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 },
  wordText: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  wordMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  wordDate: { fontSize: 12, color: COLORS.textSecondary },
  notePreview: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  variantChip: { backgroundColor: COLORS.secondary + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  variantChipText: { fontSize: 11, color: COLORS.secondary, fontWeight: '700' },
});
