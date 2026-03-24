import { create } from 'zustand';

interface NotificationStoreState {
  primingVisible: boolean;
  setPrimingVisible: (visible: boolean) => void;
}

export const useNotificationStore = create<NotificationStoreState>((set) => ({
  primingVisible: false,
  setPrimingVisible: (visible) => set({ primingVisible: visible }),
}));
