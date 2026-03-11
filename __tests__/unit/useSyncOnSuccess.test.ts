import { renderHook } from '@testing-library/react-native';
import { useSyncOnSuccess } from '../../src/hooks/useSyncOnSuccess';
import * as googleDrive from '../../src/utils/googleDrive';
import { useAuthStore } from '../../src/stores/authStore';

jest.mock('../../src/utils/googleDrive', () => ({
  performSync: jest.fn().mockResolvedValue({ success: true }),
  isGoogleConnected: jest.fn().mockResolvedValue(false),
  getGoogleUserEmail: jest.fn().mockResolvedValue(null),
  configureGoogleSignIn: jest.fn(),
}));

jest.mock('../../src/i18n/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}));

describe('useSyncOnSuccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ isConnected: false, email: null, lastSync: null });
  });

  it('does NOT call performSync when not connected', () => {
    useAuthStore.setState({ isConnected: false, email: null, lastSync: null });
    const { result } = renderHook(() => useSyncOnSuccess());
    result.current();
    expect(googleDrive.performSync).not.toHaveBeenCalled();
  });

  it('calls performSync when connected', () => {
    useAuthStore.setState({ isConnected: true, email: 'a@b.com', lastSync: null });
    const { result } = renderHook(() => useSyncOnSuccess());
    result.current();
    expect(googleDrive.performSync).toHaveBeenCalledTimes(1);
  });

  it('swallows performSync errors via .catch(console.error)', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    useAuthStore.setState({ isConnected: true, email: 'a@b.com', lastSync: null });
    (googleDrive.performSync as jest.Mock).mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() => useSyncOnSuccess());
    result.current();
    await Promise.resolve(); // let the rejection propagate
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
