import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../src/theme';
import { useTheme } from '../../src/hooks/useTheme';
import { useI18n } from '../../src/i18n/i18n';
import { withOpacity } from '../../src/utils/colorHelpers';
import { MediaCaptureProvider } from '../../src/providers/MediaCaptureProvider';
import { MediaFAB } from '../../src/components/MediaFAB';
import { MediaLinkingModal } from '../../src/components/MediaLinkingModal';
import { AddWordModal } from '../../src/components/AddWordModal';
import { useMediaCapture } from '../../src/hooks/useMediaCapture';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

/** Opens AddWordModal globally whenever the capture phase is 'creating-word'. */
function GlobalAddWordModal() {
  const { phase, resetCapture } = useMediaCapture();
  return (
    <AddWordModal
      visible={phase === 'creating-word'}
      onClose={resetCapture}
    />
  );
}

function TabIcon({ name, color, focused }: Readonly<{ name: IoniconsName; color: string; focused: boolean }>) {
  return <Ionicons name={name} size={22} color={color} style={{ opacity: focused ? 1 : 0.6 }} />;
}

const HomeTabIcon = ({ color, focused }: { color: string; focused: boolean }) =>
  <TabIcon name="home" color={color} focused={focused} />;
const WordsTabIcon = ({ color, focused }: { color: string; focused: boolean }) =>
  <TabIcon name="book" color={color} focused={focused} />;
const VariantsTabIcon = ({ color, focused }: { color: string; focused: boolean }) =>
  <TabIcon name="chatbubble-ellipses" color={color} focused={focused} />;

/**
 * Custom "More" tab button — opens a floating popup with Media and Settings
 * options instead of navigating to a dedicated screen.
 */
function MoreTabButton() {
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

export default function TabLayout() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useTheme();

  return (
    <MediaCaptureProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: themeColors.primary,
          tabBarInactiveTintColor: theme.colors.textMuted,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
            borderTopWidth: 1,
            height: 62 + insets.bottom,
            paddingBottom: 8 + insets.bottom,
            paddingTop: 6,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
          },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: t('tabs.home'),
            tabBarIcon: HomeTabIcon,
          }}
        />
        <Tabs.Screen
          name="words"
          options={{
            title: t('tabs.words'),
            tabBarIcon: WordsTabIcon,
          }}
        />
        <Tabs.Screen
          name="variants"
          options={{
            title: t('tabs.variants'),
            tabBarIcon: VariantsTabIcon,
          }}
        />
        {/* Media and Settings are routable but hidden from the tab bar */}
        <Tabs.Screen name="media" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
        {/* More: custom button that expands a floating popup */}
        <Tabs.Screen
          name="more"
          options={{
            title: t('tabs.more'),
            tabBarButton: () => <MoreTabButton />,
          }}
        />
      </Tabs>
      <MediaFAB />
      <MediaLinkingModal />
      <GlobalAddWordModal />
    </MediaCaptureProvider>
  );
}

const ms = StyleSheet.create({
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingTop: 6,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  menuCard: {
    position: 'absolute',
    right: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    minWidth: 210,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  iconWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 14,
  },
});
