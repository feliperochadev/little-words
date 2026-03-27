---
refined: true
refined_at: 2026-03-24 10:00:00 UTC
refined_by: Gemini
---

# Feature Specification: Memories Timeline Screen

## 1. Overview
Create a new "Memories" screen that visualizes the child's language journey as a vertical timeline. This screen aggregates both Words and Variants in reverse chronological order (newest first), displaying them on an alternating left-right axis around a central timeline.

## 2. Navigation & Routing
- **File:** `app/(tabs)/memories.tsx` (New)
- **Route:** `/memories`
- **Tab Bar:**
  - Add to `app/(tabs)/_layout.tsx`.
  - Position: Between `variants` and `more`.
  - Icon: Use `Ionicons` name `gift-outline` (or `archive-outline` / `albums-outline`) to represent a "keepsake box".
  - Label: "Memories" (add to `en-US` and `pt-BR` translation files).

## 3. Data Layer
### New Repository: `src/repositories/memoriesRepository.ts`
Create a function `getTimelineItems(limit: number, offset: number)` that performs a `UNION` query between `words` and `variants` tables.

**Query Logic:**
- Select `id`, `text` (word or variant), `type` ('word' | 'variant'), `created_at`, `main_word_text` (if variant), and joined `assets`.
- Since `expo-sqlite` is simple, you may need to fetch the base list first, then fetch assets for the IDs in the current page, or use a `GROUP_CONCAT` trick if feasible for asset URIs/types.
- **Efficient Asset Fetching:** The timeline needs to show specific assets (audio/photo). Ensure the query retrieves `asset_type` and `uri` (or `id` to build URI) for the items.
- Sort by `created_at` DESC.

### New Hook: `src/hooks/useMemories.ts`
- Implement a TanStack Query hook (`useInfiniteQuery` preferred for pagination, or simple `useQuery` if dataset is small) to fetch timeline items.
- Transform data into a flat list suitable for rendering.

## 4. UI/UX Design
### Timeline Layout
- **Central Line:** A continuous vertical line down the screen center.
- **Alternating Items:**
  - Index 0 (Latest): Left side? Or Right? (Pick one, e.g., Even=Left, Odd=Right).
  - Item Content: Bubble/Card pointing to the center line.
- **Date Header:**
  - Format: "3rd Mar, 2025" (Use `date-fns`).
  - Show date prominently for each item or group by date if multiple items fall on the same day. Given the prompt "starts with the latest... until the first", a continuous stream with date headers or date-on-item is best.
- **Animations:**
  - Use `react-native`'s `Animated` API for a smooth entry animation (fade in + slide up) as the user scrolls.

### Item Card Content
- **Text:** The word or variant text.
- **Context:** If it's a variant, show "Variant of [Main Word]" in smaller text.
- **Assets (Inline at the end):**
  - **Audio:** Display a small `play-circle` icon. Tapping it plays the audio.
  - **Photo:** Display a small thumbnail (rounded square). Tapping it opens the `PhotoPreviewOverlay` with the full image.
  - **Video:** (Optional, if supported) Show video icon or thumbnail.

## 5. Components
- `TimelineItem.tsx`: Reusable component for a single entry. Props: `item`, `side` ('left'|'right'), `onPlayAudio`, `onViewPhoto`.
- `MemoriesScreen.tsx`: The main container with `FlatList` (or `FlashList` if available).

## 6. Implementation Steps
1.  **Database:** Create `memoriesRepository.ts` with the union query.
2.  **Hooks:** Create `useMemories.ts`.
3.  **Assets:** Ensure asset paths are correctly resolved (using `src/utils/assetStorage.ts`).
4.  **UI Construction:** Build the screen and components.
5.  **Navigation:** Register the tab in `_layout.tsx`.
6.  **I18n:** Add keys for "Memories", "Variant of", etc.

## 7. Constraints & Standards
- **Styling:** Use `src/theme` tokens. strict light/dark mode support.
- **Performance:** Ensure the list scrolls smoothly (60fps). Optimize asset image loading (use `resizeMode="cover"` and small dimensions).
- **Libraries:** Do NOT introduce new navigation libraries. Use existing `expo-av` for audio and `react-native-svg` if needed for custom timeline graphics.
