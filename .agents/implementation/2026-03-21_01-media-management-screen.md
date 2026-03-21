---
name: 2026-03-21_01-media-management-screen
plan: .agents/plan/design/2026-03-21_01-media-management-screen.md
status: done
started: 2026-03-21
agent: claude
worktree: false
---

## Summary

Implements a full Media management screen with search/filter/sort, inline audio/photo preview overlays, edit asset modal (rename + relink), and bottom navigation restructure (Media tab + More hamburger menu for Settings).

## Design Decisions Made

- `EmptyState` doesn't accept a `testID` prop — wrapped in a `<View testID="media-empty">` instead.
- The app uses `expo-audio` (not `expo-av`) so the media screen test doesn't mock `expo-av`.
- `getAllAssetsFromRepo` import alias was unused in service — removed, re-exported directly via `export { getAllAssets } from '../repositories/assetRepository'`.

## Changes

| File | Action |
|------|--------|
| `src/types/asset.ts` | Modified — added `AssetWithLink` interface |
| `src/types/domain.ts` | Modified — exports `AssetWithLink` |
| `src/repositories/assetRepository.ts` | Modified — added `getAllAssets`, `updateAssetParent`, `updateAssetName` |
| `src/utils/assetStorage.ts` | Modified — added `moveAssetFile` |
| `src/services/assetService.ts` | Modified — added `renameAsset`, `relinkAsset`, re-exported `getAllAssets`, `AssetWithLink` |
| `src/hooks/queryKeys.ts` | Modified — added `allAssets` key |
| `src/hooks/useAssets.ts` | Modified — added `useAllAssets`, `useRelinkAsset`, `useRenameAsset`; updated `useRemoveAsset` invalidation |
| `src/i18n/en-US.ts` | Modified — added `tabs.media`, `tabs.more`, `more`, `media` sections |
| `src/i18n/pt-BR.ts` | Modified — same as en-US in Portuguese |
| `src/components/EditAssetModal.tsx` | Created |
| `app/(tabs)/media.tsx` | Created |
| `app/(tabs)/more.tsx` | Created |
| `app/(tabs)/_layout.tsx` | Modified — added Media, More tabs; hidden Settings from tab bar |
| `__tests__/unit/assetRepository.test.ts` | Modified — added getAllAssets, updateAssetParent, updateAssetName tests |
| `__tests__/unit/assetStorage.test.ts` | Modified — added moveAssetFile tests |
| `__tests__/integration/EditAssetModal.test.tsx` | Created |
| `__tests__/integration/useAssets.test.tsx` | Modified — added useAllAssets, useRelinkAsset, useRenameAsset tests |
| `__tests__/screens/media.test.tsx` | Created |
| `__tests__/screens/more.test.tsx` | Created |
| `.agents/AGENTS-CHANGELOG.md` | Modified — added entry 2026-03-21_6 |

| File | Action | Notes |
|------|--------|-------|

## Enhancements

### 2026-03-21 — Sort Button Relocation, Date Editing, Type Icon Preview, Cancel Button

- **Description:** Moved the sort button from the media screen title row to the right of the filter chips; rewrote EditAssetModal to add a drag handle with swipe-to-dismiss animation, a date picker field, a tappable type-icon badge that opens AudioPreviewOverlay or PhotoPreviewOverlay inline, and a Cancel button alongside Save matching the style of other edit modals in the app.
- **Files Modified:**
  - `app/(tabs)/media.tsx` — sort relocated to `filtersRow`, dropdown anchored inside container
  - `src/components/EditAssetModal.tsx` — complete rewrite with `useModalAnimation`, drag handle, DatePickerField, tappable type icon, cancel button
  - `src/repositories/assetRepository.ts` — added `updateAssetDate(id, date)`
  - `src/services/assetService.ts` — added `updateAssetDate` wrapper
  - `src/hooks/useAssets.ts` — added `useUpdateAssetDate` hook
  - `src/i18n/en-US.ts` + `src/i18n/pt-BR.ts` — added `editDateLabel`, `editCancel` keys
  - `__tests__/unit/assetRepository.test.ts` — 2 new tests for `updateAssetDate`
  - `__tests__/integration/useAssets.test.tsx` — 2 new tests for `useUpdateAssetDate`
  - `__tests__/integration/EditAssetModal.test.tsx` — 8 new tests (cancel, date field, type icon for audio/photo/video, drag handle)
- **Plan Updates:** None — enhancement scope is contained within existing design.

### 2026-03-21 — Auto-Refresh Media List + Audio Position Counter

- **Description:** Fixed media list not refreshing after linking assets via MediaLinkingModal or editing via EditAssetModal; added a current-position time counter to the left of the waveform in AudioPreviewOverlay.
- **Root cause of refresh issue:** `ASSET_MUTATION_KEYS` was missing `['allAssets']`, so `MediaCaptureProvider.invalidateAssetCaches()` never invalidated the query powering `useAllAssets` on the media screen.
- **Files Modified:**
  - `src/hooks/queryKeys.ts` — added `['allAssets']` to `ASSET_MUTATION_KEYS`
  - `src/hooks/useAssets.ts` — removed now-redundant explicit `invalidateQueries(['allAssets'])` from individual mutation hooks
  - `src/hooks/useAudioPlayer.ts` — added `positionMs` state; tracks `status.currentTime * 1000`; resets on stop/unload/finish
  - `src/components/AudioPreviewOverlay.tsx` — added `audio-preview-position` counter to left of waveform; added `position` stylesheet entry
  - `__tests__/unit/useAudioPlayer.test.ts` — updated initial state + added `positionMs` tests
  - `__tests__/integration/AudioPreviewOverlay.test.tsx` — added position counter test; updated mock to include `positionMs`
- **Plan Updates:** None.

### 2026-03-21 — Audio Counter Spacing + Position Counter in MediaLinkingModal

- **Description:** Tightened the spacing between the position/duration counters and the waveform (~20%) in AudioPreviewOverlay; applied the same position counter layout to MediaLinkingModal's audio preview.
- **Files Modified:**
  - `src/components/AudioPreviewOverlay.tsx` — `playerRow` gap 12→8; `duration`/`position` minWidth 36→30
  - `src/components/MediaLinkingModal.tsx` — added `audioPosition` counter between play icon and waveform; added `media-preview-duration`/`media-preview-position` testIDs; `audioPreview` gap 12→8; added `audioPosition` style; `audioDuration` minWidth 36→30
  - `__tests__/integration/MediaLinkingModal.test.tsx` — added `positionMs` to mock; added position counter test; fixed duration tests to use `testID` selectors
- **Plan Updates:** None.
