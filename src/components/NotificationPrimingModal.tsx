import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../i18n/i18n';
import { useTheme } from '../hooks/useTheme';
import { useNotificationStore } from '../stores/notificationStore';
import { requestPermissions } from '../services/notificationService';
import { setNotificationState } from '../repositories/notificationRepository';

export function NotificationPrimingModal(): React.JSX.Element | null {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { primingVisible, setPrimingVisible } = useNotificationStore();

  const handleEnable = async () => {
    setPrimingVisible(false);
    await requestPermissions();
  };

  const handleNotNow = async () => {
    setPrimingVisible(false);
    await Promise.all([
      setNotificationState('permission_requested', '1'),
      setNotificationState('notifications_enabled', '0'),
    ]);
  };

  if (!primingVisible) return null;

  return (
    <Modal
      visible={primingVisible}
      transparent
      animationType="slide"
      onRequestClose={handleNotNow}
      testID="notification-priming-modal"
    >
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="notifications-outline" size={36} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]} testID="priming-title">
            {t('notifications.primingTitle')}
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary }]} testID="priming-body">
            {t('notifications.primingBody')}
          </Text>
          <TouchableOpacity
            style={[styles.enableBtn, { backgroundColor: colors.primary }]}
            onPress={handleEnable}
            testID="priming-enable-btn"
          >
            <Ionicons name="notifications" size={18} color={colors.textOnPrimary} />
            <Text style={[styles.enableBtnText, { color: colors.textOnPrimary }]}>
              {t('notifications.primingEnable')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.notNowBtn}
            onPress={handleNotNow}
            testID="priming-not-now-btn"
          >
            <Text style={[styles.notNowText, { color: colors.textMuted }]}>
              {t('notifications.primingNotNow')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    paddingBottom: 40,
    alignItems: 'center',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 28,
  },
  enableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 12,
  },
  enableBtnText: {
    fontSize: 16,
    fontWeight: '800',
  },
  notNowBtn: {
    paddingVertical: 12,
  },
  notNowText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
