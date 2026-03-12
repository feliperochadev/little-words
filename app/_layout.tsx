import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { I18nProvider } from '../src/i18n/i18n';
import { configureGoogleSignIn } from '../src/utils/googleDrive';
import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      retry: 2,
      refetchOnMount: true,
    },
  },
});

// Tie TanStack Query focus manager to React Native AppState
// (handles app background/foreground transitions)
function onAppStateChange(status: AppStateStatus) {
  focusManager.setFocused(status === 'active');
}

export default function RootLayout() {
  useEffect(() => {
    configureGoogleSignIn();
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" />
        </Stack>
      </I18nProvider>
    </QueryClientProvider>
  );
}