---
name: 2026-03-24_02-memories-timeline-screen
plan: .agents/plan/design/2026-03-24_02-memories-timeline-screen.md
status: done
# status options: to do | in progress | done
started: 2026-03-24
agent: codex
worktree: false
# worktree: path/to/worktree  (set if a git worktree was created for isolation)
---

## Summary

Implemented a new Memories timeline tab that merges words and variants chronologically, supports audio playback/photo preview, and adds locale-aware timeline date formatting.

## Changes

| File | Action | Notes |
|------|--------|-------|
| `app/(tabs)/memories.tsx` | created | New Memories timeline screen with central line, loading/error/empty states, and overlays |
| `app/(tabs)/_layout.tsx` | modified | Registered `memories` tab between Variants and More with `gift-outline` icon |
| `src/components/TimelineItem.tsx` | created | Animated alternating timeline card with badges, context line, audio/photo controls |
| `src/hooks/useMemories.ts` | created | TanStack Query hook + focus-refetch behavior |
| `src/hooks/queryKeys.ts` | modified | Added `QUERY_KEYS.memories()` and invalidation in word/variant/asset mutation key groups |
| `src/repositories/memoriesRepository.ts` | created | UNION query for words + variants with audio/photo counts and first photo metadata |
| `src/services/memoriesService.ts` | created | Service wrapper for memories repository |
| `src/types/domain.ts` | modified | Added `TimelineItem` domain interface |
| `src/utils/dateHelpers.ts` | modified | Added `formatTimelineDate(dateStr, locale)` with EN ordinal + PT format |
| `src/i18n/en-US.ts` | modified | Added `tabs.memories` and `memories.*` strings |
| `src/i18n/pt-BR.ts` | modified | Added `tabs.memories` and `memories.*` strings |
| `__tests__/unit/memoriesRepository.test.ts` | created | Repository SQL coverage for union and correlated asset subqueries |
| `__tests__/unit/dateHelpers.test.ts` | modified | Added timeline date formatter tests (EN/PT/ISO/invalid) |
| `__tests__/integration/useMemories.test.tsx` | created | Hook behavior tests with query client wrapper |
| `__tests__/integration/TimelineItem.test.tsx` | created | Timeline item render and interaction tests |
| `__tests__/screens/memories.test.tsx` | created | Screen-level timeline, empty/error states, audio/photo interactions |
| `__tests__/screens/tabLayout.test.tsx` | modified | Added assertion for memories tab icon registration |
| `android/app/src/main/AndroidManifest.xml` | modified | Restored crop activity theme override expected by appConfig tests |
| `android/app/src/main/res/values/styles.xml` | modified | Added crop popup theme/text styles expected by appConfig tests |
| `android/app/src/main/res/values/strings.xml` | modified | Added default crop action label override (`Save`) |
| `android/app/src/main/res/values-pt/strings.xml` | created | Added PT crop action label override (`Salvar`) |
| `android/app/src/main/res/values-pt-rBR/strings.xml` | created | Added PT-BR crop action label override (`Salvar`) |

## Enhancements

### 2026-03-25 — Fix continuous vertical timeline line (definitive)

- **Description:** Eliminated the root cause of the broken/shifting vertical line. Root causes: (1) `marginBottom: 12` on each row created a gap that required `marginBottom: -12` on the bottom line segment — this hack was unreliable across FlatList cells. (2) The horizontal connector element was a layout child, shifting the dot's x-position by ~19px between left (50%) and right (45%) cards, making the line appear to zigzag. Fix: removed `marginBottom` from `row`; added `marginVertical: 6` to `card` instead so visual card spacing comes from inside the row rather than between rows. DotColumn line segments in adjacent rows now sit flush with zero gap — no negative margins needed. Dot position is now consistently at 50% via symmetric `flex:1` panes flanking the fixed-width `dotColumn`.
- **Files Modified:** `src/components/TimelineItem.tsx`
- **Plan Updates:** None.

### 2026-03-25 — Fix broken line continuity; increase compact font sizes

- **Description:** (1) Fixed the split/broken vertical line: the bottom `lineSegmentV` of non-last rows now has `marginBottom: -12` to bridge the 12px gap between rows, making the line visually continuous. (2) Increased compact mode font sizes: word text 12→14px, badge 8→10px, badge padding 5→6px.
- **Files Modified:** `src/components/TimelineItem.tsx`
- **Plan Updates:** None. (Superseded by 2026-03-25 fix above.)

### 2026-03-25 — Bounded vertical line; compact home cards

- **Description:** (1) Replaced the absolute full-height `centerLine` view with an inline `dotColumn` inside `TimelineItem`. Each item renders a vertical line segment above and below its dot, made transparent via `isFirst`/`isLast` props — the line now starts and ends at the first/last dot exactly. Both `memories.tsx` and `home.tsx` updated to pass these props and remove their now-redundant absolute line views. (2) Added `compact` prop to `TimelineItem` that reduces font sizes to ~70% (word: 12px, badge: 8px, photo: 22px) for use in the home dashboard card.
- **Files Modified:** `src/components/TimelineItem.tsx`, `app/(tabs)/memories.tsx`, `app/(tabs)/home.tsx`, `__tests__/integration/TimelineItem.test.tsx`
- **Plan Updates:** None.

### 2026-03-25 — Fix timeline sort key to date_added

- **Description:** Changed `ORDER BY created_at DESC` to `ORDER BY date_added DESC, created_at DESC`. The previous sort used DB insertion time (`created_at`), so a word entered late into the app appeared at the wrong position in the timeline. The correct key is `date_added` (when the word was spoken), with `created_at` as a same-day tiebreaker.
- **Files Modified:** `src/repositories/memoriesRepository.ts`, `__tests__/unit/memoriesRepository.test.ts`
- **Plan Updates:** None.

### 2026-03-25 — Fix interleaved timeline ordering; cap home memories at 3

- **Description:** (1) Fixed a SQLite UNION ALL ordering bug where words and variants appeared in separate date-sorted groups instead of interleaved by date. Root cause: `ORDER BY created_at DESC` at the tail of a compound SELECT with correlated subqueries was applied ambiguously by SQLite's query planner. Fix: wrap the entire UNION ALL in a subquery so the outer `ORDER BY` unambiguously applies to the combined result. (2) Reduced the home dashboard memories cap from 5 to 3 entries.
- **Files Modified:** `src/repositories/memoriesRepository.ts`, `app/(tabs)/home.tsx`, `__tests__/unit/memoriesRepository.test.ts`, `__tests__/screens/home.test.tsx`
- **Plan Updates:** None.

### 2026-03-25 — Timeline polish: media alignment, variant badge contrast, home mini-timeline

- **Description:** (1) Media controls now align with the card text direction instead of opposing it — left cards `flex-end`, right cards `flex-start`, so all card content flows consistently. (2) Variant badge text color changed from `colors.textOnPrimary` (white) to `colors.text` (dark) — improves contrast on both themes where `secondary` is a light color. (3) Replaced compact memory rows in home dashboard with actual `TimelineItem` components rendered in a mini-timeline (center line + alternating cards, capped at 5); audio/photo overlays wired via `useAssetPreviewOverlays` and `AssetPreviewOverlays`.
- **Files Modified:** `src/components/TimelineItem.tsx`, `app/(tabs)/home.tsx`, `__tests__/screens/home.test.tsx`
- **Plan Updates:** None.

### 2026-03-25 — Timeline layout redesign, audio fix, Memories card on home

- **Description:** (1) Redesigned `TimelineItem` layout: date now lives outside the card in the opposing `cardSide` (bold text); left cards right-align all text with badge on left / word on right in same row; right cards left-align with word on left / badge on right; media controls align left in left cards and right in right cards. (2) Fixed audio playback bug: `memories.tsx` was calling `playAssetByParent` from `useMediaCapture`; replaced with `openAudioOverlay` from `useAssetPreviewOverlays` (consistent with photo handling). (3) Added Memories card to home dashboard showing up to 5 latest memories with badge/word/date rows and a "see all" button navigating to `/(tabs)/memories`. (4) Added `dashboard.memoriesTitle` / `dashboard.seeAllMemories` i18n keys to both locales.
- **Files Modified:** `src/components/TimelineItem.tsx`, `app/(tabs)/memories.tsx`, `app/(tabs)/home.tsx`, `src/i18n/en-US.ts`, `src/i18n/pt-BR.ts`, `__tests__/screens/memories.test.tsx`, `__tests__/screens/home.test.tsx`, `__tests__/integration/TimelineItem.test.tsx`
- **Plan Updates:** None — enhancement to existing implementation.

### 2026-03-25 — Paginated infinite scroll, back-to-top button, scroll-reset on tab leave

- **Description:** (1) Added `getTimelineItemsPaginated(limit, offset)` repository function with `LIMIT ? OFFSET ?` appended to the same UNION ALL query. (2) Added `memoriesInfinite` query key to `queryKeys.ts` and mutation key arrays. (3) Added `useMemoriesInfinite` hook using `useInfiniteQuery` (page size 10, offset-based) exposing a flat `items` array. (4) Rewrote `memories.tsx` to use infinite scroll — `onEndReached` triggers `fetchNextPage`, a small `ActivityIndicator` footer appears when loading the next page, and a floating "Latest ↑" pill button appears at top-center when scrolled past 200px (back-to-top). (5) Added `memories.backToTop` i18n key in both locales. (6) Added `useFocusEffect` cleanup (scroll to top on leave) to all list/scroll tab screens: `words.tsx`, `variants.tsx`, `memories.tsx`, `media.tsx`, `home.tsx`, `settings.tsx`, `progress.tsx`.
- **Files Modified:** `src/repositories/memoriesRepository.ts`, `src/services/memoriesService.ts`, `src/hooks/queryKeys.ts`, `src/hooks/useMemories.ts`, `app/(tabs)/memories.tsx`, `app/(tabs)/words.tsx`, `app/(tabs)/variants.tsx`, `app/(tabs)/home.tsx`, `app/(tabs)/media.tsx`, `app/(tabs)/settings.tsx`, `app/(tabs)/progress.tsx`, `src/i18n/en-US.ts`, `src/i18n/pt-BR.ts`, `__tests__/unit/memoriesRepository.test.ts`, `__tests__/integration/useMemories.test.tsx`, `__tests__/screens/memories.test.tsx`
- **Plan Updates:** None.

## Validation

- Ran `npm run test -- __tests__/unit/appConfig.test.ts` → pass.
- Ran `npm run ci` → pass (`lint`, `typecheck`, `test:coverage`, `semgrep`).
