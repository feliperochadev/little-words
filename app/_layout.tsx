import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { I18nProvider } from '../src/i18n/i18n';
import { configureGoogleSignIn } from '../src/utils/googleDrive';
import { useEffect } from 'react';

export default function RootLayout() {
  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  return (
    <I18nProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
      </Stack>
    </I18nProvider>
  );
}