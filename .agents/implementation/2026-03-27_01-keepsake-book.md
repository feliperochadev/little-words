---
name: 2026-03-27_01-keepsake-book
plan: .agents/plan/design/2026-03-27_01-keepsake-book.md
status: done
started: 2026-03-27
agent: claude
worktree: false
---

## Summary

Adds a Keepsake Book feature that generates a shareable 9:16 Polaroid-style image of a baby's first 3 words, with photo swap, save-to-device, and share capabilities, integrated into the Memories and Home screens.

## Design Decisions Made

- **Rich emoji decorations (supersedes v1 sparse decorations)**: Scattered ~40 positioned emoji/Unicode decorations (stars, moons, bears, balloons) around card edges, matching the reference image's visual density. Future themes can replace with PNG/SVG assets.
- **Single KeepsakeCard ref**: The off-screen card (for capture at 1080x1920) uses the `ref`; the visible preview card is ref-less. This avoids ref conflicts.
- **Photo override stored as URI string**: Overrides store the full file URI directly in `keepsake_state` rather than an asset ID, simplifying the resolution logic.
- **expo-media-library added**: Required for saving JPEG to camera roll (`saveToLibraryAsync`). Not originally in the plan but necessary for the Save to Device feature.

## Changes

| File | Action | Notes |
|------|--------|-------|
| `src/types/keepsake.ts` | created | KeepsakeWord and KeepsakeState interfaces |
| `src/db/migrations/0006_add-keepsake-state.ts` | created | Creates keepsake_state table |
| `src/db/migrations/index.ts` | modified | Registers migration 0006 |
| `src/repositories/keepsakeRepository.ts` | created | SQLite CRUD for keepsake_state + word queries |
| `src/services/keepsakeService.ts` | created | Orchestration: word selection, capture, save, share |
| `src/hooks/useKeepsake.ts` | created | TanStack Query hooks for keepsake state and mutations |
| `src/hooks/queryKeys.ts` | modified | Added keepsakeState, keepsakeWords keys + KEEPSAKE_MUTATION_KEYS |
| `src/components/keepsake/KeepsakeCard.tsx` | created | Off-screen 1080x1920 Polaroid card renderer |
| `src/components/keepsake/KeepsakePreviewModal.tsx` | created | Full-screen preview modal with photo swap, save, share |
| `src/components/keepsake/KeepsakeSection.tsx` | created | Memories screen header: CTA or thumbnail |
| `src/components/keepsake/KeepsakeHomeCard.tsx` | created | Home screen compact card: thumbnail or hint |
| `src/i18n/en-US.ts` | modified | Added keepsake namespace (17 keys) |
| `src/i18n/pt-BR.ts` | modified | Added keepsake namespace (17 keys) |
| `app/(tabs)/memories.tsx` | modified | Added KeepsakeSection as ListHeaderComponent |
| `app/(tabs)/home.tsx` | modified | Added KeepsakeHomeCard in memories card |
| `jest.setup.js` | modified | Added mocks for react-native-view-shot and expo-media-library |
| `package.json` | modified | Added react-native-view-shot and expo-media-library |
| `__tests__/unit/keepsakeRepository.test.ts` | created | 13 tests |
| `__tests__/unit/keepsakeService.test.ts` | created | 17 tests |
| `__tests__/unit/keepsakeCard.test.ts` | created | 6 tests |
| `__tests__/integration/KeepsakePreviewModal.test.tsx` | created | 6 tests |
| `__tests__/integration/KeepsakeSection.test.tsx` | created | 3 tests |
| `__tests__/integration/KeepsakeHomeCard.test.tsx` | created | 3 tests |
| `__tests__/unit/migrator.test.ts` | modified | Updated to include migration 6 in "all applied" test |

## Enhancements

### 2026-03-27 — Fix capture bug, button overlap, watermark, decorations, title personalization

- **Description:** Fixed 5 issues: (1) capture failure on Android by replacing off-screen `-9999` positioning with `opacity: 0.01`; (2) action buttons overlapping Android nav bar by using `useSafeAreaInsets()`; (3) added app icon, QR code (via `react-native-qrcode-svg`), and larger text to watermark; (4) enriched background with ~40 scattered emoji/Unicode decorations matching reference image; (5) personalized title to `"{name}'s First Words"` using settings store name.
- **Files Modified:** `src/components/keepsake/KeepsakeCard.tsx`, `src/components/keepsake/KeepsakePreviewModal.tsx`, `src/i18n/en-US.ts`, `src/i18n/pt-BR.ts`, `jest.setup.js`, `package.json`
- **Plan Updates:** Updated design decision on decorations from "sparse emoji" to "rich scattered pattern".
