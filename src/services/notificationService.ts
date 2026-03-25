import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  getNotificationState,
  setNotificationState,
  getWordsWithUpcomingAnniversaries,
  getEmptyCategoryNames,
  getTotalNonProfileAssetCount,
} from '../repositories/notificationRepository';
import { getSetting } from '../repositories/settingsRepository';
import { getTotalWordCount, getWordCountSinceDate } from '../repositories/dashboardRepository';
import { useNotificationStore } from '../stores/notificationStore';
import {
  buildSchedule,
  buildMilestoneContent,
  isTooSoonToReschedule,
  type ScheduleItem,
  type NotifStrings,
  type MilestoneStrings,
} from './notificationScheduler';
import enUS from '../i18n/en-US';
import ptBR from '../i18n/pt-BR';

// ─── i18n string helpers ──────────────────────────────────────────────────────

function getNotifStrings(locale: string | null): NotifStrings {
  const cat = (locale === 'pt-BR' ? ptBR : enUS).notifications as Record<string, string>;
  const months = (locale === 'pt-BR' ? ptBR : enUS).datePicker.months;
  return {
    nudge3dTitle: cat.nudge3dTitle,
    nudge3dBody: cat.nudge3dBody,
    nudge7dTitle: cat.nudge7dTitle,
    nudge7dBody: cat.nudge7dBody,
    nudge15dTitle: cat.nudge15dTitle,
    nudge15dBody: cat.nudge15dBody,
    weeklyWinTitle: cat.weeklyWinTitle,
    weeklyWinBody: cat.weeklyWinBody,
    monthlyRecapTitle: cat.monthlyRecapTitle,
    monthlyRecapBody: cat.monthlyRecapBody,
    nostalgia1mTitle: cat.nostalgia1mTitle,
    nostalgia1mBody: cat.nostalgia1mBody,
    nostalgia1yTitle: cat.nostalgia1yTitle,
    nostalgia1yBody: cat.nostalgia1yBody,
    featureDiscoveryTitle: cat.featureDiscoveryTitle,
    featureDiscoveryBody: cat.featureDiscoveryBody,
    categoryExplorerTitle: cat.categoryExplorerTitle,
    categoryExplorerBody: cat.categoryExplorerBody,
    backupReminderTitle: cat.backupReminderTitle,
    backupReminderBody: cat.backupReminderBody,
    months,
  };
}

function getMilestoneStrings(locale: string | null): MilestoneStrings {
  const cat = (locale === 'pt-BR' ? ptBR : enUS).notifications as Record<string, string>;
  return {
    firstTitle: cat.milestoneFirstTitle,
    firstBody: cat.milestoneFirstBody,
    title: cat.milestoneTitle,
    body: cat.milestoneBody,
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const MILESTONE_THRESHOLDS = [1, 10, 30, 50, 100, 200, 500, 1000] as const;

/** Identifier prefixes that are cancelled when the app comes to foreground. */
const RETENTION_PREFIXES = ['nudge-', 'feature-discovery', 'category-'];
const SCHEDULED_PREFIXES = ['weekly-win-', 'monthly-recap-'];
const ALL_MANAGED_PREFIXES = [...RETENTION_PREFIXES, ...SCHEDULED_PREFIXES];

// ─── Initialisation ───────────────────────────────────────────────────────────

/** Call once at app startup to set up the Android notification channel. */
export async function initNotifications(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Palavrinhas',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

// ─── Permissions ──────────────────────────────────────────────────────────────

export async function getPermissionStatus(): Promise<{ granted: boolean; canAskAgain: boolean }> {
  const status = await Notifications.getPermissionsAsync();
  return { granted: status.granted, canAskAgain: status.canAskAgain };
}

export async function requestPermissions(): Promise<boolean> {
  const status = await Notifications.requestPermissionsAsync();
  const granted = status.granted;
  await Promise.all([
    setNotificationState('permission_requested', '1'),
    setNotificationState('permission_granted', granted ? '1' : '0'),
    setNotificationState('notifications_enabled', granted ? '1' : '0'),
  ]);
  return granted;
}

export async function isNotificationsEnabled(): Promise<boolean> {
  const enabled = await getNotificationState('notifications_enabled');
  return enabled === '1';
}

// ─── Cancellation ─────────────────────────────────────────────────────────────

async function cancelByPrefixes(prefixes: string[]): Promise<void> {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  const toCancel = pending.filter(n =>
    prefixes.some(prefix => n.identifier.startsWith(prefix))
  );
  await Promise.all(
    toCancel.map(n => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

/** Cancel all retention + scheduled notifications (call on app foreground). */
export async function cancelRetentionNotifications(): Promise<void> {
  try {
    await cancelByPrefixes(ALL_MANAGED_PREFIXES);
  } catch {
    // Best-effort
  }
}

/** Cancel all scheduled notifications and clear state (used when notifications are disabled or data wiped). */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Best-effort
  }
}

// ─── Scheduling ───────────────────────────────────────────────────────────────

async function scheduleItem(item: ScheduleItem): Promise<void> {
  const trigger = item.triggerDate === null
    ? null
    : {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: item.triggerDate,
      };

  // Cancel existing notification with same identifier before rescheduling
  try {
    await Notifications.cancelScheduledNotificationAsync(item.identifier);
  } catch {
    // Not scheduled yet — ignore
  }

  await Notifications.scheduleNotificationAsync({
    identifier: item.identifier,
    content: {
      title: item.title,
      body: item.body,
      data: { route: item.route },
    },
    trigger: trigger as Parameters<typeof Notifications.scheduleNotificationAsync>[0]['trigger'],
  });
}

/**
 * Collect context from DB and schedule all applicable notifications.
 * Call this when the app goes to background.
 */
export async function scheduleAll(): Promise<void> {
  try {
    const enabled = await isNotificationsEnabled();
    if (!enabled) return;

    const permGranted = await getNotificationState('permission_granted');
    if (permGranted !== '1') return;

    const lastRun = await getNotificationState('last_schedule_run');
    const now = new Date();
    if (isTooSoonToReschedule(lastRun, now)) return;

    // Gather context
    const [
      locale,
      childName,
      totalWords,
      lastBackupDate,
      featureDiscoverySentRaw,
      nostalgiaWords,
      emptyCategoryRows,
      totalAssets,
    ] = await Promise.all([
      getSetting('app_locale'),
      getSetting('child_name'),
      getTotalWordCount(),
      getNotificationState('last_backup_date'),
      getNotificationState('feature_discovery_sent'),
      getWordsWithUpcomingAnniversaries(),
      getEmptyCategoryNames(),
      getTotalNonProfileAssetCount(),
    ]);

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [wordsThisWeek, wordsLast7Days] = await Promise.all([
      getWordCountSinceDate(weekStart.toISOString().split('T')[0]),
      getWordCountSinceDate(sevenDaysAgo.toISOString().split('T')[0]),
    ]);

    const schedule = buildSchedule(
      {
        strings: getNotifStrings(locale),
        childName: childName ?? '',
        totalWords,
        wordsThisWeek,
        totalAssets,
        lastBackupDate,
        featureDiscoverySent: featureDiscoverySentRaw === '1',
        wordsLast7Days,
        emptyCategoryNames: emptyCategoryRows.map(r => r.name),
        nostalgiaWords,
      },
      now,
    );

    // Cancel retention group before rescheduling
    await cancelByPrefixes(ALL_MANAGED_PREFIXES);

    // Schedule each item
    await Promise.all(schedule.map(scheduleItem));

    // Mark feature discovery as sent if it was scheduled
    const scheduled = schedule.find(i => i.identifier === 'feature-discovery');
    if (scheduled) {
      await setNotificationState('feature_discovery_sent', '1');
    }

    // Update dedup timestamp
    await setNotificationState('last_schedule_run', now.toISOString());
  } catch {
    // Scheduling is best-effort — never crash the app
  }
}

// ─── Milestone handling ───────────────────────────────────────────────────────

/** Check if the new total count hits a milestone and schedule/show priming if so. */
export async function handleWordAdded(): Promise<void> {
  try {
    const enabled = await isNotificationsEnabled();
    const [count, locale, childName] = await Promise.all([
      getTotalWordCount(),
      getSetting('app_locale'),
      getSetting('child_name'),
    ]);

    // Check priming: show after first word if permission not yet requested
    if (count === 1) {
      const permRequested = await getNotificationState('permission_requested');
      if (permRequested !== '1') {
        useNotificationStore.getState().setPrimingVisible(true);
      }
    }

    if (!enabled) return;
    const permGranted = await getNotificationState('permission_granted');
    if (permGranted !== '1') return;

    if (!MILESTONE_THRESHOLDS.includes(count as typeof MILESTONE_THRESHOLDS[number])) return;

    const milestoneKey = `milestone_${count}`;
    const alreadySent = await getNotificationState(milestoneKey);
    if (alreadySent) return;

    const content = buildMilestoneContent(count, childName ?? '', getMilestoneStrings(locale));
    await Notifications.scheduleNotificationAsync({
      identifier: `milestone-${count}`,
      content: {
        title: content.title,
        body: content.body,
        data: { route: '/(tabs)/progress' },
      },
      trigger: null,
    });
    await setNotificationState(milestoneKey, new Date().toISOString());
  } catch {
    // Best-effort
  }
}
