import { useEffect, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import {
  cancelRetentionNotifications,
  scheduleAll,
  initNotifications,
} from '../services/notificationService';

/**
 * Registers notification listeners and implements the "Reset Sequence":
 * - On foreground: cancel all retention/scheduled notifications
 * - On background: schedule the full notification safety net
 * - On notification tap: deep-link to the embedded route
 *
 * Must be called inside a component that has access to the expo-router context.
 */
export function useNotifications(): void {
  const router = useRouter();

  const handleForeground = useCallback(async () => {
    await cancelRetentionNotifications();
  }, []);

  const handleBackground = useCallback(async () => {
    await scheduleAll();
  }, []);

  // Initialise channel + handler on mount; cancel retention immediately on open
  useEffect(() => {
    void initNotifications();
    void handleForeground();
  }, [handleForeground]);

  // AppState listener: cancel on active, schedule on background
  useEffect(() => {
    const onStateChange = (status: AppStateStatus) => {
      if (status === 'active') {
        void handleForeground();
      } else if (status === 'background' || status === 'inactive') {
        void handleBackground();
      }
    };
    const sub = AppState.addEventListener('change', onStateChange);
    return () => sub.remove();
  }, [handleForeground, handleBackground]);

  // Notification response listener: deep-link to embedded route
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = response.notification.request.content.data?.route as string | undefined;
      if (route) {
        router.push(route as Parameters<typeof router.push>[0]);
      }
    });
    return () => sub.remove();
  }, [router]);
}
