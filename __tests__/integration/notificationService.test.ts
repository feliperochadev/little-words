import { Platform } from 'react-native';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../src/repositories/notificationRepository', () => ({
  getNotificationState: jest.fn(),
  setNotificationState: jest.fn(() => Promise.resolve()),
  getWordsWithUpcomingAnniversaries: jest.fn(() => Promise.resolve([])),
  getEmptyCategoryNames: jest.fn(() => Promise.resolve([])),
  getTotalNonProfileAssetCount: jest.fn(() => Promise.resolve(0)),
}));

jest.mock('../../src/repositories/settingsRepository', () => ({
  getSetting: jest.fn(),
}));

jest.mock('../../src/repositories/dashboardRepository', () => ({
  getTotalWordCount: jest.fn(() => Promise.resolve(0)),
  getWordCountSinceDate: jest.fn(() => Promise.resolve(0)),
}));

jest.mock('../../src/services/notificationScheduler', () => ({
  buildSchedule: jest.fn(() => []),
  buildMilestoneContent: jest.fn(() => ({ title: 'Milestone!', body: 'Great job!' })),
  isTooSoonToReschedule: jest.fn(() => false),
}));

jest.mock('../../src/stores/notificationStore', () => ({
  useNotificationStore: {
    getState: jest.fn(() => ({ setPrimingVisible: jest.fn() })),
  },
}));

const Notifications = require('expo-notifications');

const {
  getNotificationState,
  setNotificationState,
  getWordsWithUpcomingAnniversaries,
  getEmptyCategoryNames,
  getTotalNonProfileAssetCount,
} = require('../../src/repositories/notificationRepository');

const { getSetting } = require('../../src/repositories/settingsRepository');
const { getTotalWordCount, getWordCountSinceDate } = require('../../src/repositories/dashboardRepository');
const { buildSchedule, isTooSoonToReschedule } = require('../../src/services/notificationScheduler');
const { useNotificationStore } = require('../../src/stores/notificationStore');

import {
  initNotifications,
  getPermissionStatus,
  requestPermissions,
  isNotificationsEnabled,
  cancelRetentionNotifications,
  cancelAllNotifications,
  scheduleAll,
  handleWordAdded,
  checkAndShowPriming,
  MILESTONE_THRESHOLDS,
} from '../../src/services/notificationService';

beforeEach(() => {
  jest.clearAllMocks();
  // Default returns
  getNotificationState.mockResolvedValue(null);
  setNotificationState.mockResolvedValue(undefined);
  getSetting.mockResolvedValue(null);
  getTotalWordCount.mockResolvedValue(5);
  getWordCountSinceDate.mockResolvedValue(0);
  buildSchedule.mockReturnValue([]);
  isTooSoonToReschedule.mockReturnValue(false);
  useNotificationStore.getState.mockReturnValue({ setPrimingVisible: jest.fn() });
});

// ─── initNotifications ────────────────────────────────────────────────────────

describe('initNotifications', () => {
  it('sets notification handler on all platforms', async () => {
    await initNotifications();
    expect(Notifications.setNotificationHandler).toHaveBeenCalledWith(
      expect.objectContaining({ handleNotification: expect.any(Function) }),
    );
  });

  it('creates android channel on android', async () => {
    const originalOS = Platform.OS;
    (Platform as any).OS = 'android';
    await initNotifications();
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      'default',
      expect.objectContaining({ name: 'Palavrinhas' }),
    );
    (Platform as any).OS = originalOS;
  });

  it('skips android channel on ios', async () => {
    const originalOS = Platform.OS;
    (Platform as any).OS = 'ios';
    await initNotifications();
    expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
    (Platform as any).OS = originalOS;
  });

  it('handleNotification returns correct flags', async () => {
    await initNotifications();
    const handler = Notifications.setNotificationHandler.mock.calls[0][0];
    const result = await handler.handleNotification();
    expect(result.shouldShowAlert).toBe(true);
    expect(result.shouldPlaySound).toBe(false);
    expect(result.shouldSetBadge).toBe(false);
  });
});

// ─── getPermissionStatus ──────────────────────────────────────────────────────

describe('getPermissionStatus', () => {
  it('returns granted and canAskAgain from expo-notifications', async () => {
    Notifications.getPermissionsAsync.mockResolvedValueOnce({ granted: true, canAskAgain: false });
    const result = await getPermissionStatus();
    expect(result).toEqual({ granted: true, canAskAgain: false });
  });

  it('returns false when not granted', async () => {
    Notifications.getPermissionsAsync.mockResolvedValueOnce({ granted: false, canAskAgain: true });
    const result = await getPermissionStatus();
    expect(result.granted).toBe(false);
  });
});

// ─── requestPermissions ───────────────────────────────────────────────────────

describe('requestPermissions', () => {
  it('returns true and saves state when granted', async () => {
    Notifications.requestPermissionsAsync.mockResolvedValueOnce({ granted: true });
    const result = await requestPermissions();
    expect(result).toBe(true);
    expect(setNotificationState).toHaveBeenCalledWith('permission_requested', '1');
    expect(setNotificationState).toHaveBeenCalledWith('permission_granted', '1');
    expect(setNotificationState).toHaveBeenCalledWith('notifications_enabled', '1');
  });

  it('returns false and saves state when denied', async () => {
    Notifications.requestPermissionsAsync.mockResolvedValueOnce({ granted: false });
    const result = await requestPermissions();
    expect(result).toBe(false);
    expect(setNotificationState).toHaveBeenCalledWith('permission_granted', '0');
    expect(setNotificationState).toHaveBeenCalledWith('notifications_enabled', '0');
  });
});

// ─── isNotificationsEnabled ───────────────────────────────────────────────────

describe('isNotificationsEnabled', () => {
  it('returns true when state is "1"', async () => {
    getNotificationState.mockResolvedValueOnce('1');
    expect(await isNotificationsEnabled()).toBe(true);
  });

  it('returns false when state is null', async () => {
    getNotificationState.mockResolvedValueOnce(null);
    expect(await isNotificationsEnabled()).toBe(false);
  });

  it('returns false when state is "0"', async () => {
    getNotificationState.mockResolvedValueOnce('0');
    expect(await isNotificationsEnabled()).toBe(false);
  });
});

// ─── cancelRetentionNotifications ────────────────────────────────────────────

describe('cancelRetentionNotifications', () => {
  it('cancels notifications with managed prefixes', async () => {
    Notifications.getAllScheduledNotificationsAsync.mockResolvedValueOnce([
      { identifier: 'nudge-3d' },
      { identifier: 'weekly-win-2026-01-05' },
      { identifier: 'unrelated-notif' },
    ]);
    await cancelRetentionNotifications();
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('nudge-3d');
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('weekly-win-2026-01-05');
    expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('unrelated-notif');
  });

  it('does not throw when getAllScheduledNotificationsAsync fails', async () => {
    Notifications.getAllScheduledNotificationsAsync.mockRejectedValueOnce(new Error('permission denied'));
    await expect(cancelRetentionNotifications()).resolves.toBeUndefined();
  });
});

// ─── cancelAllNotifications ───────────────────────────────────────────────────

describe('cancelAllNotifications', () => {
  it('calls cancelAllScheduledNotificationsAsync', async () => {
    await cancelAllNotifications();
    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  });

  it('does not throw on error', async () => {
    Notifications.cancelAllScheduledNotificationsAsync.mockRejectedValueOnce(new Error('fail'));
    await expect(cancelAllNotifications()).resolves.toBeUndefined();
  });
});

// ─── scheduleAll ─────────────────────────────────────────────────────────────

describe('scheduleAll', () => {
  function setupEnabledPermissions() {
    // isNotificationsEnabled → '1', permission_granted → '1', last_schedule_run → null
    getNotificationState
      .mockResolvedValueOnce('1')  // notifications_enabled
      .mockResolvedValueOnce('1') // permission_granted
      .mockResolvedValueOnce(null); // last_schedule_run
  }

  it('does nothing when notifications are disabled', async () => {
    getNotificationState.mockResolvedValueOnce('0'); // notifications_enabled = '0'
    await scheduleAll();
    expect(buildSchedule).not.toHaveBeenCalled();
  });

  it('does nothing when permission not granted', async () => {
    getNotificationState
      .mockResolvedValueOnce('1')  // notifications_enabled
      .mockResolvedValueOnce('0'); // permission_granted = '0'
    await scheduleAll();
    expect(buildSchedule).not.toHaveBeenCalled();
  });

  it('does nothing when too soon to reschedule', async () => {
    getNotificationState
      .mockResolvedValueOnce('1')  // notifications_enabled
      .mockResolvedValueOnce('1') // permission_granted
      .mockResolvedValueOnce('2026-03-24T09:00:00Z'); // last_schedule_run
    isTooSoonToReschedule.mockReturnValueOnce(true);
    await scheduleAll();
    expect(buildSchedule).not.toHaveBeenCalled();
  });

  it('gathers DB context and calls buildSchedule', async () => {
    setupEnabledPermissions();
    getNotificationState
      .mockResolvedValueOnce(null) // last_backup_date
      .mockResolvedValueOnce(null); // feature_discovery_sent
    getSetting.mockResolvedValueOnce('en-US').mockResolvedValueOnce('Sofia');
    getTotalWordCount.mockResolvedValueOnce(12);
    getWordCountSinceDate.mockResolvedValue(2);
    getWordsWithUpcomingAnniversaries.mockResolvedValueOnce([]);
    getEmptyCategoryNames.mockResolvedValueOnce([{ name: 'animals' }, { name: 'food' }]);
    getTotalNonProfileAssetCount.mockResolvedValueOnce(3);

    await scheduleAll();
    expect(buildSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        strings: expect.objectContaining({ nudge3dTitle: 'New sounds today?' }),
        childName: 'Sofia',
        totalWords: 12,
        emptyCategoryNames: ['Animals', 'Food'],
      }),
      expect.any(Date),
    );
  });

  it('translates empty category names to pt-BR when locale is pt-BR', async () => {
    setupEnabledPermissions();
    getNotificationState
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    getSetting.mockResolvedValueOnce('pt-BR').mockResolvedValueOnce('Olivia');
    getTotalWordCount.mockResolvedValueOnce(5);
    getWordCountSinceDate.mockResolvedValue(0);
    getWordsWithUpcomingAnniversaries.mockResolvedValueOnce([]);
    getEmptyCategoryNames.mockResolvedValueOnce([{ name: 'toys' }, { name: 'animals' }]);
    getTotalNonProfileAssetCount.mockResolvedValueOnce(0);

    await scheduleAll();
    expect(buildSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        emptyCategoryNames: ['Brinquedos', 'Animais'],
      }),
      expect.any(Date),
    );
  });

  it('passes user-created category names unchanged regardless of locale', async () => {
    setupEnabledPermissions();
    getNotificationState
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    getSetting.mockResolvedValueOnce('pt-BR').mockResolvedValueOnce('Olivia');
    getTotalWordCount.mockResolvedValueOnce(5);
    getWordCountSinceDate.mockResolvedValue(0);
    getWordsWithUpcomingAnniversaries.mockResolvedValueOnce([]);
    getEmptyCategoryNames.mockResolvedValueOnce([{ name: 'Minha Categoria' }]);
    getTotalNonProfileAssetCount.mockResolvedValueOnce(0);

    await scheduleAll();
    expect(buildSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        emptyCategoryNames: ['Minha Categoria'],
      }),
      expect.any(Date),
    );
  });

  it('handles scheduleItem cancel error gracefully (rescheduling existing notification)', async () => {
    setupEnabledPermissions();
    getNotificationState.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    getSetting.mockResolvedValue(null);
    getTotalWordCount.mockResolvedValueOnce(0);
    getWordCountSinceDate.mockResolvedValue(0);
    getWordsWithUpcomingAnniversaries.mockResolvedValueOnce([]);
    getEmptyCategoryNames.mockResolvedValueOnce([]);
    getTotalNonProfileAssetCount.mockResolvedValueOnce(0);

    buildSchedule.mockReturnValueOnce([
      { identifier: 'nudge-3d', title: 'T', body: 'B', route: '/home', triggerDate: new Date() },
    ]);
    // Simulate cancelScheduledNotificationAsync throwing (not yet scheduled)
    Notifications.cancelScheduledNotificationAsync.mockRejectedValueOnce(new Error('not found'));

    await scheduleAll();
    // scheduleNotificationAsync should still be called despite cancel error
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: 'nudge-3d' }),
    );
  });

  it('schedules each item returned by buildSchedule', async () => {
    setupEnabledPermissions();
    getNotificationState
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    getSetting.mockResolvedValue(null);
    getTotalWordCount.mockResolvedValueOnce(5);
    getWordCountSinceDate.mockResolvedValue(1);
    getWordsWithUpcomingAnniversaries.mockResolvedValueOnce([]);
    getEmptyCategoryNames.mockResolvedValueOnce([]);
    getTotalNonProfileAssetCount.mockResolvedValueOnce(0);

    buildSchedule.mockReturnValueOnce([
      { identifier: 'nudge-3d', title: 'T', body: 'B', route: '/home', triggerDate: new Date() },
    ]);

    await scheduleAll();
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: 'nudge-3d',
        trigger: expect.objectContaining({ channelId: 'default' }),
      }),
    );
  });

  it('marks feature_discovery_sent when feature-discovery is scheduled', async () => {
    setupEnabledPermissions();
    getNotificationState
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    getSetting.mockResolvedValue(null);
    getTotalWordCount.mockResolvedValueOnce(6);
    getWordCountSinceDate.mockResolvedValue(0);
    getWordsWithUpcomingAnniversaries.mockResolvedValueOnce([]);
    getEmptyCategoryNames.mockResolvedValueOnce([]);
    getTotalNonProfileAssetCount.mockResolvedValueOnce(0);

    buildSchedule.mockReturnValueOnce([
      { identifier: 'feature-discovery', title: 'T', body: 'B', route: '/home', triggerDate: new Date() },
    ]);

    await scheduleAll();
    expect(setNotificationState).toHaveBeenCalledWith('feature_discovery_sent', '1');
  });

  it('updates last_schedule_run timestamp', async () => {
    setupEnabledPermissions();
    getNotificationState.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    getSetting.mockResolvedValue(null);
    getTotalWordCount.mockResolvedValueOnce(0);
    getWordCountSinceDate.mockResolvedValue(0);
    getWordsWithUpcomingAnniversaries.mockResolvedValueOnce([]);
    getEmptyCategoryNames.mockResolvedValueOnce([]);
    getTotalNonProfileAssetCount.mockResolvedValueOnce(0);

    await scheduleAll();
    expect(setNotificationState).toHaveBeenCalledWith('last_schedule_run', expect.any(String));
  });

  it('does not throw on internal error', async () => {
    getNotificationState.mockRejectedValueOnce(new Error('db error'));
    await expect(scheduleAll()).resolves.toBeUndefined();
  });

  it('schedules item with null trigger for immediate notifications', async () => {
    setupEnabledPermissions();
    getNotificationState.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    getSetting.mockResolvedValue(null);
    getTotalWordCount.mockResolvedValueOnce(0);
    getWordCountSinceDate.mockResolvedValue(0);
    getWordsWithUpcomingAnniversaries.mockResolvedValueOnce([]);
    getEmptyCategoryNames.mockResolvedValueOnce([]);
    getTotalNonProfileAssetCount.mockResolvedValueOnce(0);

    buildSchedule.mockReturnValueOnce([
      { identifier: 'milestone-1', title: 'T', body: 'B', route: '/progress', triggerDate: null },
    ]);

    await scheduleAll();
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: null }),
    );
  });
});

// ─── handleWordAdded ─────────────────────────────────────────────────────────

// ─── checkAndShowPriming ──────────────────────────────────────────────────────

describe('checkAndShowPriming', () => {
  it('shows priming modal when permission not yet requested', async () => {
    const setPrimingVisible = jest.fn();
    useNotificationStore.getState.mockReturnValue({ setPrimingVisible });
    getNotificationState.mockResolvedValueOnce(null); // permission_requested

    await checkAndShowPriming();
    expect(setPrimingVisible).toHaveBeenCalledWith(true);
  });

  it('does not show priming when permission already requested', async () => {
    const setPrimingVisible = jest.fn();
    useNotificationStore.getState.mockReturnValue({ setPrimingVisible });
    getNotificationState.mockResolvedValueOnce('1'); // permission_requested = '1'

    await checkAndShowPriming();
    expect(setPrimingVisible).not.toHaveBeenCalledWith(true);
  });
});

describe('handleWordAdded', () => {
  it('shows priming modal regardless of word count when permission not yet requested', async () => {
    const setPrimingVisible = jest.fn();
    useNotificationStore.getState.mockReturnValue({ setPrimingVisible });
    getTotalWordCount.mockResolvedValueOnce(5);
    getSetting.mockResolvedValue(null);
    getNotificationState
      .mockResolvedValueOnce('0') // isNotificationsEnabled
      .mockResolvedValueOnce(null); // permission_requested

    await handleWordAdded();
    expect(setPrimingVisible).toHaveBeenCalledWith(true);
  });

  it('does not show priming if permission already requested', async () => {
    const setPrimingVisible = jest.fn();
    useNotificationStore.getState.mockReturnValue({ setPrimingVisible });
    getTotalWordCount.mockResolvedValueOnce(1);
    getSetting.mockResolvedValue(null);
    getNotificationState
      .mockResolvedValueOnce('0')  // isNotificationsEnabled
      .mockResolvedValueOnce('1'); // permission_requested = '1'

    await handleWordAdded();
    expect(setPrimingVisible).not.toHaveBeenCalledWith(true);
  });

  it('schedules milestone notification for threshold counts', async () => {
    getTotalWordCount.mockResolvedValueOnce(10);
    getSetting.mockResolvedValueOnce('en-US').mockResolvedValueOnce('Sofia');
    getNotificationState
      .mockResolvedValueOnce('1')  // isNotificationsEnabled
      .mockResolvedValueOnce('1') // permission_requested (checkAndShowPriming)
      .mockResolvedValueOnce('1') // permission_granted
      .mockResolvedValueOnce(null); // milestone_10 not sent yet

    await handleWordAdded();
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: 'milestone-10',
        trigger: { channelId: 'default' },
      }),
    );
    expect(setNotificationState).toHaveBeenCalledWith('milestone_10', expect.any(String));
  });

  it('does not schedule milestone for non-threshold counts', async () => {
    getTotalWordCount.mockResolvedValueOnce(5);
    getSetting.mockResolvedValue(null);
    getNotificationState
      .mockResolvedValueOnce('1')  // isNotificationsEnabled
      .mockResolvedValueOnce('1') // permission_requested (checkAndShowPriming)
      .mockResolvedValueOnce('1'); // permission_granted

    await handleWordAdded();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('returns early when enabled but permission_granted is not 1', async () => {
    getTotalWordCount.mockResolvedValueOnce(10);
    getSetting.mockResolvedValue(null);
    getNotificationState
      .mockResolvedValueOnce('1')  // isNotificationsEnabled = '1'
      .mockResolvedValueOnce('1') // permission_requested (checkAndShowPriming)
      .mockResolvedValueOnce('0'); // permission_granted = '0' → early return

    await handleWordAdded();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('uses null-safe fallbacks for locale and childName when scheduling milestone', async () => {
    getTotalWordCount.mockResolvedValueOnce(10);
    getSetting.mockResolvedValue(null);
    getNotificationState
      .mockResolvedValueOnce('1')  // isNotificationsEnabled
      .mockResolvedValueOnce('1') // permission_requested (checkAndShowPriming)
      .mockResolvedValueOnce('1') // permission_granted
      .mockResolvedValueOnce(null); // milestone_10 not sent

    await handleWordAdded();
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
  });

  it('skips milestone if already sent', async () => {
    getTotalWordCount.mockResolvedValueOnce(10);
    getSetting.mockResolvedValue(null);
    getNotificationState
      .mockResolvedValueOnce('1')  // isNotificationsEnabled
      .mockResolvedValueOnce('1') // permission_requested (checkAndShowPriming)
      .mockResolvedValueOnce('1') // permission_granted
      .mockResolvedValueOnce('2026-01-01T00:00:00Z'); // milestone_10 already sent

    await handleWordAdded();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('does not throw on error', async () => {
    getTotalWordCount.mockRejectedValueOnce(new Error('db error'));
    await expect(handleWordAdded()).resolves.toBeUndefined();
  });
});

// ─── MILESTONE_THRESHOLDS export ─────────────────────────────────────────────

describe('MILESTONE_THRESHOLDS', () => {
  it('contains expected values', () => {
    expect(MILESTONE_THRESHOLDS).toContain(1);
    expect(MILESTONE_THRESHOLDS).toContain(10);
    expect(MILESTONE_THRESHOLDS).toContain(100);
    expect(MILESTONE_THRESHOLDS).toContain(1000);
  });
});
