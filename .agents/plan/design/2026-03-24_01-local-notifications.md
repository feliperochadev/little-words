# Design: Local Push Notification System

**Date:** 2026-03-24
**Status:** Implemented
**Author:** Claude
**Related ADR:** 2026-03-24_01-notification-scheduling-architecture

---

## Problem Statement

Palavrinhas is a local-first app with no backend to trigger re-engagement. Once a parent stops opening the app, there is no mechanism to remind them to continue recording their child's words. This leads to silent churn — parents forget, memories are lost.

A local notification system must act as a "safety net" that nudges parents back into the app while also celebrating their progress and protecting their data through backup reminders.

## Goals

- Increase retention by reminding inactive users to return (3/7/15-day sequence)
- Celebrate progress (weekly wins, milestones, monthly recaps) to reinforce habit
- Prompt feature discovery (media capture) and content ideas (category explorer)
- Protect data via backup reminders after 30 days of no backup
- Trigger nostalgia with word anniversaries (1mo, 1yr)
- Work fully offline with no remote server dependency
- Support bilingual notification content (en-US, pt-BR)

## Non-Goals

- Remote/push notifications via a server (all notifications are local)
- Notification inbox or history screen (notifications are ephemeral)
- Custom notification sounds or notification channels beyond default
- "Memories" screen (deferred to a future task; nostalgia deep links to Home for now)
- Quiet hours / do-not-disturb scheduling (OS handles this)

---

## Design

### Overview

The system follows the **"Reset Sequence"** strategy:

1. **On app foreground:** Cancel all pending retention/inactivity notifications. This ensures active users never see stale reminders.
2. **On app background/quit:** Batch-schedule the full retention sequence (Day 3, 7, 15) plus any applicable time-based notifications (weekly win, monthly recap, backup reminder, nostalgia trips).
3. **On specific events:** Fire immediate notifications for milestones and feature discovery.

All scheduling is idempotent — re-scheduling replaces existing notifications of the same type via identifier-based cancellation.

### Component / Module Breakdown

| Component | Responsibility | File(s) |
|-----------|---------------|---------|
| **NotificationService** | Core orchestration: permissions, scheduling, cancellation, response handling | `src/services/notificationService.ts` |
| **NotificationScheduler** | Pure scheduling logic: compute trigger dates, build notification content | `src/services/notificationScheduler.ts` |
| **NotificationRepository** | Persist tracking state (milestones reached, last backup date, etc.) | `src/repositories/notificationRepository.ts` |
| **useNotifications hook** | React hook: registers listeners, handles foreground reset, background scheduling | `src/hooks/useNotifications.ts` |
| **useNotificationPermission hook** | Permission request with priming UI support | `src/hooks/useNotificationPermission.ts` |
| **NotificationSettings UI** | Toggle notifications on/off in Settings screen | In `app/(tabs)/settings.tsx` |
| **Permission Priming Modal** | Contextual "Enable Notifications?" prompt | `src/components/NotificationPrimingModal.tsx` |
| **Deep Link Handler** | Route notification responses to correct screens | In `app/_layout.tsx` |
| **Migration 0005** | Add `notification_state` table | `src/db/migrations/0005_add-notification-state.ts` |

### Notification Types & Identifiers

Each notification type has a stable identifier prefix used for targeted cancellation:

| # | Type | Identifier Pattern | Trigger | Cancel On |
|---|------|-------------------|---------|-----------|
| 1 | Gentle Nudge | `nudge-3d`, `nudge-7d`, `nudge-15d` | App background | App foreground |
| 2 | Weekly Win | `weekly-win-YYYY-WW` | App background (if words added this week) | App foreground (reschedule) |
| 3 | Monthly Recap | `monthly-recap-YYYY-MM` | App background (last day of month check) | App foreground (reschedule) |
| 4 | Nostalgia Trip | `nostalgia-{wordId}-{period}` | App background (scan for upcoming anniversaries) | Never (one-shot) |
| 5 | Milestone | `milestone-{count}` | Immediate on word add mutation | After display |
| 6 | Feature Discovery | `feature-discovery` | App background (if conditions met) | App foreground |
| 7 | Category Explorer | `category-{categoryKey}` | App background (if inactive > 7 days) | App foreground |
| 8 | Backup Reminder | `backup-reminder` | App background (if > 30 days since backup) | Backup completed |

**Cancellation groups** for the "Reset Sequence" foreground wipe:
- `retention`: nudge-*, feature-discovery, category-*
- `scheduled`: weekly-win-*, monthly-recap-*

Nostalgia and milestone notifications are NOT cancelled on foreground — they are one-shot celebratory notifications.

### Data Flow

#### App Startup (Foreground)
```
App opens → index.tsx
  → initDatabase() + runMigrations()
  → hydrate settingsStore
  → Cancel all 'retention' + 'scheduled' group notifications
  → Route to home
```

#### App Backgrounding
```
AppState → 'background'
  → notificationScheduler.scheduleAll(context)
    → Query dashboard stats (word counts, dates)
    → Query notification_state (milestones, last backup)
    → Compute which notifications to schedule
    → Batch schedule via expo-notifications
```

#### Word Added (Milestone Check)
```
useAddWord.onSuccess →
  → Query total word count
  → If count ∈ {1, 10, 30, 50, 100, 200, 500, 1000}
    AND milestone not yet reached (check notification_state)
  → Schedule immediate notification
  → Mark milestone as reached in notification_state
```

#### Notification Tapped (Deep Link)
```
User taps notification →
  → expo-notifications response listener (in _layout.tsx)
  → Extract route from notification data.route
  → router.push(route) or router.navigate(route)
```

### Database Schema

**New table: `notification_state`** (via migration 0005)

```sql
CREATE TABLE notification_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Tracked keys:**

| Key | Value | Purpose |
|-----|-------|---------|
| `notifications_enabled` | `'1'` / `'0'` | User preference toggle |
| `permission_requested` | `'1'` / `'0'` | Whether OS permission has been asked |
| `permission_granted` | `'1'` / `'0'` | Cached permission status |
| `milestone_{N}` | ISO timestamp | When milestone N was celebrated |
| `last_backup_date` | ISO timestamp | Updated on successful backup export |
| `last_schedule_run` | ISO timestamp | Dedup: prevent scheduling twice in quick succession |
| `feature_discovery_sent` | `'1'` / `'0'` | One-shot: only send once |

**Why a separate table instead of `settings`?** The `settings` table is the user-facing configuration store hydrated into Zustand. Notification tracking state is internal bookkeeping (timestamps, flags) that doesn't belong in the UI store. A separate table keeps concerns clean and avoids bloating `useSettingsStore` hydration.

### Deep Link Routing Map

| Notification Type | `data.route` | Target |
|-------------------|-------------|--------|
| Gentle Nudge | `/(tabs)/home?action=add-word` | Home → auto-open AddWordModal |
| Weekly Win | `/(tabs)/progress` | Progress tab |
| Monthly Recap | `/(tabs)/progress` | Progress tab |
| Nostalgia Trip | `/(tabs)/home` | Home (future: memories screen) |
| Milestone | `/(tabs)/progress` | Progress tab |
| Feature Discovery | `/(tabs)/home?action=add-word` | Home → AddWordModal (media hint) |
| Category Explorer | `/(tabs)/home?action=add-word` | Home → AddWordModal |
| Backup Reminder | `/(tabs)/settings` | Settings (scroll to export section) |

**Deep link handling in `app/_layout.tsx`:**
```typescript
// Register notification response listener
Notifications.addNotificationResponseReceivedListener((response) => {
  const route = response.notification.request.content.data?.route;
  if (route) {
    router.push(route);
  }
});
```

For the `?action=add-word` parameter, `home.tsx` reads the route params and auto-opens the AddWordModal when the param is present.

### Notification Content (i18n)

All notification copy is stored in the translation catalogues (`en-US.ts`, `pt-BR.ts`) under a new `notifications` namespace:

```typescript
notifications: {
  nudge3d: { title: "New sounds today?", body: "Has {{childName}} made any new sounds? Capture them before you forget!" },
  nudge7d: { title: "A quiet week!", body: "Did {{childName}} discover a new word? Record it now." },
  nudge15d: { title: "Don't let memories fade!", body: "Add {{childName}}'s latest words to their timeline." },
  weeklyWin: { title: "Weekly win!", body: "{{childName}} learned {{count}} new words this week!" },
  monthlyRecap: { title: "Bye bye, {{month}}!", body: "{{childName}} added {{count}} words this month. See the growth!" },
  nostalgia1m: { title: "1 month ago today!", body: "{{childName}} said '{{word}}' for the first time 1 month ago!" },
  nostalgia1y: { title: "Flashback!", body: "{{childName}} said '{{word}}' one year ago today!" },
  milestone: { title: "Milestone!", body: "That was {{childName}}'s {{count}}th word! The dictionary is growing!" },
  milestoneFirst: { title: "First word!", body: "You've started {{childName}}'s journey. Keep it up!" },
  featureDiscovery: { title: "Did you know?", body: "You can record audio or add photos to {{childName}}'s words. Try it!" },
  categoryExplorer: { title: "Time for new words!", body: "Does {{childName}} know any {{category}} words yet?" },
  backupReminder: { title: "Keep memories safe!", body: "It's been a while since your last backup. Tap to save a ZIP now." },
}
```

**Language selection at schedule time:** When scheduling notifications during app background, the scheduler reads the current locale from `settingsRepository.getSetting('app_locale')` and uses the appropriate catalogue to build notification content. This is necessary because notifications fire when the app is not running — they must contain pre-rendered text, not translation keys.

### Permission Flow

**Priming strategy:** Don't ask for notification permission on first launch. Wait for a meaningful moment:

1. **Trigger point:** After the user adds their **first word** (milestone 1).
2. **UI:** Show `NotificationPrimingModal` — a friendly bottom-sheet explaining the value:
   > "Would you like reminders to capture new words? We'll celebrate milestones and remind you to back up."
3. **"Enable" button:** Calls `Notifications.requestPermissionsAsync()`. On Android 13+, this triggers the runtime permission dialog.
4. **"Not now" button:** Dismisses modal, sets `permission_requested: '1'` but `notifications_enabled: '0'`. User can enable later in Settings.
5. **Denied by OS:** Show a gentle note in Settings pointing to system settings.

**Android 13+ (API 33):** `POST_NOTIFICATIONS` runtime permission is required. `expo-notifications` handles this via `requestPermissionsAsync()`. The priming modal ensures we explain *before* the OS dialog appears.

**Android < 13:** Notifications are enabled by default. The priming modal still appears for opt-in UX consistency, but the OS dialog won't show.

### Settings UI Addition

Add a **"Notifications"** section to `app/(tabs)/settings.tsx` between "Language" and "Categories":

```
┌─────────────────────────────────┐
│ 🔔 Notifications                │
│                                 │
│ Enable notifications    [toggle]│
│                                 │
│ (when disabled, grey text:)     │
│ "You won't receive reminders    │
│  or milestone celebrations"     │
└─────────────────────────────────┘
```

Toggle writes to `notification_state.notifications_enabled`. When toggled OFF → cancel all pending notifications. When toggled ON → trigger a reschedule on next background.

### Scheduling Logic Details

#### Gentle Nudge (Retention)
```
Schedule 3 notifications:
  - nudge-3d: now + 3 days, 10:00 AM local
  - nudge-7d: now + 7 days, 10:00 AM local
  - nudge-15d: now + 15 days, 10:00 AM local
```

#### Weekly Win
```
If words_added_this_week > 0:
  Schedule for next Sunday at 12:00 PM local
  Identifier: weekly-win-{YYYY}-{WW}
```

#### Monthly Recap
```
Schedule for last day of current month at 7:00 PM local
Only if current total words > 0
Identifier: monthly-recap-{YYYY}-{MM}
```

#### Nostalgia Trip
```
Query words where:
  - date_added is exactly N months/years ago (within next 30 days window)
  - Periods: 1 month, 1 year
Schedule at 9:00 AM local on the anniversary date
Identifier: nostalgia-{wordId}-{period}
Limit: max 2 nostalgia notifications per scheduling run (avoid flood)
```

#### Milestone Celebration
```
Triggered synchronously in useAddWord.onSuccess callback
Check total count against thresholds: [1, 10, 30, 50, 100, 200, 500, 1000]
If threshold just crossed AND not in notification_state:
  Schedule immediate notification (trigger: null = now)
  Write milestone_{N} to notification_state
```

#### Feature Discovery
```
If:
  - total_words > 5
  - total_assets == 0 (no media attached to any word)
  - feature_discovery_sent != '1'
Then:
  Schedule for now + 1 day at 10:00 AM
  One-shot: mark feature_discovery_sent = '1'
```

#### Category Explorer
```
If no words added in last 7 days:
  Pick a random category that has 0 words
  Schedule for now + 1 day at 10:00 AM
  Identifier: category-{categoryKey}
```

#### Backup Reminder
```
If last_backup_date is NULL or > 30 days ago:
  Schedule for now + 1 day at 6:00 PM
  Identifier: backup-reminder
Cancel when backup is successfully exported (write last_backup_date)
```

### Error Handling

- **Permission denied:** Gracefully degrade — no notifications scheduled, no errors shown. Settings toggle shows "disabled" state with hint to enable in OS settings.
- **Scheduling failure:** Log error silently. Notifications are best-effort — a missed notification is not a data loss event.
- **Database query failure during scheduling:** Catch and skip. The next app background event will retry.
- **Stale notifications after data wipe:** `clearAllData()` in settings must also call `Notifications.cancelAllScheduledNotificationsAsync()` and clear `notification_state` table.

---

## Alternatives Considered

### 1. Store notification state in Zustand + settings table
**Rejected:** Notification tracking state (milestone timestamps, feature discovery flag) is internal bookkeeping. Mixing it with user-facing settings bloats `useSettingsStore` hydration and muddies the store's purpose. A dedicated `notification_state` table is cleaner.

### 2. Use expo-task-manager for background scheduling
**Rejected:** Background tasks on mobile are unreliable and battery-hungry. The "Reset Sequence" pattern (schedule on background, cancel on foreground) achieves the same outcome using only `AppState` events and `expo-notifications` scheduled triggers, which are handled by the OS alarm system.

### 3. Schedule all notifications at startup instead of background
**Rejected:** Scheduling on foreground means cancelling + rescheduling every time the user opens the app, even if they're active daily. Scheduling on background only creates the "safety net" when the user is actually leaving, which is the correct mental model.

---

## Open Questions

- [ ] **Nostalgia notification frequency cap:** Should we limit to max 1 nostalgia notification per day? With many words, anniversaries could cluster.
- [ ] **Backup date tracking integration:** The `last_backup_date` key needs to be written by the existing backup export flow (`backupExport.ts`). This is a cross-cutting concern — confirm the integration point.
- [ ] **Settings scroll-to-export:** The backup reminder deep links to settings. Should it auto-scroll to the export section, or is navigating to settings sufficient for MVP?

---

## Acceptance Criteria

- [ ] `expo-notifications` installed and configured
- [ ] Permission priming modal appears after first word is added
- [ ] Android 13+ runtime permission request works correctly
- [ ] All 8 notification types schedule correctly on app background
- [ ] All retention/scheduled notifications cancel on app foreground
- [ ] Milestone notifications fire immediately on word count thresholds
- [ ] Notification taps deep link to correct screens (Progress, Home, Settings)
- [ ] `?action=add-word` param auto-opens AddWordModal on Home
- [ ] Settings toggle enables/disables all notifications
- [ ] Disabling notifications cancels all pending scheduled notifications
- [ ] `clearAllData()` cancels all notifications and clears notification_state
- [ ] Backup export writes `last_backup_date` to notification_state
- [ ] All notification content renders in correct locale (en-US / pt-BR)
- [ ] Feature discovery notification fires once and never again
- [ ] Milestone notifications fire once per threshold and never again
- [ ] Unit tests for scheduler logic (trigger computation, content building)
- [ ] Integration tests for permission flow and settings toggle
- [ ] CI passes (`npm run ci`)

---

## Implementation Plan

### Phase 1: Foundation
1. Install `expo-notifications`
2. Create migration 0005 (`notification_state` table)
3. Create `notificationRepository.ts` (CRUD for notification_state)
4. Create `notificationService.ts` (permissions, schedule, cancel wrappers)
5. Create `notificationScheduler.ts` (pure scheduling logic — dates, content, identifiers)

### Phase 2: Core Scheduling
6. Add i18n keys for all 8 notification types (en-US + pt-BR)
7. Implement Reset Sequence in `useNotifications` hook (foreground cancel, background schedule)
8. Wire `useNotifications` into `app/_layout.tsx` (AppState listener + response listener)
9. Implement deep link routing handler

### Phase 3: Event-Driven Notifications
10. Add milestone check to `useAddWord` mutation `onSuccess`
11. Add `last_backup_date` write to backup export flow
12. Implement feature discovery and category explorer scheduling logic

### Phase 4: Permission & Settings UI
13. Create `NotificationPrimingModal` component
14. Trigger priming after first word milestone
15. Add Notifications section to Settings screen (toggle + status)
16. Handle permission denied state gracefully

### Phase 5: Testing & Polish
17. Unit tests for `notificationScheduler.ts` (all 8 types)
18. Unit tests for `notificationRepository.ts`
19. Integration tests for `useNotifications` hook
20. Integration tests for Settings notification toggle
21. Integration tests for deep link routing
22. Run `npm run ci` — all green
