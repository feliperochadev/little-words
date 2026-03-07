import { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { initDatabase, getSetting } from '../src/database/database';
import { isGoogleConnected, performSync } from '../src/utils/googleDrive';
import { COLORS } from '../src/utils/theme';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    initDatabase().then(async () => {
      const done = await getSetting('onboarding_done');
      if (done) {
        isGoogleConnected().then(connected => {
          if (connected) performSync().catch(console.error);
        });
        router.replace('/(tabs)/home');
      } else {
        router.replace('/onboarding');
      }
    });
  }, []);

  return (
    <View style={styles.splash}>
      <Image source={require('@/assets/icon.png')} style={styles.icon} />
    </View>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 100,
    height: 100,
    borderRadius: 24,
  },
});