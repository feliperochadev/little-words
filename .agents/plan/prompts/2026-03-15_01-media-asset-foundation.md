# Prompt — 2026-03-15_01-media-asset-foundation

## Original Prompt

we'll implement audio/photo/video support on the app, in new features we will have the real implementation, for now let's prepare the foundation of the app to receive those assets, use: expo-file-system → persistent storage expo-av → audio recording/playback expo-image-picker → camera/gallery photos We need to stored internally but exportable We'll store in this structure: /words/{wordId}/ audio/ audio_1.m4a audio_2.m4a photos/ photo_1.jpg /variants/{variantId} /audio/audio_1.m4a ... The metadata of each asset needs to be store in the db. Let the code follow the standarts, be secure and performatic.

## Refined Prompt

### 1. Prompt Analysis

- **Intent:** Build the foundational infrastructure (database schema, file-system management, service layer, TanStack Query hooks, TypeScript types) to support audio/photo/video media assets attached to words and variants — without implementing the actual capture/playback UI. This is a "preparation layer" for future features.
- **Weaknesses or ambiguities:**
  - "video support" is mentioned alongside `expo-av` (audio) and `expo-image-picker` (photos), but video capture also comes through `expo-image-picker`. It's unclear whether video is in scope for the foundation or deferred.
  - The example file structure shows `/variants/{variantId}/audio/` but omits `/variants/{variantId}/photos/` — unclear whether variants support photos.
  - "stored internally but exportable" — the export mechanism is not defined (ZIP archive? media URIs in CSV? separate export flow?).
  - No maximum asset counts or file-size limits specified.
  - Auto-increment filenames (`audio_1`, `audio_2`) create gaps on deletion — numbering strategy needs clarification.
  - No mention of how word/variant deletion cascades to media file cleanup.
- **Missing constraints or context:**
  - Migration strategy for existing DB schema (no schema versioning exists — uses conditional checks).
  - Whether "Clear all data" should also purge media files.
  - Whether media asset counts should appear in existing Word/Variant interfaces (e.g., `audio_count`, `photo_count`).
  - Thumbnail generation for photos (for list views).
  - Disk-space management / storage quota awareness.

### 2. Edge Cases

- **Cascade deletion:** Deleting a word must remove all associated asset files on disk (and their DB metadata). Same for variants.
- **Orphaned files:** DB record exists but file is missing on disk (corrupted/deleted externally), or file exists but no DB record.
- **Disk full:** File write fails mid-operation — must not leave partial DB records.
- **Directory path safety:** Word names may contain Unicode/special characters — use numeric IDs for directory paths, not names.
- **App reinstall:** Documents directory may persist across installs on some platforms, but DB is recreated — need an integrity reconciliation strategy.
- **Concurrent operations:** Multiple quick saves should not corrupt the file tree or create duplicate entries.
- **Large files:** Video files can be very large — need size validation before storage.

### 3. Suggested Improvements

- Use the database row ID as the file identifier (e.g., `asset_{id}.m4a`) instead of auto-increment counting — this avoids gap issues on deletion and provides a unique, stable name.
- Define explicit metadata fields: `id`, `parent_type` (word/variant), `parent_id`, `asset_type` (audio/photo/video), `filename`, `mime_type`, `file_size`, `duration_ms` (audio/video), `width`/`height` (photo/video), `uri`, `created_at`.
- Use a **single `assets` table** with a `parent_type` discriminator column instead of separate `word_assets`/`variant_assets` tables — simpler queries, single hook layer.
- Add `asset_count` to Word/Variant query joins for efficient UI display.
- Include a `status` field (`pending`/`ready`/`error`) for future sync features.
- Plan the export strategy: ZIP archive containing CSV + media files, preserving the directory structure.
- Add file integrity validation (store file size in DB, verify on read).
- Extend the "Clear all data" flow to also delete the media directory.
- Add mocks for `expo-av` and `expo-image-picker` in `jest.setup.js`.

### 4. Clarifying Questions

1. Should **video** recording/selection be included in the foundation scope, or just audio + photos?
2. Should **variants** support both audio AND photos (the example only showed audio for variants)?
3. For "exportable" — should media files be bundled in a ZIP archive, referenced as URIs in CSV, or handled through a separate media export feature?
4. Should "Clear all data" also delete all media files from the device?
5. Should we use a **single `assets` table** (with `parent_type: 'word' | 'variant'`) or **two separate tables** (`word_assets`, `variant_assets`)?

### 5. Refined Prompt

**Implement the foundational media asset infrastructure** for the Palavrinhas app to prepare for future audio, photo, and video attachment features on words and variants.

**Scope:** Foundation only — database schema, file-system management layer, service layer, TanStack Query hooks, TypeScript types, and comprehensive tests. No UI for capture/playback in this iteration.

**Dependencies to install:**
- `expo-av` — audio recording/playback (future use; install and mock now)
- `expo-image-picker` — camera/gallery photo and video selection (future use; install and mock now)
- `expo-file-system` — already installed; use for persistent file storage in the app's documents directory

**Database changes:**
- Add an `assets` table with columns: `id` (PK), `parent_type` ('word' | 'variant'), `parent_id` (FK), `asset_type` ('audio' | 'photo' | 'video'), `filename`, `mime_type`, `file_size` (bytes), `duration_ms` (nullable, for audio/video), `width` (nullable, for photo/video), `height` (nullable, for photo/video), `created_at`.
- Add asset counts to Word/Variant query joins.
- Extend word/variant deletion to cascade-delete associated assets (both DB records and files on disk).

**File storage structure (documents directory):**
```
{documentsDir}/media/
  words/{wordId}/
    audio/asset_{id}.m4a
    photos/asset_{id}.jpg
    videos/asset_{id}.mp4
  variants/{variantId}/
    audio/asset_{id}.m4a
    photos/asset_{id}.jpg
    videos/asset_{id}.mp4
```

**New modules:**
- `src/utils/assetStorage.ts` — File-system operations (save, delete, get URI, list, cleanup, directory management).
- `src/database/database.ts` — Schema extension with `assets` table + CRUD functions.
- `src/services/assetService.ts` — Service layer wrapping DB + file operations.
- `src/hooks/useAssets.ts` — TanStack Query hooks for asset queries/mutations.
- `src/hooks/queryKeys.ts` — Extended with asset query keys and mutation invalidation keys.

**Quality requirements:**
- Follow existing architectural patterns (service layer → hooks → TanStack Query).
- 99% line coverage, 95% branch/function/statement coverage on all new code.
- Parameterized SQL queries (no interpolation).
- File operations must be atomic — if DB insert fails, don't leave orphan files; if file write fails, don't leave orphan DB records.
- Add mocks for `expo-av` and `expo-image-picker` in `jest.setup.js`.
- Pass `npm run ci` before completion.
