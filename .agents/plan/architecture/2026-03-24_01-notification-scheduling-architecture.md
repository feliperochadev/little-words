# ADR: Notification Scheduling Architecture — Reset Sequence Pattern

**Date:** 2026-03-24
**Status:** Accepted
**Deciders:** Claude, user

---

## Context

Palavrinhas is a local-first app with no backend. To support retention notifications (inactivity reminders, weekly summaries, backup nudges), we need a scheduling strategy that:

1. Works without a server to trigger notifications
2. Doesn't annoy active users with irrelevant reminders
3. Handles the app being killed by the OS (no guaranteed background execution)
4. Remains simple — no background task runners, no periodic sync

The core question: **When and how should local notifications be scheduled and cancelled?**

## Decision Drivers

- **Reliability:** Notifications must fire even if the app is killed after backgrounding
- **User respect:** Active users must never see stale inactivity reminders
- **Simplicity:** No background task managers (expo-task-manager) or periodic alarms
- **Battery efficiency:** Minimal processing, leveraging OS alarm system
- **Idempotency:** Re-scheduling must not duplicate notifications

## Considered Options

1. **Reset Sequence (schedule on background, cancel on foreground)**
2. **Periodic Background Task (expo-task-manager with BackgroundFetch)**
3. **Schedule on Foreground (schedule + cancel every app open)**

## Decision

**Chosen option: Option 1 — Reset Sequence**, because it is the simplest reliable pattern for a local-first app without a backend.

### How It Works

1. **App comes to foreground:** Cancel all pending retention/scheduled notifications immediately. The user is active — they don't need reminders.
2. **App goes to background:** Batch-schedule the full notification sequence (Day 3/7/15 nudges, weekly win, monthly recap, backup reminder, nostalgia trips, category explorer, feature discovery). These act as a "safety net" that only fires if the user doesn't return.
3. **App is killed by OS:** The scheduled notifications persist in the OS alarm system. They will fire at their scheduled times regardless of app state.
4. **User returns:** Step 1 fires again — all pending notifications are wiped and the cycle restarts.

### Identifier-Based Cancellation

Each notification type has a deterministic identifier (e.g., `nudge-3d`, `weekly-win-2026-W13`). To "reschedule," we cancel by identifier then schedule a new one. This ensures idempotency without needing a local notification registry.

Cancellation groups:
- **`retention`** group (cancelled on foreground): `nudge-*`, `feature-discovery`, `category-*`
- **`scheduled`** group (cancelled on foreground): `weekly-win-*`, `monthly-recap-*`
- **Never cancelled**: `nostalgia-*` (one-shot anniversary), `milestone-*` (immediate)

### Pros
- Zero background processing — uses only `AppState` events and OS-level scheduled alarms
- Battle-tested pattern in local-first apps (Duolingo, language learning apps use similar approaches)
- Idempotent by design — scheduling is a pure function of current state
- Simple to reason about: foreground = cancel, background = schedule
- Battery-friendly: no periodic wake-ups

### Cons
- If the user force-quits without triggering `AppState: 'background'`, the previous schedule remains (stale but harmless — notifications are time-limited)
- Scheduling happens on every background transition, even if nothing changed (mitigated by `last_schedule_run` dedup timestamp)
- Cannot dynamically update notification content after scheduling (e.g., if the user changes locale while notifications are pending — they'll fire in the old locale)

## Consequences

### Positive
- No dependency on `expo-task-manager` or background fetch (fewer native modules, simpler config)
- Works on all Android versions without special battery optimization whitelisting
- Notification scheduling is testable as a pure function (given stats → compute schedule)
- Clear mental model for debugging: "what was the last background event?"

### Negative / Risks
- **Stale locale risk:** If user changes locale, pending notifications remain in old language. Mitigation: cancel and reschedule all on next background event (which happens naturally).
- **Force-quit edge case:** If user force-kills the app from recent apps, `AppState` may not fire `background`. The previously scheduled notifications will fire. Mitigation: these are the same notifications that would have been scheduled anyway, just not "refreshed." Acceptable.
- **Notification limit:** Some Android OEMs limit the number of pending alarms (typically 50+). With 8 notification types and limited instances per type, we stay well under this limit.

## Links

- Related design: `2026-03-24_01-local-notifications.md`
- Brainstorming: `PUSH_NOTIFICATIONS_BRAINSTORM.md` (project root)
- expo-notifications docs: https://docs.expo.dev/versions/latest/sdk/notifications/
