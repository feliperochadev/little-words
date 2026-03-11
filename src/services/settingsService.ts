import { getSetting, setSetting } from '../database/database';

export { getSetting, setSetting };

export interface ChildProfile {
  name: string;
  sex: 'boy' | 'girl' | null;
  birth: string;
}

export const getChildProfile = async (): Promise<ChildProfile> => {
  const [name, sex, birth] = await Promise.all([
    getSetting('child_name'),
    getSetting('child_sex'),
    getSetting('child_birth'),
  ]);
  return {
    name: name ?? '',
    sex: (sex as 'boy' | 'girl' | null) ?? null,
    birth: birth ?? '',
  };
};

export const setChildProfile = async (profile: ChildProfile): Promise<void> => {
  await Promise.all([
    setSetting('child_name', profile.name),
    setSetting('child_sex', profile.sex ?? ''),
    setSetting('child_birth', profile.birth),
  ]);
};

export interface GoogleAuthState {
  isConnected: boolean;
  email: string | null;
  lastSync: string | null;
}

export const getGoogleAuthState = async (): Promise<GoogleAuthState> => {
  const [email, lastSync] = await Promise.all([
    getSetting('google_email'),
    getSetting('google_last_sync'),
  ]);
  return {
    isConnected: !!email,
    email,
    lastSync,
  };
};
