import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  StyleSheet, Alert, Animated, Keyboard, ScrollView, Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORY_COLORS, CATEGORY_EMOJIS } from '../theme/category';
import { withOpacity } from '../utils/colorHelpers';
import { Button } from './UIComponents';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n, useCategoryName } from '../i18n/i18n';
import { useAddCategory, useUpdateCategory, useDeleteCategory, useWordCountByCategory } from '../hooks/useCategories';
import { useModalAnimation } from '../hooks/useModalAnimation';
import { useTheme } from '../hooks/useTheme';
import { findCategoryByName } from '../services/categoryService';
import type { Category } from '../types/domain';
import { TIMING } from '../utils/animationConstants';
import { canonicalizeCategoryName } from '../utils/categoryKeys';

const DEFAULT_CATEGORY_COLOR = CATEGORY_COLORS[0];
const DEFAULT_CATEGORY_EMOJI = CATEGORY_EMOJIS[0];

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
  const { colors } = useTheme();
  const isEditing = !!editCategory;

  const addCategoryMutation    = useAddCategory();
  const updateCategoryMutation = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();
  const { data: wordCount = 0 } = useWordCountByCategory(editCategory?.id ?? 0);

  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(DEFAULT_CATEGORY_COLOR);
  const [selectedEmoji, setSelectedEmoji] = useState(DEFAULT_CATEGORY_EMOJI);
  const [loading, setLoading] = useState(false);
  const [duplicate, setDuplicate] = useState<Category | null>(null);
  const nameInputRef = useRef<TextInput>(null);

  const resetForm = useCallback(() => {
    setName('');
    setSelectedColor(DEFAULT_CATEGORY_COLOR);
    setSelectedEmoji(DEFAULT_CATEGORY_EMOJI);
  }, []);

  const handleClose = () => {
    resetForm();
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
      resetForm();
    }
  }, [editCategory, visible, resetForm]);

  // iOS only: delayed focus after modal spring animation settles.
  // On Android, programmatic focus after open triggers layout-resize blink — skip it.
  useEffect(() => {
    if (!visible || Platform.OS === 'android') return;
    const timer = setTimeout(() => {
      nameInputRef.current?.focus();
    }, TIMING.MODAL_FOCUS_DELAY);
    return () => clearTimeout(timer);
  }, [visible]);

  useEffect(() => {
    if (editCategory || !name.trim()) {
      setDuplicate(null);
      return;
    }
    const normalizedName = canonicalizeCategoryName(name.trim());
    const timer = setTimeout(async () => {
      const existing = await findCategoryByName(normalizedName);
      setDuplicate(existing);
    }, TIMING.DUPLICATE_CHECK_DEBOUNCE);

    return () => clearTimeout(timer);
  }, [name, editCategory]);

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
    if (duplicate) {
      Alert.alert(t('common.attention'), t('addCategory.errorDuplicate'));
      return;
    }
    setLoading(true);
    try {
      const normalizedName = canonicalizeCategoryName(name.trim());
      let id: number | undefined;
      if (isEditing && editCategory) {
        await updateCategoryMutation.mutateAsync({ id: editCategory.id, name: name.trim(), color: selectedColor, emoji: selectedEmoji });
        id = editCategory.id;
      } else {
        id = await addCategoryMutation.mutateAsync({ name: normalizedName, color: selectedColor, emoji: selectedEmoji });
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
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => { Keyboard.dismiss(); dismissModal(); }} testID="add-category-backdrop" />
      </Animated.View>
      <View style={styles.overlay} pointerEvents="box-none">
        <Animated.View style={[styles.container, { paddingBottom: 24 + insets.bottom, transform: [{ translateY }], backgroundColor: colors.background }]}>
          <View style={styles.handleWrap} {...panResponder.panHandlers}>
            <View style={[styles.handle, { backgroundColor: colors.textMuted }]} />
          </View>


          {/* Header row */}
          <View style={styles.header}>
            <View style={styles.titleWrap}>
              <Ionicons name="pricetag-outline" size={20} color={colors.primary} testID="category-title-icon" />
              <Text style={[styles.title, isEditing && styles.titleLeft, { color: colors.text }]} testID={isEditing ? 'modal-title-edit-category' : 'modal-title-new-category'}>
                {isEditing ? t('addCategory.titleEdit') : t('addCategory.title')}
              </Text>
            </View>
            {isEditing && (
              <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: withOpacity(colors.error, '20') }]} onPress={handleDelete} testID="category-delete-btn">
                <Ionicons name="trash-outline" size={14} color={colors.error} />
              <Text style={[styles.deleteBtnText, { color: colors.error }]}>{t('common.remove')}</Text>
              </TouchableOpacity>
            )}
          </View>

          <KeyboardAwareScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bottomOffset={insets.bottom + 24}
          >
            {/* Preview */}
            <View style={[styles.preview, { borderColor: selectedColor, backgroundColor: colors.surface }]}>
              <Text style={styles.previewEmoji}>{selectedEmoji}</Text>
              <Text style={[styles.previewName, { color: selectedColor }]}>
                {name.trim() || t('addCategory.previewNamePlaceholder')}
              </Text>
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('addCategory.nameLabel')}</Text>
            <TextInput
              ref={nameInputRef}
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              value={name}
              onChangeText={setName}
              placeholder={t('addCategory.namePlaceholder')}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
              returnKeyType="done"
              testID="category-name-input"
            />
            {duplicate && (
              <View style={styles.duplicateWrap} testID="category-duplicate-warning">
                <Text style={[styles.duplicateText, { color: colors.error }]}>
                  {t('addCategory.errorDuplicate')}
                </Text>
              </View>
            )}

            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('addCategory.emojiLabel')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiScroll}>
              {CATEGORY_EMOJIS.map(emoji => (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    styles.emojiBtn,
                    { backgroundColor: colors.surface },
                    selectedEmoji === emoji && { backgroundColor: withOpacity(selectedColor, '30'), borderColor: selectedColor },
                  ]}
                  onPress={() => setSelectedEmoji(emoji)}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('addCategory.colorLabel')}</Text>
            <View style={styles.colorGrid}>
              {CATEGORY_COLORS.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorBtn, { backgroundColor: color }, selectedColor === color && styles.colorBtnSelected, selectedColor === color && { borderColor: colors.text }]}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor === color && <Text style={styles.colorCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.actions}>
              <Button title={t('addCategory.btnCancel')} onPress={handleClose} variant="outline" style={styles.actionBtn} testID="category-cancel-btn" />
              <Button
                title={isEditing ? t('addCategory.btnSave') : t('addCategory.btnCreate')}
                onPress={handleSave}
                loading={loading}
                style={[styles.actionBtn, !!duplicate && styles.btnDisabled]}
                testID="category-save-btn"
              />
            </View>
          </KeyboardAwareScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop:         { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.65)' },
  overlay:          { flex: 1, justifyContent: 'flex-end' },
  container:        { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '90%' },
  handleWrap:       { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 10, marginBottom: 10 },
  handle:           { width: 40, height: 4, borderRadius: 2 },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  titleWrap:        { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  title:            { fontSize: 22, fontWeight: '800', textAlign: 'center', flex: 1 },
  titleLeft:      { textAlign: 'left' },
  deleteBtn:        { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  deleteBtnText:    { fontSize: 13, fontWeight: '700' },
  preview:          { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 2, padding: 14, marginBottom: 20, gap: 10 },
  previewEmoji:     { fontSize: 28 },
  previewName:      { fontSize: 18, fontWeight: '700' },
  label:            { fontSize: 13, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:            { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, borderWidth: 1.5, marginBottom: 16 },
  duplicateWrap:    { marginTop: -10, marginBottom: 16 },
  duplicateText:    { fontSize: 13, fontWeight: '700' },
  emojiScroll:      { marginBottom: 16 },
  emojiBtn:         { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 8, borderWidth: 2, borderColor: 'transparent' },
  emojiText:        { fontSize: 24 },
  colorGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20, paddingHorizontal: 4 },
  colorBtn:         { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  colorBtnSelected: { borderWidth: 3, transform: [{ scale: 1.15 }] },
  colorCheck:       { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  actions:          { flexDirection: 'row', gap: 12, marginTop: 8, paddingBottom: 16 },
  actionBtn:        { flex: 1 },
  btnDisabled:      { opacity: 0.5 },
});
