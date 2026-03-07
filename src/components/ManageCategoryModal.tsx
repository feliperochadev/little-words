import React from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, Alert,
} from 'react-native';
import { COLORS } from '../utils/theme';
import { unlinkWordsFromCategory, deleteCategory, getWordCountByCategory } from '../database/database';
import { useI18n, useCategoryName } from '../i18n/i18n';

export interface CategoryItem {
  id: number;
  name: string;
  color: string;
  emoji: string;
}

interface ManageCategoryModalProps {
  visible: boolean;
  category: CategoryItem | null;
  onClose: () => void;
  onEdit: (category: CategoryItem) => void;
  onDeleted: () => void;
}

export const ManageCategoryModal: React.FC<ManageCategoryModalProps> = ({
  visible, category, onClose, onEdit, onDeleted,
}) => {
  const { t } = useI18n();
  const categoryName = useCategoryName();

  if (!category) return null;

  const displayName = categoryName(category.name);

  const handleDelete = async () => {
    const count = await getWordCountByCategory(category.id);
    const message = count > 0
      ? t('manageCategory.deleteMessageWithWords', { name: displayName, count })
      : t('manageCategory.deleteMessage', { name: displayName });

    Alert.alert(
      t('manageCategory.deleteTitle'),
      message,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: async () => {
            await unlinkWordsFromCategory(category.id);
            await deleteCategory(category.id);
            onClose();
            onDeleted();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.sheet} activeOpacity={1}>
          <View style={styles.handle} />

          {/* Category preview */}
          <View style={styles.preview}>
            <View style={[styles.emojiCircle, { backgroundColor: category.color + '20' }]}>
              <Text style={styles.emoji}>{category.emoji}</Text>
            </View>
            <Text style={[styles.categoryName, { color: category.color }]}>{displayName}</Text>
          </View>

          {/* Actions */}
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => { onClose(); setTimeout(() => onEdit(category), 300); }}
          >
            <Text style={styles.actionIcon}>✏️</Text>
            <Text style={styles.actionText}>{t('manageCategory.edit')}</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.actionRow} onPress={handleDelete}>
            <Text style={styles.actionIcon}>🗑️</Text>
            <Text style={[styles.actionText, styles.actionTextDanger]}>{t('manageCategory.delete')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:          { backgroundColor: COLORS.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36 },
  handle:         { width: 40, height: 4, backgroundColor: COLORS.textLight, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  preview:        { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  emojiCircle:    { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emoji:          { fontSize: 24 },
  categoryName:   { fontSize: 20, fontWeight: '800' },
  actionRow:      { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  actionIcon:     { fontSize: 20, width: 28, textAlign: 'center' },
  actionText:     { fontSize: 17, color: COLORS.text, fontWeight: '500' },
  actionTextDanger: { color: COLORS.error },
  divider:        { height: 1, backgroundColor: COLORS.border, marginHorizontal: -24 },
  cancelBtn:      { marginTop: 16, alignItems: 'center', paddingVertical: 14, backgroundColor: COLORS.white, borderRadius: 16 },
  cancelText:     { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary },
});
