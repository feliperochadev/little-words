import { create } from 'zustand';
import { isGoogleConnected, getGoogleUserEmail } from '../utils/googleDrive';
import { getSetting } from '../services/settingsService';

interface AuthState {
  isConnected: boolean;
  email: string | null;
  lastSync: string | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setConnected: (connected: boolean, email: string | null) => void;
  setLastSync: (timestamp: string) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isConnected: false,
  email: null,
  lastSync: null,
  isHydrated: false,

  hydrate: async () => {
    const connected = await isGoogleConnected();
    const [email, lastSync] = await Promise.all([
      connected ? getGoogleUserEmail() : Promise.resolve(null),
      getSetting('google_last_sync'),
    ]);
    set({ isConnected: connected, email, lastSync, isHydrated: true });
  },

  setConnected: (connected, email) => set({ isConnected: connected, email }),

  setLastSync: (timestamp) => set({ lastSync: timestamp }),

  clear: () => set({ isConnected: false, email: null, lastSync: null }),
}));
