import { create } from 'zustand';
import { getChildProfile, setChildProfile, ChildProfile, getSetting, setSetting } from '../services/settingsService';

interface SettingsState extends ChildProfile {
  isOnboardingDone: boolean;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setProfile: (profile: ChildProfile) => Promise<void>;
  setOnboardingDone: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  name: '',
  sex: null,
  birth: '',
  isOnboardingDone: false,
  isHydrated: false,

  hydrate: async () => {
    const [profile, onboarding] = await Promise.all([
      getChildProfile(),
      getSetting('onboarding_done'),
    ]);
    set({
      name: profile.name,
      sex: profile.sex,
      birth: profile.birth,
      isOnboardingDone: onboarding === '1',
      isHydrated: true,
    });
  },

  setProfile: async (profile) => {
    await setChildProfile(profile);
    set({ name: profile.name, sex: profile.sex, birth: profile.birth });
  },

  setOnboardingDone: async () => {
    await setSetting('onboarding_done', '1');
    set({ isOnboardingDone: true });
  },
}));
