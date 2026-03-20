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

## Enhancements

### 2026-03-20 — Fix creating-word phase: GlobalAddWordModal missing from tab layout

- **Description:** When `startCreateWord()` was called from `MediaLinkingModal`, the phase changed to `'creating-word'` and the linking modal correctly closed, but no `AddWordModal` was ever opened. The `creating-word` phase had no global handler — only `words.tsx` and `home.tsx` had local `AddWordModal` instances driven by `showAddWord` state, which were never triggered. The fix adds a `GlobalAddWordModal` component to `app/(tabs)/_layout.tsx` that renders `AddWordModal` with `visible={phase === 'creating-word'}`, ensuring the modal opens globally regardless of the active tab.
- **Files Modified:** `app/(tabs)/_layout.tsx`, `__tests__/screens/tabLayout.test.tsx`
- **Root Cause:** `_layout.tsx` mounted `MediaFAB` and `MediaLinkingModal` globally but omitted a global `AddWordModal` for the `creating-word` phase.

### 2026-03-20 — Navigate to words tab and focus saved word after AddWordModal save

- **Description:** After a word is saved (new or edited), `AddWordModal` now calls `router.push({ pathname: '/(tabs)/words', params: { highlightId: String(wordId) } })` to navigate the user to the words list. `words.tsx` reads the `highlightId` param via `useLocalSearchParams` and scrolls the FlatList to the matching word using a ref and `scrolledHighlightRef` guard to prevent double-scroll on re-renders or tab refocus.
- **Files Modified:** `src/components/AddWordModal.tsx`, `app/(tabs)/words.tsx`, `__tests__/integration/AddWordModal.test.tsx`
