import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  StyleSheet, ScrollView, Alert, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { layout } from '../theme/layout';
import { withOpacity } from '../utils/colorHelpers';
import { useTheme } from '../hooks/useTheme';
import { findWordByName } from '../services/wordService';
import type { Word, Variant, Category } from '../types/domain';
import * as variantService from '../services/variantService';
import { Button, CategoryBadge } from './UIComponents';
import { AddCategoryModal, CategoryToEdit } from './AddCategoryModal';
import { DatePickerField } from './DatePickerField';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n, useCategoryName } from '../i18n/i18n';
import { useQueryClient } from '@tanstack/react-query';
import { VARIANT_MUTATION_KEYS, CATEGORY_MUTATION_KEYS } from '../hooks/queryKeys';
import { useCategories } from '../hooks/useCategories';
import { useVariantsByWord, useUpdateVariant, useDeleteVariant } from '../hooks/useVariants';
import { useAddWord, useUpdateWord, useDeleteWord } from '../hooks/useWords';
import { useModalAnimation } from '../hooks/useModalAnimation';
import { TIMING } from '../utils/animationConstants';
import { MediaChips } from './MediaChips';
import { useMediaCapture } from '../hooks/useMediaCapture';

// Stable empty arrays to avoid creating new references on every render
const EMPTY_CATEGORIES: Category[] = [];
const EMPTY_VARIANTS: Variant[] = [];

interface AddWordModalProps {
  visible: boolean;
  onClose: () => void;
  onSave?: () => void;
  onDeleted?: () => void;
  editWord?: Word | null;
  onEditDuplicate?: (word: Word) => void;
}

interface VariantEntry {
  key: string;
  text: string;
}

export function AddWordModal({ visible, onClose, onSave, onDeleted, editWord, onEditDuplicate }: Readonly<AddWordModalProps>) {
  const { t } = useI18n();
  const categoryName = useCategoryName();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const today = new Date().toISOString().split('T')[0];
  const queryClient = useQueryClient();
  const {
    phase,
    pendingMedia,
    prefilledWordName,
    onWordCreated,
    resetCapture,
  } = useMediaCapture();

  // Server state via hooks
  const { data: categories = EMPTY_CATEGORIES } = useCategories();
  const { data: fetchedVariants = EMPTY_VARIANTS } = useVariantsByWord(editWord?.id, visible && !!editWord);
  const addWordMutation = useAddWord();
  const updateWordMutation = useUpdateWord();
  const deleteWordMutation = useDeleteWord();
  const updateVariantMutation = useUpdateVariant();
  const deleteVariantMutation = useDeleteVariant();

  const handleDelete = () => {
    if (!editWord) return;
    Alert.alert(
      t('words.deleteTitle'),
      t('words.deleteMessage', { word: editWord.word }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.remove'), style: 'destructive', onPress: () => { void deleteWordMutation.mutateAsync({ id: editWord.id }).then(() => { onClose(); onDeleted?.(); }); }},
      ]
    );
  };

  const [word, setWord]                         = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [dateAdded, setDateAdded]               = useState(today);
  const [notes, setNotes]                       = useState('');
  const [editCategory, setEditCategory]         = useState<CategoryToEdit | null>(null);
  const [showNewCategory, setShowNewCategory]   = useState(false);
  const [loading, setLoading]                   = useState(false);
  const [duplicate, setDuplicate]               = useState<Word | null>(null);
  const [variants, setVariants]                 = useState<VariantEntry[]>([]);
  const [existingVariants, setExistingVariants] = useState<Variant[]>([]);
  const [editingVariantIds, setEditingVariantIds]   = useState<Set<number>>(new Set());
  const [editingVariantTexts, setEditingVariantTexts] = useState<Record<number, string>>({});

  // Modal animation and gesture handling
  const handleClose = () => {
    if (phase === 'creating-word') {
      resetCapture();
    }
    onClose();
  };
  const { translateY, backdropOpacity, dismissModal, panResponder } = useModalAnimation(visible, handleClose);

  const catScrollRef = useRef<ScrollView>(null);
  const catScrollWidth = useRef(0);
  const catContentWidth = useRef(0);
  const catScrollX = useRef(0);
  const [catScrolled, setCatScrolled] = useState(false);
  const [catAtEnd, setCatAtEnd] = useState(false);
  const nextVariantKeyRef = useRef(0);
  const catItemWidth = 110; // approximate chip width + gap

  // Sync fetched variants into local editable state when modal opens or data arrives
  useEffect(() => {
    if (visible && editWord) {
      setExistingVariants(fetchedVariants);
    }
  }, [fetchedVariants, visible, editWord]);

  // Initialize form state when modal opens or editWord changes.
  // NOTE: `categories` is intentionally excluded — it must not reset form fields when TQ loads.
  useEffect(() => {
    if (!visible) return;
    if (editWord) {
      setWord(editWord.word);
      setSelectedCategory(editWord.category_id);
      setDateAdded(editWord.date_added);
      setNotes(editWord.notes || '');
      setVariants([]);
    } else {
      setWord(prefilledWordName || ''); setSelectedCategory(null);
      setDateAdded(today); setNotes(''); setVariants([]);
      setExistingVariants([]);
      setCatScrolled(false);
      setCatAtEnd(false);
      catScrollX.current = 0;
      catScrollRef.current?.scrollTo({ x: 0, animated: false });
    }
    setEditingVariantIds(new Set());
    setEditingVariantTexts({});
    setShowNewCategory(false);
    setDuplicate(null);
  }, [visible, editWord, today, prefilledWordName]);

  // Scroll category carousel to the selected chip when editing (runs when categories load).
  useEffect(() => {
    if (!visible || !editWord?.category_id || categories.length === 0) return;
    const idx = categories.findIndex(c => c.id === editWord.category_id);
    if (idx > 0) {
      setTimeout(() => {
        const offset = idx * catItemWidth - catScrollWidth.current / 2 + catItemWidth / 2;
        catScrollRef.current?.scrollTo({ x: Math.max(0, offset), animated: true });
      }, TIMING.SCROLL_TRANSITION_DELAY);
    }
  }, [visible, editWord?.category_id, categories, catItemWidth]);

  useEffect(() => {
    if (editWord || !word.trim()) { setDuplicate(null); return; }
    const timer = setTimeout(async () => setDuplicate(await findWordByName(word.trim())), TIMING.DUPLICATE_CHECK_DEBOUNCE);
    return () => clearTimeout(timer);
  }, [word, editWord]);

  const addVariantRow = () =>
    setVariants(v => [...v, { key: `${Date.now()}-${nextVariantKeyRef.current++}`, text: '' }]);

  const updateVariantRow = (key: string, text: string) =>
    setVariants(v => v.map(e => e.key === key ? { ...e, text } : e));

  const removeVariantRow = (key: string) =>
    setVariants(v => v.filter(e => e.key !== key));

  const formatDate = (d: string) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  const stopEditingVariant = (variantId: number) => {
    setEditingVariantIds(prev => {
      const updated = new Set(prev);
      updated.delete(variantId);
      return updated;
    });
  };

  const handleExistingVariantBlur = async (variant: Variant) => {
    const text = (editingVariantTexts[variant.id] ?? variant.variant).trim();
    if (text && text !== variant.variant) {
      await updateVariantMutation.mutateAsync({ id: variant.id, variant: text, dateAdded: today, notes: variant.notes || '' });
      setExistingVariants(prev => prev.map(ev => ev.id === variant.id ? { ...ev, variant: text } : ev));
    }
    stopEditingVariant(variant.id);
  };

  const handleExistingVariantDelete = async (variant: Variant) => {
    await deleteVariantMutation.mutateAsync({ id: variant.id });
    setExistingVariants(prev => prev.filter(v => v.id !== variant.id));
    stopEditingVariant(variant.id);
  };

  const handleSave = async () => {
    if (!word.trim()) { Alert.alert(t('common.attention'), t('addWord.errorWord')); return; }
    if (duplicate) { Alert.alert(t('addWord.duplicateTitle'), t('addWord.duplicateAlert', { word: duplicate.word })); return; }
    setLoading(true);
    try {
      let wordId: number;
      if (editWord) {
        await updateWordMutation.mutateAsync({ id: editWord.id, word: word.trim(), categoryId: selectedCategory, dateAdded, notes });
        wordId = editWord.id;
      } else {
        wordId = await addWordMutation.mutateAsync({ word: word.trim(), categoryId: selectedCategory, dateAdded, notes });
        if (phase === 'creating-word' && pendingMedia) {
          await onWordCreated(wordId);
        }
      }
      // Flush any inline variant edits still open — use service directly to batch all
      // side effects (cache invalidation + sync) in a single call at the end of handleSave.
      for (const id of editingVariantIds) {
        const text = (editingVariantTexts[id] ?? '').trim();
        const original = existingVariants.find(v => v.id === id);
        if (text && original && text !== original.variant) {
          await variantService.updateVariant(id, text, today, original.notes || '');
        }
      }
      const existingTexts = new Set(existingVariants.map(v => v.variant.toLowerCase()));
      for (const v of variants.filter(v => v.text.trim())) {
        const text = v.text.trim();
        if (!existingTexts.has(text.toLowerCase())) {
          await variantService.addVariant(wordId, text, dateAdded);
          existingTexts.add(text.toLowerCase());
        }
      }
      // Invalidate all variant-related caches
      VARIANT_MUTATION_KEYS.forEach(key =>
        queryClient.invalidateQueries({ queryKey: key })
      );
      handleClose();
      onSave?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Modal visible={visible} animationType="none" transparent onRequestClose={dismissModal}>
      <Animated.View style={[s.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={dismissModal} />
      </Animated.View>
      <View style={s.overlay} pointerEvents="box-none">
        <Animated.View style={[s.container, { paddingBottom: 24 + insets.bottom, transform: [{ translateY }], backgroundColor: colors.background }]}>
          <View style={s.handleWrap} {...panResponder.panHandlers}>
            <View style={[s.handle, { backgroundColor: colors.textMuted }]} />
          </View>

          <View style={s.header}>
            <Text style={[s.title, editWord && s.titleLeft, { color: colors.text }]} testID={editWord ? 'modal-title-edit-word' : 'modal-title-new-word'}>{editWord ? t('addWord.titleEdit') : t('addWord.titleNew')}</Text>
            {editWord && (
              <TouchableOpacity style={s.deleteBtn} onPress={handleDelete} testID="word-delete-btn">
                <Ionicons name="trash-outline" size={14} color={colors.error} />
              <Text style={[s.deleteBtnText, { color: colors.error }]}>{t('common.remove')}</Text>
              </TouchableOpacity>
            )}
          </View>

          <MediaChips
            parentType="word"
            parentId={editWord?.id ?? 0}
            enabled={!!editWord}
            pendingMedia={pendingMedia}
            onRemovePending={phase === 'creating-word' ? resetCapture : undefined}
          />

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* ── Word ── */}
            <Text style={[s.label, { color: colors.textSecondary }]}>{t('addWord.wordLabel')}</Text>
            <TextInput
              testID="word-input"
              style={[s.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }, duplicate && s.inputDup]}
              value={word} onChangeText={setWord}
              placeholder={t('addWord.wordPlaceholder')}
              placeholderTextColor={colors.textMuted}
              autoFocus={!editWord} autoCapitalize="none"
            />

            {duplicate && (
              <TouchableOpacity
                style={s.dupCard}
                onPress={() => onEditDuplicate?.(duplicate)}
                activeOpacity={onEditDuplicate ? 0.7 : 1}
              >
                <View style={s.dupCardHeader}>
                  <Text style={s.dupTitle}>{t('addWord.duplicateTitle')}</Text>
                  {onEditDuplicate && <Text style={s.dupEditHint}>{t('addWord.duplicateTapHint')}</Text>}
                </View>
                <View style={[s.dupRecord, { backgroundColor: colors.surface }]}>
                  <Text style={[s.dupWord, { color: colors.text }]}>{duplicate.word}</Text>
                  <View style={s.dupMeta}>
                    {duplicate.category_name && (
                      <CategoryBadge name={categoryName(duplicate.category_name)} color={duplicate.category_color || colors.primary} emoji={duplicate.category_emoji || '📝'} size="small" />
                    )}
                    <View style={s.dupDateRow}>
                      <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
                      <Text style={[s.dupDate, { color: colors.textSecondary }]}>{formatDate(duplicate.date_added)}</Text>
                    </View>
                    {(duplicate.variant_count ?? 0) > 0 && (
                      <View style={s.dupVariantsRow}>
                        <Ionicons name="chatbubble-outline" size={12} color={colors.secondary} />
                        <Text style={[s.dupVariants, { color: colors.secondary }]}>{duplicate.variant_count} {(duplicate.variant_count ?? 0) === 1 ? t('common.variant') : t('common.variants')}</Text>
                      </View>
                    )}
                  </View>
                  {duplicate.notes && (
                    <View style={s.dupNotesRow}>
                      <Ionicons name="document-text-outline" size={12} color={colors.textSecondary} />
                      <Text style={[s.dupNotes, { color: colors.textSecondary }]} numberOfLines={2}>{duplicate.notes}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )}

            {/* ── Category ── */}
            <Text style={[s.label, { color: colors.textSecondary }]}>{t('addWord.categoryLabel')}</Text>
            <View testID="category-section" style={s.carouselWrapper}>
              {catScrolled && (
                <TouchableOpacity
                  style={s.carouselArrow}
                  onPress={() => catScrollRef.current?.scrollTo({ x: Math.max(0, catScrollX.current - catScrollWidth.current), animated: true })}
                  testID="category-scroll-left"
                >
                  <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
              <ScrollView
                ref={catScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={s.catScroll}
                onLayout={e => { catScrollWidth.current = e.nativeEvent.layout.width; }}
                onScroll={e => {
                  const x = e.nativeEvent.contentOffset.x;
                  catScrollX.current = x;
                  setCatScrolled(x > 10);
                  setCatAtEnd(x + catScrollWidth.current >= catContentWidth.current - 10);
                }}
                onContentSizeChange={(w) => {
                  catContentWidth.current = w;
                  setCatAtEnd(catScrollX.current + catScrollWidth.current >= w - 10);
                }}
                scrollEventThrottle={16}
                testID="category-scroll"
              >
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[s.catChip, { borderColor: cat.color, backgroundColor: colors.surface }, selectedCategory === cat.id && { backgroundColor: cat.color }]}
                    onPress={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                    onLongPress={() => setEditCategory({ id: cat.id, name: categoryName(cat.name), color: cat.color, emoji: cat.emoji })}
                    delayLongPress={400}
                    testID={`category-chip-${cat.name}`}
                  >
                    <Text style={s.catEmoji}>{cat.emoji}</Text>
                    <Text style={[s.catName, { color: colors.text }, selectedCategory === cat.id && { color: colors.textOnPrimary }]}>{categoryName(cat.name)}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[s.catChipAdd, { borderColor: colors.primary, backgroundColor: colors.surface }]}
                  onPress={() => setShowNewCategory(true)}
                  testID="category-add-btn"
                >
                  <Ionicons name="add" size={14} color={colors.primary} />
                  <Text style={[s.catChipAddText, { color: colors.primary }]}>{t('words.addCategory')}</Text>
                </TouchableOpacity>
              </ScrollView>
              {!catAtEnd && (
                <TouchableOpacity
                  style={s.carouselArrow}
                  onPress={() => catScrollRef.current?.scrollTo({ x: catScrollX.current + catScrollWidth.current, animated: true })}
                  testID="category-scroll-right"
                >
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* ── Variants ── */}
            <View style={s.varHeader}>
              <Text style={[s.label, { color: colors.textSecondary }]}>{t('addWord.variantsLabel')}</Text>
            </View>

            {existingVariants.map((v, i) => {
              const isEditing = editingVariantIds.has(v.id);
              return isEditing ? (
                <View key={v.id} style={s.varRow}>
                  <View style={[s.varBadge, { backgroundColor: withOpacity(colors.secondary, '20') }]}><Text style={[s.varBadgeText, { color: colors.secondary }]}>{i + 1}</Text></View>
                  <TextInput
                    style={[s.varInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                    value={editingVariantTexts[v.id] ?? v.variant}
                    onChangeText={txt => setEditingVariantTexts(prev => ({ ...prev, [v.id]: txt }))}
                    placeholder={v.variant}
                     placeholderTextColor={colors.textMuted}
                     autoCapitalize="none"
                     autoFocus
                     onBlur={() => { void handleExistingVariantBlur(v); }}
                   />
                   <TouchableOpacity style={s.varRemove} testID={`existing-variant-delete-${v.variant}`} onPress={() => { void handleExistingVariantDelete(v); }}>
                    <Ionicons name="close" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  key={v.id}
                  style={[s.existingVarRow, { backgroundColor: withOpacity(colors.secondary, '10'), borderColor: withOpacity(colors.secondary, '30') }]}
                  testID={`existing-variant-row-${v.variant}`}
                  onPress={() => {
                    setEditingVariantTexts(prev => ({ ...prev, [v.id]: v.variant }));
                    setEditingVariantIds(prev => new Set(prev).add(v.id));
                  }}
                >
                  <Ionicons name="chatbubble-outline" size={13} color={colors.secondary} style={s.existingVarIcon} />
                  <Text style={[s.existingVarText, { color: colors.text }]}>{v.variant}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              );
            })}

            <Text style={[s.varHint, { color: colors.textMuted }]}>{t('addWord.variantHint')}</Text>

            {variants.map((v, i) => (
              <View key={v.key} style={s.varRow}>
                <View style={[s.varBadge, { backgroundColor: withOpacity(colors.secondary, '20') }]}><Text style={[s.varBadgeText, { color: colors.secondary }]}>{existingVariants.length + i + 1}</Text></View>
                <TextInput
                  style={[s.varInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={v.text}
                  onChangeText={txt => updateVariantRow(v.key, txt)}
                  placeholder={word
                    ? t('addWord.variantPlaceholder', { word })
                    : t('addWord.variantPlaceholderGeneric')}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  testID={`word-variant-input-${i}`}
                />
                <TouchableOpacity style={s.varRemove} onPress={() => removeVariantRow(v.key)} testID={`new-variant-remove-${i}`}>
                  <Ionicons name="close" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={[s.addAnotherBtn, { backgroundColor: withOpacity(colors.primary, '12'), borderColor: withOpacity(colors.primary, '50') }]} onPress={addVariantRow} testID="word-add-variant-btn">
              <Text style={[s.addAnotherText, { color: colors.primary }]}>
                {variants.length === 0 ? t('addWord.addVariant') : t('addWord.addAnother')}
              </Text>
            </TouchableOpacity>

            {/* ── Date ── */}
            <DatePickerField label={t('common.date')} value={dateAdded} onChange={setDateAdded} accentColor={colors.primary} />

            {/* ── Notes ── */}
            <Text style={[s.label, { color: colors.textSecondary }]}>{t('common.notes').toUpperCase()}</Text>
            <TextInput
              style={[s.input, s.textArea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={notes} onChangeText={setNotes}
              placeholder={t('addWord.notesPlaceholder')}
              placeholderTextColor={colors.textMuted} multiline numberOfLines={3}
              testID="word-notes-input"
            />

            <View style={s.actions}>
               <Button title={t('common.cancel')} onPress={handleClose} variant="outline" style={s.actionBtn} testID="word-cancel-btn" />
              <Button
                title={editWord ? t('addWord.btnSave') : t('addWord.btnAdd')}
                onPress={handleSave} loading={loading}
                style={[s.actionBtn, !!duplicate && s.btnDisabled]}
                testID="word-save-btn"
              />
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>

    <AddCategoryModal
      visible={showNewCategory || !!editCategory}
      editCategory={editCategory}
      onClose={() => { setEditCategory(null); setShowNewCategory(false); }}
      onSave={async (id) => {
        setEditCategory(null);
        setShowNewCategory(false);
        CATEGORY_MUTATION_KEYS.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
        if (id) setSelectedCategory(id);
        catScrollRef.current?.scrollTo({ x: 0, animated: true });
      }}
      onDeleted={async () => {
        setEditCategory(null);
        setShowNewCategory(false);
        CATEGORY_MUTATION_KEYS.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
        setSelectedCategory(null);
      }}
    />

    </>
  );
}

const s = StyleSheet.create({
  backdrop:       { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  overlay:        { flex: 1, justifyContent: 'flex-end' },
  container:      { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '92%' },
  handleWrap:     { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 10, marginBottom: 10 },
  handle:         { width: 40, height: 4, borderRadius: 2 },
  title:          { fontSize: 22, fontWeight: '800', textAlign: 'center', flex: 1 },
  titleLeft:      { textAlign: 'left' },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  deleteBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(255,0,0,0.12)', borderRadius: 12 },
  deleteBtnText:  { fontSize: 13, fontWeight: '700' },
  label:          { fontSize: 13, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:          { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, borderWidth: 1.5, marginBottom: 16 },
  inputDup:       { borderColor: '#F4A022', backgroundColor: 'rgba(244,160,34,0.13)' },
  dupCard:        { backgroundColor: 'rgba(244,160,34,0.13)', borderRadius: 14, borderWidth: 1.5, borderColor: '#F4A022', padding: 14, marginTop: -8, marginBottom: 16 },
  dupTitle:       { fontSize: 13, fontWeight: '700', color: '#F4A022' },
  dupCardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dupEditHint:    { fontSize: 12, fontWeight: '600', color: '#F4A022', opacity: 0.7 },
  dupRecord:      { borderRadius: 10, padding: 12 },
  dupWord:        { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  dupMeta:        { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  dupDateRow:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dupDate:        { fontSize: 12 },
  dupVariantsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dupVariants:    { fontSize: 12, fontWeight: '600' },
  dupNotesRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 6 },
  dupNotes:       { fontSize: 12, flex: 1 },
  textArea:       { height: layout.textAreaHeight, textAlignVertical: 'top' },
  carouselWrapper:{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  catScroll:      { flex: 1 },
  carouselArrow:  { paddingHorizontal: 6, paddingVertical: 8, justifyContent: 'center', alignItems: 'center' },
  catChip:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 2, marginRight: 8 },
  catChipAdd:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 2, borderStyle: 'dashed', marginRight: 8 },
  catChipAddText: { fontSize: 13, fontWeight: '700' },
  catEmoji:       { fontSize: 16, marginRight: 6 },
  catName:        { fontSize: 13, fontWeight: '600' },
  varHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  addVarBtn:      { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1.5 },
  addVarBtnText:  { fontSize: 13, fontWeight: '700' },
  varHint:        { fontSize: 13, fontStyle: 'italic', marginBottom: 16 },
  existingVarRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 8, borderWidth: 1.5 },
  existingVarIcon:{ marginRight: 8 },
  existingVarText:{ flex: 1, fontSize: 15, fontWeight: '600' },
  varRow:         { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  varBadge:       { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  varBadgeText:   { fontSize: 13, fontWeight: '700' },
  varInput:       { flex: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1.5 },
  varRemove:      { padding: 6 },
  addAnotherBtn:  { alignSelf: 'flex-start', marginBottom: 16, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5 },
  addAnotherText: { fontSize: 13, fontWeight: '700' },
  actions:        { flexDirection: 'row', gap: 12, marginTop: 8, paddingBottom: 16 },
  actionBtn:      { flex: 1 },
  btnDisabled:    { opacity: 0.5 },
});
