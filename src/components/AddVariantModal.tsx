import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Modal, StyleSheet,
  Alert, TouchableOpacity, ScrollView,
} from 'react-native';
import { COLORS } from '../utils/theme';
import { addVariant, updateVariant, getWords, Variant, Word } from '../database/database';
import { Button } from './UIComponents';
import { DatePickerField } from './DatePickerField';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  word: Word | null;          // pre-selected word (from words screen); null = show search
  editVariant?: Variant | null;
}

export const AddVariantModal: React.FC<Props> = ({ visible, onClose, onSave, word, editVariant }) => {
  const today = new Date().toISOString().split('T')[0];

  const [variant, setVariant]       = useState('');
  const [dateAdded, setDateAdded]   = useState(today);
  const [notes, setNotes]           = useState('');
  const [loading, setLoading]       = useState(false);

  // word search state — only used when word prop is null and not editing
  const [allWords, setAllWords]     = useState<Word[]>([]);
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
    if (showSearch) {
      setChosenWord(null); setWordSearch('');
      getWords().then(setAllWords);
    }
  }, [visible, editVariant, word]);

  const filtered = wordSearch.trim()
    ? allWords.filter(w => w.word.toLowerCase().includes(wordSearch.toLowerCase()))
    : allWords;

  const handleSave = async () => {
    if (!variant.trim()) { Alert.alert('Atenção', 'Digite a variante.'); return; }
    if (!editVariant && !effectiveWord) { Alert.alert('Atenção', 'Selecione uma palavra.'); return; }
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
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.overlay}>
        <View style={s.container}>
          <View style={s.handle} />
          <Text style={s.title}>{editVariant ? '✏️ Editar Variante' : '🗣️ Nova Variante'}</Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* ── Word search (only when no word pre-selected) ── */}
            {showSearch && (
              <View style={s.searchSection}>
                <Text style={s.label}>Palavra *</Text>

                {chosenWord ? (
                  /* chosen chip */
                  <TouchableOpacity style={s.chosenChip} onPress={() => setChosenWord(null)}>
                    <Text style={s.chosenText}>{chosenWord.word}</Text>
                    <Text style={s.chosenClear}>✕ trocar</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    {/* search box */}
                    <View style={s.searchBox}>
                      <Text style={s.searchIcon}>🔍</Text>
                      <TextInput
                        style={s.searchInput}
                        value={wordSearch}
                        onChangeText={setWordSearch}
                        placeholder="Buscar palavra..."
                        placeholderTextColor={COLORS.textLight}
                        autoCapitalize="none"
                      />
                      {wordSearch.length > 0 && (
                        <TouchableOpacity onPress={() => setWordSearch('')}>
                          <Text style={s.searchClear}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* results list */}
                    <View style={s.wordList}>
                      {filtered.length === 0
                        ? <Text style={s.noWords}>Nenhuma palavra encontrada</Text>
                        : filtered.slice(0, 7).map(w => (
                          <TouchableOpacity
                            key={w.id} style={s.wordItem}
                            onPress={() => { setChosenWord(w); setWordSearch(''); }}
                          >
                            <Text style={s.wordItemText}>{w.word}</Text>
                            {w.category_name && (
                              <Text style={s.wordItemCat}>{w.category_emoji} {w.category_name}</Text>
                            )}
                          </TouchableOpacity>
                        ))
                      }
                    </View>
                  </>
                )}
              </View>
            )}

            {/* context label when word is pre-selected */}
            {effectiveWord && !editVariant && (
              <View style={s.contextRow}>
                <Text style={s.contextLabel}>Para a palavra </Text>
                <Text style={s.contextWord}>"{effectiveWord.word}"</Text>
              </View>
            )}

            {/* ── Variant text ── */}
            <Text style={s.label}>Variante *</Text>
            <TextInput
              style={s.input}
              value={variant} onChangeText={setVariant}
              placeholder={effectiveWord ? `Como a criança diz "${effectiveWord.word}"` : 'Como a criança pronuncia...'}
              placeholderTextColor={COLORS.textLight}
              autoCapitalize="none"
            />

            {/* ── Date ── */}
            <DatePickerField label="Data" value={dateAdded} onChange={setDateAdded} accentColor={COLORS.secondary} />

            {/* ── Notes ── */}
            <Text style={s.label}>Observações</Text>
            <TextInput
              style={[s.input, s.textArea]} value={notes} onChangeText={setNotes}
              placeholder="Contexto em que falou..."
              placeholderTextColor={COLORS.textLight} multiline numberOfLines={3}
            />

            <View style={s.actions}>
              <Button title="Cancelar" onPress={onClose} variant="outline" style={s.actionBtn} />
              <Button title={editVariant ? 'Salvar' : 'Adicionar'} onPress={handleSave} loading={loading} style={s.actionBtn} />
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
  title:        { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 16, textAlign: 'center' },
  label:        { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:        { backgroundColor: COLORS.white, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: COLORS.text, borderWidth: 1.5, borderColor: COLORS.border, marginBottom: 16 },
  textArea:     { height: 80, textAlignVertical: 'top' },
  actions:      { flexDirection: 'row', gap: 12, marginTop: 8, paddingBottom: 16 },
  actionBtn:    { flex: 1 },

  // word search
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

  // context
  contextRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 12, backgroundColor: COLORS.secondary + '10', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  contextLabel: { fontSize: 14, color: COLORS.textSecondary },
  contextWord:  { fontSize: 14, fontWeight: '800', color: COLORS.text },
});