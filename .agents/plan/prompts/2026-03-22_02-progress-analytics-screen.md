# Prompt — 2026-03-22_02-progress-analytics-screen

## Original Prompt

Implement the PROGRESS_SCREEN_SPEC.md specification: refactor the dashboard to create a dedicated progress screen for detailed analytics, move complex charts from home, and simplify the home screen layout with improved stat card formatting.

Key points from the spec:
- Refactor StatCard layout: icon + label on same horizontal line, numeric value on line below aligned right
- Remove monthly progress chart, category breakdown, and recent words from home screen
- Add "See the Progress" button below stat cards that navigates to new progress screen
- Create `app/(tabs)/progress.tsx` as hidden tab (href: null) containing the moved sections + a coming soon placeholder
- Add i18n keys for both en-US and pt-BR
- All existing tests must be updated; new tests required for the progress screen

## Refined Prompt

### Context
The Palavrinhas app has a dashboard home screen (`app/(tabs)/home.tsx`) that currently displays stat cards (total words, variants, today/week/month counts), a monthly progress bar chart, a category breakdown with progress bars, and a recent words cloud. As the app grows, this creates a cluttered home screen. The goal is to split analytics into a dedicated progress screen while simplifying the home.

### Task
1. **Refactor StatCard** in `src/components/UIComponents.tsx`: change from vertical (icon on top → label → value) to a compact horizontal layout (icon + label on one row, value right-aligned on the same or next row).
2. **Simplify home screen**: remove the three heavy sections (monthly progress chart, category breakdown, recent words) and add a "See the Progress" navigation button below the stat cards.
3. **Create progress screen** at `app/(tabs)/progress.tsx` as a hidden tab containing the three moved sections plus a "coming soon" placeholder for future metrics.
4. **Register the route** in `app/(tabs)/_layout.tsx` with `href: null` (same pattern as media/settings).
5. **Add i18n keys**: `dashboard.seeProgress`, `dashboard.comingSoonTitle`, `dashboard.comingSoonDesc` in both `en-US` and `pt-BR`.
6. **Update all affected tests** (home screen tests, StatCard tests) and add new progress screen tests.

### Constraints
- No new dependencies; reuse existing components (`Card`, `StatCard`, Ionicons).
- The progress screen must use the same data source (`useDashboardStats`) — no new queries.
- StatCard refactor must be backward-compatible or all call sites updated simultaneously.
- Hidden tabs use `href: null` pattern already established for media/settings.
- All tests must pass `npm run ci` after changes.

### Expected Output
- Modified: `src/components/UIComponents.tsx` (StatCard), `app/(tabs)/home.tsx`, `app/(tabs)/_layout.tsx`, `src/i18n/en-US.ts`, `src/i18n/pt-BR.ts`
- New: `app/(tabs)/progress.tsx`
- Updated: `__tests__/screens/home.test.tsx`, `__tests__/integration/UIComponents.test.tsx` (or equivalent)
- New: `__tests__/screens/progress.test.tsx`

### Acceptance Criteria
- Home screen shows only profile, stat cards (new layout), and "See the Progress" button when data exists
- "See the Progress" navigates to `/progress` screen
- Progress screen displays monthly chart, category breakdown, recent words, and coming soon placeholder
- StatCard renders icon + label horizontally, value below/right-aligned
- All i18n keys present for en-US and pt-BR
- All tests pass, coverage meets project requirements (99% lines, 95% funcs/branches/stmts)
- `npm run ci` passes
