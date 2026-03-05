import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getWords, deleteWord, getVariantsByWord, deleteVariant,
  Word, Variant,
} from '../../src/database/database';
import { COLORS } from '../../src/utils/theme';
import { SearchBar, Card, CategoryBadge, EmptyState } from '../../src/components/UIComponents';
import { AddWordModal } from '../../src/components/AddWordModal';
import { AddVariantModal } from '../../src/components/AddVariantModal';
import { AddCategoryModal } from '../../src/components/AddCategoryModal';
import { performSync, isGoogleConnected } from '../../src/utils/googleDrive';

type SortKey = 'date_desc' | 'date_asc' | 'alpha_asc' | 'alpha_desc';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'date_desc', label: '📅 Mais recente' },
  { key: 'date_asc',  label: '📅 Mais antigo'  },
  { key: 'alpha_asc', label: '🔤 A → Z'         },
  { key: 'alpha_desc',label: '🔤 Z → A'         },
];

function sortWords(words: Word[], sort: SortKey): Word[] {
  return [...words].sort((a, b) => {
    switch (sort) {
      case 'date_desc': return b.date_added.localeCompare(a.date_added);
      case 'date_asc':  return a.date_added.localeCompare(b.date_added);
      case 'alpha_asc': return a.word.localeCompare(b.word, 'pt');
      case 'alpha_desc':return b.word.localeCompare(a.word, 'pt');
    }
  });
}

export default function WordsScreen() {
  const [words, setWords] = useState<Word[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('date_desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddWord, setShowAddWord] = useState(false);
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editWord, setEditWord] = useState<Word | null>(null);
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [editVariant, setEditVariant] = useState<Variant | null>(null);
  const [expandedWord, setExpandedWord] = useState<number | null>(null);
  const [expandedVariants, setExpandedVariants] = useState<Record<number, Variant[]>>({});

  const load = async (searchQuery?: string) => {
    const data = await getWords(searchQuery ?? search);
    setWords(data);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const handleExpand = async (wordId: number, isExpanded: boolean) => {
    if (isExpanded) {
      setExpandedWord(null);
    } else {
      setExpandedWord(wordId);
      if (!expandedVariants[wordId]) {
        const variants = await getVariantsByWord(wordId);
        setExpandedVariants(prev => ({ ...prev, [wordId]: variants }));
      }
    }
  };

  const reloadVariants = async (wordId: number) => {
    const variants = await getVariantsByWord(wordId);
    setExpandedVariants(prev => ({ ...prev, [wordId]: variants }));
    await load();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleSearch = (text: string) => {
    setSearch(text);
    load(text);
  };

  const handleDelete = (word: Word) => {
    Alert.alert(
      'Remover Palavra',
      `Tem certeza que quer remover "${word.word}"? Todas as variantes também serão removidas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover', style: 'destructive',
          onPress: async () => {
            await deleteWord(word.id);
            load();
            const connected = await isGoogleConnected();
            if (connected) performSync();
          },
        },
      ]
    );
  };

  const handleDeleteVariant = (variant: Variant, wordId: number) => {
    Alert.alert('Remover Variante', `Remover "${variant.variant}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive',
        onPress: async () => { await deleteVariant(variant.id); reloadVariants(wordId); },
      },
    ]);
  };

  const handleSaved = async () => {
    await load();
    if (expandedWord) reloadVariants(expandedWord);
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
    const isExpanded = expandedWord === item.id;
    const variants = expandedVariants[item.id] || [];

    return (
      <Card style={[styles.wordCard, isExpanded && styles.wordCardExpanded]}>
        <TouchableOpacity onPress={() => handleExpand(item.id, isExpanded)} activeOpacity={0.8}>
          <View style={styles.wordRow}>
            <View style={styles.wordMain}>
              <Text style={styles.wordText}>{item.word}</Text>
              <View style={styles.wordMeta}>
                {item.category_name && (
                  <CategoryBadge
                    name={item.category_name}
                    color={item.category_color || COLORS.primary}
                    emoji={item.category_emoji || '📝'}
                    size="small"
                  />
                )}
                <Text style={styles.wordDate}>📅 {formatDate(item.date_added)}</Text>
                {(item.variant_count ?? 0) > 0 && (
                  <View style={styles.variantBadge}>
                    <Text style={styles.variantBadgeText}>🗣️ {item.variant_count}</Text>
                  </View>
                )}
              </View>
              {item.notes && !isExpanded && (
                <Text style={styles.notePreview} numberOfLines={1}>💬 {item.notes}</Text>
              )}
            </View>
            <Text style={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</Text>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
            {item.notes && (
              <View style={styles.notesBox}>
                <Text style={styles.notesLabel}>Observações</Text>
                <Text style={styles.notesText}>{item.notes}</Text>
              </View>
            )}

            {/* Inline variants */}
            {variants.length > 0 && (
              <View style={styles.variantsSection}>
                <Text style={styles.variantsSectionTitle}>🗣️ Variantes</Text>
                {variants.map(v => (
                  <View key={v.id} style={styles.variantRow}>
                    <View style={styles.variantInfo}>
                      <Text style={styles.variantText}>"{v.variant}"</Text>
                      <Text style={styles.variantDate}>📅 {formatDate(v.date_added)}</Text>
                      {v.notes && <Text style={styles.variantNotes} numberOfLines={1}>💬 {v.notes}</Text>}
                    </View>
                    <View style={styles.variantActions}>
                      <TouchableOpacity
                        style={styles.variantActionBtn}
                        onPress={() => {
                          setEditVariant(v);
                          setSelectedWord(item);
                          setShowAddVariant(true);
                        }}
                      >
                        <Text style={styles.variantActionEdit}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.variantActionBtn}
                        onPress={() => handleDeleteVariant(v, item.id)}
                      >
                        <Text style={styles.variantActionDelete}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: COLORS.secondary + '20' }]}
                onPress={() => { setEditVariant(null); setSelectedWord(item); setShowAddVariant(true); }}
              >
                <Text style={[styles.actionBtnText, { color: COLORS.secondary }]}>🗣️ + Variante</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: COLORS.accent + '20' }]}
                onPress={() => { setEditWord(item); setShowAddWord(true); }}
              >
                <Text style={[styles.actionBtnText, { color: COLORS.accent }]}>✏️ Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: COLORS.error + '20' }]}
                onPress={() => handleDelete(item)}
              >
                <Text style={[styles.actionBtnText, { color: COLORS.error }]}>🗑️ Remover</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>📚 Palavras</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.addBtn, styles.addCategoryBtn]}
            onPress={() => setShowAddCategory(true)}
          >
            <Text style={styles.addCategoryBtnText}>+ Categoria</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => { setEditWord(null); setShowAddWord(true); }}
          >
            <Text style={styles.addBtnText}>+ Nova</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <SearchBar value={search} onChangeText={handleSearch} placeholder="Buscar palavras..." />
      </View>

      {/* Sort bar */}
      <View style={styles.sortBar}>
        <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSortMenu(!showSortMenu)}>
          <Text style={styles.sortBtnText}>{currentSortLabel} ▾</Text>
        </TouchableOpacity>
        <Text style={styles.countText}>{words.length} palavra{words.length !== 1 ? 's' : ''}</Text>
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
            title={search ? 'Nenhuma palavra encontrada' : 'Nenhuma palavra ainda'}
            subtitle={search ? `Não encontramos "${search}"` : 'Adicione a primeira palavrinha do seu bebê!'}
            action={!search ? { label: '+ Adicionar Palavra', onPress: () => setShowAddWord(true) } : undefined}
          />
        }
      />

      <AddWordModal
        visible={showAddWord}
        onClose={() => { setShowAddWord(false); setEditWord(null); }}
        onSave={handleSaved}
        editWord={editWord}
      />

      <AddVariantModal
        visible={showAddVariant}
        onClose={() => { setShowAddVariant(false); setEditVariant(null); }}
        onSave={handleSaved}
        word={selectedWord}
        editVariant={editVariant}
      />

      <AddCategoryModal
        visible={showAddCategory}
        onClose={() => setShowAddCategory(false)}
        onSave={handleSaved}
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
  wordCardExpanded: { borderWidth: 1.5, borderColor: COLORS.primaryLight },
  wordRow: { flexDirection: 'row', alignItems: 'flex-start' },
  wordMain: { flex: 1 },
  wordText: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
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
  variantsSectionTitle: { fontSize: 11, fontWeight: '700', color: COLORS.secondary, marginBottom: 8, textTransform: 'uppercase' },
  variantRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: 10,
    padding: 10, marginBottom: 6,
  },
  variantInfo: { flex: 1 },
  variantText: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  variantDate: { fontSize: 11, color: COLORS.textSecondary },
  variantNotes: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  variantActions: { flexDirection: 'row', gap: 4 },
  variantActionBtn: { padding: 6, borderRadius: 8 },
  variantActionEdit: { fontSize: 16 },
  variantActionDelete: { fontSize: 16 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
  actionBtnText: { fontSize: 12, fontWeight: '700' },
});