import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getWords, deleteWord, deleteVariant,
  Word, Variant,
} from '../../src/database/database';
import { COLORS } from '../../src/utils/theme';
import { SearchBar, Card, CategoryBadge, EmptyState } from '../../src/components/UIComponents';
import { AddWordModal } from '../../src/components/AddWordModal';
import { AddVariantModal } from '../../src/components/AddVariantModal';
import { AddCategoryModal, CategoryToEdit } from '../../src/components/AddCategoryModal';
import { performSync, isGoogleConnected } from '../../src/utils/googleDrive';
import { useI18n, useCategoryName } from '../../src/i18n/i18n';

type SortKey = 'date_desc' | 'date_asc' | 'alpha_asc' | 'alpha_desc';

function sortWords(words: Word[], sort: SortKey): Word[] {
  return [...words].sort((a, b) => {
    switch (sort) {
      case 'date_desc': return b.date_added.localeCompare(a.date_added);
      case 'date_asc':  return a.date_added.localeCompare(b.date_added);
      case 'alpha_asc': return a.word.localeCompare(b.word);
      case 'alpha_desc':return b.word.localeCompare(a.word);
    }
  });
}

export default function WordsScreen() {
  const { t, tc, locale } = useI18n();
  const categoryName = useCategoryName();

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'date_desc', label: t('words.sortRecent') },
    { key: 'date_asc',  label: t('words.sortOldest') },
    { key: 'alpha_asc', label: t('words.sortAZ') },
    { key: 'alpha_desc',label: t('words.sortZA') },
  ];

  const [words, setWords] = useState<Word[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('date_desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddWord, setShowAddWord] = useState(false);
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editCategory, setEditCategory] = useState<CategoryToEdit | null>(null);
  const [editWord, setEditWord] = useState<Word | null>(null);
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [editVariant, setEditVariant] = useState<Variant | null>(null);

  const load = async (searchQuery?: string) => {
    const data = await getWords(searchQuery ?? search);
    setWords(data);
  };

  useFocusEffect(useCallback(() => { load(); }, []));



  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleSearch = (text: string) => { setSearch(text); load(text); };



  const handleSaved = async () => {
    await load();
    const connected = await isGoogleConnected();
    if (connected) performSync();
  };

  const formatDate = (date: string) => {
    if (!date) return '';
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  };

  const sortedWords = sortWords(words, sort);
  const currentSortLabel = SORT_OPTIONS.find(o => o.key === sort)?.label ?? '';

  const renderWord = ({ item }: { item: Word }) => {

    return (
      <Card style={[styles.wordCard]}>
        <TouchableOpacity onPress={() => { setEditWord(item); setShowAddWord(true); }} activeOpacity={0.8}>
          <View style={styles.wordRow}>
            <View style={styles.wordMain}>
              <View style={styles.wordHeader}>
                <TouchableOpacity onPress={() => { setEditWord(item); setShowAddWord(true); }} hitSlop={{ top: 4, bottom: 4 }}>
                  <Text style={styles.wordText}>{item.word}</Text>
                </TouchableOpacity>
                <Text style={styles.wordDate}>{formatDate(item.date_added)}</Text>
              </View>
              <View style={styles.wordMeta}>
                {item.category_name && (
                  <TouchableOpacity
                    onLongPress={() => setEditCategory({
                      id: item.category_id!,
                      name: categoryName(item.category_name!),
                      color: item.category_color || COLORS.primary,
                      emoji: item.category_emoji || '🏷️',
                    })}
                    delayLongPress={400}
                    activeOpacity={1}
                  >
                    <CategoryBadge
                      name={categoryName(item.category_name)}
                      color={item.category_color || COLORS.primary}
                      emoji={item.category_emoji || '📝'}
                      size="small"
                    />
                  </TouchableOpacity>
                )}
                {item.variant_texts && item.variant_texts.split('|||').map((v, i) => (
                  <View key={i} style={styles.variantChip}>
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
  };

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
        <SearchBar value={search} onChangeText={handleSearch} placeholder={t('words.searchPlaceholder')} />
      </View>

      <View style={styles.sortBar}>
        <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSortMenu(!showSortMenu)}>
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
            action={!search ? { label: t('words.addFirstWord'), onPress: () => setShowAddWord(true) } : undefined}
          />
        }
      />

      <AddWordModal
        visible={showAddWord}
        onClose={() => { setShowAddWord(false); setEditWord(null); }}
        onSave={handleSaved}
        onDeleted={() => { setShowAddWord(false); setEditWord(null); load(); }}
        editWord={editWord}
        onEditDuplicate={(w) => { setShowAddWord(false); setTimeout(() => { setEditWord(w); setShowAddWord(true); }, 300); }}
      />

      <AddVariantModal
        visible={showAddVariant}
        onClose={() => { setShowAddVariant(false); setEditVariant(null); }}
        onSave={handleSaved}
        onDeleted={() => { setShowAddVariant(false); setEditVariant(null); load(); }}
        word={selectedWord}
        editVariant={editVariant}
      />

      <AddCategoryModal
        visible={showAddCategory || !!editCategory}
        onClose={() => { setShowAddCategory(false); setEditCategory(null); }}
        onSave={() => { load(); setEditCategory(null); }}
        onDeleted={() => { load(); setEditCategory(null); }}
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
  addCategoryBtn: { backgroundColor: COLORS.white, borderWidth: 2, borderColor: COLORS.primary, shadowOpacity: 0.1 },
  addCategoryBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
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
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
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
  variantBadge: { backgroundColor: COLORS.secondary + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  variantBadgeText: { fontSize: 11, color: COLORS.secondary, fontWeight: '700' },
  expandIcon: { fontSize: 12, color: COLORS.textLight, marginLeft: 8, marginTop: 4 },
  expandedContent: { marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  notesBox: { backgroundColor: COLORS.background, borderRadius: 10, padding: 12, marginBottom: 12 },
  notesLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 4 },
  notesText: { fontSize: 13, color: COLORS.text, lineHeight: 18 },
  notePreview: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  variantsSection: {
    backgroundColor: COLORS.secondary + '0D', borderRadius: 12,
    padding: 10, marginBottom: 12,
  },
  variantsSectionTitle: { fontSize: 11, fontWeight: '700', color: COLORS.secondary, marginBottom: 8 },
  variantRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: 10,
    padding: 10, marginBottom: 6,
  },
  variantInfo: { flex: 1 },
  variantText: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  variantDate: { fontSize: 11, color: COLORS.textSecondary },
  variantNotes: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
  actionBtnText: { fontSize: 12, fontWeight: '700' },
  variantChip: { backgroundColor: COLORS.secondary + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  variantChipText: { fontSize: 11, color: COLORS.secondary, fontWeight: '700' },
});