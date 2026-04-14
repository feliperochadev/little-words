# Design: Keepsake Book Backup + Photo Icon Alignment

**Date:** 2026-04-14
**Status:** Draft
**Author:** Claude
**Related ADR:** N/A

---

## Problem Statement

1. The keepsake book image (`Documents/media/keepsake/keepsake.jpg`) and its state (`keepsake_state` table) are not included in ZIP backup exports. Users lose their generated keepsake when restoring from backup.
2. The camera swap badge in `KeepsakePreviewModal` sits at the top-right corner of the percentage-based touch target overlay, which doesn't align with the actual photo area inside the scaled-down polaroid frame.

## Goals

- Include keepsake file + state in backup ZIP
- Update `manifest.json` and `data.json` schemas to carry keepsake data
- Restore keepsake on import
- Fix swap badge to appear visually inside the photo frame

## Non-Goals

- Changing the keepsake generation flow or capture logic
- Migrating keepsake storage to the `assets` table
- Changing the backup version from `1.0` (additive change, not breaking)

## Design

### Overview

**Backup changes:** Extend the existing backup pipeline to also export/import keepsake state and the keepsake image file. This is additive — existing backups without keepsake data still import fine.

**Photo icon fix:** Adjust the `swapBadge` position to sit inside the photo area of each polaroid frame by accounting for the polaroid padding at preview scale.

### Component / Module Breakdown

| Component | Responsibility | File(s) |
|-----------|---------------|---------|
| BackupManifest type | Add `has_keepsake` flag | `src/types/backup.ts` |
| BackupData type | Add `keepsake` section | `src/types/backup.ts` |
| backupRepository | Add `getAllKeepsakeStateForBackup()` | `src/repositories/backupRepository.ts` |
| backupExport | Include keepsake state in `data.json`, file in ZIP | `src/utils/backupExport.ts` |
| backupValidation | Allow `keepsake/keepsake.jpg` path | `src/utils/backupValidation.ts` |
| backupImport | Restore keepsake state + file | `src/utils/backupImport.ts` |
| KeepsakePreviewModal | Fix swap badge alignment | `src/components/keepsake/KeepsakePreviewModal.tsx` |

### Data Flow

#### Export

```
buildBackupZip()
  → getAllKeepsakeStateForBackup()   → keepsake key/value rows
  → keepsakeFileExists()            → check if file present
  → read keepsake.jpg bytes         → add to fileMap as media/keepsake/keepsake.jpg
  → build manifest (has_keepsake: true/false)
  → build data.json (keepsake: { state: [...], filename: "keepsake.jpg" | null })
```

#### Import

```
importFullBackup(data, fileMap)
  → if data.keepsake exists:
    → clear existing keepsake_state rows
    → re-insert keepsake state key/value pairs
    → if fileMap["media/keepsake/keepsake.jpg"] exists:
      → ensure keepsake dir
      → write file
  → existing assets/words/variants import unchanged
```

### Schema Changes

#### `BackupManifest` — add optional field

```typescript
export interface BackupManifest {
  // ... existing fields ...
  has_keepsake?: boolean;  // optional for backward compat
}
```

#### `BackupData` — add optional section

```typescript
export interface BackupKeepsakeState {
  key: string;
  value: string;
}

export interface BackupKeepsake {
  state: BackupKeepsakeState[];
  filename: string | null;  // "keepsake.jpg" when file included, null otherwise
}

export interface BackupData {
  // ... existing fields ...
  keepsake?: BackupKeepsake;  // optional for backward compat
}
```

#### Validation — safe path regex

Current regex:
```
^(words|variants|profile|unlinked)\/\d+\/(audio|photos|videos)\/asset_\d+\.\w+$
```

Add a separate check for the keepsake path:
```
^keepsake\/keepsake\.jpg$
```

Keep these as two patterns rather than merging — the keepsake path is structurally different (no parent_id or asset_type dirs).

### backupRepository — new query

```typescript
export const getAllKeepsakeStateForBackup = (): Promise<BackupKeepsakeState[]> =>
  query<BackupKeepsakeState>('SELECT key, value FROM keepsake_state ORDER BY key ASC');
```

### backupExport changes

In `buildBackupZip()`:

1. Fetch keepsake state via `getAllKeepsakeStateForBackup()` (add to existing `Promise.all`).
2. Check `keepsakeFileExists()` — if true, read file bytes into `fileMap['media/keepsake/keepsake.jpg']`.
3. Set `manifest.has_keepsake` based on whether file exists.
4. Set `data.keepsake = { state: rows, filename: fileExists ? 'keepsake.jpg' : null }`.

### backupImport changes

In `importFullBackup()` — after the existing assets import phase:

1. If `data.keepsake` exists and has state entries:
   - Run `clearKeepsakeState()` (already exists in `keepsakeRepository`)
   - Insert each state row via `setKeepsakeState(key, value)` (already exists)
2. If `fileMap['media/keepsake/keepsake.jpg']` exists:
   - Call `ensureKeepsakeDir()` (from keepsakeService — needs export or inline)
   - Write bytes to `getKeepsakeFileUri()`

### Photo Icon Fix

**Problem:** The `swapBadge` in `KeepsakePreviewModal` uses `alignItems: 'flex-end', justifyContent: 'flex-start'` on the `frameTouchTarget`, placing the camera icon at the absolute top-right corner of the touch target. Since touch targets use approximate percentage positions over the scaled 1080→340dp preview, the badge often sits outside the visible photo area (the polaroid has 20px internal padding at full scale = ~6dp at preview scale).

**Fix:** Move the badge to `bottom-right` inside the photo area:
- Change `frameTouchTarget` alignment to `alignItems: 'flex-end', justifyContent: 'flex-end'`
- Add padding to push the badge inward past the polaroid border + photo border radius. Approximately `padding: 12` (accounts for ~6dp polaroid border + visual margin).

This makes the badge sit visually inside the bottom-right corner of the photo within the polaroid frame, consistent with standard photo badge UX conventions (camera icon in bottom-right of photo).

### Error Handling

- Missing keepsake file on export: `has_keepsake: false`, `filename: null`, no crash
- Missing keepsake data on import (old backup): skip keepsake restore entirely (`data.keepsake` is optional)
- Keepsake file write failure on import: log warning (non-blocking, same pattern as asset file failures)

## Alternatives Considered

1. **Store keepsake as a regular asset in the `assets` table:** Would simplify backup (assets already exported). Rejected because keepsake has fundamentally different lifecycle — it's a generated artifact, not user-captured media. Forcing it into the asset model would require a new `parent_type` and complicate asset queries.

2. **Bump backup version to 2.0:** Not needed. The keepsake fields are optional in both `BackupManifest` and `BackupData`. Older backups without keepsake data import without issues. Older app versions encountering a backup with keepsake data will simply ignore the unknown fields.

3. **Move swap badge into KeepsakeCard component:** Would ensure pixel-perfect alignment but requires passing interaction callbacks into the pure render card, complicating its API and breaking the clean separation between capture card and interactive preview.

## Open Questions

None — all components of this design extend existing patterns.

## Acceptance Criteria

- [ ] `buildBackupZip()` includes `keepsake` section in `data.json`
- [ ] `manifest.json` includes `has_keepsake: true` when keepsake file exists
- [ ] Keepsake image file appears in ZIP at `media/keepsake/keepsake.jpg`
- [ ] `importFullBackup()` restores keepsake state rows and image file
- [ ] Old backups (without keepsake) import without errors
- [ ] Path validation accepts `keepsake/keepsake.jpg`
- [ ] Camera swap badge sits visually inside the photo area of each polaroid frame
- [ ] Tests cover export with/without keepsake, import with/without keepsake, validation of keepsake path, badge positioning logic
- [ ] DO NOT FORGET TO CHECK FOR THE DOCUMENTED ISSUES ON .agents/standards/sonar.md for sonar quality check and fix if they were found in the new changes
- [ ] Ship changes once all done and CI is working and wait for sonar process to run (like in the /fix-new-issues instructions) and see if the sonar analysis is good, if not fix and document the new found issues on .agents/standards/sonar.md


## Files Changed (estimated: 9)

1. `src/types/backup.ts` — add `BackupKeepsakeState`, `BackupKeepsake`, optional fields
2. `src/repositories/backupRepository.ts` — add `getAllKeepsakeStateForBackup`
3. `src/utils/backupExport.ts` — include keepsake in ZIP build
4. `src/utils/backupValidation.ts` — add keepsake path to safe-path check
5. `src/utils/backupImport.ts` — restore keepsake on import
6. `src/components/keepsake/KeepsakePreviewModal.tsx` — fix badge alignment
7. `__tests__/unit/backupExport.test.ts` — keepsake export tests
8. `__tests__/unit/backupImport.test.ts` — keepsake import tests
9. `__tests__/unit/backupValidation.test.ts` — keepsake path tests
