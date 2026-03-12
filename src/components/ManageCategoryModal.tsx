import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, Alert, Animated, PanResponder,
} from 'react-native';
import { COLORS } from '../utils/theme';
import { getWordCountByCategory } from '../database/database';
import { useDeleteCategory } from '../hooks/useCategories';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

export function ManageCategoryModal({
  visible, category, onClose, onEdit, onDeleted,
}: Readonly<ManageCategoryModalProps>) {
  const { t } = useI18n();
  const categoryName = useCategoryName();
  const insets = useSafeAreaInsets();
  const deleteCategory = useDeleteCategory();

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
            try {
              await deleteCategory.mutateAsync({ id: category.id });
              onClose();
              onDeleted();
            } catch {
              Alert.alert(t('common.error'), t('manageCategory.deleteFailed'));
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={dismissModal}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={dismissModal} />
      </Animated.View>
      <View style={styles.overlay} pointerEvents="box-none">
        <Animated.View
          style={[styles.sheet, { paddingBottom: 36 + insets.bottom, transform: [{ translateY }] }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.handleWrap} {...panResponder.panHandlers}>
            <View style={styles.handle} />
          </View>

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
            onPress={() => { dismissModal(); setTimeout(() => onEdit(category), 300); }}
          >
            <Text style={styles.actionIcon}>✏️</Text>
            <Text style={styles.actionText}>{t('manageCategory.edit')}</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.actionRow} onPress={handleDelete}>
            <Text style={styles.actionIcon}>🗑️</Text>
            <Text style={[styles.actionText, styles.actionTextDanger]}>{t('manageCategory.delete')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={dismissModal}>
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop:       { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  overlay:        { flex: 1, justifyContent: 'flex-end' },
  sheet:          { backgroundColor: COLORS.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36 },
  handleWrap:     { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 10, marginBottom: 10 },
  handle:         { width: 40, height: 4, backgroundColor: COLORS.textLight, borderRadius: 2 },
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
