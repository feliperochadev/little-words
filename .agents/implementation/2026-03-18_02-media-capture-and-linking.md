---
name: 2026-03-18_02-media-capture-and-linking
plan: .agents/plan/design/2026-03-18_02-media-capture-and-linking.md
status: done
started: 2026-03-18
agent: claude
worktree: false
---

## Summary

Full media capture & linking feature: FAB with audio recording + photo capture, linking modal, inline playback indicators, and media chips in edit modals.

## Changes

| File | Action | Notes |
|------|--------|-------|
| `app/(tabs)/_layout.tsx` | modified | Wrapped tabs with `MediaCaptureProvider`; mounted global `MediaFAB` and `MediaLinkingModal`. |
| `app/(tabs)/words.tsx` | modified | Added inline media asset count chip with `AudioPlayerInline` for word rows. |
| `app/(tabs)/variants.tsx` | modified | Added inline media asset count chip with `AudioPlayerInline` for variant rows. |
| `src/components/AddWordModal.tsx` | modified | Integrated `MediaChips`; wired creating-word handoff (`prefilledWordName`, `onWordCreated`, pending cleanup). |
| `src/i18n/en-US.ts` | modified | Added `mediaCapture` translation keys and placeholders/messages. |
| `src/i18n/pt-BR.ts` | modified | Added `mediaCapture` translation keys and placeholders/messages. |
| `__tests__/helpers/renderWithProviders.tsx` | modified | Added `MediaCaptureProvider` to shared test wrapper. |
| `__tests__/screens/tabLayout.test.tsx` | modified | Added mocks for media components/provider to keep tab tests deterministic. |
| `__tests__/integration/MediaFAB.test.tsx` | modified | Mocked `useI18n` for stable rendering without provider coupling. |
| `__tests__/screens/home.test.tsx` | modified | Expanded `useAssets` mock with `useAssetsByParent` and `useRemoveAsset`. |
| `__tests__/unit/useAudioPlayer.test.ts` | modified | Updated global mock access typing for TS strictness. |
| `__tests__/unit/useAudioRecording.test.ts` | modified | Updated global mock access typing for TS strictness. |
| `jest.setup.js` | modified | Expanded `expo-av` mock with `__mockSound` and `__mockRecording` globals and full method surface. |

## Validation

- `npm run ci` ✅ passed
- `npm run agent:review` ✅ simple change internal review passed
