import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, Modal, StyleSheet,
  Alert, TouchableOpacity, ScrollView, Animated, PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../utils/theme';
import { addVariant, updateVariant, deleteVariant, getWords, Variant, Word } from '../database/database';
import { Button } from './UIComponents';
import { DatePickerField } from './DatePickerField';
import { useI18n, useCategoryName } from '../i18n/i18n';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  onDeleted?: () => void;
  word: Word | null;
  editVariant?: Variant | null;
}

export const AddVariantModal: React.FC<Props> = ({ visible, onClose, onSave, onDeleted, word, editVariant }) => {
  const { t } = useI18n();
  const categoryName = useCategoryName();
  const insets = useSafeAreaInsets();
  const today = new Date().toISOString().split('T')[0];

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

  const [variant, setVariant]     = useState('');
  const [dateAdded, setDateAdded] = useState(today);
  const [notes, setNotes]         = useState('');
  const [loading, setLoading]     = useState(false);

  const [allWords, setAllWords]   = useState<Word[]>([]);
  const [wordSearch, setWordSearch] = useState('');
  const [chosenWord, setChosenWord] = useState<Word | null>(null);

  const effectiveWord = word ?? chosenWord;
  const showSearch    = !word && !editVariant;

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
    if (editVariant) {
      setVariant(editVariant.variant);
      setDateAdded(editVariant.date_added);
      setNotes(editVariant.notes || '');
    } else {
      setVariant(''); setDateAdded(today); setNotes('');
    }
    if (showSearch) {
      setChosenWord(null); setWordSearch('');
      getWords().then(setAllWords);
    }
  }, [visible, editVariant, word, today, showSearch]);

  const filtered = wordSearch.trim()
    ? allWords.filter(w => w.word.toLowerCase().includes(wordSearch.toLowerCase()))
    : allWords;

  const handleDelete = () => {
    if (!editVariant) return;
    Alert.alert(
      t('variants.deleteTitle'),
      t('variants.deleteMessage', { variant: editVariant.variant }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.remove'), style: 'destructive', onPress: async () => {
          await deleteVariant(editVariant.id);
          onClose();
          onDeleted?.();
        }},
      ]
    );
  };

  const handleSave = async () => {
    if (!variant.trim()) { Alert.alert(t('common.attention'), t('addVariant.errorVariant')); return; }
    if (!editVariant && !effectiveWord) { Alert.alert(t('common.attention'), t('addVariant.errorSelectWord')); return; }
    setLoading(true);
    try {
      if (editVariant) {
        await updateVariant(editVariant.id, variant.trim(), dateAdded, notes);
      } else {
        await addVariant(effectiveWord!.id, variant.trim(), dateAdded, notes);
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
        <Animated.View style={[s.container, { paddingBottom: 24 + insets.bottom, transform: [{ translateY }] }]}>
          <View style={s.handleWrap} {...panResponder.panHandlers}>
            <View style={s.handle} />
          </View>

          <View style={s.header}>
            <Text style={[s.title, editVariant && s.titleLeft]} testID={editVariant ? 'modal-title-edit-variant' : 'modal-title-new-variant'}>{editVariant ? t('addVariant.titleEdit') : t('addVariant.titleNew')}</Text>
            {editVariant && (
              <TouchableOpacity style={s.deleteBtn} onPress={handleDelete} testID="variant-delete-btn">
                <Text style={s.deleteBtnText}>🗑️ {t('common.remove')}</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* ── Word search ── */}
            {showSearch && (
              <View style={s.searchSection}>
                <Text style={s.label}>{t('addVariant.wordLabel')}</Text>
                {chosenWord ? (
                  <TouchableOpacity style={s.chosenChip} onPress={() => setChosenWord(null)}>
                    <Text style={s.chosenText}>{chosenWord.word}</Text>
                    <Text style={s.chosenClear}>{t('addVariant.changeWord')}</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <View style={s.searchBox}>
                      <Text style={s.searchIcon}>🔍</Text>
                      <TextInput
                        style={s.searchInput}
                        value={wordSearch}
                        onChangeText={setWordSearch}
                        placeholder={t('addVariant.wordSearchPlaceholder')}
                        placeholderTextColor={COLORS.textLight}
                        autoCapitalize="none"
                        testID="variant-word-search"
                      />
                      {wordSearch.length > 0 && (
                        <TouchableOpacity onPress={() => setWordSearch('')}>
                          <Text style={s.searchClear}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={s.wordList}>
                      {filtered.length === 0
                        ? <Text style={s.noWords}>{t('addVariant.noWordsFound')}</Text>
                        : filtered.slice(0, 7).map(w => (
                          <TouchableOpacity
                            key={w.id} style={s.wordItem}
                            onPress={() => { setChosenWord(w); setWordSearch(''); }}
                          >
                            <Text style={s.wordItemText}>{w.word}</Text>
                            {w.category_name && (
                              <Text style={s.wordItemCat}>{w.category_emoji} {categoryName(w.category_name)}</Text>
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
              <View style={s.contextRow}>
                <Text style={s.contextLabel}>{t('addVariant.forWord')}</Text>
                <Text style={s.contextWord}>&ldquo;{effectiveWord.word}&rdquo;</Text>
              </View>
            )}

            {/* ── Variant text ── */}
            <Text style={s.label}>{t('addVariant.variantLabel')}</Text>
            <TextInput
              testID="variant-input"
              style={s.input}
              value={variant} onChangeText={setVariant}
              placeholder={effectiveWord
                ? t('addVariant.variantPlaceholder', { word: effectiveWord.word })
                : t('addVariant.variantPlaceholderGeneric')}
              placeholderTextColor={COLORS.textLight}
              autoCapitalize="none"
            />

            {/* ── Date ── */}
            <DatePickerField label={t('common.date')} value={dateAdded} onChange={setDateAdded} accentColor={COLORS.secondary} />

            {/* ── Notes ── */}
            <Text style={s.label}>{t('common.notes').toUpperCase()}</Text>
            <TextInput
              style={[s.input, s.textArea]} value={notes} onChangeText={setNotes}
              placeholder={t('addVariant.notesPlaceholder')}
              placeholderTextColor={COLORS.textLight} multiline numberOfLines={3}
              testID="variant-notes-input"
            />

            <View style={s.actions}>
              <Button title={t('common.cancel')} onPress={onClose} variant="outline" style={s.actionBtn} />
              <Button
                title={editVariant ? t('addVariant.btnSave') : t('addVariant.btnAdd')}
                onPress={handleSave} loading={loading} style={s.actionBtn}
              />
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  backdrop:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  overlay:      { flex: 1, justifyContent: 'flex-end' },
  container:    { backgroundColor: COLORS.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '92%' },
  handleWrap:   { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 10, marginBottom: 10 },
  handle:       { width: 40, height: 4, backgroundColor: COLORS.textLight, borderRadius: 2 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title:        { fontSize: 22, fontWeight: '800', color: COLORS.text, textAlign: 'center', flex: 1 },
  titleLeft:    { textAlign: 'left' },
  deleteBtn:    { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: COLORS.error + '20', borderRadius: 12 },
  deleteBtnText:{ fontSize: 13, fontWeight: '700', color: COLORS.error },
  label:        { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:        { backgroundColor: COLORS.white, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: COLORS.text, borderWidth: 1.5, borderColor: COLORS.border, marginBottom: 16 },
  textArea:     { height: 80, textAlignVertical: 'top' },
  actions:      { flexDirection: 'row', gap: 12, marginTop: 8, paddingBottom: 16 },
  actionBtn:    { flex: 1 },
  searchSection:{ marginBottom: 16 },
  searchBox:    { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1.5, borderColor: COLORS.border, marginBottom: 6 },
  searchIcon:   { fontSize: 16, marginRight: 8 },
  searchInput:  { flex: 1, fontSize: 15, color: COLORS.text },
  searchClear:  { fontSize: 14, color: COLORS.textLight, padding: 4 },
  wordList:     { backgroundColor: COLORS.white, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.border, overflow: 'hidden' },
  wordItem:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  wordItemText: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  wordItemCat:  { fontSize: 12, color: COLORS.textSecondary },
  noWords:      { textAlign: 'center', color: COLORS.textSecondary, padding: 16, fontSize: 14 },
  chosenChip:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.secondary + '15', borderRadius: 14, borderWidth: 2, borderColor: COLORS.secondary, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 4 },
  chosenText:   { fontSize: 17, fontWeight: '800', color: COLORS.secondary },
  chosenClear:  { fontSize: 13, color: COLORS.secondary, fontWeight: '600' },
  contextRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 12, backgroundColor: COLORS.secondary + '10', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  contextLabel: { fontSize: 14, color: COLORS.textSecondary },
  contextWord:  { fontSize: 14, fontWeight: '800', color: COLORS.text },
});
