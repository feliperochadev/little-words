---
name: 2026-03-23_01-export-import-full-backup
plan: .agents/plan/design/2026-03-23_01-export-import-full-backup.md
status: done
started: 2026-03-23
agent: claude
worktree: false
---

## Summary

Implemented full ZIP backup/restore: export mode selector in Settings (CSV vs ZIP), ZIP archive builder with manifest + data + media files, and ZIP import tab in ImportModal with merge strategy and profile restore toggle.

## Changes

| File | Action | Notes |
|------|--------|-------|
| `src/types/backup.ts` | Created | All backup TypeScript interfaces: BackupManifest, BackupData, BackupSettings, BackupCategory, BackupWord, BackupVariant, BackupAsset, BackupImportResult |
| `src/repositories/backupRepository.ts` | Created | Bulk DB queries: getAllCategoriesForBackup, getAllWordsForBackup, getAllVariantsForBackup, getAllAssetsForBackup (no parent_type filter — includes unlinked) |
| `src/utils/backupValidation.ts` | Created | Path traversal protection, manifest/data byte validation, validateMediaPaths |
| `src/utils/backupExport.ts` | Created | buildBackupZip, shareFullBackup, saveFullBackupToDevice; uses fflate.zipSync; locale passed as param |
| `src/utils/backupImport.ts` | Created | openBackupZip, importFullBackup; merge strategy; two-phase DB+file I/O; unlinked assets stored as 'word' parent_type |
| `src/i18n/en-US.ts` | Modified | Added ~40 backup translation keys; updated settings.exportDesc |
| `src/i18n/pt-BR.ts` | Modified | Added ~40 backup translation keys (Portuguese); updated settings.exportDesc |
| `app/(tabs)/settings.tsx` | Modified | Export mode selector (CSV/ZIP cards), zip export handlers, locale param threading |
| `src/components/ImportModal.tsx` | Modified | Added ZIP tab with picker, preview, profile restore toggle, and import handler |
| `__tests__/unit/backupValidation.test.ts` | Created | 22 tests, 100% coverage all metrics |
| `__tests__/unit/backupRepository.test.ts` | Created | 7 tests, 100% coverage all metrics |
| `__tests__/unit/backupExport.test.ts` | Created | 17 tests, 100% coverage all metrics |
| `__tests__/unit/backupImport.test.ts` | Created | 33 tests, 100% coverage all metrics |
| `__tests__/integration/ImportModal.test.tsx` | Modified | 5 new tests for ZIP tab (renders, hint, pick button, disabled state, cancel) |
| `__tests__/screens/settings.test.tsx` | Modified | 7 new tests for export mode selector and zip export handlers |

## Enhancements

### 2026-03-23 — Data-Layer Responsibility Fix (SQL to Repositories)

- **Description:** Moved all raw SQL queries out of `src/utils/backupImport.ts` into their respective repository files, fixing a data-layer architecture violation. Added `importCategory`, `importWord`, `importVariant`, and `importAsset` repository functions that preserve `created_at` from backup data. `backupImport.ts` now calls only repository functions; `withTransaction` is kept as permitted service-level orchestration.
- **Files Modified:** `src/repositories/categoryRepository.ts`, `src/repositories/wordRepository.ts`, `src/repositories/variantRepository.ts`, `src/repositories/assetRepository.ts`, `src/utils/backupImport.ts`, `__tests__/unit/backupImport.test.ts`, `__tests__/unit/categoryRepository.test.ts`, `__tests__/unit/wordRepository.test.ts`, `__tests__/unit/variantRepository.test.ts`, `__tests__/unit/assetRepository.test.ts`
- **Plan Updates:** None — architectural correction, no design doc changes needed.

### 2026-03-23 — UI Polish, Media Bug Fix, and Per-Type Import Reporting

- **Description:** Fixed media files not being written to disk during ZIP import (root cause: `ensureDir` cannot create intermediate directories). Split `BackupImportResult.assetsRestored` into `audiosRestored`, `photosRestored`, `videosRestored`. Renamed "media" → "audios, photos and videos" throughout UI. Changed default export mode to ZIP and default import tab to ZIP (Full Backup first). Reduced import tab font size ~21%. Changed Import modal title to "Import Data". Added "Export first" button to delete-all confirmation dialog.
- **Files Modified:** `src/utils/assetStorage.ts`, `src/utils/backupImport.ts`, `src/types/backup.ts`, `src/components/ImportModal.tsx`, `app/(tabs)/settings.tsx`, `src/i18n/en-US.ts`, `src/i18n/pt-BR.ts`, `__tests__/unit/backupImport.test.ts`, `__tests__/unit/backupExport.test.ts`, `__tests__/integration/ImportModal.test.tsx`, `__tests__/screens/settings.test.tsx`
- **Plan Updates:** None — enhancements were post-implementation improvements.

## Design Decisions Made

1. **Unlinked media in backup**: Include — `parent_type='unlinked'` assets are included in backup with their own `unlinked/` directory in the ZIP. On import, they are stored as `parent_type='word'` in DB to avoid FK issues, using parent_id as-is.
2. **Profile settings on import**: Ask user with a toggle "Restore profile settings (name, birth date, photo)". Default: on.
3. **Import strategy**: Merge only — existing words are skipped (not overwritten), new words/variants are added.
4. **Max backup size**: No hard block — show a warning in the result summary if archive exceeds 100MB. No OOM guard.
5. **ZIP library**: fflate (ADR accepted). Sync API only (`zipSync`/`unzipSync`) — async API does not work in React Native/Hermes.
6. **Locale threading**: Locale is managed by i18n context (not settingsStore), so it is passed as a `locale: string` parameter to all export functions. Settings screen passes it from `useI18n()`.
7. **ZIP filename format**: `{AppName-in-locale}-export-DD-MM-YYYY_HH-MM.zip` (spaces in app name replaced with hyphens).
8. **File.bytes() is async**: Despite initial assumption of sync, `File.bytes()` returns `Promise<Uint8Array>` — awaited in export loop.
9. **ASSET_TYPE_DIRS mapping**: `audio → 'audio'`, `photo → 'photos'`, `video → 'videos'` with fallback to raw asset_type string for unknown types.
10. **PARENT_DIRS mapping**: `word → 'words'`, `variant → 'variants'`, `profile → 'profile'`, `unlinked → 'unlinked'` with fallback to raw parent_type string.
