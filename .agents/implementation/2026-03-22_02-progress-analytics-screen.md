---
name: 2026-03-22_02-progress-analytics-screen
plan: .agents/plan/design/2026-03-22_02-progress-analytics-screen.md
status: done
started: 2026-03-22
agent: claude
worktree: false
---

## Summary

Creates a dedicated progress analytics screen by moving chart/category/recent-words sections from home, refactoring StatCard to a compact two-row layout, and wrapping home stat cards in a tappable design-system Card frame that navigates to progress.

## Changes

| File | Action | Notes |
|------|--------|-------|
| `src/utils/dashboardHelpers.ts` | modified | Added `formatMonth` + `MONTH_KEYS` |
| `src/components/UIComponents.tsx` | modified | StatCard: vertical → two-row layout (icon+label top, value centered below) |
| `app/(tabs)/home.tsx` | modified | Removed 3 sections; stat cards wrapped in tappable Card frame with "Progress" title |
| `app/(tabs)/progress.tsx` | created | New screen with moved sections + coming soon |
| `app/(tabs)/_layout.tsx` | modified | Added hidden progress tab |
| `src/i18n/en-US.ts` | modified | Added seeProgress, progressTitle, comingSoonTitle, comingSoonDesc |
| `src/i18n/pt-BR.ts` | modified | Added seeProgress, progressTitle, comingSoonTitle, comingSoonDesc |
| `__tests__/screens/home.test.tsx` | modified | Removed chart/category/recent tests, added progress-frame tests |
| `__tests__/integration/UIComponents.test.tsx` | modified | Updated StatCard tests for two-row layout |
| `__tests__/unit/dashboardHelpers.test.ts` | modified | Added formatMonth tests |
| `__tests__/screens/progress.test.tsx` | created | Full test suite for progress screen |

## Design Decisions Made

- StatCard layout: icon+label on top row (icon 32×32, label flex:1), value centered below — two-row design
- Progress screen header: back button (chevron-back) + trending-up icon + `t('dashboard.progressTitle')` title
- Home stat cards wrapped in a tappable `Card` (design system) with "Progress" title top-left + chevron; entire frame navigates to `/(tabs)/progress`
- Frame only visible when `totalWords > 0`; empty state shows only "Start recording" message
- `formatMonth` extracted to `dashboardHelpers.ts` taking `(monthStr, showYear, t)` for i18n support
