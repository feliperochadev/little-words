import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  StyleSheet, ScrollView, Alert,
} from 'react-native';
import { COLORS, CATEGORY_COLORS, CATEGORY_EMOJIS } from '../utils/theme';
import { addCategory } from '../database/database';
import { Button } from './UIComponents';
import { useI18n } from '../i18n/i18n';

interface AddCategoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({ visible, onClose, onSave }) => {
  const { t } = useI18n();

  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(CATEGORY_COLORS[0]);
  const [selectedEmoji, setSelectedEmoji] = useState(CATEGORY_EMOJIS[0]);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setName('');
    setSelectedColor(CATEGORY_COLORS[0]);
    setSelectedEmoji(CATEGORY_EMOJIS[0]);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t('common.attention'), t('addCategory.errorName'));
      return;
    }
    setLoading(true);
    try {
      await addCategory(name.trim(), selectedColor, selectedEmoji);
      onSave();
      handleClose();
    } catch (e: any) {
      console.error('addCategory error:', e);
      const msg = e?.message || '';
      Alert.alert(
        t('common.error'),
        msg.includes('UNIQUE') ? t('addCategory.errorDuplicate') : msg || t('addCategory.errorName')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.handle} />
          <Text style={styles.title}>{t('addCategory.title')}</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Preview */}
            <View style={[styles.preview, { borderColor: selectedColor }]}>
              <Text style={styles.previewEmoji}>{selectedEmoji}</Text>
              <Text style={[styles.previewName, { color: selectedColor }]}>
                {name.trim() || t('addCategory.previewNamePlaceholder')}
              </Text>
            </View>

            <Text style={styles.label}>{t('addCategory.nameLabel')}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t('addCategory.namePlaceholder')}
              placeholderTextColor={COLORS.textLight}
              autoFocus
              autoCapitalize="words"
            />

            <Text style={styles.label}>{t('addCategory.emojiLabel')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiScroll}>
              {CATEGORY_EMOJIS.map(emoji => (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.emojiBtn, selectedEmoji === emoji && { backgroundColor: selectedColor + '30', borderColor: selectedColor }]}
                  onPress={() => setSelectedEmoji(emoji)}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>{t('addCategory.colorLabel')}</Text>
            <View style={styles.colorGrid}>
              {CATEGORY_COLORS.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorBtn, { backgroundColor: color }, selectedColor === color && styles.colorBtnSelected]}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor === color && <Text style={styles.colorCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.actions}>
              <Button title={t('addCategory.btnCancel')} onPress={handleClose} variant="outline" style={styles.actionBtn} />
              <Button title={t('addCategory.btnCreate')} onPress={handleSave} loading={loading} style={styles.actionBtn} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container:        { backgroundColor: COLORS.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '90%' },
  handle:           { width: 40, height: 4, backgroundColor: COLORS.textLight, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title:            { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 20, textAlign: 'center' },
  preview:          { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 16, borderWidth: 2, padding: 14, marginBottom: 20, gap: 10 },
  previewEmoji:     { fontSize: 28 },
  previewName:      { fontSize: 18, fontWeight: '700' },
  label:            { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:            { backgroundColor: COLORS.white, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: COLORS.text, borderWidth: 1.5, borderColor: COLORS.border, marginBottom: 16 },
  emojiScroll:      { marginBottom: 16 },
  emojiBtn:         { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 8, borderWidth: 2, borderColor: 'transparent', backgroundColor: COLORS.white },
  emojiText:        { fontSize: 24 },
  colorGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  colorBtn:         { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  colorBtnSelected: { borderWidth: 3, borderColor: COLORS.text, transform: [{ scale: 1.15 }] },
  colorCheck:       { color: COLORS.white, fontSize: 18, fontWeight: '900' },
  actions:          { flexDirection: 'row', gap: 12, marginTop: 8, paddingBottom: 16 },
  actionBtn:        { flex: 1 },
});
