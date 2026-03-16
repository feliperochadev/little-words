import {
  getSetting,
  setSetting,
  clearAllData as dbClearAllData,
} from '../repositories/settingsRepository';
import { deleteAllMedia } from '../utils/assetStorage';

export { getSetting, setSetting } from '../repositories/settingsRepository';

export async function clearAllData(): Promise<void> {
  await dbClearAllData();
  // Best-effort file cleanup after DB purge
  deleteAllMedia();
}

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
