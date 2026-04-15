---
name: 2026-04-15_01-ui-polish-and-ios-fixes
plan: .agents/plan/design/2026-04-15_01-ui-polish-and-ios-fixes.md
status: done
started: 2026-04-15
agent: claude
worktree: false
---

## Summary

Shrinks the home "Nova Palavra" button, reduces timeline word/variant font sizes, adds a pre-import full backup guard, and fixes the iOS stacked-modal freeze for the category modal inside AddWordModal.

## Changes

| File | Action | Notes |
|------|--------|-------|
| `app/(tabs)/home.tsx` | modified | `addWordHeaderBtn` padding/icon/font size reduced ~15% |
| `src/components/TimelineItem.tsx` | modified | `wordFontSize` compact 14→12, normal 17→15; `variantOf` line gets explicit `fontSize: 13` |
| `src/components/ImportModal.tsx` | modified | Imports `saveFullBackupToDevice`; adds `backingUp` state + `withBackup` helper guarding ZIP pick and CSV/text submit |
| `src/components/AddCategoryModal.tsx` | modified | `renderAsOverlay` prop added; when true, renders as absolute-positioned overlay view instead of native Modal |
| `src/components/AddWordModal.tsx` | modified | `AddCategoryModal` moved inside outer Modal tree with `renderAsOverlay` to fix iOS stacked-modal freeze |
| `src/i18n/en-US.ts` | modified | Added `backup.preImportBackupFailedTitle`, `backup.preImportBackupFailedMessage`, `backup.preImportBackupProceed` |
| `src/i18n/pt-BR.ts` | modified | Same keys in Portuguese |
| `__tests__/integration/ImportModal.test.tsx` | modified | Mocks `saveFullBackupToDevice`; adds tests for backup-cancelled, backup-error alert, Proceed path, Cancel path |
| `__tests__/integration/AddCategoryModal.test.tsx` | modified | Adds `renderAsOverlay` tests (render, null when hidden, backdrop pressable, color selection); iOS focus line test |

## Enhancements

### 2026-04-15 — Button +10%, timeline word -5%, import tab labels -10%

- **Description:** Three micro-adjustments: home "Nova Palavra" button increased ~10% (paddingH 14→15, paddingV 7→8, fontSize 13→14, icon 14→15); timeline word font decreased ~5% (compact 12→11, normal 15→14); ImportModal tab label text (`tabText`) decreased ~10% (fontSize 11→10) so "📦 Backup Completo" fits on one line on iPhone.
- **Files Modified:** `app/(tabs)/home.tsx`, `src/components/TimelineItem.tsx`, `src/components/ImportModal.tsx`

## Design Decisions Made

- `variantOf` line: size change only (`fontSize: 13`), no colour or style change (confirmed by user).
- Pre-import backup guards the ZIP file picker button (`handlePickZip`) and the CSV/text import submit button. The Restore button (`handleImportZip`) has its own `!zipData` guard but the button is disabled in the UI, so the guard is defensive code only.
- `withBackup` silently returns (no alert) when `saveFullBackupToDevice` returns `error: 'cancelled'` (user dismissed the directory picker).
- `AddCategoryModal` overlay uses `zIndex: 999` in an `overlayRoot` style.
- Lines 277-278 in ImportModal (`!zipData` guard inside `handleImportZip`) are not covered by tests because the Restore button is disabled when `zipData` is null — this branch cannot be reached from the UI. Accepted as known defensive-code gap.
