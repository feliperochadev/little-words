# Media Asset Naming, Preview Overlays & Word List Chips

**Files affected:** `src/components/MediaLinkingModal.tsx`, `src/types/asset.ts`, `src/db/migrations/`, `src/repositories/assetRepository.ts`, `src/services/assetService.ts`, `app/(tabs)/words.tsx`, `src/components/AddWordModal.tsx`, `src/components/MediaChips.tsx` (replace or extend), new shared components `AudioPreviewOverlay`, `PhotoPreviewOverlay`.

---

## Prerequisites / Schema Change

Add a `name TEXT` column to the `assets` table via a new DB migration. Update `Asset`, `NewAsset` types, `assetRepository`, and `assetService` to pass `name` through all read/write paths.

---

## 1. Asset Name — `MediaLinkingModal`

When the user taps the Save button:
- If the "Name" field is non-empty, save that value as `asset.name`.
- If empty, generate a fallback: `{assetType}_{assetId}` (e.g. `audio_42`, `photo_17`) using the DB-assigned `id` returned after insert.

---

## 2. Modal Title + Button Label — `MediaLinkingModal`

- Title: `"Add Audio"` when `pendingMedia.type === 'audio'`; `"Add Photo"` when photo. Remove the generic "Link Media" copy.
- Primary button label: change from "Link" → `"Save"`.
- Update i18n keys for both locales (`en-US`, `pt-BR`).

---

## 3. Fullscreen Photo Dismiss — `MediaLinkingModal` (Bug Fix)

Tapping outside the fullscreen photo (the dark backdrop) must close **only** the photo fullscreen overlay — it must NOT propagate to and dismiss the linking modal behind it. Ensure the fullscreen `Modal` backdrop tap handler calls `setPhotoExpanded(false)` and stops propagation; the linking modal must remain open and visible when the photo fullscreen closes.

---

## 4. Word List Asset Chips — `words.tsx`

Replace the current single `assetCountChip` (count + `AudioPlayerInline`) with individual per-asset chips:

- **Layout**: chips wrap in the existing `wordMeta` row. Each chip shows: icon (mic for audio, image for photo) + asset `name` (truncated to ~20 chars).
- **Audio chip tap**: open a lightweight `AudioPreviewOverlay` — a bottom-anchored card (or centered overlay) with a dark semi-transparent backdrop. Contents: asset name, `created_at` date (formatted `DD/MM/YYYY`), waveform animation during playback, play/pause button. Dismiss by tapping the backdrop or swiping down.
- **Photo chip tap**: open a `PhotoPreviewOverlay` — fullscreen image (contain mode) on a dark backdrop, asset name + `created_at` date overlaid at bottom in white text. Dismiss by tapping the backdrop or swiping down.
- If a word has > 4 assets, show the first 3 chips + a `+N` overflow chip (tapping it does nothing for now).
- `AudioPreviewOverlay` and `PhotoPreviewOverlay` are new shared components reused in item 5.

---

## 5. AddWordModal Asset Display

Replace `MediaChips` with two sections rendered inside the modal's `ScrollView`:

- **Audio section** (if any audio assets exist for this word): a horizontal row of audio chips. Each chip: mic icon + asset `name`. Tap behavior = same `AudioPreviewOverlay` as item 4.
- **Photo section** (if any photo assets, on the line below audio): a horizontal row of photo thumbnails (60×60dp, rounded). Tap behavior = same `PhotoPreviewOverlay` as item 4.
- For `pendingMedia` (not yet saved), show a "pending" chip with the same tap behavior and a visual indicator (e.g. dashed border) that it has not been saved yet.
- Keep the "remove pending" (×) affordance for pending media.

---

## Acceptance Criteria

- [ ] `assets` table has a `name` column populated on every new asset save.
- [ ] `MediaLinkingModal` title reflects the media type; button reads "Save".
- [ ] Tapping outside fullscreen photo returns to the linking modal (not closes both).
- [ ] Word list shows individual named chips per asset; audio/photo chips open their respective overlays.
- [ ] `AddWordModal` shows audio chips (row 1) and photo thumbnails (row 2) with the same overlay behavior.
- [ ] `AudioPreviewOverlay` and `PhotoPreviewOverlay` are extracted as reusable components.
- [ ] Both overlays dismiss on backdrop tap and swipe-down.
- [ ] All locales (`en-US`, `pt-BR`) updated for changed copy.
- [ ] CI passes (`npm run ci`).
