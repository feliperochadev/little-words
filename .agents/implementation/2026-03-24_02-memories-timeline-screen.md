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

## Validation

- Ran `npm run test -- __tests__/unit/appConfig.test.ts` → pass.
- Ran `npm run ci` → pass (`lint`, `typecheck`, `test:coverage`, `semgrep`).
