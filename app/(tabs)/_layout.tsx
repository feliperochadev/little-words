import React from 'react';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../src/theme';
import { useTheme } from '../../src/hooks/useTheme';
import { useI18n } from '../../src/i18n/i18n';
import { MediaCaptureProvider } from '../../src/providers/MediaCaptureProvider';
import { MediaFAB } from '../../src/components/MediaFAB';
import { MediaLinkingModal } from '../../src/components/MediaLinkingModal';
import { AddWordModal } from '../../src/components/AddWordModal';
import { MoreTabButton } from '../../src/components/MoreTabButton';
import { useMediaCapture } from '../../src/hooks/useMediaCapture';
import { Ionicons } from '@expo/vector-icons';

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

function MoreTabButtonTab() {
  return <MoreTabButton />;
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
            tabBarButton: MoreTabButtonTab,
          }}
        />
      </Tabs>
      <MediaFAB />
      <MediaLinkingModal />
      <GlobalAddWordModal />
    </MediaCaptureProvider>
  );
}
