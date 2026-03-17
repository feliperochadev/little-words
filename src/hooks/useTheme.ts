import { useSettingsStore } from '../stores/settingsStore';
import { getThemeForSex } from '../theme/getThemeForSex';
import type { Theme } from '../theme/types';

export function useTheme(): Theme {
  const sex = useSettingsStore(state => state.sex);
  return getThemeForSex(sex);
}
