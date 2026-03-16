import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  StyleSheet, ScrollView, Alert, Animated,
} from 'react-native';
import { COLORS, CATEGORY_COLORS, CATEGORY_EMOJIS } from '../utils/theme';
import { withOpacity } from '../utils/colorHelpers';
import { Button } from './UIComponents';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n, useCategoryName } from '../i18n/i18n';
import { useAddCategory, useUpdateCategory, useDeleteCategory, useWordCountByCategory } from '../hooks/useCategories';
import { useModalAnimation } from '../hooks/useModalAnimation';

export interface CategoryToEdit {
  id: number;
  name: string;
  color: string;
  emoji: string;
}

interface AddCategoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (id?: number) => void;
  onDeleted?: () => void;
  editCategory?: CategoryToEdit | null;
}

export function AddCategoryModal({
  visible, onClose, onSave, onDeleted, editCategory,
}: Readonly<AddCategoryModalProps>) {
  const { t } = useI18n();
  const categoryName = useCategoryName();
  const insets = useSafeAreaInsets();
  const isEditing = !!editCategory;

  const addCategoryMutation    = useAddCategory();
  const updateCategoryMutation = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();
  const { data: wordCount = 0 } = useWordCountByCategory(editCategory?.id ?? 0);

  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(CATEGORY_COLORS[0]);
  const [selectedEmoji, setSelectedEmoji] = useState(CATEGORY_EMOJIS[0]);
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setName('');
    setSelectedColor(CATEGORY_COLORS[0]);
    setSelectedEmoji(CATEGORY_EMOJIS[0]);
    onClose();
  };

  // Modal animation and gesture handling
  const { translateY, backdropOpacity, dismissModal, panResponder } = useModalAnimation(visible, onClose);

  useEffect(() => {
    if (editCategory) {
      setName(editCategory.name);
      setSelectedColor(editCategory.color);
      setSelectedEmoji(editCategory.emoji);
    } else {
      setName('');
      setSelectedColor(CATEGORY_COLORS[0]);
      setSelectedEmoji(CATEGORY_EMOJIS[0]);
    }
  }, [editCategory, visible]);

  const handleDelete = () => {
    if (!editCategory) return;
    const displayName = categoryName(editCategory.name);
    const message = wordCount > 0
      ? t('manageCategory.deleteMessageWithWords', { name: displayName, count: wordCount })
      : t('manageCategory.deleteMessage', { name: displayName });

    Alert.alert(
      t('manageCategory.deleteTitle'),
      message,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: () => {
            deleteCategoryMutation.mutateAsync({ id: editCategory.id }).then(() => {
              handleClose();
              onDeleted?.();
            });
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t('common.attention'), t('addCategory.errorName'));
      return;
    }
    setLoading(true);
    try {
      let id: number | undefined;
      if (isEditing && editCategory) {
        await updateCategoryMutation.mutateAsync({ id: editCategory.id, name: name.trim(), color: selectedColor, emoji: selectedEmoji });
        id = editCategory.id;
      } else {
        id = await addCategoryMutation.mutateAsync({ name: name.trim(), color: selectedColor, emoji: selectedEmoji });
      }
      onSave(id);
      handleClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      Alert.alert(
        t('common.error'),
        msg.includes('UNIQUE') ? t('addCategory.errorDuplicate') : msg || t('addCategory.errorName')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={dismissModal}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={dismissModal} />
      </Animated.View>
      <View style={styles.overlay} pointerEvents="box-none">
        <Animated.View style={[styles.container, { paddingBottom: 24 + insets.bottom, transform: [{ translateY }] }]}>
          <View style={styles.handleWrap} {...panResponder.panHandlers}>
            <View style={styles.handle} />
          </View>


          {/* Header row */}
          <View style={styles.header}>
            <Text style={[styles.title, isEditing && styles.titleLeft]} testID={isEditing ? 'modal-title-edit-category' : 'modal-title-new-category'}>
              {isEditing ? t('addCategory.titleEdit') : t('addCategory.title')}
            </Text>
            {isEditing && (
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} testID="category-delete-btn">
                <Text style={styles.deleteBtnText}>🗑️ {t('common.remove')}</Text>
              </TouchableOpacity>
            )}
          </View>

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
              testID="category-name-input"
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
              <Button
                title={isEditing ? t('addCategory.btnSave') : t('addCategory.btnCreate')}
                onPress={handleSave}
                loading={loading}
                style={styles.actionBtn}
                testID="category-save-btn"
              />
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop:         { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  overlay:          { flex: 1, justifyContent: 'flex-end' },
  container:        { backgroundColor: COLORS.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '90%' },
  handleWrap:       { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 10, marginBottom: 10 },
  handle:           { width: 40, height: 4, backgroundColor: COLORS.textLight, borderRadius: 2 },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title:            { fontSize: 22, fontWeight: '800', color: COLORS.text, textAlign: 'center', flex: 1 },
  titleLeft:      { textAlign: 'left' },
  deleteBtn:        { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: withOpacity(COLORS.error, '20'), borderRadius: 12 },
  deleteBtnText:    { fontSize: 13, fontWeight: '700', color: COLORS.error },
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
