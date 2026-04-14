---
name: 2026-04-14_01-memories-export-backup-assets-photo-icon
plan: .agents/plan/design/2026-04-14_01-memories-export-backup-assets-photo-icon.md
status: done
started: 2026-04-14
agent: claude
worktree: false
---

## Summary

Adds keepsake book to ZIP backup export/import and centers the camera swap badge inside polaroid photo frames in the preview modal.

## Design Decisions Made

- Keepsake path inlined as constants in `backupExport.ts` / `backupImport.ts` (no cross-service import) to keep the backup pipeline self-contained.
- Additive schema changes (`has_keepsake?`, `keepsake?` optional fields) — no backup version bump; old backups import unchanged.
- Badge alignment changed to `center/center` (not bottom-right) — most intuitive UX for "tap to add photo here" affordance within a small scaled preview.
- `restoreKeepsake()` always clears+re-inserts keepsake state when `data.keepsake` is present (overwrite semantics, matching restore intent).
- `KEEPSAKE_SAFE_PATH` constant + separate `if (path === KEEPSAKE_SAFE_PATH)` check in `isPathSafe` keeps the asset regex clean and the keepsake path explicitly whitelisted.

## Changes

| File | Action | Notes |
|------|--------|-------|
| `src/types/backup.ts` | modified | Added `BackupKeepsakeState`, `BackupKeepsake`; optional fields on `BackupManifest` + `BackupData` |
| `src/repositories/backupRepository.ts` | modified | Added `getAllKeepsakeStateForBackup()` |
| `src/utils/backupExport.ts` | modified | ZIP includes keepsake state + image file; manifest/data carry keepsake metadata |
| `src/utils/backupValidation.ts` | modified | `isPathSafe()` accepts `keepsake/keepsake.jpg` |
| `src/utils/backupImport.ts` | modified | `restoreKeepsake()` helper; called from `importFullBackup()` |
| `src/components/keepsake/KeepsakePreviewModal.tsx` | modified | `frameTouchTarget` badge centered within polaroid overlay |
| `__tests__/unit/backupExport.test.ts` | modified | Mock + tests for keepsake in ZIP; asset exists:false branch fix |
| `__tests__/unit/backupImport.test.ts` | modified | Mock keepsake repo + Directory; keepsake restore tests |
| `__tests__/unit/backupRepository.test.ts` | modified | Tests for `getAllKeepsakeStateForBackup` |
| `__tests__/unit/backupValidation.test.ts` | modified | Tests keepsake path accepted + similar-but-invalid path rejected |

## Enhancements

### 2026-04-14 — Polaroid placeholder: blank card + prominent round badge in preview

- **Description:** `KeepsakeCard.tsx` placeholder reverted to empty `<View>` (no icon in captured image). `KeepsakePreviewModal.tsx` `swapBadge` enlarged to 44×44dp with 22px icon so the round camera button is prominently centered in the photo frame when no photo is set.
- **Files Modified:** `src/components/keepsake/KeepsakeCard.tsx`, `src/components/keepsake/KeepsakePreviewModal.tsx`
- **Plan Updates:** None.

### 2026-04-14 — Polaroid placeholder: camera icon replaces category emoji (superseded)

- **Description:** Removed category emoji (and 💬 fallback) from the photo placeholder inside each polaroid frame. Replaced with a centered `Ionicons camera-outline` icon sized at 25% of the photo area, colored `TEXT_LIGHT`. Removed the now-unused `placeholderEmoji` StyleSheet entry.
- **Files Modified:** `src/components/keepsake/KeepsakeCard.tsx`, `__tests__/integration/KeepsakeCard.test.tsx`
- **Plan Updates:** None — visual-only change, no architecture impact.
