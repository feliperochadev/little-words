# Design: Memories Timeline Screen

**Date:** 2026-03-24
**Status:** Draft
**Author:** Claude
**Related ADR:** N/A

---

## Problem Statement

The app tracks words and pronunciation variants across two separate screens (Words, Variants), but there is no unified chronological view of the child's language journey. Parents want to see a "story in time" — a single place that shows every word and variant, from the most recent back to the very first, visualized as a timeline of precious milestones.

## Goals

- Provide a single chronological view of all words **and** variants, newest first.
- Display inline asset indicators (audio play, photo thumbnail) for each item.
- Use an alternating left-right timeline layout with a central vertical line.
- Support smooth scrolling and entry animations.
- Integrate as a new tab between "Variants" and "More".

## Non-Goals

- Editing or deleting items from the Memories screen (tap navigates to existing edit flows in a future enhancement).
- Grouping items by date headers (the spec favors a continuous stream with date-on-item).
- Video support (placeholder — existing video support is locked/coming soon).
- Infinite scroll / pagination in the initial implementation — the dataset is small enough for a single `useQuery`. Pagination can be added later if needed.

---

## Design

### Overview

A new **Memories** tab screen renders a `FlatList` of `TimelineItem` cards. Each card represents either a word or a variant, positioned on alternating sides of a continuous central vertical line. The data comes from a UNION query that merges the `words` and `variants` tables, sorted by `created_at DESC`.

### Component / Module Breakdown

| Component | Responsibility | File(s) |
|-----------|---------------|---------|
| `memoriesRepository` | UNION query: words + variants with asset counts + first photo info | `src/repositories/memoriesRepository.ts` |
| `memoriesService` | Thin passthrough (service layer convention) | `src/services/memoriesService.ts` |
| `useMemories` | TanStack Query hook with `useFocusEffect` refetch | `src/hooks/useMemories.ts` |
| `TimelineItem` | Single timeline card: bubble, date, type badge, asset icons, photo thumbnail | `src/components/TimelineItem.tsx` |
| `MemoriesScreen` | Main screen: FlatList + central line + empty state | `app/(tabs)/memories.tsx` |
| `queryKeys` | Add `memories()` key | `src/hooks/queryKeys.ts` |
| `domain.ts` | Add `TimelineItem` interface | `src/types/domain.ts` |
| `dateHelpers` | Add `formatTimelineDate(dateStr, t)` for "3rd Mar, 2025" / "3 de Mar, 2025" | `src/utils/dateHelpers.ts` |
| `_layout.tsx` | Register Memories tab between Variants and More | `app/(tabs)/_layout.tsx` |
| `en-US.ts` / `pt-BR.ts` | Add i18n keys for tab label, "Variant of", empty state, date ordinals | `src/i18n/en-US.ts`, `src/i18n/pt-BR.ts` |

### Data Model

```typescript
// src/types/domain.ts — new interface
export interface TimelineItem {
  id: number;
  text: string;                    // word.word or variant.variant
  item_type: 'word' | 'variant';
  created_at: string;              // ISO datetime from DB
  date_added: string;              // user-specified date (YYYY-MM-DD)
  main_word_text: string | null;   // parent word text (variants only)
  word_id: number | null;          // parent word ID (variants only)
  audio_count: number;
  photo_count: number;
  first_photo_filename: string | null;  // for thumbnail
  first_photo_mime: string | null;
}
```

### Data Flow

```
[Screen mounts / tab focused]
  → useMemories() fires TanStack Query
    → memoriesService.getTimelineItems()
      → memoriesRepository.getTimelineItems()
        → UNION query (words + variants) + correlated subqueries for asset counts + first photo
  → FlatList renders TimelineItem[]
    → Even-index items: left side; Odd-index items: right side
    → Audio icon tap: playAssetByParent(parentType, parentId) via MediaCaptureProvider
    → Photo thumbnail tap: fetch first photo asset → open PhotoPreviewOverlay
```

### SQL Query

```sql
SELECT
  w.id,
  w.word AS text,
  'word' AS item_type,
  w.created_at,
  w.date_added,
  NULL AS main_word_text,
  NULL AS word_id,
  (SELECT COUNT(*) FROM assets a
   WHERE a.parent_type = 'word' AND a.parent_id = w.id AND a.asset_type = 'audio') AS audio_count,
  (SELECT COUNT(*) FROM assets a
   WHERE a.parent_type = 'word' AND a.parent_id = w.id AND a.asset_type = 'photo') AS photo_count,
  (SELECT a2.filename FROM assets a2
   WHERE a2.parent_type = 'word' AND a2.parent_id = w.id AND a2.asset_type = 'photo'
   ORDER BY a2.created_at DESC LIMIT 1) AS first_photo_filename,
  (SELECT a3.mime_type FROM assets a3
   WHERE a3.parent_type = 'word' AND a3.parent_id = w.id AND a3.asset_type = 'photo'
   ORDER BY a3.created_at DESC LIMIT 1) AS first_photo_mime
FROM words w

UNION ALL

SELECT
  v.id,
  v.variant AS text,
  'variant' AS item_type,
  v.created_at,
  v.date_added,
  w2.word AS main_word_text,
  v.word_id,
  (SELECT COUNT(*) FROM assets a
   WHERE a.parent_type = 'variant' AND a.parent_id = v.id AND a.asset_type = 'audio') AS audio_count,
  (SELECT COUNT(*) FROM assets a
   WHERE a.parent_type = 'variant' AND a.parent_id = v.id AND a.asset_type = 'photo') AS photo_count,
  (SELECT a2.filename FROM assets a2
   WHERE a2.parent_type = 'variant' AND a2.parent_id = v.id AND a2.asset_type = 'photo'
   ORDER BY a2.created_at DESC LIMIT 1) AS first_photo_filename,
  (SELECT a3.mime_type FROM assets a3
   WHERE a3.parent_type = 'variant' AND a3.parent_id = v.id AND a3.asset_type = 'photo'
   ORDER BY a3.created_at DESC LIMIT 1) AS first_photo_mime
FROM variants v
JOIN words w2 ON v.word_id = w2.id

ORDER BY created_at DESC
```

**Performance note:** For typical app usage (<1,000 items), the correlated subqueries run efficiently against the indexed `assets(parent_type, parent_id)` and `assets(parent_type, parent_id, asset_type)` indexes that already exist.

### Date Formatting

The spec requests "3rd Mar, 2025" format. A new `formatTimelineDate(dateStr, t)` utility in `dateHelpers.ts` handles this:

- **English:** ordinal suffix (1st, 2nd, 3rd, 4th…) + abbreviated month + year → "3rd Mar, 2025"
- **Portuguese:** day number + "de" + abbreviated month + year → "3 de Mar, 2025"

Uses `date-fns` (already installed) `format()` with `do` token for ordinals, or a lightweight custom implementation to keep it simple and locale-aware via the existing i18n system.

### UI / UX Decisions

#### Timeline Layout

```
┌─────────────────────────────────────────────┐
│                  Memories                    │  ← ScreenHeader
│─────────────────────────────────────────────│
│                                              │
│  ┌─────────┐    │                            │
│  │  "mamãe" │────●                           │  ← Item 0 (left)
│  │  Word    │    │                            │
│  │  3rd Mar │    │                            │
│  │  🔊 📷   │    │                            │
│  └─────────┘    │                            │
│                  │    ┌──────────┐            │
│                  ●────│ "mamã"   │            │  ← Item 1 (right)
│                  │    │ Variant  │            │
│                  │    │ of mamãe │            │
│                  │    │ 2nd Mar  │            │
│                  │    └──────────┘            │
│  ┌─────────┐    │                            │
│  │  "dog"   │────●                           │  ← Item 2 (left)
│  │  Word    │    │                            │
│  └─────────┘    │                            │
│                  │                            │
└─────────────────────────────────────────────┘
```

**Central line:** A `View` with `width: 2, backgroundColor: colors.border` positioned at `left: '50%'` using `position: 'absolute'`.

**Timeline dot:** A small circle (10×10, `borderRadius: full`) at the intersection of the card connector and the central line.

**Card positioning:** Each card takes roughly 45% of the screen width. Even indices render on the left with a right-facing connector; odd indices on the right with a left-facing connector.

**Connector:** A thin horizontal line (height 2px) from the card edge to the central dot.

#### Item Card Content

- **Text:** The word or variant text, displayed prominently (font size 17, bold).
- **Type badge:** Small pill — "Word" or "Variant" — color-coded (primary for words, secondary for variants).
- **Context line:** For variants, show "Variant of [Main Word]" in smaller muted text.
- **Date:** Formatted as "3rd Mar, 2025" below the text.
- **Asset row (bottom of card):**
  - If `audio_count > 0`: A `play-circle` icon (Ionicons). Tap calls `playAssetByParent(parentType, parentId)`.
  - If `photo_count > 0`: A small `Image` thumbnail (32×32, rounded 6px) using `getAssetFileUri(parentType, parentId, 'photo', first_photo_filename)`. Tap opens `PhotoPreviewOverlay`.

#### Entry Animation

Use React Native `Animated` API (per spec constraint — no new animation libraries):
- Each `TimelineItem` wraps content in an `Animated.View`.
- On mount, runs a parallel animation: `opacity` 0→1, `translateY` 20→0 (slide up from below).
- Duration: 300ms, easing: `Easing.out(Easing.cubic)`.
- Staggered delay based on index within visible batch (e.g., `index * 80ms`, capped at 5 items to avoid long waits on initial load).

#### Empty State

When no words or variants exist, show the standard `EmptyState` component:
- Icon: `<Ionicons name="gift-outline" />` (matches tab icon)
- Title: "No memories yet"
- Subtitle: "Start adding words to see your timeline!"

### Tab Registration

In `app/(tabs)/_layout.tsx`:

```tsx
// After the variants tab, before hidden screens:
<Tabs.Screen
  name="memories"
  options={{
    title: t('tabs.memories'),
    tabBarIcon: MemoriesTabIcon,  // Ionicons "gift-outline"
  }}
/>
```

Tab order: Home → Words → Variants → **Memories** → More

### Asset Interaction Pattern

**Audio playback:** Reuses the `MediaCaptureProvider.playAssetByParent(parentType, parentId)` pattern from `AudioPlayerInline`. The provider fetches the first audio asset for the given parent and plays it.

**Photo preview:** The `TimelineItem` receives callbacks `onPlayAudio(parentType, parentId)` and `onViewPhoto(item)`. The screen manages `PhotoPreviewOverlay` state using `useAssetPreviewOverlays()`:
1. On photo tap, the screen fetches the first photo asset via `assetRepository.getAssetsByParentAndType(parentType, parentId, 'photo')`.
2. Calls `openPhotoOverlay(asset)` from the overlay hook.
3. The overlay renders via `AssetPreviewOverlays`.

### Error Handling

- **Empty query result:** Handled by `ListEmptyComponent` rendering `EmptyState`.
- **Missing asset file:** Photo thumbnail uses a fallback (image-outline icon) if `Image` fails to load (`onError` handler).
- **Query error:** TanStack Query's built-in error state — show a generic error message with retry button.

---

## Alternatives Considered

1. **`useInfiniteQuery` with pagination:** Considered for large datasets, but the typical user has <500 items total. A simple `useQuery` fetching all items keeps the code simpler. Pagination can be added as an enhancement if performance degrades.

2. **Two-pass asset fetching (batch query after UNION):** Would avoid correlated subqueries but adds complexity in the hook layer. Since indexes already exist on `assets(parent_type, parent_id, asset_type)`, correlated subqueries perform well for this dataset size.

3. **`FlashList` instead of `FlatList`:** FlashList offers better performance for large lists, but it's not currently installed. FlatList is sufficient for the expected data volume and avoids a new dependency.

4. **`react-native-reanimated` for animations:** More powerful but the spec explicitly says to use RN's `Animated` API, and the project doesn't currently use reanimated.

5. **Grouping items by date (section headers):** The spec prefers a continuous stream with dates on each item rather than `SectionList` with date group headers. This is simpler and works better with the alternating layout.

---

## Open Questions

- [ ] **Photo thumbnail size and caching:** Should thumbnails be generated at a smaller size on save, or is loading the full photo at 32×32 render size acceptable? For now, use full photo at small render size with `resizeMode="cover"` — revisit if performance is an issue.

---

## Acceptance Criteria

- [ ] New "Memories" tab visible between "Variants" and "More" with `gift-outline` icon.
- [ ] Timeline displays all words and variants in reverse chronological order.
- [ ] Items alternate left-right around a central vertical line.
- [ ] Each card shows: text, type badge (Word/Variant), date in "3rd Mar, 2025" format.
- [ ] Variant cards show "Variant of [word]" context line.
- [ ] Cards with audio show a play icon; tapping it plays the audio.
- [ ] Cards with photos show a small thumbnail; tapping opens `PhotoPreviewOverlay`.
- [ ] Smooth fade+slide entry animation on items.
- [ ] Empty state shown when no data exists.
- [ ] Tab label and all UI strings available in both `en-US` and `pt-BR`.
- [ ] All tests pass: repository, hook, component, and screen-level.
- [ ] `npm run ci` passes (lint, typecheck, tests, semgrep).

---

## Implementation Files Summary

| # | File | Action | Category |
|---|------|--------|----------|
| 1 | `src/types/domain.ts` | Add `TimelineItem` interface | Types |
| 2 | `src/repositories/memoriesRepository.ts` | New — UNION query | Data |
| 3 | `src/services/memoriesService.ts` | New — thin service wrapper | Data |
| 4 | `src/hooks/useMemories.ts` | New — TQ hook | Hooks |
| 5 | `src/hooks/queryKeys.ts` | Add `memories()` key + `MEMORIES_MUTATION_KEYS` | Hooks |
| 6 | `src/utils/dateHelpers.ts` | Add `formatTimelineDate(dateStr, t)` | Utils |
| 7 | `src/components/TimelineItem.tsx` | New — timeline card component | UI |
| 8 | `app/(tabs)/memories.tsx` | New — screen | Screen |
| 9 | `app/(tabs)/_layout.tsx` | Register Memories tab | Navigation |
| 10 | `src/i18n/en-US.ts` | Add memories i18n keys | i18n |
| 11 | `src/i18n/pt-BR.ts` | Add memories i18n keys | i18n |
| 12 | `__tests__/unit/memoriesRepository.test.ts` | Repository tests | Test |
| 13 | `__tests__/unit/dateHelpers.test.ts` | Timeline date formatter tests | Test |
| 14 | `__tests__/integration/TimelineItem.test.tsx` | Component tests | Test |
| 15 | `__tests__/screens/MemoriesScreen.test.tsx` | Screen-level tests | Test |
| 16 | `__tests__/integration/useMemories.test.ts` | Hook tests | Test |
