# Design: Export/Import Full Backup with Media Assets

**Date:** 2026-03-23
**Status:** Draft
**Author:** claude
**Related ADR:** `.agents/plan/architecture/2026-03-23_01-fflate-zip-library.md`

---

## Problem Statement

Users can currently export/import words as CSV (text data only). There is no way to backup or restore media assets (audio recordings, photos) attached to words and variants. Users who switch devices or reinstall the app lose all media. A full backup/restore capability is needed.

## Goals

- Full backup: export all words, variants, categories, assets, profile photo, and profile settings in a single ZIP file
- Full restore: import a ZIP backup, recreating all data and media files
- Backward compatible: existing CSV import/export flows unchanged
- Safe: atomic DB operations, path traversal protection, schema validation
- User-friendly: mode selector for export, auto-detection for import, clear progress and result summary

## Non-Goals

- Cloud backup (Google Drive, iCloud) — future feature
- Streaming/incremental export for very large libraries (>100MB)
- Video recording (format supported in types but no recording UI)
- Encryption or password protection of backups
- Inter-device real-time sync

---

## Design

### Overview

Add a ZIP-based full backup format alongside the existing CSV export. The ZIP contains a `manifest.json` (metadata), `data.json` (all entities), and a `media/` directory tree mirroring the on-disk asset structure. Import auto-detects CSV vs ZIP by file extension and routes to the appropriate handler.

### Component / Module Breakdown

| Component | Responsibility | File(s) |
|-----------|---------------|---------|
| Backup types | Shared interfaces for manifest, data.json schema | `src/types/backup.ts` |
| Backup export | Build ZIP from DB + media files | `src/utils/backupExport.ts` |
| Backup import | Extract ZIP, validate, import into DB + storage | `src/utils/backupImport.ts` |
| Backup validation | Schema validation, path traversal checks | `src/utils/backupValidation.ts` |
| Backup repository | Bulk queries for export (all words/variants/categories/assets) | `src/repositories/backupRepository.ts` |
| Export mode selector | UI for choosing CSV vs ZIP export | New section in `app/(tabs)/settings.tsx` |
| Import modal update | Accept ZIP files, show ZIP preview, handle ZIP import flow | `src/components/ImportModal.tsx` (modified) |
| i18n keys | All new user-facing strings | `src/i18n/en-US.ts`, `src/i18n/pt-BR.ts` |

### ZIP Archive Structure

```
backup-YYYY-MM-DD.zip
├── manifest.json
├── data.json
└── media/
    ├── profile/
    │   └── 1/
    │       └── photos/
    │           └── asset_{id}.{ext}
    ├── words/
    │   └── {wordId}/
    │       ├── audio/
    │       │   └── asset_{id}.{ext}
    │       └── photos/
    │           └── asset_{id}.{ext}
    └── variants/
        └── {variantId}/
            ├── audio/
            │   └── asset_{id}.{ext}
            └── photos/
                └── asset_{id}.{ext}
```

The media directory structure mirrors the on-disk layout from `assetStorage.ts`, using the same `{parentType}/{parentId}/{assetType}/asset_{id}.{ext}` convention.

### manifest.json Schema

```typescript
interface BackupManifest {
  version: '1.0';
  exported_at: string;        // ISO 8601
  app_version: string;        // from package.json/app.json
  word_count: number;
  variant_count: number;
  category_count: number;
  asset_count: number;
  locale: string;             // 'en-US' | 'pt-BR'
}
```

### data.json Schema

```typescript
interface BackupData {
  version: '1.0';
  settings: {
    name: string;
    sex: 'girl' | 'boy' | null;
    birth: string;            // YYYY-MM-DD or ''
    locale: string;
  };
  categories: Array<{
    id: number;
    name: string;             // canonical key or user name
    color: string;
    emoji: string;
    created_at: string;
  }>;
  words: Array<{
    id: number;
    word: string;
    category_id: number | null;
    date_added: string;
    notes: string | null;
    created_at: string;
  }>;
  variants: Array<{
    id: number;
    word_id: number;
    variant: string;
    date_added: string;
    notes: string | null;
    created_at: string;
  }>;
  assets: Array<{
    id: number;
    parent_type: 'word' | 'variant' | 'profile';
    parent_id: number;
    asset_type: 'audio' | 'photo' | 'video';
    filename: string;
    name: string | null;
    mime_type: string;
    file_size: number;
    duration_ms: number | null;
    width: number | null;
    height: number | null;
    created_at: string;
    // Relative path within ZIP's media/ directory:
    media_path: string;       // e.g. "words/1/audio/asset_5.m4a"
  }>;
}
```

Key decisions:
- IDs are the DB integer IDs at time of export. On import, new IDs are generated and an `oldId → newId` mapping is maintained.
- `media_path` is relative to the ZIP's `media/` directory, never absolute. This path is validated during import.
- `unlinked` assets are excluded from backup (they are ephemeral/incomplete).
- Categories use DB names (canonical keys for built-in, literal for user-created) — matches the existing storage convention.

### Data Flow

#### Export (ZIP)

```
User taps "Full Backup" in Settings
  → Show loading overlay
  → backupExport.createFullBackup(t)
    → backupRepository.getAllCategories()
    → backupRepository.getAllWords()
    → backupRepository.getAllVariants()
    → backupRepository.getAllAssets()  (excludes unlinked)
    → settingsStore.getState() for profile settings
    → Build manifest.json + data.json as Uint8Array via fflate.strToU8()
    → For each asset: read file via File.bytes() → add to file map
    → fflate.zipSync(fileMap) → Uint8Array
    → Write to temp file: Paths.cache / 'backup-YYYY-MM-DD.zip'
  → Hide loading overlay
  → Share via expo-sharing OR save to device via SAF directory picker
```

#### Import (ZIP)

```
User opens Import Modal → picks .zip file
  → Read file bytes via File.bytes()
  → fflate.unzipSync(bytes) → fileMap
  → Show loading overlay
  → backupValidation.validateManifest(fileMap['manifest.json'])
  → backupValidation.validateData(fileMap['data.json'])
  → backupValidation.validateMediaPaths(data.assets, fileMap)
  → Hide loading, show preview:
    "42 words, 68 variants, 127 media files"
    Conflict summary: "3 words already exist (will be merged)"
  → User confirms
  → Show loading overlay
  → backupImport.importFullBackup(data, fileMap)
    → withTransaction():
      → Import categories: match by canonical name, create new ones
        → Build categoryIdMap: {oldId → newId}
      → Import words: match by case-insensitive name
        → Existing: update category/date/notes if newer
        → New: insert
        → Build wordIdMap: {oldId → newId}
      → Import variants: match by word + variant name
        → Existing: update date/notes if newer
        → New: insert
        → Build variantIdMap: {oldId → newId}
    → Outside transaction (file I/O):
      → For each asset in data.assets:
        → Resolve new parent_id from mapping
        → Insert asset DB record → get new asset ID
        → Build new filename: asset_{newId}.{ext}
        → Write file bytes from ZIP to storage location
        → Update asset record with final filename
        → On file write failure: delete asset record, log warning
    → Build and return ImportResult
  → Hide loading, show result summary
```

#### Import (CSV) — Unchanged

Existing flow in `ImportModal.tsx` continues to work. File type detection happens at the document picker step: `.zip` routes to ZIP handler, `.csv`/`.txt` routes to existing handler.

### UI / UX Decisions

#### Settings Screen — Export Section

Replace the current "Share" / "Save" buttons with a two-step flow:

1. **Export format selector** — Two tappable cards side by side:
   - Left card: 📄 "Words Only (CSV)" — "Export word list as CSV text file"
   - Right card: 📦 "Full Backup (ZIP)" — "Export everything including audio & photos"
2. On card tap:
   - **CSV**: Show existing "Share" / "Save" buttons
   - **ZIP**: Show "Share" / "Save" buttons (same UX, different file)

#### Import Modal — ZIP Support

- File picker now accepts `.zip` in addition to `.csv`/`.txt`
- When a ZIP is selected:
  - Validation runs immediately
  - Preview shows: word count, variant count, asset count
  - Conflict summary: how many existing words will be merged
  - "Import" button triggers the full restore
- Result dialog shows detailed summary

#### Loading Overlay

- Full-screen semi-transparent overlay with activity indicator
- Text updates: "Creating backup...", "Extracting...", "Importing words...", "Copying media..."
- Cannot be dismissed (blocks interaction during sync ZIP operation)

### Error Handling

| Scenario | Behavior |
|----------|----------|
| Invalid ZIP (not a valid archive) | Show error alert, offer to try CSV import instead |
| Missing `manifest.json` | Show error: "Not a valid Little Words backup" |
| Unsupported manifest version | Show error: "This backup was created with a newer version" |
| Missing `data.json` | Show error: "Backup file is corrupted" |
| Invalid data.json structure | Show error with specific field failure |
| Path traversal in `media_path` | Reject entire backup: "Unsafe file paths detected" |
| Missing media file in ZIP | Import word/variant successfully, log warning, include in result summary |
| Corrupt/unreadable media file | Skip file, log warning, continue import |
| DB insert failure mid-import | Roll back entire transaction, show error |
| File write failure for single asset | Delete that asset's DB record, warn user, continue with rest |
| Out of memory during ZIP creation | Catch error, show "Backup too large" message |

### Security Considerations

- **Path traversal**: Every `media_path` in `data.json` is validated:
  - Must not contain `..`
  - Must not start with `/` or `\`
  - Must match pattern: `{words|variants|profile}/{number}/{audio|photos|videos}/asset_{number}.{ext}`
  - Must exist in the ZIP's file map
- **SQL injection**: All DB operations use parameterized queries (existing pattern)
- **File size**: Each extracted file validated against `MAX_FILE_SIZE` limits from `asset.ts`
- **MIME type**: Each asset's `mime_type` validated against `ACCEPTED_MIME_TYPES`

---

## Alternatives Considered

1. **JSON-only backup (no ZIP)**: Would include base64-encoded media in the JSON file. Rejected: 33% size overhead from base64 encoding, huge JSON files, no standard tooling for viewing/editing.

2. **SQLite database copy**: Export the raw `.db` file. Rejected: not portable across schema versions, doesn't include media files, not human-inspectable.

3. **Tar archive**: Simpler format than ZIP. Rejected: no compression, larger files, less tooling support, fewer JS libraries available.

4. **Native ZIP library (react-native-zip-archive)**: Better performance. Rejected for v1: requires custom dev build, breaks Expo Go debugging. Can revisit if performance becomes an issue.

---

## Open Questions

- [ ] **Unlinked media**: Should media captured but not yet linked to a word/variant be included in backups? Recommendation: exclude in v1 (they are ephemeral), add in v2 if requested.
- [ ] **Import strategy choice**: Should the UI offer "Merge" vs "Replace All" options? Recommendation: merge-only in v1, add replace option later.
- [ ] **Max backup size**: What's the recommended limit? Recommendation: show a warning at 100MB, hard-block at 200MB (fflate sync may OOM).
- [ ] **Profile settings on import**: Should importing a backup overwrite the current profile (name, sex, birth)? Recommendation: ask the user with a toggle "Restore profile settings".

---

## Acceptance Criteria

- [ ] Export mode selector UI shows CSV vs ZIP options
- [ ] ZIP export creates valid archive with manifest.json, data.json, media/
- [ ] ZIP export includes all categories, words, variants, non-unlinked assets, profile photo
- [ ] ZIP export includes profile settings (name, sex, birth) in data.json
- [ ] Import auto-detects CSV vs ZIP by file extension
- [ ] ZIP import validates manifest version (rejects unknown versions)
- [ ] ZIP import validates data.json structure (required fields, types)
- [ ] ZIP import validates all media_path entries (no path traversal, files exist in ZIP)
- [ ] ZIP import merges words by case-insensitive name match
- [ ] ZIP import adds new variants to existing words without duplicating
- [ ] ZIP import copies all media files to correct storage locations
- [ ] ZIP import is atomic: DB transaction rolls back on failure
- [ ] Missing media files produce warnings, not errors (words still imported)
- [ ] Loading overlay shown during ZIP creation and extraction
- [ ] Post-import result summary shows counts (words, variants, assets, warnings)
- [ ] CSV export/import flows continue to work unchanged
- [ ] All new code ≥99% line / ≥95% branch coverage
- [ ] `npm run ci` passes
