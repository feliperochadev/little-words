---
name: 2026-03-24_01-local-notifications
plan: .agents/plan/design/2026-03-24_01-local-notifications.md
status: done
started: 2026-03-24
agent: claude
worktree: false
---

## Summary

Implemented a complete local push notification system for Palavrinhas using expo-notifications, including 8 notification types, a "Reset Sequence" scheduling strategy, permission priming modal, Settings toggle, deep-link routing, and bilingual content — all covered at 100% across all metrics.

## Design Decisions Made

**Q1 — Nostalgia cap:** Option C — 1 random nostalgia notification per scheduling run (prevents notification spam when many anniversaries exist simultaneously).

**Q2 — Backup date tracking:** Option A — write `last_backup_date` in `settings.tsx` call sites (keep `backupExport.ts` pure, no repo coupling in the export utility).

**Q3 — Settings scroll-to-export:** Option B — add `scrollTo=export` URL param, capture export section `y` via `onLayout`, and scroll via `useEffect` with a 300ms delay.

**Dynamic import removed:** `NotificationPrimingModal` originally used a dynamic `import()` for `notificationRepository` to reduce initial bundle impact, but Jest's CommonJS environment doesn't support `--experimental-vm-modules`, so it was replaced with a static import.

**nostalgia date parsing:** Original implementation used `new Date(date_added)` which parses as UTC midnight, causing timezone edge cases when comparing with local `now`. Fixed to use explicit `[y, m, d] = date_added.split('-').map(Number)` with `new Date(y, m-1, d)` for local midnight.

**nostalgia horizon check:** Changed from `>= now` to `>= startOfDay(now)` so same-day anniversaries are included regardless of the current hour.

## Changes

| File | Action | Notes |
|------|--------|-------|
| `src/db/migrations/0005_add-notification-state.ts` | created | New migration: `notification_state` table |
| `src/db/migrations/index.ts` | modified | Added m0005 to migration array |
| `src/repositories/notificationRepository.ts` | created | CRUD for notification_state + query helpers |
| `src/services/notificationScheduler.ts` | created | Pure scheduling logic (no expo-notifications import) |
| `src/services/notificationService.ts` | created | expo-notifications orchestration layer |
| `src/stores/notificationStore.ts` | created | Zustand store for priming modal visibility |
| `src/hooks/useNotifications.ts` | created | React hook: AppState listener + notification response listener |
| `src/components/NotificationPrimingModal.tsx` | created | Permission priming bottom-sheet modal |
| `src/repositories/settingsRepository.ts` | modified | Added clearNotificationState to clearAllData |
| `src/services/settingsService.ts` | modified | Added cancelAllNotifications to clearAllData |
| `src/hooks/useWords.ts` | modified | handleWordAdded() called in useAddWord.onSuccess |
| `src/i18n/en-US.ts` | modified | Added notifications namespace |
| `src/i18n/pt-BR.ts` | modified | Added notifications namespace |
| `app/_layout.tsx` | modified | Added NotificationHandler component inside providers |
| `app/(tabs)/_layout.tsx` | modified | Added NotificationPrimingModal globally |
| `app/(tabs)/home.tsx` | modified | Added action=add-word deep link support |
| `app/(tabs)/settings.tsx` | modified | Added notifications toggle, backup date tracking, scroll-to-export |
| `jest.setup.js` | modified | Added expo-notifications mock |
| `__tests__/unit/notificationRepository.test.ts` | created | 100% coverage |
| `__tests__/unit/notificationScheduler.test.ts` | created | 100% coverage |
| `__tests__/integration/notificationService.test.ts` | created | 100% coverage |
| `__tests__/integration/useNotifications.test.ts` | created | 100% coverage |
| `__tests__/integration/NotificationPrimingModal.test.tsx` | created | 100% coverage |
| `__tests__/screens/settings.test.tsx` | modified | Added notification mock + 6 new test cases |
| `__tests__/screens/home.test.tsx` | modified | Added notificationService mock |
| `__tests__/screens/layout.test.tsx` | modified | Added useNotifications mock |
| `__tests__/screens/tabLayout.test.tsx` | modified | Added NotificationPrimingModal mock |
| `__tests__/integration/AddWordModal.test.tsx` | modified | Added notificationService mock |
| `__tests__/unit/migrator.test.ts` | modified | Added v5 rollback test + updated "all applied" test |

## Enhancements

### 2026-03-24 — i18n migration, expandable categories, standards update

- **Description:** (1) Moved all hardcoded notification content strings from `notificationScheduler.ts` to the i18n catalogues (`en-US.ts`, `pt-BR.ts`). Scheduler now receives pre-resolved `NotifStrings` and `MilestoneStrings` via context instead of doing locale selection internally. (2) Categories section in Settings is now collapsible — collapsed by default, expand button at the bottom reveals the list and add-category button. (3) Added mandatory i18n rule to `.agents/standards/components.md`.
- **Files Modified:** `src/i18n/en-US.ts`, `src/i18n/pt-BR.ts`, `src/services/notificationScheduler.ts`, `src/services/notificationService.ts`, `app/(tabs)/settings.tsx`, `.agents/standards/components.md`, `__tests__/unit/notificationScheduler.test.ts`, `__tests__/screens/settings.test.tsx`, `__tests__/integration/notificationService.test.ts`
- **Plan Updates:** None — purely enhancement to existing implementation.
