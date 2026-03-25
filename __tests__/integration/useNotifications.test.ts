import { renderHook, act } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { useNotifications } from '../../src/hooks/useNotifications';

jest.mock('../../src/services/notificationService', () => ({
  initNotifications: jest.fn(() => Promise.resolve()),
  cancelRetentionNotifications: jest.fn(() => Promise.resolve()),
  scheduleAll: jest.fn(() => Promise.resolve()),
}));

const {
  initNotifications,
  cancelRetentionNotifications,
  scheduleAll,
} = require('../../src/services/notificationService');

const Notifications = require('expo-notifications');

let appStateCallback: ((status: AppStateStatus) => void) | null = null;

beforeEach(() => {
  jest.clearAllMocks();
  appStateCallback = null;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, cb) => {
    appStateCallback = cb as (status: AppStateStatus) => void;
    return { remove: jest.fn() };
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useNotifications', () => {
  it('calls initNotifications and cancelRetentionNotifications on mount', async () => {
    renderHook(() => useNotifications());
    await act(async () => {});
    expect(initNotifications).toHaveBeenCalledTimes(1);
    expect(cancelRetentionNotifications).toHaveBeenCalledTimes(1);
  });

  it('cancels retention notifications when app comes to foreground', async () => {
    renderHook(() => useNotifications());
    await act(async () => {});
    cancelRetentionNotifications.mockClear();

    await act(async () => {
      appStateCallback?.('active');
    });

    expect(cancelRetentionNotifications).toHaveBeenCalledTimes(1);
  });

  it('schedules all notifications when app goes to background', async () => {
    renderHook(() => useNotifications());
    await act(async () => {});

    await act(async () => {
      appStateCallback?.('background');
    });

    expect(scheduleAll).toHaveBeenCalledTimes(1);
  });

  it('schedules all notifications when app goes inactive', async () => {
    renderHook(() => useNotifications());
    await act(async () => {});

    await act(async () => {
      appStateCallback?.('inactive');
    });

    expect(scheduleAll).toHaveBeenCalledTimes(1);
  });

  it('registers a notification response listener on mount', async () => {
    renderHook(() => useNotifications());
    await act(async () => {});
    expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalledTimes(1);
  });

  it('removes the notification response listener on unmount', async () => {
    const removeMock = jest.fn();
    Notifications.addNotificationResponseReceivedListener.mockReturnValueOnce({ remove: removeMock });

    const { unmount } = renderHook(() => useNotifications());
    await act(async () => {});

    act(() => { unmount(); });
    expect(removeMock).toHaveBeenCalled();
  });

  it('deep-links to route when notification tapped with route data', async () => {
    const mockPush = jest.fn();
    const { useRouter } = require('expo-router');
    useRouter.mockReturnValue({ push: mockPush, replace: jest.fn(), back: jest.fn() });

    let capturedListener: ((response: any) => void) | null = null;
    Notifications.addNotificationResponseReceivedListener.mockImplementationOnce((cb: any) => {
      capturedListener = cb;
      return { remove: jest.fn() };
    });

    renderHook(() => useNotifications());
    await act(async () => {});

    await act(async () => {
      capturedListener?.({
        notification: { request: { content: { data: { route: '/(tabs)/progress' } } } },
      });
    });

    expect(mockPush).toHaveBeenCalledWith('/(tabs)/progress');
  });

  it('does nothing when app state is unknown (no-op branch)', async () => {
    renderHook(() => useNotifications());
    await act(async () => {});
    cancelRetentionNotifications.mockClear();
    scheduleAll.mockClear();

    await act(async () => {
      appStateCallback?.('unknown' as any);
    });

    expect(cancelRetentionNotifications).not.toHaveBeenCalled();
    expect(scheduleAll).not.toHaveBeenCalled();
  });

  it('does not navigate when notification has no route data', async () => {
    const mockPush = jest.fn();
    const { useRouter } = require('expo-router');
    useRouter.mockReturnValue({ push: mockPush, replace: jest.fn(), back: jest.fn() });

    let capturedListener: ((response: any) => void) | null = null;
    Notifications.addNotificationResponseReceivedListener.mockImplementationOnce((cb: any) => {
      capturedListener = cb;
      return { remove: jest.fn() };
    });

    renderHook(() => useNotifications());
    await act(async () => {});

    await act(async () => {
      capturedListener?.({
        notification: { request: { content: { data: {} } } },
      });
    });

    expect(mockPush).not.toHaveBeenCalled();
  });
});
