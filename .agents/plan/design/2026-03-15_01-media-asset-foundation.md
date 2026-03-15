# Design: Media Asset Foundation

**Date:** 2026-03-15
**Status:** Draft
**Author:** Copilot
**Related ADR:** N/A

---

## Problem Statement

The Palavrinhas app tracks a baby's first words and pronunciation variants but currently stores only text data. Users need the ability to attach audio recordings, photos, and videos to words and variants — capturing how the child actually pronounces words and the context around them. This design covers the **foundation layer only**: database schema, file-system management, service layer, TanStack Query hooks, and types. The actual capture/playback UI will be implemented in a future iteration.

## Goals

- Add a persistent `assets` table to SQLite for media metadata storage
- Create a file-system management layer for media files in the app's documents directory
- Build service + hooks layers following existing TanStack Query patterns
- Ensure cascade deletion (word/variant delete → media file + DB cleanup)
- Extend "Clear all data" to purge all media files
- Install and mock `expo-av` and `expo-image-picker` for future use
- Achieve 99% line / 95% branch coverage on all new code

## Non-Goals

- Actual UI for recording audio, taking photos, or recording video (future feature)
- Media playback components (future feature)
- Media export (ZIP archive, etc.) — deferred to UI feature phase
- Cloud backup / sync of media files
- Thumbnail generation for photos (can be added in UI phase)
- Media compression or transcoding

## Design

### Overview

A single `assets` table stores metadata for all media attachments. A `parent_type` discriminator column (`'word'` | `'variant'`) with `parent_id` links each asset to its owner. Physical files live in the app's documents directory under a structured path. An `assetStorage` utility handles all file-system operations. An `assetService` orchestrates atomic save/delete (DB + file). TanStack Query hooks expose the data to the UI layer.

### Component / Module Breakdown

| Component | Responsibility | File(s) |
|-----------|---------------|---------|
| Asset Types | Type definitions, constants, validation | `src/types/asset.ts` |
| Asset DB Layer | SQLite CRUD, schema, cascade queries | `src/database/database.ts` |
| Asset Storage | File-system operations (save, delete, path resolution) | `src/utils/assetStorage.ts` |
| Asset Service | Orchestration: atomic DB + file operations | `src/services/assetService.ts` |
| Asset Hooks | TanStack Query hooks for queries/mutations | `src/hooks/useAssets.ts` |
| Query Keys | Extended with asset keys + mutation invalidation | `src/hooks/queryKeys.ts` |
| Jest Mocks | Mocks for expo-av and expo-image-picker | `jest.setup.js` |

### Database Schema

```sql
CREATE TABLE IF NOT EXISTS assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_type TEXT NOT NULL CHECK(parent_type IN ('word', 'variant')),
  parent_id INTEGER NOT NULL,
  asset_type TEXT NOT NULL CHECK(asset_type IN ('audio', 'photo', 'video')),
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  width INTEGER,
  height INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_assets_parent
  ON assets(parent_type, parent_id);
CREATE INDEX IF NOT EXISTS idx_assets_type
  ON assets(parent_type, parent_id, asset_type);
```

**New DB functions:**
- `getAssetsByParent(parentType, parentId)` → `Asset[]`
- `getAssetsByParentAndType(parentType, parentId, assetType)` → `Asset[]`
- `addAsset(asset: NewAsset)` → `number` (insertId)
- `deleteAsset(id: number)` → `void`
- `deleteAssetsByParent(parentType, parentId)` → `void`

**Modified DB functions:**
- `deleteWord(id)` — add cascade: delete assets where `parent_type='word' AND parent_id=id`, plus delete assets for all variants of this word
- `deleteVariant(id)` — add cascade: delete assets where `parent_type='variant' AND parent_id=id`
- `clearAllData()` — add `DELETE FROM assets` before existing deletes
- `getWords(search?)` — add `asset_count` subquery to SELECT
- `getAllVariants()` — add `asset_count` subquery to SELECT

### Type Definitions (`src/types/asset.ts`)

```typescript
export type ParentType = 'word' | 'variant';
export type AssetType = 'audio' | 'photo' | 'video';

export interface Asset {
  id: number;
  parent_type: ParentType;
  parent_id: number;
  asset_type: AssetType;
  filename: string;
  mime_type: string;
  file_size: number;
  duration_ms: number | null;
  width: number | null;
  height: number | null;
  created_at: string;
}

export interface NewAsset {
  parent_type: ParentType;
  parent_id: number;
  asset_type: AssetType;
  filename: string;
  mime_type: string;
  file_size: number;
  duration_ms?: number | null;
  width?: number | null;
  height?: number | null;
}

export const ACCEPTED_MIME_TYPES: Record<AssetType, readonly string[]> = {
  audio: ['audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/aac'],
  photo: ['image/jpeg', 'image/png', 'image/webp'],
  video: ['video/mp4', 'video/quicktime'],
} as const;

export const ASSET_EXTENSIONS: Record<string, string> = {
  'audio/mp4': '.m4a',
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
  'audio/x-m4a': '.m4a',
  'audio/aac': '.aac',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
} as const;

export const MAX_FILE_SIZE: Record<AssetType, number> = {
  audio: 50 * 1024 * 1024,   // 50 MB
  photo: 20 * 1024 * 1024,   // 20 MB
  video: 200 * 1024 * 1024,  // 200 MB
} as const;

export const MEDIA_ROOT_DIR = 'media';
```

### File Storage Structure

```
{Paths.document}/media/
  words/{wordId}/
    audio/asset_{id}.m4a
    photos/asset_{id}.jpg
    videos/asset_{id}.mp4
  variants/{variantId}/
    audio/asset_{id}.m4a
    photos/asset_{id}.jpg
    videos/asset_{id}.mp4
```

**Key design decisions:**
- Use numeric IDs for directory names (not word text) — safe for all Unicode
- Use `asset_{dbId}` for filenames — unique, no gaps issue on deletion
- `photos/` and `videos/` use plural form to match asset type naming
- Audio uses `audio/` (already plural)

### Asset Storage Utility (`src/utils/assetStorage.ts`)

```typescript
// Core functions
getMediaRootDir(): string
getAssetDir(parentType, parentId, assetType): string
getAssetUri(parentType, parentId, assetType, filename): string
buildAssetFilename(assetId, mimeType): string

// File operations
ensureDir(dirPath): Promise<void>
saveFile(sourceUri, destDir, filename): Promise<string>  // returns saved URI
deleteFile(uri): Promise<void>
deleteDir(dirPath): Promise<void>
fileExists(uri): Promise<boolean>

// High-level operations
saveAssetFile(sourceUri, parentType, parentId, assetType, assetId, mimeType): Promise<string>
deleteAssetFile(parentType, parentId, assetType, filename): Promise<void>
deleteAllAssetsForParent(parentType, parentId): Promise<void>
deleteAllMedia(): Promise<void>

// Validation
validateMimeType(assetType, mimeType): boolean
validateFileSize(assetType, fileSize): boolean
```

### Asset Service (`src/services/assetService.ts`)

Orchestrates atomic operations (DB + file system):

```typescript
// Atomic save: write file → insert DB record → return Asset
// On DB failure: delete the file (rollback)
saveAsset(sourceUri, parentType, parentId, assetType, metadata): Promise<Asset>

// Atomic remove: delete DB record → delete file (best-effort)
removeAsset(asset: Asset): Promise<void>

// Bulk remove: delete DB records → delete files (best-effort)
removeAllAssetsForParent(parentType, parentId): Promise<void>

// Full cleanup
removeAllMedia(): Promise<void>

// Queries (pass-through to DB)
getAssetsByParent(parentType, parentId): Promise<Asset[]>
getAssetsByParentAndType(parentType, parentId, assetType): Promise<Asset[]>
```

**Atomicity strategy:**
- **Save:** Write file first → if success, insert DB. If DB insert fails, delete the file.
- **Delete:** Delete DB record first → then delete file (best-effort). Orphan files are acceptable (can be cleaned up).
- **Cascade delete (word):** In a transaction: get variant IDs → delete all variant assets → delete word assets → delete variants → delete word. Then bulk-delete files.

### TanStack Query Hooks (`src/hooks/useAssets.ts`)

```typescript
// Query keys (added to queryKeys.ts)
QUERY_KEYS.assets = (parentType, parentId) => ['assets', parentType, parentId]
QUERY_KEYS.assetsByType = (parentType, parentId, assetType) =>
  ['assets', parentType, parentId, assetType]
ASSET_MUTATION_KEYS = [['assets'], ['words'], ['variants'], ['dashboard']]

// Hooks
useAssetsByParent(parentType, parentId, enabled?)  // query
useAssetsByType(parentType, parentId, assetType, enabled?)  // query
useSaveAsset()     // mutation → invalidates ASSET_MUTATION_KEYS
useRemoveAsset()   // mutation → invalidates ASSET_MUTATION_KEYS
```

### Data Flow

```
[Future UI] → useSaveAsset() mutation
  → assetService.saveAsset()
    → assetStorage.saveAssetFile() (copies file to documents dir)
    → database.addAsset() (inserts metadata row)
  → TanStack Query invalidation (assets, words, variants, dashboard)
  → UI re-renders with updated asset_count

[Word deletion] → useDeleteWord() mutation
  → database.deleteWord() (transaction: delete assets → delete variants → delete word)
  → assetStorage.deleteAllAssetsForParent('word', wordId) (cleanup files)
  → TanStack Query invalidation
```

### Extended Interfaces

Add to `Word` interface:
```typescript
asset_count?: number;  // number of assets directly attached to this word
```

Add to `Variant` interface:
```typescript
asset_count?: number;  // number of assets directly attached to this variant
```

### Error Handling

| Error Scenario | Handling |
|---|---|
| File write fails (disk full) | Throw error, no DB record created |
| DB insert fails after file write | Delete the orphan file, throw error |
| File delete fails after DB delete | Log warning, continue (orphan file is acceptable) |
| Invalid MIME type | Throw validation error before any write |
| File exceeds size limit | Throw validation error before any write |
| Parent (word/variant) doesn't exist | DB foreign key won't catch this (no FK on assets table — intentional for flexibility), but service layer can validate |
| Concurrent deletes | DB transaction protects record integrity; file operations are best-effort |

### Jest Mock Setup

Add to `jest.setup.js`:

```javascript
// expo-av
jest.mock('expo-av', () => ({
  Audio: {
    Recording: jest.fn(),
    Sound: jest.fn(),
    setAudioModeAsync: jest.fn(),
    requestPermissionsAsync: jest.fn(() => ({ granted: true })),
  },
  Video: jest.fn(),
}));

// expo-image-picker
jest.mock('expo-image-picker', () => ({
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(() => ({ granted: true })),
  requestMediaLibraryPermissionsAsync: jest.fn(() => ({ granted: true })),
  MediaTypeOptions: { All: 'All', Images: 'Images', Videos: 'Videos' },
}));
```

## Alternatives Considered

1. **Separate `word_assets` / `variant_assets` tables** — Rejected: doubles the hook/service/query code for no real benefit. A discriminator column is simpler and equally performant at this scale.

2. **Storing media as base64 in SQLite** — Rejected: massively increases DB size, terrible for performance with video/audio files.

3. **Using cache directory instead of documents** — Rejected: cache can be purged by the OS at any time. Documents directory is persistent and appropriate for user-generated content.

4. **Auto-increment filenames (audio_1, audio_2)** — Rejected: creates gaps on deletion, requires querying existing files to determine next number. Using `asset_{dbId}` is simpler and guaranteed unique.

## Open Questions

- [x] Include video? → Yes
- [x] Variants support all media types? → Yes (symmetric)
- [x] Single vs. separate tables? → Single with discriminator
- [x] Clear all data includes media? → Yes
- [x] Export strategy? → Deferred to UI phase

## Acceptance Criteria

- [ ] `assets` table created in `initDatabase()` with proper constraints and indexes
- [ ] `Asset`, `NewAsset`, `ParentType`, `AssetType` types exported from `src/types/asset.ts`
- [ ] MIME type validation and file size constants defined
- [ ] `assetStorage.ts` handles save, delete, directory management, and validation
- [ ] `assetService.ts` provides atomic save/remove with proper error handling
- [ ] `useAssets.ts` hooks follow existing TanStack Query patterns
- [ ] `queryKeys.ts` extended with asset keys and mutation invalidation
- [ ] Word deletion cascades to delete word assets + variant assets (DB + files)
- [ ] Variant deletion cascades to delete variant assets (DB + files)
- [ ] "Clear all data" deletes all assets (DB + files)
- [ ] `getWords()` and `getAllVariants()` include `asset_count` in results
- [ ] `expo-av` and `expo-image-picker` installed and mocked in `jest.setup.js`
- [ ] 99% line coverage, 95% branch/function/statement coverage on new code
- [ ] `npm run ci` passes
