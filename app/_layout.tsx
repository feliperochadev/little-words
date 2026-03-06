import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { initDatabase, getSetting } from '../src/database/database';
import { configureGoogleSignIn, isGoogleConnected, performSync } from '../src/utils/googleDrive';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Configure Google Sign-In once at startup
    configureGoogleSignIn();

    initDatabase().then(async () => {
      const done = await getSetting('onboarding_done');
      const inOnboarding = segments[0] === 'onboarding';

      if (!done && !inOnboarding) {
        router.replace('/onboarding');
      } else if (done) {
        const connected = await isGoogleConnected();
        if (connected) performSync().catch(console.error);
      }
      setReady(true);
    });
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
      </Stack>
    </>
  );
}