import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Modal, StyleSheet, Alert
} from 'react-native';
import { COLORS } from '../utils/theme';
import { addVariant, updateVariant, Variant, Word } from '../database/database';
import { Button } from './UIComponents';

interface AddVariantModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  word: Word | null;
  editVariant?: Variant | null;
}

export const AddVariantModal: React.FC<AddVariantModalProps> = ({
  visible, onClose, onSave, word, editVariant,
}) => {
  const [variant, setVariant] = useState('');
  const [dateAdded, setDateAdded] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      if (editVariant) {
        setVariant(editVariant.variant);
        setDateAdded(editVariant.date_added);
        setNotes(editVariant.notes || '');
      } else {
        setVariant('');
        setDateAdded(new Date().toISOString().split('T')[0]);
        setNotes('');
      }
    }
  }, [visible, editVariant]);

  const handleSave = async () => {
    if (!variant.trim()) {
      Alert.alert('Atenção', 'Por favor, digite a variante.');
      return;
    }
    setLoading(true);
    try {
      if (editVariant) {
        await updateVariant(editVariant.id, variant.trim(), dateAdded, notes);
      } else {
        if (!word) return;
        await addVariant(word.id, variant.trim(), dateAdded, notes);
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
          <Text style={styles.title}>
            {editVariant ? '✏️ Editar Variante' : '🗣️ Nova Variante'}
          </Text>
          {word && !editVariant && (
            <Text style={styles.subtitle}>
              Como {word.word.toLowerCase()} foi dito de forma diferente?
            </Text>
          )}

          <Text style={styles.label}>Variante *</Text>
          <TextInput
            style={styles.input}
            value={variant}
            onChangeText={setVariant}
            placeholder={word ? `Ex: como a criança disse "${word.word}"` : 'Variante...'}
            placeholderTextColor={COLORS.textLight}
            autoFocus
            autoCapitalize="none"
          />

          <Text style={styles.label}>Data</Text>
          <TextInput
            style={styles.input}
            value={dateAdded}
            onChangeText={setDateAdded}
            placeholder="AAAA-MM-DD"
            placeholderTextColor={COLORS.textLight}
          />

          <Text style={styles.label}>Observações</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Contexto em que falou..."
            placeholderTextColor={COLORS.textLight}
            multiline
            numberOfLines={3}
          />

          <View style={styles.actions}>
            <Button title="Cancelar" onPress={onClose} variant="outline" style={styles.actionBtn} />
            <Button
              title={editVariant ? 'Salvar' : 'Adicionar'}
              onPress={handleSave}
              loading={loading}
              style={styles.actionBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, maxHeight: '85%',
  },
  handle: {
    width: 40, height: 4, backgroundColor: COLORS.textLight,
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 4, textAlign: 'center' },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 20 },
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
  textArea: { height: 80, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  actionBtn: { flex: 1 },
});