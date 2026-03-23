import { unzipSync } from 'fflate';
import { File as FSFile } from 'expo-file-system';
import { query, run, withTransaction } from '../db/client';
import { ensureAssetDirTree, getAssetFileUri } from './assetStorage';
import { validateManifestBytes, validateDataBytes, validateMediaPaths } from './backupValidation';
import type { BackupData, BackupImportResult } from '../types/backup';
import type { ParentType } from '../types/asset';

interface IdMap {
  categories: Map<number, number>;
  words: Map<number, number>;
  variants: Map<number, number>;
}

async function importCategories(
  data: BackupData,
  idMap: IdMap,
): Promise<number> {
  let added = 0;
  for (const cat of data.categories) {
    const existing = await query<{ id: number }>(
      'SELECT id FROM categories WHERE LOWER(name) = LOWER(?) LIMIT 1',
      [cat.name]
    );
    if (existing.length > 0) {
      idMap.categories.set(cat.id, existing[0].id);
    } else {
      const result = await run(
        'INSERT INTO categories (name, color, emoji, created_at) VALUES (?, ?, ?, ?)',
        [cat.name, cat.color, cat.emoji, cat.created_at]
      );
      const newId = result.insertId ?? 0;
      idMap.categories.set(cat.id, newId);
      added++;
    }
  }
  return added;
}

async function importWords(
  data: BackupData,
  idMap: IdMap,
): Promise<{ added: number; skipped: number }> {
  let added = 0;
  let skipped = 0;
  for (const word of data.words) {
    const existing = await query<{ id: number }>(
      'SELECT id FROM words WHERE LOWER(word) = LOWER(?) LIMIT 1',
      [word.word]
    );
    if (existing.length > 0) {
      idMap.words.set(word.id, existing[0].id);
      skipped++;
    } else {
      const newCategoryId = word.category_id !== null
        ? (idMap.categories.get(word.category_id) ?? null)
        : null;
      const result = await run(
        'INSERT INTO words (word, category_id, date_added, notes, created_at) VALUES (?, ?, ?, ?, ?)',
        [word.word, newCategoryId, word.date_added, word.notes, word.created_at]
      );
      const newId = result.insertId ?? 0;
      idMap.words.set(word.id, newId);
      added++;
    }
  }
  return { added, skipped };
}

async function importVariants(
  data: BackupData,
  idMap: IdMap,
): Promise<number> {
  let added = 0;
  for (const variant of data.variants) {
    const newWordId = idMap.words.get(variant.word_id);
    if (newWordId === undefined) continue; // orphaned variant, skip

    const existing = await query<{ id: number }>(
      'SELECT id FROM variants WHERE word_id = ? AND LOWER(variant) = LOWER(?) LIMIT 1',
      [newWordId, variant.variant]
    );
    if (existing.length > 0) {
      idMap.variants.set(variant.id, existing[0].id);
    } else {
      const result = await run(
        'INSERT INTO variants (word_id, variant, date_added, notes, created_at) VALUES (?, ?, ?, ?, ?)',
        [newWordId, variant.variant, variant.date_added, variant.notes, variant.created_at]
      );
      const newId = result.insertId ?? 0;
      idMap.variants.set(variant.id, newId);
      added++;
    }
  }
  return added;
}

async function importAssets(
  data: BackupData,
  idMap: IdMap,
  fileMap: Record<string, Uint8Array>,
): Promise<{ audiosRestored: number; photosRestored: number; videosRestored: number; warnings: string[] }> {
  let audiosRestored = 0;
  let photosRestored = 0;
  let videosRestored = 0;
  const warnings: string[] = [];

  for (const asset of data.assets) {
    // Resolve new parent ID
    let newParentId: number | undefined;
    if (asset.parent_type === 'word') {
      newParentId = idMap.words.get(asset.parent_id);
    } else if (asset.parent_type === 'variant') {
      newParentId = idMap.variants.get(asset.parent_id);
    } else if (asset.parent_type === 'profile') {
      newParentId = 1;
    } else {
      // unlinked — use parent_id as-is (these are stored under profile in design decision #1)
      newParentId = asset.parent_id;
    }

    if (newParentId === undefined) {
      warnings.push(`Asset ${asset.id}: parent ${asset.parent_type}/${asset.parent_id} not found`);
      continue;
    }

    const zipKey = `media/${asset.media_path}`;
    const fileBytes = fileMap[zipKey];
    if (!fileBytes) {
      warnings.push(`Asset ${asset.id}: file not found in backup (${asset.media_path})`);
      continue;
    }

    // Insert asset DB record with a placeholder filename
    let newAssetId: number;
    try {
      const result = await run(
        `INSERT INTO assets (parent_type, parent_id, asset_type, filename, name, mime_type, file_size, duration_ms, width, height, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          asset.parent_type === 'unlinked' ? 'word' : asset.parent_type,
          newParentId,
          asset.asset_type,
          asset.filename, // temporary; updated after we know the new ID
          asset.name,
          asset.mime_type,
          asset.file_size,
          asset.duration_ms,
          asset.width,
          asset.height,
          asset.created_at,
        ]
      );
      newAssetId = result.insertId ?? 0;
    } catch (e: unknown) {
      warnings.push(`Asset ${asset.id}: DB insert failed — ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }

    // Build new filename with new asset ID
    const ext = asset.filename.match(/\.\w+$/)?.[0] ?? '';
    const newFilename = `asset_${newAssetId}${ext}`;
    const resolvedParentType = (asset.parent_type === 'unlinked' ? 'word' : asset.parent_type) as ParentType;

    // Write file bytes to storage
    try {
      ensureAssetDirTree(resolvedParentType, newParentId, asset.asset_type);
      const destUri = getAssetFileUri(resolvedParentType, newParentId, asset.asset_type, newFilename);
      const destFile = new FSFile(destUri);
      destFile.write(fileBytes);

      // Update filename in DB
      await run('UPDATE assets SET filename = ? WHERE id = ?', [newFilename, newAssetId]);
      if (asset.asset_type === 'audio') audiosRestored++;
      else if (asset.asset_type === 'photo') photosRestored++;
      else videosRestored++;
    } catch (e: unknown) {
      // File write failed — remove the orphaned DB record
      try { await run('DELETE FROM assets WHERE id = ?', [newAssetId]); } catch { /* best effort */ }
      warnings.push(`Asset ${asset.id}: file write failed — ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { audiosRestored, photosRestored, videosRestored, warnings };
}

export interface FullBackupFileMap {
  manifest: Uint8Array;
  data: Uint8Array;
  fileMap: Record<string, Uint8Array>;
}

/** Reads and validates a ZIP backup, returning its parsed contents for preview. */
export function openBackupZip(zipBytes: Uint8Array): {
  fileMap: Record<string, Uint8Array>;
  data: BackupData;
  manifest: import('../types/backup').BackupManifest;
} {
  let fileMap: Record<string, Uint8Array>;
  try {
    fileMap = unzipSync(zipBytes) as Record<string, Uint8Array>;
  } catch {
    throw new Error('Not a valid ZIP file');
  }

  const manifestBytes = fileMap['manifest.json'];
  if (!manifestBytes) throw new Error('Not a valid Little Words backup (missing manifest.json)');

  const dataBytes = fileMap['data.json'];
  if (!dataBytes) throw new Error('Backup file is corrupted (missing data.json)');

  const manifest = validateManifestBytes(manifestBytes);
  const data = validateDataBytes(dataBytes);
  validateMediaPaths(data.assets, fileMap);

  return { fileMap, data, manifest };
}

/** Executes the full backup import: DB + media file writes. */
export async function importFullBackup(
  data: BackupData,
  fileMap: Record<string, Uint8Array>,
): Promise<BackupImportResult> {
  const idMap: IdMap = {
    categories: new Map(),
    words: new Map(),
    variants: new Map(),
  };

  let categoriesAdded = 0;
  let wordsAdded = 0;
  let wordsSkipped = 0;
  let variantsAdded = 0;

  // Atomic DB phase
  await withTransaction(async () => {
    categoriesAdded = await importCategories(data, idMap);
    const wordResult = await importWords(data, idMap);
    wordsAdded = wordResult.added;
    wordsSkipped = wordResult.skipped;
    variantsAdded = await importVariants(data, idMap);
  });

  // File I/O phase (outside transaction — individual failures are non-blocking)
  const { audiosRestored, photosRestored, videosRestored, warnings } = await importAssets(data, idMap, fileMap);

  return {
    categoriesAdded,
    wordsAdded,
    wordsSkipped,
    variantsAdded,
    audiosRestored,
    photosRestored,
    videosRestored,
    assetWarnings: warnings,
  };
}
