import { useI18n } from '../i18n/i18n';
import { useAuthStore } from '../stores/authStore';
import { performSync } from '../utils/googleDrive';

export function useSyncOnSuccess() {
  const { t } = useI18n();
  return () => {
    if (useAuthStore.getState().isConnected) {
      performSync(t).catch(console.error);
    }
  };
}
