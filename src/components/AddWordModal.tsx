import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  StyleSheet, ScrollView, Alert, Animated, PanResponder,
} from 'react-native';
import { COLORS } from '../utils/theme';
import { Category, getCategories, addWord, updateWord, deleteWord, addVariant, updateVariant, deleteVariant, getVariantsByWord, findWordByName, Word, Variant } from '../database/database';
import { Button, CategoryBadge } from './UIComponents';
import { AddCategoryModal, CategoryToEdit } from './AddCategoryModal';
import { DatePickerField } from './DatePickerField';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n, useCategoryName } from '../i18n/i18n';

interface AddWordModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  onDeleted?: () => void;
  editWord?: Word | null;
  onEditDuplicate?: (word: Word) => void;
}

interface VariantEntry {
  key: string;
  text: string;
}

export const AddWordModal: React.FC<AddWordModalProps> = ({ visible, onClose, onSave, onDeleted, editWord, onEditDuplicate }) => {
  const { t } = useI18n();
  const categoryName = useCategoryName();
  const insets = useSafeAreaInsets();
  const today = new Date().toISOString().split('T')[0];

  const handleDelete = () => {
    if (!editWord) return;
    Alert.alert(
      t('words.deleteTitle'),
      t('words.deleteMessage', { word: editWord.word }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.remove'), style: 'destructive', onPress: async () => {
          await deleteWord(editWord.id);
          onClose();
          onDeleted?.();
        }},
      ]
    );
  };

  const [word, setWord]                         = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [dateAdded, setDateAdded]               = useState(today);
  const [notes, setNotes]                       = useState('');
  const [editCategory, setEditCategory]         = useState<CategoryToEdit | null>(null);
  const [showNewCategory, setShowNewCategory]   = useState(false);
  const [categories, setCategories]             = useState<Category[]>([]);
  const [loading, setLoading]                   = useState(false);
  const [duplicate, setDuplicate]               = useState<Word | null>(null);
  const [variants, setVariants]                 = useState<VariantEntry[]>([]);
  const [existingVariants, setExistingVariants] = useState<Variant[]>([]);
  const [editingVariantIds, setEditingVariantIds]   = useState<Set<number>>(new Set());
  const [editingVariantTexts, setEditingVariantTexts] = useState<Record<number, string>>({});

  const translateY = useRef(new Animated.Value(800)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  const dismissModal = useRef(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 800, duration: 250, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => { onCloseRef.current(); });
  }).current;
  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, { dy }) => dy > 0,
    onPanResponderMove: (_, { dy }) => { if (dy > 0) translateY.setValue(dy); },
    onPanResponderRelease: (_, { dy, vy }) => {
      if (dy > 100 || vy > 0.8) {
        dismissModal();
      } else {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 7 }).start();
      }
    },
  })).current;

  const catScrollRef = useRef<ScrollView>(null);
  const catScrollWidth = useRef(0);
  const catContentWidth = useRef(0);
  const catScrollX = useRef(0);
  const [catScrolled, setCatScrolled] = useState(false);
  const [catAtEnd, setCatAtEnd] = useState(false);
  const catItemWidth = 110; // approximate chip width + gap

  useEffect(() => {
    if (visible) {
      translateY.setValue(800);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8, tension: 65 }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, translateY, backdropOpacity]);

  useEffect(() => {
    if (!visible) return;
    getCategories().then(cats => {
      setCategories(cats);
      // Scroll to selected category when editing
      if (editWord?.category_id) {
        const idx = cats.findIndex(c => c.id === editWord.category_id);
        if (idx > 0) {
          setTimeout(() => {
            const offset = idx * catItemWidth - catScrollWidth.current / 2 + catItemWidth / 2;
            catScrollRef.current?.scrollTo({ x: Math.max(0, offset), animated: true });
          }, 300);
        }
      }
    });
    if (editWord) {
      setWord(editWord.word);
      setSelectedCategory(editWord.category_id);
      setDateAdded(editWord.date_added);
      setNotes(editWord.notes || '');
      setVariants([]);
      getVariantsByWord(editWord.id).then(setExistingVariants);
    } else {
      setWord(''); setSelectedCategory(null);
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
  }, [visible, editWord, today]);

  useEffect(() => {
    if (editWord || !word.trim()) { setDuplicate(null); return; }
    const timer = setTimeout(async () => setDuplicate(await findWordByName(word.trim())), 400);
    return () => clearTimeout(timer);
  }, [word, editWord]);

  const addVariantRow = () =>
    setVariants(v => [...v, { key: String(Date.now() + Math.random()), text: '' }]);

  const updateVariantRow = (key: string, text: string) =>
    setVariants(v => v.map(e => e.key === key ? { ...e, text } : e));

  const removeVariantRow = (key: string) =>
    setVariants(v => v.filter(e => e.key !== key));

  const formatDate = (d: string) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  const handleSave = async () => {
    if (!word.trim()) { Alert.alert(t('common.attention'), t('addWord.errorWord')); return; }
    if (duplicate) { Alert.alert(t('addWord.duplicateTitle'), t('addWord.duplicateAlert', { word: duplicate.word })); return; }
    setLoading(true);
    try {
      let wordId: number;
      if (editWord) {
        await updateWord(editWord.id, word.trim(), selectedCategory, dateAdded, notes);
        wordId = editWord.id;
      } else {
        wordId = await addWord(word.trim(), selectedCategory, dateAdded, notes);
      }
      // Flush any inline variant edits still open
      for (const id of editingVariantIds) {
        const text = (editingVariantTexts[id] ?? '').trim();
        const original = existingVariants.find(v => v.id === id);
        if (text && original && text !== original.variant) {
          await updateVariant(id, text, today, original.notes || '');
        }
      }
      const existingTexts = new Set(existingVariants.map(v => v.variant.toLowerCase()));
      for (const v of variants.filter(v => v.text.trim())) {
        const text = v.text.trim();
        if (!existingTexts.has(text.toLowerCase())) {
          await addVariant(wordId, text, dateAdded);
          existingTexts.add(text.toLowerCase());
        }
      }
      onSave(); onClose();
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
        <Animated.View style={[s.container, { paddingBottom: 24 + insets.bottom, transform: [{ translateY }] }]}>
          <View style={s.handleWrap} {...panResponder.panHandlers}>
            <View style={s.handle} />
          </View>

          <View style={s.header}>
            <Text style={[s.title, editWord && s.titleLeft]} testID={editWord ? 'modal-title-edit-word' : 'modal-title-new-word'}>{editWord ? t('addWord.titleEdit') : t('addWord.titleNew')}</Text>
            {editWord && (
              <TouchableOpacity style={s.deleteBtn} onPress={handleDelete} testID="word-delete-btn">
                <Text style={s.deleteBtnText}>🗑️ {t('common.remove')}</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* ── Word ── */}
            <Text style={s.label}>{t('addWord.wordLabel')}</Text>
            <TextInput
              testID="word-input"
              style={[s.input, duplicate && s.inputDup]}
              value={word} onChangeText={setWord}
              placeholder={t('addWord.wordPlaceholder')}
              placeholderTextColor={COLORS.textLight}
              autoFocus={!editWord} autoCapitalize="none"
            />

            {duplicate && (
              <TouchableOpacity
                style={s.dupCard}
                onPress={() => onEditDuplicate && onEditDuplicate(duplicate)}
                activeOpacity={onEditDuplicate ? 0.7 : 1}
              >
                <View style={s.dupCardHeader}>
                  <Text style={s.dupTitle}>{t('addWord.duplicateTitle')}</Text>
                  {onEditDuplicate && <Text style={s.dupEditHint}>{t('addWord.duplicateTapHint')}</Text>}
                </View>
                <View style={s.dupRecord}>
                  <Text style={s.dupWord}>{duplicate.word}</Text>
                  <View style={s.dupMeta}>
                    {duplicate.category_name && (
                      <CategoryBadge name={categoryName(duplicate.category_name)} color={duplicate.category_color || COLORS.primary} emoji={duplicate.category_emoji || '📝'} size="small" />
                    )}
                    <Text style={s.dupDate}>📅 {formatDate(duplicate.date_added)}</Text>
                    {(duplicate.variant_count ?? 0) > 0 && (
                      <Text style={s.dupVariants}>🗣️ {duplicate.variant_count} {(duplicate.variant_count ?? 0) === 1 ? t('common.variant') : t('common.variants')}</Text>
                    )}
                  </View>
                  {duplicate.notes && <Text style={s.dupNotes} numberOfLines={2}>💬 {duplicate.notes}</Text>}
                </View>
              </TouchableOpacity>
            )}

            {/* ── Category ── */}
            <Text style={s.label}>{t('addWord.categoryLabel')}</Text>
            <View testID="category-section" style={s.carouselWrapper}>
              {catScrolled && (
                <TouchableOpacity
                  style={s.carouselArrow}
                  onPress={() => catScrollRef.current?.scrollTo({ x: Math.max(0, catScrollX.current - catScrollWidth.current), animated: true })}
                  testID="category-scroll-left"
                >
                  <Text style={s.carouselArrowText}>‹</Text>
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
                    style={[s.catChip, { borderColor: cat.color }, selectedCategory === cat.id && { backgroundColor: cat.color }]}
                    onPress={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                    onLongPress={() => setEditCategory({ id: cat.id, name: categoryName(cat.name), color: cat.color, emoji: cat.emoji })}
                    delayLongPress={400}
                    testID={`category-chip-${cat.name}`}
                  >
                    <Text style={s.catEmoji}>{cat.emoji}</Text>
                    <Text style={[s.catName, selectedCategory === cat.id && { color: COLORS.white }]}>{categoryName(cat.name)}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={s.catChipAdd}
                  onPress={() => setShowNewCategory(true)}
                  testID="category-add-btn"
                >
                  <Text style={s.catChipAddText}>{t('words.addCategory')}</Text>
                </TouchableOpacity>
              </ScrollView>
              {!catAtEnd && (
                <TouchableOpacity
                  style={s.carouselArrow}
                  onPress={() => catScrollRef.current?.scrollTo({ x: catScrollX.current + catScrollWidth.current, animated: true })}
                  testID="category-scroll-right"
                >
                  <Text style={s.carouselArrowText}>›</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* ── Variants ── */}
            <View style={s.varHeader}>
              <Text style={s.label}>{t('addWord.variantsLabel')}</Text>
            </View>

            {existingVariants.map((v, i) => {
              const isEditing = editingVariantIds.has(v.id);
              return isEditing ? (
                <View key={v.id} style={s.varRow}>
                  <View style={s.varBadge}><Text style={s.varBadgeText}>{i + 1}</Text></View>
                  <TextInput
                    style={s.varInput}
                    value={editingVariantTexts[v.id] ?? v.variant}
                    onChangeText={txt => setEditingVariantTexts(prev => ({ ...prev, [v.id]: txt }))}
                    placeholder={v.variant}
                    placeholderTextColor={COLORS.textLight}
                    autoCapitalize="none"
                    autoFocus
                    onBlur={async () => {
                      const text = (editingVariantTexts[v.id] ?? v.variant).trim();
                      if (text && text !== v.variant) {
                        await updateVariant(v.id, text, today, v.notes || '');
                        if (editWord) getVariantsByWord(editWord.id).then(setExistingVariants);
                      }
                      setEditingVariantIds(prev => { const s = new Set(prev); s.delete(v.id); return s; });
                    }}
                  />
                  <TouchableOpacity style={s.varRemove} testID={`existing-variant-delete-${v.variant}`} onPress={async () => {
                    await deleteVariant(v.id);
                    setExistingVariants(prev => prev.filter(e => e.id !== v.id));
                    setEditingVariantIds(prev => { const s = new Set(prev); s.delete(v.id); return s; });
                  }}>
                    <Text style={s.varRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  key={v.id}
                  style={s.existingVarRow}
                  testID={`existing-variant-row-${v.variant}`}
                  onPress={() => {
                    setEditingVariantTexts(prev => ({ ...prev, [v.id]: v.variant }));
                    setEditingVariantIds(prev => new Set(prev).add(v.id));
                  }}
                >
                  <Text style={s.existingVarText}>🗣️ {v.variant}</Text>
                  <Text style={s.existingVarChevron}>›</Text>
                </TouchableOpacity>
              );
            })}

            <Text style={s.varHint}>{t('addWord.variantHint')}</Text>

            {variants.map((v, i) => (
              <View key={v.key} style={s.varRow}>
                <View style={s.varBadge}><Text style={s.varBadgeText}>{existingVariants.length + i + 1}</Text></View>
                <TextInput
                  style={s.varInput}
                  value={v.text}
                  onChangeText={txt => updateVariantRow(v.key, txt)}
                  placeholder={word
                    ? t('addWord.variantPlaceholder', { word })
                    : t('addWord.variantPlaceholderGeneric')}
                  placeholderTextColor={COLORS.textLight}
                  autoCapitalize="none"
                  testID={`word-variant-input-${i}`}
                />
                <TouchableOpacity style={s.varRemove} onPress={() => removeVariantRow(v.key)}>
                  <Text style={s.varRemoveText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={s.addAnotherBtn} onPress={addVariantRow} testID="word-add-variant-btn">
              <Text style={s.addAnotherText}>
                {variants.length === 0 ? t('addWord.addVariant') : t('addWord.addAnother')}
              </Text>
            </TouchableOpacity>

            {/* ── Date ── */}
            <DatePickerField label={t('common.date')} value={dateAdded} onChange={setDateAdded} accentColor={COLORS.primary} />

            {/* ── Notes ── */}
            <Text style={s.label}>{t('common.notes').toUpperCase()}</Text>
            <TextInput
              style={[s.input, s.textArea]} value={notes} onChangeText={setNotes}
              placeholder={t('addWord.notesPlaceholder')}
              placeholderTextColor={COLORS.textLight} multiline numberOfLines={3}
              testID="word-notes-input"
            />

            <View style={s.actions}>
              <Button title={t('common.cancel')} onPress={onClose} variant="outline" style={s.actionBtn} />
              <Button
                title={editWord ? t('addWord.btnSave') : t('addWord.btnAdd')}
                onPress={handleSave} loading={loading}
                style={[s.actionBtn, !!duplicate && s.btnDisabled]}
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
        const cats = await getCategories();
        setCategories(cats);
        if (id) setSelectedCategory(id);
        // Move section back to left so user can see the new category (as requested)
        catScrollRef.current?.scrollTo({ x: 0, animated: true });
      }}
      onDeleted={async () => { setEditCategory(null); setShowNewCategory(false); const cats = await getCategories(); setCategories(cats); setSelectedCategory(null); }}
    />

    </>
  );
};

const s = StyleSheet.create({
  backdrop:       { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  overlay:        { flex: 1, justifyContent: 'flex-end' },
  container:      { backgroundColor: COLORS.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '92%' },
  handleWrap:     { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 10, marginBottom: 10 },
  handle:         { width: 40, height: 4, backgroundColor: COLORS.textLight, borderRadius: 2 },
  title:          { fontSize: 22, fontWeight: '800', color: COLORS.text, textAlign: 'center', flex: 1 },
  titleLeft:      { textAlign: 'left' },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  deleteBtn:      { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: COLORS.error + '20', borderRadius: 12 },
  deleteBtnText:  { fontSize: 13, fontWeight: '700', color: COLORS.error },
  label:          { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:          { backgroundColor: COLORS.white, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: COLORS.text, borderWidth: 1.5, borderColor: COLORS.border, marginBottom: 16 },
  inputDup:       { borderColor: '#E17055', backgroundColor: '#FFF5F4' },
  dupCard:        { backgroundColor: '#FFF5F4', borderRadius: 14, borderWidth: 1.5, borderColor: '#E17055', padding: 14, marginTop: -8, marginBottom: 16 },
  dupTitle:       { fontSize: 13, fontWeight: '700', color: '#E17055' },
  dupCardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dupEditHint:    { fontSize: 12, fontWeight: '600', color: '#E17055', opacity: 0.7 },
  dupRecord:      { backgroundColor: COLORS.white, borderRadius: 10, padding: 12 },
  dupWord:        { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  dupMeta:        { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  dupDate:        { fontSize: 12, color: COLORS.textSecondary },
  dupVariants:    { fontSize: 12, color: COLORS.secondary, fontWeight: '600' },
  dupNotes:       { fontSize: 12, color: COLORS.textSecondary, marginTop: 6 },
  textArea:       { height: 80, textAlignVertical: 'top' },
  carouselWrapper:{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  catScroll:      { flex: 1 },
  carouselArrow:  { paddingHorizontal: 6, paddingVertical: 8, justifyContent: 'center', alignItems: 'center' },
  carouselArrowText: { fontSize: 22, color: COLORS.textSecondary, fontWeight: '300' },
  catChip:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 2, marginRight: 8, backgroundColor: COLORS.white },
  catChipAdd:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 2, borderStyle: 'dashed', borderColor: COLORS.primary, marginRight: 8, backgroundColor: COLORS.white },
  catChipAddText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  catEmoji:       { fontSize: 16, marginRight: 6 },
  catName:        { fontSize: 13, fontWeight: '600', color: COLORS.text },
  varHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  addVarBtn:      { backgroundColor: COLORS.primary + '18', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1.5, borderColor: COLORS.primary + '60' },
  addVarBtnText:  { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  varHint:        { fontSize: 13, color: COLORS.textLight, fontStyle: 'italic', marginBottom: 16 },
  existingVarRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.secondary + '10', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 8, borderWidth: 1.5, borderColor: COLORS.secondary + '30' },
  existingVarText:{ flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text },
  existingVarChevron: { fontSize: 22, color: COLORS.textLight, fontWeight: '300' },
  varRow:         { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  varBadge:       { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.secondary + '20', alignItems: 'center', justifyContent: 'center' },
  varBadgeText:   { fontSize: 13, fontWeight: '700', color: COLORS.secondary },
  varInput:       { flex: 1, backgroundColor: COLORS.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.text, borderWidth: 1.5, borderColor: COLORS.border },
  varRemove:      { padding: 6 },
  varRemoveText:  { fontSize: 16, color: COLORS.textLight, fontWeight: '700' },
  addAnotherBtn:  { alignSelf: 'flex-start', marginBottom: 16, backgroundColor: COLORS.primary + '12', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, borderColor: COLORS.primary + '50' },
  addAnotherText: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
  actions:        { flexDirection: 'row', gap: 12, marginTop: 8, paddingBottom: 16 },
  actionBtn:      { flex: 1 },
  btnDisabled:    { opacity: 0.5 },
});
