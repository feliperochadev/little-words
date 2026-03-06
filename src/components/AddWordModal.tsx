import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  StyleSheet, ScrollView, Alert,
} from 'react-native';
import { COLORS } from '../utils/theme';
import { Category, getCategories, addWord, updateWord, addVariant, deleteVariant, getVariantsByWord, findWordByName, Word, Variant } from '../database/database';
import { Button, CategoryBadge } from './UIComponents';
import { DatePickerField } from './DatePickerField';

interface AddWordModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  editWord?: Word | null;
  onEditDuplicate?: (word: Word) => void;
}

interface VariantEntry {
  key: string;
  text: string;
}

export const AddWordModal: React.FC<AddWordModalProps> = ({ visible, onClose, onSave, editWord, onEditDuplicate }) => {
  const today = new Date().toISOString().split('T')[0];

  const [word, setWord]                   = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [dateAdded, setDateAdded]         = useState(today);
  const [notes, setNotes]                 = useState('');
  const [categories, setCategories]       = useState<Category[]>([]);
  const [loading, setLoading]             = useState(false);
  const [duplicate, setDuplicate]         = useState<Word | null>(null);
  const [variants, setVariants]           = useState<VariantEntry[]>([]);
  const [existingVariants, setExistingVariants] = useState<Variant[]>([]);

  // Reset form on open
  useEffect(() => {
    if (!visible) return;
    getCategories().then(setCategories);
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
    }
    setDuplicate(null);
  }, [visible, editWord]);

  // Duplicate detection
  useEffect(() => {
    if (editWord || !word.trim()) { setDuplicate(null); return; }
    const t = setTimeout(async () => setDuplicate(await findWordByName(word.trim())), 400);
    return () => clearTimeout(t);
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
    if (!word.trim()) { Alert.alert('Atenção', 'Digite uma palavra.'); return; }
    if (duplicate)    { Alert.alert('Palavra já existe', `"${duplicate.word}" já foi registrada.`); return; }
    setLoading(true);
    try {
      let wordId: number;
      if (editWord) {
        await updateWord(editWord.id, word.trim(), selectedCategory, dateAdded, notes);
        wordId = editWord.id;
      } else {
        wordId = await addWord(word.trim(), selectedCategory, dateAdded, notes);
      }
      for (const v of variants.filter(v => v.text.trim())) {
        await addVariant(wordId, v.text.trim(), dateAdded);
      }
      onSave(); onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.overlay}>
        <View style={s.container}>
          <View style={s.handle} />
          <Text style={s.title}>{editWord ? '✏️ Editar Palavra' : '✨ Nova Palavra'}</Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* ── Word ── */}
            <Text style={s.label}>Palavra *</Text>
            <TextInput
              style={[s.input, duplicate && s.inputDup]}
              value={word} onChangeText={setWord}
              placeholder="Ex: mamãe, cachorro..."
              placeholderTextColor={COLORS.textLight}
              autoFocus autoCapitalize="none"
            />

            {duplicate && (
              <TouchableOpacity
                style={s.dupCard}
                onPress={() => onEditDuplicate && onEditDuplicate(duplicate)}
                activeOpacity={onEditDuplicate ? 0.7 : 1}
              >
                <View style={s.dupCardHeader}>
                  <Text style={s.dupTitle}>⚠️ Palavra já existe</Text>
                  {onEditDuplicate && <Text style={s.dupEditHint}>Toque para editar →</Text>}
                </View>
                <View style={s.dupRecord}>
                  <Text style={s.dupWord}>{duplicate.word}</Text>
                  <View style={s.dupMeta}>
                    {duplicate.category_name && (
                      <CategoryBadge name={duplicate.category_name} color={duplicate.category_color || COLORS.primary} emoji={duplicate.category_emoji || '📝'} size="small" />
                    )}
                    <Text style={s.dupDate}>📅 {formatDate(duplicate.date_added)}</Text>
                    {(duplicate.variant_count ?? 0) > 0 && (
                      <Text style={s.dupVariants}>🗣️ {duplicate.variant_count} variante{(duplicate.variant_count ?? 0) !== 1 ? 's' : ''}</Text>
                    )}
                  </View>
                  {duplicate.notes && <Text style={s.dupNotes} numberOfLines={2}>💬 {duplicate.notes}</Text>}
                </View>
              </TouchableOpacity>
            )}

            {/* ── Date ── */}
            <DatePickerField label="Data" value={dateAdded} onChange={setDateAdded} accentColor={COLORS.primary} />

            {/* ── Category ── */}
            <Text style={s.label}>Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[s.catChip, { borderColor: cat.color }, selectedCategory === cat.id && { backgroundColor: cat.color }]}
                  onPress={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                >
                  <Text style={s.catEmoji}>{cat.emoji}</Text>
                  <Text style={[s.catName, selectedCategory === cat.id && { color: COLORS.white }]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* ── Variants ── */}
            <>
              <View style={s.varHeader}>
                <Text style={s.label}>Variantes</Text>
                <TouchableOpacity style={s.addVarBtn} onPress={addVariantRow}>
                  <Text style={s.addVarBtnText}>＋ Adicionar</Text>
                </TouchableOpacity>
              </View>

              {/* Existing variants (edit mode) */}
              {existingVariants.map(v => (
                <View key={v.id} style={s.existingVarRow}>
                  <Text style={s.existingVarText}>🗣️ {v.variant}</Text>
                  <TouchableOpacity
                    style={s.varRemove}
                    onPress={() => {
                      deleteVariant(v.id).then(() =>
                        setExistingVariants(prev => prev.filter(e => e.id !== v.id))
                      );
                    }}
                  >
                    <Text style={s.varRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {/* New variant inputs */}
              {variants.map((v, i) => (
                <View key={v.key} style={s.varRow}>
                  <View style={s.varBadge}><Text style={s.varBadgeText}>{existingVariants.length + i + 1}</Text></View>
                  <TextInput
                    style={s.varInput}
                    value={v.text}
                    onChangeText={t => updateVariantRow(v.key, t)}
                    placeholder={`Como disse "${word || 'a palavra'}"`}
                    placeholderTextColor={COLORS.textLight}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={s.varRemove} onPress={() => removeVariantRow(v.key)}>
                    <Text style={s.varRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {existingVariants.length === 0 && variants.length === 0 && (
                <Text style={s.varHint}>Como a criança pronuncia esta palavra?</Text>
              )}

              {(existingVariants.length > 0 || variants.length > 0) && (
                <TouchableOpacity style={s.addAnotherBtn} onPress={addVariantRow}>
                  <Text style={s.addAnotherText}>＋ Outra variante</Text>
                </TouchableOpacity>
              )}
            </>

            {/* ── Notes ── */}
            <Text style={s.label}>Observações</Text>
            <TextInput
              style={[s.input, s.textArea]} value={notes} onChangeText={setNotes}
              placeholder="Contexto, situação em que falou..."
              placeholderTextColor={COLORS.textLight} multiline numberOfLines={3}
            />

            <View style={s.actions}>
              <Button title="Cancelar" onPress={onClose} variant="outline" style={s.actionBtn} />
              <Button
                title={editWord ? 'Salvar' : 'Adicionar'}
                onPress={handleSave} loading={loading}
                style={[s.actionBtn, !!duplicate && s.btnDisabled]}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container:    { backgroundColor: COLORS.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '92%' },
  handle:       { width: 40, height: 4, backgroundColor: COLORS.textLight, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title:        { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 20, textAlign: 'center' },
  label:        { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:        { backgroundColor: COLORS.white, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: COLORS.text, borderWidth: 1.5, borderColor: COLORS.border, marginBottom: 16 },
  inputDup:     { borderColor: '#E17055', backgroundColor: '#FFF5F4' },
  dupCard:      { backgroundColor: '#FFF5F4', borderRadius: 14, borderWidth: 1.5, borderColor: '#E17055', padding: 14, marginTop: -8, marginBottom: 16 },
  dupTitle:     { fontSize: 13, fontWeight: '700', color: '#E17055' },
  dupCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dupEditHint:   { fontSize: 12, fontWeight: '600', color: '#E17055', opacity: 0.7 },
  dupRecord:    { backgroundColor: COLORS.white, borderRadius: 10, padding: 12 },
  dupWord:      { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  dupMeta:      { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  dupDate:      { fontSize: 12, color: COLORS.textSecondary },
  dupVariants:  { fontSize: 12, color: COLORS.secondary, fontWeight: '600' },
  dupNotes:     { fontSize: 12, color: COLORS.textSecondary, marginTop: 6 },
  textArea:     { height: 80, textAlignVertical: 'top' },
  catScroll:    { marginBottom: 16 },
  catChip:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 2, marginRight: 8, backgroundColor: COLORS.white },
  catEmoji:     { fontSize: 16, marginRight: 6 },
  catName:      { fontSize: 13, fontWeight: '600', color: COLORS.text },
  varHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  addVarBtn:    { backgroundColor: COLORS.secondary + '20', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 },
  addVarBtnText:{ fontSize: 13, fontWeight: '700', color: COLORS.secondary },
  varHint:      { fontSize: 13, color: COLORS.textLight, fontStyle: 'italic', marginBottom: 16 },
  existingVarRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.secondary + '10', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 8, borderWidth: 1.5, borderColor: COLORS.secondary + '30' },
  existingVarText: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text },
  varRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  varBadge:     { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.secondary + '20', alignItems: 'center', justifyContent: 'center' },
  varBadgeText: { fontSize: 13, fontWeight: '700', color: COLORS.secondary },
  varInput:     { flex: 1, backgroundColor: COLORS.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.text, borderWidth: 1.5, borderColor: COLORS.border },
  varRemove:    { padding: 6 },
  varRemoveText:{ fontSize: 16, color: COLORS.textLight, fontWeight: '700' },
  addAnotherBtn:{ alignSelf: 'flex-start', marginBottom: 16, backgroundColor: COLORS.secondary + '10', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, borderColor: COLORS.secondary + '40' },
  addAnotherText:{ fontSize: 13, color: COLORS.secondary, fontWeight: '700' },
  actions:      { flexDirection: 'row', gap: 12, marginTop: 8, paddingBottom: 16 },
  actionBtn:    { flex: 1 },
  btnDisabled:  { opacity: 0.5 },
});