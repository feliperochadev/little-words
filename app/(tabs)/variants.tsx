import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAllVariants, getWords, Variant, Word } from '../../src/database/database';
import { COLORS } from '../../src/utils/theme';
import { Card, EmptyState, SearchBar } from '../../src/components/UIComponents';
import { AddVariantModal } from '../../src/components/AddVariantModal';
import { useI18n } from '../../src/i18n/i18n';
import { sortVariants, SortKey } from '../../src/utils/sortHelpers';

export default function VariantsScreen() {
  const { t, tc } = useI18n();

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'date_desc', label: t('words.sortRecent') },
    { key: 'date_asc',  label: t('words.sortOldest') },
    { key: 'alpha_asc', label: t('words.sortAZ') },
    { key: 'alpha_desc',label: t('words.sortZA') },
  ];

  const [variants, setVariants] = useState<Variant[]>([]);
  const [filteredVariants, setFilteredVariants] = useState<Variant[]>([]);
  const [search, setSearch] = useState('');
  const searchRef = useRef(search);
  searchRef.current = search;
  const [sort, setSort] = useState<SortKey>('date_desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [editVariant, setEditVariant] = useState<Variant | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);

  const applySearch = useCallback((data: Variant[], text: string) => {
    if (!text.trim()) {
      setFilteredVariants(data);
    } else {
      setFilteredVariants(data.filter(v =>
        v.variant.toLowerCase().includes(text.toLowerCase()) ||
        (v.main_word || '').toLowerCase().includes(text.toLowerCase())
      ));
    }
  }, []);

  const load = useCallback(async () => {
    const data = await getAllVariants();
    setVariants(data);
    applySearch(data, searchRef.current);
    const wordData = await getWords();
    setWords(wordData);
  }, [applySearch]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleSearch = (text: string) => { setSearch(text); applySearch(variants, text); };

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
  const sorted = sortVariants(filteredVariants, sort);

  const renderVariant = ({ item }: { item: Variant }) => (
    <Card style={styles.variantCard}>
      <TouchableOpacity onPress={() => handleEditVariant(item)} activeOpacity={0.8}>
        <View style={styles.variantRow}>
          <View style={styles.variantBubble}>
            <Text style={styles.variantText}>&ldquo;{item.variant}&rdquo;</Text>
          </View>
          <View style={styles.variantMeta}>
            <Text style={styles.arrow}>→</Text>
            <Text style={styles.mainWord}>{item.main_word}</Text>
            <Text style={styles.date}>{formatDate(item.date_added)}</Text>
          </View>
        </View>
        {item.notes && <Text style={styles.notes} numberOfLines={2}>💬 {item.notes}</Text>}
      </TouchableOpacity>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('variants.title')}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => { setSelectedWord(null); setEditVariant(null); setShowAddVariant(true); }}>
          <Text style={styles.addBtnText}>{t('variants.addNew')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <SearchBar value={search} onChangeText={handleSearch} placeholder={t('variants.searchPlaceholder')} />
      </View>

      <View style={styles.sortBar}>
        <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSortMenu(!showSortMenu)}>
          <Text style={styles.sortBtnText}>{currentSortLabel} ▾</Text>
        </TouchableOpacity>
        <Text style={styles.countText}>{tc('variants.count', filteredVariants.length)}</Text>
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
        data={sorted}
        keyExtractor={item => item.id.toString()}
        renderItem={renderVariant}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.secondary} />}
        ListHeaderComponent={
          <Text style={styles.hint}>{t('variants.hint')}</Text>
        }
        ListEmptyComponent={
          <EmptyState
            emoji="🗣️"
            title={search ? t('variants.emptySearchTitle') : t('variants.emptyTitle')}
            subtitle={search ? t('variants.emptySearchSubtitle', { search }) : t('variants.emptySubtitle')}
          />
        }
      />

      <AddVariantModal
        visible={showAddVariant}
        onClose={() => { setShowAddVariant(false); setEditVariant(null); }}
        onSave={load}
        word={selectedWord}
        editVariant={editVariant}
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
  addBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
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
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
    marginBottom: 6, overflow: 'hidden',
  },
  sortMenuItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sortMenuItemActive: { backgroundColor: COLORS.secondary + '15' },
  sortMenuText: { fontSize: 14, color: COLORS.text },
  sortMenuTextActive: { color: COLORS.secondary, fontWeight: '700' },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  hint: {
    fontSize: 13, color: COLORS.textSecondary, backgroundColor: COLORS.secondary + '15',
    padding: 12, borderRadius: 12, marginBottom: 12, lineHeight: 18,
  },
  variantCard: { marginBottom: 10 },
  variantRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  variantBubble: {
    backgroundColor: COLORS.primaryLight + '30', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 16,
  },
  variantText: { fontSize: 18, fontWeight: '700', color: COLORS.primaryDark, fontStyle: 'italic' },
  variantMeta: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6, flexWrap: 'wrap' },
  arrow: { fontSize: 14, color: COLORS.textSecondary },
  mainWord: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  date: { fontSize: 12, color: COLORS.textSecondary, flex: 1, textAlign: 'right' },
  notes: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, lineHeight: 16 },
});