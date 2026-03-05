import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  StyleSheet, ScrollView, Alert,
} from 'react-native';
import { COLORS } from '../utils/theme';
import { Category, getCategories, addWord, updateWord, findWordByName, Word } from '../database/database';
import { Button, CategoryBadge } from './UIComponents';

interface AddWordModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  editWord?: Word | null;
}

export const AddWordModal: React.FC<AddWordModalProps> = ({ visible, onClose, onSave, editWord }) => {
  const [word, setWord] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [dateAdded, setDateAdded] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [duplicate, setDuplicate] = useState<Word | null>(null);

  useEffect(() => {
    if (visible) {
      loadCategories();
      if (editWord) {
        setWord(editWord.word);
        setSelectedCategory(editWord.category_id);
        setDateAdded(editWord.date_added);
        setNotes(editWord.notes || '');
      } else {
        setWord('');
        setSelectedCategory(null);
        setDateAdded(new Date().toISOString().split('T')[0]);
        setNotes('');
      }
      setDuplicate(null);
    }
  }, [visible, editWord]);

  // Check for duplicate as user types (debounced feel via useEffect)
  useEffect(() => {
    if (editWord || !word.trim()) {
      setDuplicate(null);
      return;
    }
    const timer = setTimeout(async () => {
      const found = await findWordByName(word.trim());
      setDuplicate(found);
    }, 400);
    return () => clearTimeout(timer);
  }, [word, editWord]);

  const loadCategories = async () => {
    const cats = await getCategories();
    setCategories(cats);
  };

  const formatDate = (date: string) => {
    if (!date) return '';
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  };

  const handleSave = async () => {
    if (!word.trim()) {
      Alert.alert('Atenção', 'Por favor, digite uma palavra.');
      return;
    }
    if (duplicate) {
      Alert.alert('Palavra já existe', `"${duplicate.word}" já foi registrada.`);
      return;
    }
    setLoading(true);
    try {
      if (editWord) {
        await updateWord(editWord.id, word.trim(), selectedCategory, dateAdded, notes);
      } else {
        await addWord(word.trim(), selectedCategory, dateAdded, notes);
      }
      onSave();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.handle} />
          <Text style={styles.title}>{editWord ? '✏️ Editar Palavra' : '✨ Nova Palavra'}</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Palavra *</Text>
            <TextInput
              style={[styles.input, duplicate ? styles.inputDuplicate : null]}
              value={word}
              onChangeText={setWord}
              placeholder="Ex: mamãe, cachorro..."
              placeholderTextColor={COLORS.textLight}
              autoFocus
              autoCapitalize="none"
            />

            {/* Duplicate warning card */}
            {duplicate && (
              <View style={styles.duplicateCard}>
                <Text style={styles.duplicateTitle}>⚠️ Palavra já existe</Text>
                <View style={styles.duplicateRecord}>
                  <Text style={styles.duplicateWord}>{duplicate.word}</Text>
                  <View style={styles.duplicateMeta}>
                    {duplicate.category_name && (
                      <CategoryBadge
                        name={duplicate.category_name}
                        color={duplicate.category_color || COLORS.primary}
                        emoji={duplicate.category_emoji || '📝'}
                        size="small"
                      />
                    )}
                    <Text style={styles.duplicateDate}>📅 {formatDate(duplicate.date_added)}</Text>
                    {(duplicate.variant_count ?? 0) > 0 && (
                      <Text style={styles.duplicateVariants}>🗣️ {duplicate.variant_count} variante{(duplicate.variant_count ?? 0) !== 1 ? 's' : ''}</Text>
                    )}
                  </View>
                  {duplicate.notes && (
                    <Text style={styles.duplicateNotes} numberOfLines={2}>💬 {duplicate.notes}</Text>
                  )}
                </View>
              </View>
            )}

            <Text style={styles.label}>Data</Text>
            <TextInput
              style={styles.input}
              value={dateAdded}
              onChangeText={setDateAdded}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={COLORS.textLight}
            />

            <Text style={styles.label}>Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    { borderColor: cat.color },
                    selectedCategory === cat.id && { backgroundColor: cat.color },
                  ]}
                  onPress={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                >
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.categoryName, selectedCategory === cat.id && { color: COLORS.white }]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Observações</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Contexto, situação em que falou..."
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={3}
            />

            <View style={styles.actions}>
              <Button title="Cancelar" onPress={onClose} variant="outline" style={styles.actionBtn} />
              <Button
                title={editWord ? 'Salvar' : 'Adicionar'}
                onPress={handleSave}
                loading={loading}
                style={[styles.actionBtn, !!duplicate && styles.btnDisabled]}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '90%',
  },
  handle: {
    width: 40, height: 4,
    backgroundColor: COLORS.textLight,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22, fontWeight: '800', color: COLORS.text,
    marginBottom: 20, textAlign: 'center',
  },
  label: {
    fontSize: 13, fontWeight: '700', color: COLORS.textSecondary,
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.white, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: COLORS.text,
    borderWidth: 1.5, borderColor: COLORS.border, marginBottom: 16,
  },
  inputDuplicate: {
    borderColor: '#E17055',
    backgroundColor: '#FFF5F4',
  },
  duplicateCard: {
    backgroundColor: '#FFF5F4',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E17055',
    padding: 14,
    marginTop: -8,
    marginBottom: 16,
  },
  duplicateTitle: {
    fontSize: 13, fontWeight: '700', color: '#E17055',
    marginBottom: 10,
  },
  duplicateRecord: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 12,
  },
  duplicateWord: {
    fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 6,
  },
  duplicateMeta: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6,
  },
  duplicateDate: { fontSize: 12, color: COLORS.textSecondary },
  duplicateVariants: { fontSize: 12, color: COLORS.secondary, fontWeight: '600' },
  duplicateNotes: { fontSize: 12, color: COLORS.textSecondary, marginTop: 6 },
  textArea: { height: 80, textAlignVertical: 'top' },
  categoryScroll: { marginBottom: 16 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 2,
    marginRight: 8, backgroundColor: COLORS.white,
  },
  categoryEmoji: { fontSize: 16, marginRight: 6 },
  categoryName: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8, paddingBottom: 16 },
  actionBtn: { flex: 1 },
  btnDisabled: { opacity: 0.5 },
});