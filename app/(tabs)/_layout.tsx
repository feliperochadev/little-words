import { Tabs } from 'expo-router';
import { View, Text, Image } from 'react-native';
import { COLORS } from '../../src/utils/theme';

function HeaderTitle() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Image
        source={require('@/assets/icon.png')}
        style={{ width: 52, height: 52, borderRadius: 8 }}
      />
      <View>
        <Text style={{ fontSize: 20, fontWeight: '900', color: COLORS.text, lineHeight: 22 }}>
          Palavrinhas
        </Text>
        <Text style={{ fontSize: 12, color: COLORS.textLight, fontStyle: 'italic', lineHeight: 15 }}>
          cada palavra, uma memória
        </Text>
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
        headerStyle: {
          backgroundColor: COLORS.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: COLORS.text,
        headerTitleStyle: {
          fontWeight: '800',
          fontSize: 18,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} />,
          headerTitle: () => <HeaderTitle />,
        }}
      />
      <Tabs.Screen
        name="words"
        options={{
          title: 'Palavras',
          tabBarIcon: ({ color }) => <TabIcon emoji="📚" color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="variants"
        options={{
          title: 'Variantes',
          tabBarIcon: ({ color }) => <TabIcon emoji="🗣️" color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Config.',
          tabBarIcon: ({ color }) => <TabIcon emoji="⚙️" color={color} />,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  return <Text style={{ fontSize: 22, opacity: color === COLORS.primary ? 1 : 0.5 }}>{emoji}</Text>;
}