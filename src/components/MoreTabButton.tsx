import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../i18n/i18n';
import { withOpacity } from '../utils/colorHelpers';

/**
 * Custom "More" tab button — opens a floating popup with Media and Settings
 * options instead of navigating to a dedicated screen.
 */
export function MoreTabButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 62 + insets.bottom;

  const handleMedia = () => {
    setOpen(false);
    router.push('/(tabs)/media');
  };

  const handleSettings = () => {
    setOpen(false);
    router.push('/(tabs)/settings');
  };

  return (
    <>
      <TouchableOpacity
        style={ms.tabBtn}
        onPress={() => setOpen(v => !v)}
        testID="more-tab-btn"
        accessibilityLabel={t('tabs.more')}
      >
        <Ionicons
          name={open ? 'close' : 'menu'}
          size={22}
          color={open ? colors.primary : theme.colors.textMuted}
          style={{ opacity: 1 }}
        />
        <Text style={[ms.tabLabel, { color: open ? colors.primary : theme.colors.textMuted }]}>
          {t('tabs.more')}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        testID="more-menu-modal"
      >
        {/* Backdrop — tap to close */}
        <TouchableOpacity
          style={ms.backdrop}
          activeOpacity={1}
          onPress={() => setOpen(false)}
          testID="more-menu-backdrop"
        />

        {/* Floating card above tab bar */}
        <View
          style={[
            ms.menuCard,
            {
              bottom: tabBarHeight + 8,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
          testID="more-menu-card"
        >
          {/* Media option */}
          <TouchableOpacity style={ms.menuItem} onPress={handleMedia} testID="more-media-option">
            <View style={[ms.iconWrap, { backgroundColor: withOpacity(colors.primary, '1F') }]}>
              <Ionicons name="musical-notes" size={12} color={colors.primary} />
              <Ionicons name="image" size={12} color={colors.primary} />
              <Ionicons name="videocam" size={12} color={colors.primary} />
            </View>
            <Text style={[ms.menuLabel, { color: theme.colors.text }]}>{t('more.media')}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>

          <View style={[ms.divider, { backgroundColor: theme.colors.border }]} />

          {/* Settings option */}
          <TouchableOpacity style={ms.menuItem} onPress={handleSettings} testID="more-settings-option">
            <View style={[ms.iconWrap, { backgroundColor: withOpacity(colors.primary, '1F') }]}>
              <Ionicons name="settings-sharp" size={18} color={colors.primary} />
            </View>
            <Text style={[ms.menuLabel, { color: theme.colors.text }]}>{t('more.settings')}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const ms = StyleSheet.create({
  tabBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuCard: {
    position: 'absolute',
    right: 12,
    width: 180,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  menuLabel: {
    flex: 1,
    fontSize: 14,
  },
  divider: {
    height: 1,
    marginVertical: 0,
  },
});
