import { withOpacity } from '../../src/utils/colorHelpers';
import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Variant, Word } from '../../src/types/domain';
import { Card, EmptyState, SearchBar } from '../../src/components/UIComponents';
import { AddVariantModal } from '../../src/components/AddVariantModal';
import { useI18n } from '../../src/i18n/i18n';
import { sortVariants, SortKey } from '../../src/utils/sortHelpers';
import { useAllVariants } from '../../src/hooks/useVariants';
import { useWords } from '../../src/hooks/useWords';
import { useTheme } from '../../src/hooks/useTheme';

const EMPTY_VARIANTS: Variant[] = [];
const EMPTY_WORDS: Word[] = [];

export default function VariantsScreen() {
  const { t, tc } = useI18n();
  const { colors } = useTheme();

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'date_desc', label: t('words.sortRecent') },
    { key: 'date_asc',  label: t('words.sortOldest') },
    { key: 'alpha_asc', label: t('words.sortAZ') },
    { key: 'alpha_desc',label: t('words.sortZA') },
  ];

  const { data: variants = EMPTY_VARIANTS, refetch: refetchVariants } = useAllVariants();
  const { data: words = EMPTY_WORDS } = useWords();

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('date_desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [editVariant, setEditVariant] = useState<Variant | null>(null);
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);

  const onRefresh = async () => { setRefreshing(true); try { await refetchVariants(); } finally { setRefreshing(false); } };

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

  const formatDate = (date: string) => {
    if (!date) return '';
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  };

  const currentSortLabel = SORT_OPTIONS.find(o => o.key === sort)?.label ?? '';
  const sorted = sortVariants(filtered, sort);

  const renderVariant = ({ item, index }: { item: Variant; index: number }) => (
    <Card style={styles.variantCard} testID={`variant-pos-${index}-${item.variant}`}>
      <TouchableOpacity onPress={() => handleEditVariant(item)} activeOpacity={0.8} testID={`variant-item-${item.variant}`}>
        <View style={styles.variantRow}>
          <View style={[styles.variantBubble, { backgroundColor: withOpacity(colors.primaryLight, '30') }]}>
            <Text style={[styles.variantText, { color: colors.primaryDark }]}>&ldquo;{item.variant}&rdquo;</Text>
          </View>
          <View style={styles.variantMeta}>
            <Text style={[styles.arrow, { color: colors.textSecondary }]}>→</Text>
            <Text style={[styles.mainWord, { color: colors.text }]}>{item.main_word}</Text>
            <Text style={[styles.date, { color: colors.textSecondary }]}>{formatDate(item.date_added)}</Text>
          </View>
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
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('variants.title')}</Text>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]} onPress={() => { setSelectedWord(null); setEditVariant(null); setShowAddVariant(true); }}>
          <Text style={[styles.addBtnText, { color: colors.textOnPrimary }]}>{t('variants.addNew')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <SearchBar value={search} onChangeText={handleSearch} placeholder={t('variants.searchPlaceholder')} testID="variants-search" />
      </View>

      <View style={styles.sortBar}>
        <TouchableOpacity style={[styles.sortBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowSortMenu(!showSortMenu)} testID="variants-sort-btn">
          <Text style={[styles.sortBtnText, { color: colors.text }]}>{currentSortLabel} ▾</Text>
        </TouchableOpacity>
        <Text style={[styles.countText, { color: colors.textSecondary }]}>{tc('variants.count', filtered.length)}</Text>
      </View>

      {showSortMenu && (
        <View style={[styles.sortMenu, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.text }]}>
          {SORT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.sortMenuItem, { borderBottomColor: colors.border }, sort === opt.key && { backgroundColor: withOpacity(colors.secondary, '15') }]}
              onPress={() => { setSort(opt.key); setShowSortMenu(false); }}
              testID={`sort-option-${opt.key}`}
            >
              <Text style={[styles.sortMenuText, { color: colors.text }, sort === opt.key && { color: colors.secondary, fontWeight: '700' }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        data={sorted}
        keyExtractor={item => item.id.toString()}
        renderItem={renderVariant}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
        ListHeaderComponent={
          <Text style={[styles.hint, { backgroundColor: withOpacity(colors.secondary, '15'), color: colors.textSecondary }]}>{t('variants.hint')}</Text>
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
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8,
  },
  title: { fontSize: 26, fontWeight: '900' },
  addBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
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
  hint: {
    fontSize: 13, padding: 12, borderRadius: 12, marginBottom: 12, lineHeight: 18,
  },
  variantCard: { marginBottom: 10 },
  variantRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  variantBubble: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 16,
  },
  variantText: { fontSize: 18, fontWeight: '700', fontStyle: 'italic' },
  variantMeta: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6, flexWrap: 'wrap' },
  arrow: { fontSize: 14 },
  mainWord: { fontSize: 15, fontWeight: '700' },
  date: { fontSize: 12, flex: 1, textAlign: 'right' },
  notesRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  notes: { fontSize: 12, flex: 1, lineHeight: 16 },
});
