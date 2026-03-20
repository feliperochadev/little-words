---
name: 2026-03-19_02-media-asset-naming-preview-overlays
plan: .agents/plan/prompts/2026-03-19_02-media-asset-naming-preview-overlays.md
status: done
started: 2026-03-19
agent: claude
worktree: false
---

## Summary

Adds asset naming (user-supplied or auto-generated fallback), renames MediaLinkingModal title/button by media type, fixes fullscreen photo dismiss, replaces word list asset count chip with per-asset named chips that open preview overlays on tap, and updates AddWordModal to show audio/photo chips in separate rows.

## Changes

| File | Action | Notes |
|------|--------|-------|
| `src/db/migrations/0003_add-asset-name.ts` | created | Adds nullable `name TEXT` column to assets table |
| `src/db/migrations/index.ts` | modified | Registered migration 0003 |
| `src/types/asset.ts` | modified | Added `name: string \| null` to Asset and NewAsset |
| `src/repositories/assetRepository.ts` | modified | Updated addAsset INSERT; added updateAssetMeta |
| `src/services/assetService.ts` | modified | saveAsset accepts name param; auto-fallback name |
| `src/providers/MediaCaptureProvider.tsx` | modified | prefilledMediaName state; linkMediaToWord/startCreateWord accept name |
| `src/i18n/en-US.ts` | modified | addAudioTitle, addPhotoTitle, saveButton keys |
| `src/i18n/pt-BR.ts` | modified | addAudioTitle, addPhotoTitle, saveButton keys |
| `src/components/MediaLinkingModal.tsx` | modified | Dynamic title, Save button, fullscreen dismiss fix, name passed to provider |
| `src/components/AudioPreviewOverlay.tsx` | created | Bottom overlay with waveform, play/stop, name, date |
| `src/components/PhotoPreviewOverlay.tsx` | created | Fullscreen photo with name/date overlay |
| `src/components/WordAssetChips.tsx` | created | Per-word inline chips with overlay on tap |
| `src/components/MediaChips.tsx` | modified | Uses overlays; added separateRows prop |
| `app/(tabs)/words.tsx` | modified | Replaced AudioPlayerInline + count chip with WordAssetChips |
| `src/components/AddWordModal.tsx` | modified | separateRows on MediaChips |
| `__tests__/integration/AudioPreviewOverlay.test.tsx` | created | 15 tests |
| `__tests__/integration/PhotoPreviewOverlay.test.tsx` | created | 11 tests |
| `__tests__/integration/WordAssetChips.test.tsx` | created | 19 tests |
| `__tests__/integration/MediaChips.test.tsx` | modified | Rewritten for overlay-based behavior |
| `__tests__/integration/assetService.test.ts` | modified | Updated assertions for updateAssetMeta |
| `__tests__/unit/assetRepository.test.ts` | modified | Updated INSERT param arrays to include name |
| `__tests__/unit/assetDatabase.test.ts` | modified | Updated INSERT param arrays to include name |
| `__tests__/unit/migrator.test.ts` | modified | Updated "all applied" mock to include version 3 |
| `__tests__/integration/MediaCaptureProvider.test.tsx` | modified | Added name field to SAMPLE_ASSET |
| `__tests__/integration/useAssets.test.tsx` | modified | Added name field to mock assets |
| `__tests__/integration/MediaFAB.test.tsx` | modified | Added prefilledMediaName to mock; explicit return type |
| `__tests__/integration/MediaLinkingModal.test.tsx` | modified | Updated assertions to include mediaName param |
