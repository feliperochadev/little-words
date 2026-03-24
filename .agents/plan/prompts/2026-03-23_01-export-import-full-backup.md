# Prompt — 2026-03-23_01-export-import-full-backup

## Original Prompt

Enhance the Export/Import feature in Settings to support full backup and restore of the word library including media assets, while maintaining backward compatibility with CSV-only exports. See `EXPORT_IMPORT_ENHANCEMENT.md` for full specification:

- **Export**: Add mode selector (CSV-only vs Full Backup ZIP). ZIP contains `manifest.json`, `data.json`, and a `media/` directory with all assets organized by parent type.
- **Import**: Accept both CSV and ZIP files. ZIP imports must validate schema version, data structure, referenced media files, and guard against path traversal. Merge strategy for conflicts: update existing, add new.
- **Error handling**: Atomic DB operations, graceful degradation for missing/corrupt media files.
- Post-import summary showing counts of imported/skipped/errored items.

## Refined Prompt

### 1. Intent
Add full backup/restore capability to the existing Export/Import feature, allowing users to create ZIP archives containing all words, variants, categories, profile settings, and media files — and later restore them on the same or a different device.

### 2. Scope & Constraints
- **In scope**: ZIP backup creation (export), ZIP backup extraction and import, export mode selector UI, import format auto-detection, conflict resolution via merge, profile photo & settings inclusion, validation & security (path traversal prevention).
- **Out of scope**: Cloud backup (Google Drive, iCloud), streaming/incremental export for very large libraries, video assets (the spec mentions video but no video recording exists yet — include format support but don't implement recording), inter-device sync, encryption/password protection.
- **Constraints**: Must work with Expo managed workflow (no native modules requiring ejection). Must use synchronous ZIP operations since async fflate Workers don't run in Hermes. Must handle typical backup sizes under 50MB without memory issues. Must maintain full backward compatibility with existing CSV import/export flows.

### 3. Acceptance Criteria
- [ ] User can choose between "Words Only (CSV)" and "Full Backup (ZIP)" when exporting
- [ ] ZIP export produces a valid archive with `manifest.json`, `data.json`, and `media/` directory
- [ ] ZIP export includes all words, variants, categories, assets, profile photo, and profile settings
- [ ] User can import a ZIP file through the existing import flow (auto-detected by file extension)
- [ ] ZIP import validates manifest version, data.json structure, and file references
- [ ] ZIP import rejects paths containing `..` or absolute paths (path traversal protection)
- [ ] ZIP import uses merge strategy: existing words updated, new words added, new variants added to existing words
- [ ] ZIP import copies all media files to the correct storage locations
- [ ] ZIP import shows preview with counts before confirming
- [ ] ZIP import shows result summary (imported, skipped, errors, missing assets)
- [ ] All database operations during import are atomic (transaction-wrapped, rollback on error)
- [ ] Missing/corrupt media files during import produce warnings but don't block word/variant import
- [ ] Existing CSV import and CSV/share export continue to work unchanged
- [ ] Loading indicator shown during ZIP creation/extraction (blocks JS thread)
- [ ] All new code has ≥99% line / ≥95% branch test coverage

### 4. Risks & Mitigations
- **Memory pressure on large backups**: fflate `zipSync`/`unzipSync` hold entire archive in memory. Mitigated by: (a) typical baby app data is well under 50MB, (b) document a recommended size limit in manifest, (c) future iteration can add streaming.
- **JS thread blocking**: Synchronous ZIP operations freeze the UI. Mitigated by showing a full-screen loading overlay with progress text.
- **Schema evolution**: Future data.json versions may add fields. Mitigated by including `version` in manifest and validating at import time; importer ignores unknown fields.
- **Cross-platform file paths**: Windows-style paths could appear in imported ZIPs from other sources. Mitigated by normalizing all paths to forward slashes during validation.

### 5. Open Questions
- Should unlinked media (captured but not yet linked to a word/variant) be included in the backup?
- Should the import UI allow the user to choose between "merge" and "replace all" strategies?
- What is the maximum backup size to support in v1? (50MB? 100MB? No limit with warning?)
