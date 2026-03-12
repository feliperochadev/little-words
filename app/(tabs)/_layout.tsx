import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../src/utils/theme';
import { useI18n } from '../../src/i18n/i18n';

function TabIcon({ emoji, color }: Readonly<{ emoji: string; color: string }>) {
  return <Text style={color === COLORS.primary ? styles.tabIconActive : styles.tabIconInactive}>{emoji}</Text>;
}

const HomeTabIcon = ({ color }: Readonly<{ color: string }>) => <TabIcon emoji="🏠" color={color} />;
const WordsTabIcon = ({ color }: Readonly<{ color: string }>) => <TabIcon emoji="📚" color={color} />;
const VariantsTabIcon = ({ color }: Readonly<{ color: string }>) => <TabIcon emoji="🗣️" color={color} />;
const SettingsTabIcon = ({ color }: Readonly<{ color: string }>) => <TabIcon emoji="⚙️" color={color} />;

export default function TabLayout() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.border,
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
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: SettingsTabIcon,
        }}
      />
    </Tabs>
  );
}

const styles = {
  tabIconActive: { fontSize: 22, opacity: 1 },
  tabIconInactive: { fontSize: 22, opacity: 0.5 },
} as const;
