import { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { initDatabase } from '../src/database/database';
import { performSync } from '../src/utils/googleDrive';
import { useI18n } from '../src/i18n/i18n';
import { COLORS } from '../src/utils/theme';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAuthStore } from '../src/stores/authStore';

export default function Index() {
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    (async () => {
      await initDatabase();
      await Promise.all([
        useSettingsStore.getState().hydrate(),
        useAuthStore.getState().hydrate(),
      ]);
      const { isOnboardingDone } = useSettingsStore.getState();
      if (isOnboardingDone) {
        if (useAuthStore.getState().isConnected) {
          performSync(t).catch((error) => {
            console.error('[GoogleDrive] Initial sync failed:', error);
          });
        }
        router.replace('/(tabs)/home');
      } else {
        router.replace('/onboarding');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return (
    <View style={styles.splash}>
      <Image source={require('@/assets/icon.png')} style={styles.icon} />
    </View>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 100, height: 100, borderRadius: 24 },
});
