---
name: 2026-03-17_01-design-system
plan: .agents/plan/ui-changes/2026-03-17_01-design-system.md
status: done
started: 2026-03-17
agent: claude
worktree: false
---

## Summary

Implements the Palavrinhas Design System foundation: theme token layer (`src/theme/`), two color variants (Florzinha/Mel), 7 new shared components, Ionicons tab bar, refactored UIComponents, and full test coverage — CI passes.

## Changes

<!-- Filled in once implementation is complete. List every file created or modified. -->

| File | Action | Notes |
|------|--------|-------|
| `src/theme/types.ts` | created | Theme type definitions |
| `src/theme/config.ts` | created | One-line variant selector |
| `src/theme/index.ts` | created | Re-exports active theme |
| `src/theme/tokens/typography.ts` | created | Shared typography scale |
| `src/theme/tokens/spacing.ts` | created | Shared spacing scale |
| `src/theme/tokens/shape.ts` | created | Shared border radius scale |
| `src/theme/tokens/elevation.ts` | created | Shared shadow presets |
| `src/theme/tokens/motion.ts` | created | Shared animation tokens |
| `src/theme/variants/florzinha.ts` | created | Florzinha color tokens |
| `src/theme/variants/mel.ts` | created | Mel color tokens |
| `src/utils/theme.ts` | modified | Migration bridge — re-exports from src/theme |
| `src/components/UIComponents.tsx` | modified | Refactored with theme tokens + icon props |
| `src/components/Input.tsx` | created | New shared input component |
| `src/components/Label.tsx` | created | New shared label component |
| `src/components/ScreenHeader.tsx` | created | New screen header component |
| `src/components/SortBar.tsx` | created | New sort bar component |
| `src/components/BottomSheet.tsx` | created | New modal bottom sheet component |
| `src/components/IconButton.tsx` | created | New icon-only button with 48dp targets |
| `src/components/LanguagePicker.tsx` | created | New language picker component |
| `app/(tabs)/_layout.tsx` | modified | Replaced emoji with Ionicons |
