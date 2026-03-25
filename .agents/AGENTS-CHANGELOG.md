# Changelog

Entries are added after every approved change. Most recent first.

### 2026-03-25_9

**[fix] SonarCloud issues on PR #57: coverage, duplication, cognitive complexity (apsc - gi)**

- Refactored `src/components/TimelineItem.tsx` by extracting `TimelineBadge`, `TimelineAssetRow`, `TimelineCard`, and `TimelinePane` to reduce cognitive complexity from 36 to <15.
- Refactored `src/repositories/memoriesRepository.ts` SQL query using a CTE (`AssetStats`) to eliminate duplication between `words` and `variants` branches of the `UNION ALL`.
- Extracted `useTimelineHandlers` hook to eliminate duplication of asset interaction logic between `home.tsx` and `memories.tsx`.
- Simplified `renderItem` in `app/(tabs)/memories.tsx` to fix Sonar warning about unused `item` and `index` props.
- Refactored `StatCard` in `src/components/UIComponents.tsx` to reduce internal duplication between variants.
- Updated `.agents/standards/quality.md` and `.agents/standards/components.md` with new standards for preventing cognitive complexity and SQL duplication.
- Updated `__tests__/unit/memoriesRepository.test.ts` to match the refactored SQL query structure.
- Added `__tests__/integration/useTimelineHandlers.test.tsx` to verify shared timeline logic.
- All tests pass (95/95 suites, 1985 tests) with 100% coverage on new/modified code.

### 2026-03-25_8

**[feature] Add iconValue variant to StatCard: all 5 stat cards (totalWords, totalVariants, today, this week, this month) now show icon + number centered on the same row with the label text centered below — applied in home.tsx and progress.tsx**

### 2026-03-25_7

**[fix] Fix continuous vertical timeline line: eliminate gap-bridging hacks by removing `marginBottom` from `TimelineItem` row and moving spacing to `card`'s `marginVertical: 6` — dotColumn line segments in adjacent rows are now flush with zero gap, making the line truly continuous without negative margins or overflow tricks; dot position stays consistently at 50% via symmetric flex:1 panes**

### 2026-03-25_6

[fix] Fix broken vertical line between timeline items: added `lineSegmentVExtend` style with `marginBottom: -12` on the bottom segment of non-last items, bridging the 12px row gap so the line appears continuous
[fix] Increase compact font sizes: word text 12→14, badge 8→10, badge padding 5→6 — matching user request to double the compact scale

### 2026-03-25_5

[fix] Bound timeline vertical line to first/last dot: replaced the absolute full-height `centerLine` overlay with an inline `dotColumn` layout inside each `TimelineItem`; line segments above/below the dot are transparent when `isFirst`/`isLast` — memories screen and home mini-timeline no longer show the line beyond the first and last entries
[fix] Scale down home mini-timeline cards: added `compact` prop to `TimelineItem` that reduces word font size to 12, badge font to 8, and photo thumbnail to 22px — prevents text overflow in the narrower home card context; home cards pass `compact` and `isFirst`/`isLast`

### 2026-03-25_4

[fix] Fix timeline sort key: change `ORDER BY created_at DESC` to `ORDER BY date_added DESC, created_at DESC` so the timeline orders by when the word was spoken (user-facing date), not by DB insertion time — entries entered on different days than they were spoken now appear in the correct chronological position

### 2026-03-25_3

[fix] Fix timeline ordering: wrap UNION ALL in a subquery so the outer `ORDER BY created_at DESC` applies to the entire interleaved result — previously SQLite applied it only to the variants half, causing words and variants to appear in separate sorted groups
[fix] Reduce home memories card cap from 5 to 3 latest entries

### 2026-03-25_2

[fix] Align media controls with card text direction: left cards now use `flex-end` (right-aligned, matching right-aligned text); right cards use `flex-start` (left-aligned, matching left-aligned text) — previously they were reversed
[fix] Improve variant badge contrast: badge text color changed from `textOnPrimary` (white) to `text` (dark) so it is readable on the light `secondary` background used in all themes
[feature] Replace home memories compact rows with full `TimelineItem` mini-timeline: alternating cards with center line, capped at 5 entries; audio/photo overlays wired via `useAssetPreviewOverlays`; header row and see-all button navigate to `/(tabs)/memories`

### 2026-03-25_1

[feature] Enhance memories timeline layout: date moved outside card to opposing side (bold); left cards right-align text with badge on left and word on right in same row; right cards left-align with word on left and badge on right; media controls align left in left cards, right in right cards; `variant of` context text now also follows card alignment
[fix] Fix audio playback in memories screen: replace `useMediaCapture.playAssetByParent` with `useAssetPreviewOverlays.openAudioOverlay`; audio asset is now fetched via `assetService.getAssetsByParentAndType` then opened through the standard `AudioPreviewOverlay` — consistent with photo handling
[feature] Add Memories card to home dashboard: shows up to 5 latest memories as compact badge+word+date rows; card and see-all button both navigate to `/(tabs)/memories`; only shown when `totalWords > 0`; adds `dashboard.memoriesTitle` and `dashboard.seeAllMemories` i18n keys to both locales
[test] Update test suite: `memories.test.tsx` drops `useMediaCapture` mock, replaces audio test with `getAssetsByParentAndType` spy; `home.test.tsx` adds `memoriesService` mock and 4 new memories card tests; `TimelineItem.test.tsx` updated for new layout with no-media test added

### 2026-03-24_09

[fix] Resolve remaining CI blockers in Android cropper config tests: restored `ExpoCropImageActivity` theme override in `android/app/src/main/AndroidManifest.xml`; added `ExpoCropImageThemeOverride`, `ExpoCropPopupMenuStyle`, and `ExpoCropPopupMenuItemText` in `android/app/src/main/res/values/styles.xml`; restored crop action label overrides in `android/app/src/main/res/values/strings.xml`, `values-pt/strings.xml`, and `values-pt-rBR/strings.xml`
[test] Validation rerun after fix: `npm run test -- __tests__/unit/appConfig.test.ts` passed; full `npm run ci` passed (lint + typecheck + coverage tests + semgrep)

### 2026-03-24_08

[feature] Implement Memories timeline screen: added new `memories` tab between Variants and More with `gift-outline` icon; built chronological timeline UI with alternating cards around a central line; each card shows word/variant badge, localized date, and variant parent context; audio tap reuses `playAssetByParent`; photo tap opens existing `PhotoPreviewOverlay`
[feature] Add memories data layer: new `TimelineItem` domain type, `memoriesRepository` UNION query (words + variants) with correlated audio/photo counts and first-photo metadata, `memoriesService`, `useMemories` hook with focus refetch, and `QUERY_KEYS.memories` invalidation from word/variant/asset mutations
[feature] Add locale-aware timeline date formatter: `formatTimelineDate` now outputs English ordinal style (`3rd Mar, 2025`) and Portuguese style (`3 de Mar, 2025`)
[test] Add comprehensive memories coverage: new unit tests for repository/date formatter, integration tests for `useMemories` and `TimelineItem`, new screen test suite for `memories` screen interactions and states, and tab-layout test update to assert memories icon registration
[config] Validation status: `npm run ci` executed; memories implementation passes lint/typecheck/tests, but overall CI currently fails due pre-existing unrelated Android manifest/resource state expected by `__tests__/unit/appConfig.test.ts`

### 2026-03-24_07

[refactor] Move all hardcoded notification content strings from `notificationScheduler.ts` to i18n catalogues (`en-US.ts`, `pt-BR.ts`): 20 new keys per locale covering all 8 notification types and milestones; `SchedulerContext.locale` replaced with `SchedulerContext.strings: NotifStrings`; `buildMilestoneContent` signature updated to accept `MilestoneStrings`; `notificationService.ts` builds strings from catalogs via `getNotifStrings`/`getMilestoneStrings` helpers before passing to scheduler
[feature] Add collapsible categories section in Settings screen: section starts collapsed by default; expand/collapse button at the bottom of the card reveals the categories list and add-category button; uses `chevron-down`/`chevron-up` Ionicons and `settings.categoriesExpand`/`settings.categoriesCollapse` i18n keys
[config] Add mandatory i18n rule to `.agents/standards/components.md`: all user-visible strings must come from i18n catalogues; covers both React hook usage and non-React service imports
[test] Update `notificationScheduler.test.ts` with `makeNotifStrings`/`makeMilestoneStrings` helpers using real catalog imports; update `notificationService.test.ts`; add 3 new settings tests for expand/collapse behaviour + update 3 existing category tests to expand first

### 2026-03-24_06

[fix] Resolve SonarCloud issues on PR #56: refactor `handleNotificationsToggle` in `app/(tabs)/settings.tsx` to avoid negated-condition smell (S7735); refactor `src/services/notificationScheduler.ts` to remove repeated sequential `items.push(...)` calls (S7778) and replace nested ternary milestone template selection with `if/else` (S3358)
[fix] Remove SonarCloud security hotspot pattern (S2245) by replacing `Math.random()` selection in nostalgia/category scheduling with deterministic day-seeded selection helper (`getDeterministicDayIndex`)
[test] Extend `__tests__/unit/notificationScheduler.test.ts` with deterministic-selection assertions for nostalgia and category scheduling; scheduler file remains at 100% lines/branches/functions under `npm run test:coverage`
[config] Update `.agents/standards/quality.md` with new Sonar prevention sections for S7778, S3358, and S2245 plus checklist items

### 2026-03-24_05

[feature] Add local push notification system using expo-notifications: 8 notification types (Gentle Nudge 3/7/15d, Weekly Win, Monthly Recap, Nostalgia Trip, Milestone, Feature Discovery, Category Explorer, Backup Reminder); Reset Sequence strategy (cancel on foreground, batch-schedule on background); pure scheduler (`notificationScheduler.ts`) separated from orchestration (`notificationService.ts`); permission priming modal (`NotificationPrimingModal`) shown after first word is added; notifications toggle in Settings with permission-denied hint; `notification_state` SQLite table (migration 0005); deep-link routing via `data.route` on notification tap; backup date tracking in settings.tsx call sites; scroll-to-export via `scrollTo=export` URL param; bilingual content (en-US / pt-BR) embedded at schedule time
[test] Add 5 new test files and update 7 existing files: 100% coverage across all 6 notification modules (notificationRepository, notificationScheduler, notificationService, useNotifications, NotificationPrimingModal, notificationStore); fix renderHook/act pattern to use renderHook outside act; add migration v5 rollback test

### 2026-03-24_04

[refactor] Simplify media link navigation: replace unreliable scroll-to-index logic with search pre-filling in `app/(tabs)/words.tsx` and `app/(tabs)/variants.tsx`; navigating from `MediaLinkingModal` now passes an `initialSearch` param which sets the search filter to the linked word/variant name, ensuring it is visible; use `useFocusEffect` to clear the search when leaving the screen
[test] Update integration tests in `MediaLinkingModal.test.tsx` to expect `initialSearch` param instead of `highlightId`; update screen tests in `words.test.tsx` and `variants.test.tsx` to verify `initialSearch` behavior and search clearing on blur

### 2026-03-24_03

[fix] Fix scroll-to-wrong-variant/word bug when active search matches the target item: add `search !== ''` guard to the `highlightId` scroll effects in both `app/(tabs)/variants.tsx` and `app/(tabs)/words.tsx`; without the guard, `idx` was captured from the filtered list before `setSearch('')` could clear it, causing `scrollToIndex` to use a stale index against the expanded full list; adding `search` to the dependency arrays and guarding early ensures `idx` is only computed once the list is unfiltered

### 2026-03-24_02

[fix] Clear search filter before scroll-to-highlight on Words and Variants screens: add `useEffect` in `app/(tabs)/words.tsx` and `app/(tabs)/variants.tsx` that calls `setSearch('')` whenever `highlightId` changes to a non-null value; prevents the target word/variant being filtered out of the list when the user had an active search before navigating from MediaLinkingModal
[test] Add `clears active search when highlightId is set on navigation` tests to both `words.test.tsx` and `variants.test.tsx` using rerender to simulate mid-session navigation with a highlight param
