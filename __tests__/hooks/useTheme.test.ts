import { renderHook } from '@testing-library/react-native';
import { useTheme } from '../../src/hooks/useTheme';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { blossomColors } from '../../src/theme/variants/blossom';
import { breezeColors } from '../../src/theme/variants/breeze';

describe('useTheme', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns blossom variant for girl', () => {
    useSettingsStore.setState({ sex: 'girl', name: 'Luna', birth: '', isOnboardingDone: true, isHydrated: true });
    const { result } = renderHook(() => useTheme());
    expect(result.current.colors.primary).toBe(blossomColors.primary);
  });

  it('returns breeze variant for boy', () => {
    useSettingsStore.setState({ sex: 'boy', name: 'Miguel', birth: '', isOnboardingDone: true, isHydrated: true });
    const { result } = renderHook(() => useTheme());
    expect(result.current.colors.primary).toBe(breezeColors.primary);
  });

  it('returns blossom variant for null sex', () => {
    useSettingsStore.setState({ sex: null, name: '', birth: '', isOnboardingDone: false, isHydrated: true });
    const { result } = renderHook(() => useTheme());
    expect(result.current.colors.primary).toBe(blossomColors.primary);
  });

  it('returns a complete theme object', () => {
    useSettingsStore.setState({ sex: 'girl', name: '', birth: '', isOnboardingDone: false, isHydrated: true });
    const { result } = renderHook(() => useTheme());
    expect(result.current).toHaveProperty('colors');
    expect(result.current).toHaveProperty('typography');
    expect(result.current).toHaveProperty('spacing');
    expect(result.current).toHaveProperty('shape');
    expect(result.current).toHaveProperty('elevation');
    expect(result.current).toHaveProperty('motion');
  });

  it('blossom and breeze themes have different primary colors', () => {
    expect(blossomColors.primary).not.toBe(breezeColors.primary);
  });
});
