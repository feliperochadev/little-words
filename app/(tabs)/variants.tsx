import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, Alert, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAllVariants, deleteVariant, getWords, Variant, Word } from '../../src/database/database';
import { COLORS } from '../../src/utils/theme';
import { Card, EmptyState, SearchBar } from '../../src/components/UIComponents';
import { AddVariantModal } from '../../src/components/AddVariantModal';

type SortKey = 'date_desc' | 'date_asc' | 'alpha_asc' | 'alpha_desc';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'date_desc', label: '📅 Mais recente' },
  { key: 'date_asc',  label: '📅 Mais antigo'  },
  { key: 'alpha_asc', label: '🔤 A → Z'         },
  { key: 'alpha_desc',label: '🔤 Z → A'         },
];

function sortVariants(variants: Variant[], sort: SortKey): Variant[] {
  return [...variants].sort((a, b) => {
    switch (sort) {
      case 'date_desc': return b.date_added.localeCompare(a.date_added);
      case 'date_asc':  return a.date_added.localeCompare(b.date_added);
      case 'alpha_asc': return a.variant.localeCompare(b.variant, 'pt');
      case 'alpha_desc':return b.variant.localeCompare(a.variant, 'pt');
    }
  });
}

export default function VariantsScreen() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [filteredVariants, setFilteredVariants] = useState<Variant[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('date_desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [editVariant, setEditVariant] = useState<Variant | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);

  const load = async () => {
    const data = await getAllVariants();
    setVariants(data);
    applySearch(data, search);
    const wordData = await getWords();
    setWords(wordData);
  };

  const applySearch = (data: Variant[], text: string) => {
    if (!text.trim()) {
      setFilteredVariants(data);
    } else {
      setFilteredVariants(data.filter(v =>
        v.variant.toLowerCase().includes(text.toLowerCase()) ||
        (v.main_word || '').toLowerCase().includes(text.toLowerCase())
      ));
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleSearch = (text: string) => { setSearch(text); applySearch(variants, text); };

  const handleDelete = (variant: Variant) => {
    Alert.alert('Remover Variante', `Remover "${variant.variant}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: async () => { await deleteVariant(variant.id); load(); } },
    ]);
  };

  const handleEditVariant = (variant: Variant) => {
    // Find the parent word so AddVariantModal has context
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
      <View style={styles.variantRow}>
        <View style={styles.variantLeft}>
          <View style={styles.variantBubble}>
            <Text style={styles.variantText}>"{item.variant}"</Text>
          </View>
          <View style={styles.arrowRow}>
            <Text style={styles.arrow}>→</Text>
            <Text style={styles.mainWord}>{item.main_word}</Text>
          </View>
          <Text style={styles.date}>📅 {formatDate(item.date_added)}</Text>
          {item.notes && <Text style={styles.notes} numberOfLines={2}>💬 {item.notes}</Text>}
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => handleEditVariant(item)} style={styles.actionBtn}>
            <Text style={styles.editIcon}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}>
            <Text style={styles.deleteIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>🗣️ Variantes</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => { setSelectedWord(null); setEditVariant(null); setShowAddVariant(true); }}>
          <Text style={styles.addBtnText}>+ Nova</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <SearchBar value={search} onChangeText={handleSearch} placeholder="Buscar variantes..." />
      </View>

      {/* Sort bar */}
      <View style={styles.sortBar}>
        <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSortMenu(!showSortMenu)}>
          <Text style={styles.sortBtnText}>{currentSortLabel} ▾</Text>
        </TouchableOpacity>
        <Text style={styles.countText}>{filteredVariants.length} variante{filteredVariants.length !== 1 ? 's' : ''}</Text>
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
          <Text style={styles.hint}>
            💡 Variantes são como a criança pronuncia cada palavra antes de aprender o correto
          </Text>
        }
        ListEmptyComponent={
          <EmptyState
            emoji="🗣️"
            title={search ? 'Nenhuma variante encontrada' : 'Nenhuma variante ainda'}
            subtitle={search ? `Não encontramos "${search}"` : 'Registre como o seu bebê pronuncia as palavras!'}
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
  addBtn: { backgroundColor: COLORS.secondary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, elevation: 4 },
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
  variantRow: { flexDirection: 'row', alignItems: 'flex-start' },
  variantLeft: { flex: 1 },
  variantBubble: {
    backgroundColor: COLORS.primaryLight + '30', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 16, alignSelf: 'flex-start', marginBottom: 6,
  },
  variantText: { fontSize: 18, fontWeight: '700', color: COLORS.primaryDark, fontStyle: 'italic' },
  arrowRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  arrow: { fontSize: 16, color: COLORS.textSecondary, marginRight: 6 },
  mainWord: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  date: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 2 },
  notes: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, lineHeight: 16 },
  cardActions: { flexDirection: 'column', gap: 4, marginLeft: 8 },
  actionBtn: { padding: 8, borderRadius: 8 },
  editIcon: { fontSize: 18 },
  deleteIcon: { fontSize: 18 },
  wordPickerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  wordPickerContainer: {
    backgroundColor: COLORS.background, borderTopLeftRadius: 28,
    borderTopRightRadius: 28, padding: 24, maxHeight: '70%',
  },
  wordPickerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 16, textAlign: 'center' },
  wordPickerItem: {
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  wordPickerItemText: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  wordPickerCat: { fontSize: 12, color: COLORS.textSecondary },
  wordPickerEmpty: { textAlign: 'center', color: COLORS.textSecondary, padding: 20 },
  wordPickerClose: {
    marginTop: 16, padding: 14, borderRadius: 16,
    backgroundColor: COLORS.border, alignItems: 'center',
  },
  wordPickerCloseText: { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary },
});