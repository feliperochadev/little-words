/**
 * Pure scheduling logic — no side effects, no expo-notifications imports.
 * Given a SchedulerContext it returns ScheduleItems that the service applies.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NostalgiaCandidate {
  id: number;
  word: string;
  date_added: string;
}

export interface NotifStrings {
  nudge3dTitle: string;
  nudge3dBody: string;
  nudge7dTitle: string;
  nudge7dBody: string;
  nudge15dTitle: string;
  nudge15dBody: string;
  weeklyWinTitle: string;
  weeklyWinBody: string;
  monthlyRecapTitle: string;
  monthlyRecapBody: string;
  nostalgia1mTitle: string;
  nostalgia1mBody: string;
  nostalgia1yTitle: string;
  nostalgia1yBody: string;
  featureDiscoveryTitle: string;
  featureDiscoveryBody: string;
  categoryExplorerTitle: string;
  categoryExplorerBody: string;
  backupReminderTitle: string;
  backupReminderBody: string;
  /** 12 month names (Jan=0) for monthly recap interpolation */
  months: readonly string[];
}

export interface MilestoneStrings {
  firstTitle: string;
  firstBody: string;
  title: string;
  body: string;
}

export interface SchedulerContext {
  strings: NotifStrings;
  childName: string;
  totalWords: number;
  wordsThisWeek: number;
  totalAssets: number;
  lastBackupDate: string | null;
  featureDiscoverySent: boolean;
  wordsLast7Days: number;
  emptyCategoryNames: string[];
  nostalgiaWords: NostalgiaCandidate[];
}

export interface ScheduleItem {
  identifier: string;
  title: string;
  body: string;
  /** expo-router path that the notification deep-links to */
  route: string;
  /** null = fire immediately */
  triggerDate: Date | null;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function atHour(date: Date, hour: number, minute = 0): Date {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function nextSunday(from: Date): Date {
  const d = new Date(from);
  const daysUntil = (7 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + daysUntil);
  return d;
}

function lastDayOfCurrentMonth(from: Date): Date {
  return new Date(from.getFullYear(), from.getMonth() + 1, 0);
}

export function interpolate(template: string, params: Record<string, string | number>): string {
  return Object.entries(params).reduce(
    (s, [k, v]) => s.replaceAll(`{{${k}}}`, String(v)),
    template,
  );
}

// ─── Nostalgia computation ─────────────────────────────────────────────────────

interface NostalgiaItem {
  id: number;
  word: string;
  anniversaryDate: Date;
  period: '1m' | '1y';
}

function pickNostalgiaWord(
  words: NostalgiaCandidate[],
  now: Date,
): NostalgiaItem | null {
  // Use start of today so same-day anniversaries (midnight) are included
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const horizon = addDays(now, 30);
  const candidates: NostalgiaItem[] = [];

  for (const w of words) {
    // Parse date string as local midnight to avoid UTC offset issues
    const [y, m, d] = w.date_added.split('-').map(Number);
    const added = new Date(y, m - 1, d);

    const oneMonth = new Date(added.getFullYear(), added.getMonth() + 1, added.getDate());
    if (oneMonth >= startOfToday && oneMonth <= horizon) {
      candidates.push({ id: w.id, word: w.word, anniversaryDate: oneMonth, period: '1m' });
      continue; // prefer 1m over 1y for same word
    }

    const oneYear = new Date(added.getFullYear() + 1, added.getMonth(), added.getDate());
    if (oneYear >= startOfToday && oneYear <= horizon) {
      candidates.push({ id: w.id, word: w.word, anniversaryDate: oneYear, period: '1y' });
    }
  }

  if (candidates.length === 0) return null;
  return candidates[getDeterministicDayIndex(candidates.length, now)];
}

// ─── Main scheduler ────────────────────────────────────────────────────────────

const DEDUP_MINUTES = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

function getDeterministicDayIndex(length: number, now: Date): number {
  const daySeed = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAY_MS);
  return daySeed % length;
}

/** Returns true if last scheduling run was within DEDUP_MINUTES. */
export function isTooSoonToReschedule(lastScheduleRun: string | null, now: Date): boolean {
  if (!lastScheduleRun) return false;
  const last = new Date(lastScheduleRun);
  return (now.getTime() - last.getTime()) < DEDUP_MINUTES * 60 * 1000;
}

export function buildSchedule(ctx: SchedulerContext, now: Date = new Date()): ScheduleItem[] {
  const s = ctx.strings;
  const items: ScheduleItem[] = [];
  const name = ctx.childName || 'your baby';

  // ── 1. Gentle Nudge (retention) ──────────────────────────────────────────────
  items.push(
    {
      identifier: 'nudge-3d',
      title: s.nudge3dTitle,
      body: interpolate(s.nudge3dBody, { childName: name }),
      route: '/(tabs)/home?action=add-word',
      triggerDate: atHour(addDays(now, 3), 10),
    },
    {
      identifier: 'nudge-7d',
      title: s.nudge7dTitle,
      body: interpolate(s.nudge7dBody, { childName: name }),
      route: '/(tabs)/home?action=add-word',
      triggerDate: atHour(addDays(now, 7), 10),
    },
    {
      identifier: 'nudge-15d',
      title: s.nudge15dTitle,
      body: interpolate(s.nudge15dBody, { childName: name }),
      route: '/(tabs)/home?action=add-word',
      triggerDate: atHour(addDays(now, 15), 10),
    },
  );

  // ── 2. Weekly Win ─────────────────────────────────────────────────────────────
  if (ctx.wordsThisWeek > 0) {
    const sunday = nextSunday(now);
    const sundayKey = sunday.toISOString().split('T')[0];
    items.push({
      identifier: `weekly-win-${sundayKey}`,
      title: s.weeklyWinTitle,
      body: interpolate(s.weeklyWinBody, { childName: name, count: ctx.wordsThisWeek }),
      route: '/(tabs)/progress',
      triggerDate: atHour(sunday, 12),
    });
  }

  // ── 3. Monthly Recap ──────────────────────────────────────────────────────────
  if (ctx.totalWords > 0) {
    const lastDay = lastDayOfCurrentMonth(now);
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    items.push({
      identifier: `monthly-recap-${monthKey}`,
      title: interpolate(s.monthlyRecapTitle, { month: s.months[now.getMonth()] }),
      body: interpolate(s.monthlyRecapBody, { childName: name, count: ctx.totalWords }),
      route: '/(tabs)/progress',
      triggerDate: atHour(lastDay, 19),
    });
  }

  // ── 4. Nostalgia Trip (1 random) ─────────────────────────────────────────────
  const nostalgia = pickNostalgiaWord(ctx.nostalgiaWords, now);
  if (nostalgia) {
    const key = `nostalgia-${nostalgia.id}-${nostalgia.period}`;
    const isOneYear = nostalgia.period === '1y';
    items.push({
      identifier: key,
      title: isOneYear ? s.nostalgia1yTitle : s.nostalgia1mTitle,
      body: interpolate(
        isOneYear ? s.nostalgia1yBody : s.nostalgia1mBody,
        { childName: name, word: nostalgia.word },
      ),
      route: '/(tabs)/home',
      triggerDate: atHour(nostalgia.anniversaryDate, 9),
    });
  }

  // ── 6. Feature Discovery (one-shot) ──────────────────────────────────────────
  if (ctx.totalWords > 5 && ctx.totalAssets === 0 && !ctx.featureDiscoverySent) {
    items.push({
      identifier: 'feature-discovery',
      title: s.featureDiscoveryTitle,
      body: interpolate(s.featureDiscoveryBody, { childName: name }),
      route: '/(tabs)/home?action=add-word',
      triggerDate: atHour(addDays(now, 1), 10),
    });
  }

  // ── 7. Category Explorer ──────────────────────────────────────────────────────
  if (ctx.wordsLast7Days === 0 && ctx.emptyCategoryNames.length > 0) {
    const categoryIndex = getDeterministicDayIndex(ctx.emptyCategoryNames.length, now);
    const randomCategory = ctx.emptyCategoryNames[categoryIndex];
    items.push({
      identifier: `category-${randomCategory}`,
      title: s.categoryExplorerTitle,
      body: interpolate(s.categoryExplorerBody, { childName: name, category: randomCategory }),
      route: '/(tabs)/home?action=add-word',
      triggerDate: atHour(addDays(now, 1), 10),
    });
  }

  // ── 8. Backup Reminder ────────────────────────────────────────────────────────
  const backupStale = ctx.lastBackupDate === null ||
    (now.getTime() - new Date(ctx.lastBackupDate).getTime()) > 30 * 24 * 60 * 60 * 1000;
  if (backupStale) {
    items.push({
      identifier: 'backup-reminder',
      title: s.backupReminderTitle,
      body: s.backupReminderBody,
      route: '/(tabs)/settings?scrollTo=export',
      triggerDate: atHour(addDays(now, 1), 18),
    });
  }

  return items;
}

// ─── Milestone content ────────────────────────────────────────────────────────

export function buildMilestoneContent(
  count: number,
  childName: string,
  strings: MilestoneStrings,
): { title: string; body: string } {
  const name = childName || 'your baby';
  const isFirst = count === 1;
  const tpl = isFirst
    ? { title: strings.firstTitle, body: strings.firstBody }
    : { title: strings.title, body: strings.body };
  return {
    title: tpl.title,
    body: interpolate(tpl.body, { childName: name, count }),
  };
}
