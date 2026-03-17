import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Modal, StyleSheet,
  Alert, TouchableOpacity, ScrollView, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LAYOUT } from '../utils/theme';
import { withOpacity } from '../utils/colorHelpers';
import { useTheme } from '../hooks/useTheme';
import { findVariantByName } from '../services/variantService';
import type { Variant, Word } from '../types/domain';
import { useWords } from '../hooks/useWords';
import { useModalAnimation } from '../hooks/useModalAnimation';
import { useAddVariant, useUpdateVariant, useDeleteVariant } from '../hooks/useVariants';
import { Button } from './UIComponents';
import { DatePickerField } from './DatePickerField';
import { useI18n, useCategoryName } from '../i18n/i18n';
import { TIMING } from '../utils/animationConstants';

const EMPTY_WORDS: Word[] = [];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  onDeleted?: () => void;
  word: Word | null;
  editVariant?: Variant | null;
}

export function AddVariantModal({ visible, onClose, onSave, onDeleted, word, editVariant }: Readonly<Props>) {
  const { t } = useI18n();
  const categoryName = useCategoryName();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const today = new Date().toISOString().split('T')[0];

  // Modal animation and gesture handling
  const { translateY, backdropOpacity, dismissModal, panResponder } = useModalAnimation(visible, onClose);

  const { data: words = EMPTY_WORDS } = useWords();
  const addVariantMutation    = useAddVariant();
  const updateVariantMutation = useUpdateVariant();
  const deleteVariantMutation = useDeleteVariant();

  const [variant, setVariant]     = useState('');
  const [dateAdded, setDateAdded] = useState(today);
  const [notes, setNotes]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [duplicate, setDuplicate] = useState<Variant | null>(null);

  const [wordSearch, setWordSearch] = useState('');
  const [chosenWord, setChosenWord] = useState<Word | null>(null);

  const effectiveWord = word ?? chosenWord;
  const showSearch    = !word && !editVariant;

  useEffect(() => {
    if (!visible) return;
    if (editVariant) {
      setVariant(editVariant.variant);
      setDateAdded(editVariant.date_added);
      setNotes(editVariant.notes || '');
    } else {
      setVariant(''); setDateAdded(today); setNotes('');
    }
    setDuplicate(null);
    if (showSearch) {
      setChosenWord(null); setWordSearch('');
    }
  }, [visible, editVariant, word, today, showSearch]);

  useEffect(() => {
    if (editVariant || !variant.trim() || !effectiveWord) { setDuplicate(null); return; }
    const timer = setTimeout(async () => setDuplicate(await findVariantByName(effectiveWord.id, variant.trim())), TIMING.DUPLICATE_CHECK_DEBOUNCE);
    return () => clearTimeout(timer);
  }, [variant, editVariant, effectiveWord]);

  const filtered = wordSearch.trim()
    ? words.filter(w => w.word.toLowerCase().includes(wordSearch.toLowerCase()))
    : words;

  const handleDelete = () => {
    if (!editVariant) return;
    Alert.alert(
      t('variants.deleteTitle'),
      t('variants.deleteMessage', { variant: editVariant.variant }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.remove'), style: 'destructive', onPress: () => { void deleteVariantMutation.mutateAsync({ id: editVariant.id }).then(() => { onClose(); onDeleted?.(); }); }},
      ]
    );
  };

  const handleSave = async () => {
    if (!variant.trim()) { Alert.alert(t('common.attention'), t('addVariant.errorVariant')); return; }
    if (!editVariant && !effectiveWord) { Alert.alert(t('common.attention'), t('addVariant.errorSelectWord')); return; }
    if (duplicate) { Alert.alert(t('addVariant.duplicateTitle', { word: effectiveWord?.word ?? '' }), t('addVariant.duplicateAlert', { variant: duplicate.variant })); return; }
    const targetWordId = effectiveWord?.id;
    setLoading(true);
    try {
      if (editVariant) {
        await updateVariantMutation.mutateAsync({ id: editVariant.id, variant: variant.trim(), dateAdded, notes });
      } else {
        if (!targetWordId) {
          Alert.alert(t('common.attention'), t('addVariant.errorSelectWord'));
          return;
        }
        await addVariantMutation.mutateAsync({ wordId: targetWordId, variant: variant.trim(), dateAdded, notes });
      }
      onSave(); onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
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
            <Text style={[s.title, editVariant && s.titleLeft, { color: colors.text }]} testID={editVariant ? 'modal-title-edit-variant' : 'modal-title-new-variant'}>{editVariant ? t('addVariant.titleEdit') : t('addVariant.titleNew')}</Text>
            {editVariant && (
              <TouchableOpacity style={[s.deleteBtn, { backgroundColor: withOpacity(colors.error, '20') }]} onPress={handleDelete} testID="variant-delete-btn">
                <Ionicons name="trash-outline" size={14} color={colors.error} />
                <Text style={[s.deleteBtnText, { color: colors.error }]}>{t('common.remove')}</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* ── Word search ── */}
            {showSearch && (
              <View style={s.searchSection}>
                <Text style={[s.label, { color: colors.textSecondary }]}>{t('addVariant.wordLabel')}</Text>
                {chosenWord ? (
                  <TouchableOpacity style={[s.chosenChip, { backgroundColor: withOpacity(colors.secondary, '15'), borderColor: colors.secondary }]} onPress={() => setChosenWord(null)}>
                    <Text style={[s.chosenText, { color: colors.secondary }]}>{chosenWord.word}</Text>
                    <Text style={[s.chosenClear, { color: colors.secondary }]}>{t('addVariant.changeWord')}</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <View style={[s.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Ionicons name="search" size={16} color={colors.textMuted} style={s.searchIcon} />
                      <TextInput
                        style={[s.searchInput, { color: colors.text }]}
                        value={wordSearch}
                        onChangeText={setWordSearch}
                        placeholder={t('addVariant.wordSearchPlaceholder')}
                        placeholderTextColor={colors.textMuted}
                        autoCapitalize="none"
                        testID="variant-word-search"
                      />
                      {wordSearch.length > 0 && (
                        <TouchableOpacity onPress={() => setWordSearch('')} testID="variant-word-search-clear">
                          <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={[s.wordList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      {filtered.length === 0
                        ? <Text style={[s.noWords, { color: colors.textSecondary }]}>{t('addVariant.noWordsFound')}</Text>
                        : filtered.slice(0, 7).map(w => (
                          <TouchableOpacity
                            key={w.id} style={[s.wordItem, { borderBottomColor: colors.border }]}
                            onPress={() => { setChosenWord(w); setWordSearch(''); }}
                          >
                            <Text style={[s.wordItemText, { color: colors.text }]}>{w.word}</Text>
                            {w.category_name && (
                              <Text style={[s.wordItemCat, { color: colors.textSecondary }]}>{w.category_emoji} {categoryName(w.category_name)}</Text>
                            )}
                          </TouchableOpacity>
                        ))
                      }
                    </View>
                  </>
                )}
              </View>
            )}

            {effectiveWord && !editVariant && (
              <View style={[s.contextRow, { backgroundColor: withOpacity(colors.secondary, '10') }]}>
                <Text style={[s.contextLabel, { color: colors.textSecondary }]}>{t('addVariant.forWord')}</Text>
                <Text style={[s.contextWord, { color: colors.text }]}>&ldquo;{effectiveWord.word}&rdquo;</Text>
              </View>
            )}

            {/* ── Variant text ── */}
            <Text style={[s.label, { color: colors.textSecondary }]}>{t('addVariant.variantLabel')}</Text>
            <TextInput
              testID="variant-input"
              style={[
                s.input,
                { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
                duplicate && { borderColor: colors.warning, backgroundColor: withOpacity(colors.warning, '22') },
              ]}
              value={variant} onChangeText={setVariant}
              placeholder={effectiveWord
                ? t('addVariant.variantPlaceholder', { word: effectiveWord.word })
                : t('addVariant.variantPlaceholderGeneric')}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />

            {duplicate && effectiveWord && (
              <View style={[s.dupCard, { backgroundColor: withOpacity(colors.warning, '22'), borderColor: colors.warning }]} testID="modal-duplicate-variant">
                <Text style={[s.dupTitle, { color: colors.warning }]}>{t('addVariant.duplicateTitle', { word: effectiveWord.word })}</Text>
                <Text style={[s.dupText, { color: colors.warning }]}>{duplicate.variant}</Text>
              </View>
            )}

            {/* ── Date ── */}
            <DatePickerField label={t('common.date')} value={dateAdded} onChange={setDateAdded} accentColor={colors.secondary} />

            {/* ── Notes ── */}
            <Text style={[s.label, { color: colors.textSecondary }]}>{t('common.notes').toUpperCase()}</Text>
            <TextInput
              style={[s.input, s.textArea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={notes} onChangeText={setNotes}
              placeholder={t('addVariant.notesPlaceholder')}
              placeholderTextColor={colors.textMuted} multiline numberOfLines={3}
              testID="variant-notes-input"
            />

            <View style={s.actions}>
              <Button title={t('common.cancel')} onPress={onClose} variant="outline" style={s.actionBtn} testID="variant-cancel-btn" />
              <Button
                title={editVariant ? t('addVariant.btnSave') : t('addVariant.btnAdd')}
                onPress={handleSave} loading={loading}
                style={[s.actionBtn, !!duplicate && s.btnDisabled]}
                testID="variant-save-btn"
              />
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop:     { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  overlay:      { flex: 1, justifyContent: 'flex-end' },
  container:    { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '92%' },
  handleWrap:   { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 10, marginBottom: 10 },
  handle:       { width: 40, height: 4, borderRadius: 2 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title:        { fontSize: 22, fontWeight: '800', textAlign: 'center', flex: 1 },
  titleLeft:    { textAlign: 'left' },
  deleteBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  deleteBtnText:{ fontSize: 13, fontWeight: '700' },
  label:        { fontSize: 13, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:        { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, borderWidth: 1.5, marginBottom: 16 },
  textArea:     { height: LAYOUT.TEXTAREA_HEIGHT, textAlignVertical: 'top' },
  actions:      { flexDirection: 'row', gap: 12, marginTop: 8, paddingBottom: 16 },
  actionBtn:    { flex: 1 },
  btnDisabled:  { opacity: 0.5 },
  dupCard:      { borderRadius: 14, borderWidth: 1.5, padding: 14, marginTop: -8, marginBottom: 16 },
  dupTitle:     { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  dupText:      { fontSize: 16, fontWeight: '800' },
  searchSection:{ marginBottom: 16 },
  searchBox:    { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1.5, marginBottom: 6 },
  searchIcon:   { marginRight: 8 },
  searchInput:  { flex: 1, fontSize: 15 },
  wordList:     { borderRadius: 14, borderWidth: 1.5, overflow: 'hidden' },
  wordItem:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1 },
  wordItemText: { fontSize: 16, fontWeight: '700' },
  wordItemCat:  { fontSize: 12 },
  noWords:      { textAlign: 'center', padding: 16, fontSize: 14 },
  chosenChip:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, borderWidth: 2, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 4 },
  chosenText:   { fontSize: 17, fontWeight: '800' },
  chosenClear:  { fontSize: 13, fontWeight: '600' },
  contextRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  contextLabel: { fontSize: 14 },
  contextWord:  { fontSize: 14, fontWeight: '800' },
});
