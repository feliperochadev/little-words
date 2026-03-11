import { useSettingsStore } from '../stores/settingsStore';
import { useAuthStore } from '../stores/authStore';

/** Child profile and onboarding status, hydrated from SQLite on app start. */
export function useChildProfile() {
  const { name, sex, birth, isOnboardingDone, isHydrated, setProfile, setOnboardingDone } =
    useSettingsStore();
  return { name, sex, birth, isOnboardingDone, isHydrated, setProfile, setOnboardingDone };
}

/** Google auth state, hydrated from SQLite on app start. */
export function useGoogleAuth() {
  const { isConnected, email, lastSync, isHydrated, setConnected, setLastSync, clear } =
    useAuthStore();
  return { isConnected, email, lastSync, isHydrated, setConnected, setLastSync, clear };
}
