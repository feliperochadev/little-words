import { unzipSync } from 'fflate';
import { File as FSFile } from 'expo-file-system';
import { withTransaction } from '../db/client';
import { findCategoryByName, importCategory } from '../repositories/categoryRepository';
import { findWordByName, importWord } from '../repositories/wordRepository';
import { findVariantByName, importVariant } from '../repositories/variantRepository';
import { importAsset, updateAssetFilename, deleteAsset } from '../repositories/assetRepository';
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
    const existing = await findCategoryByName(cat.name);
    if (existing) {
      idMap.categories.set(cat.id, existing.id);
    } else {
      const newId = await importCategory(cat.name, cat.color, cat.emoji, cat.created_at);
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
    const existing = await findWordByName(word.word);
    if (existing) {
      idMap.words.set(word.id, existing.id);
      skipped++;
    } else {
      const newCategoryId = word.category_id === null
        ? null
        : (idMap.categories.get(word.category_id) ?? null);
      const newId = await importWord(word.word, newCategoryId, word.date_added, word.notes, word.created_at);
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

    const existing = await findVariantByName(newWordId, variant.variant);
    if (existing) {
      idMap.variants.set(variant.id, existing.id);
    } else {
      const newId = await importVariant(newWordId, variant.variant, variant.date_added, variant.notes, variant.created_at);
      idMap.variants.set(variant.id, newId);
      added++;
    }
  }
  return added;
}

interface AssetCounters {
  audiosRestored: number;
  photosRestored: number;
  videosRestored: number;
}

function resolveParentId(
  asset: BackupData['assets'][number],
  idMap: IdMap,
): number | undefined {
  if (asset.parent_type === 'word') return idMap.words.get(asset.parent_id);
  if (asset.parent_type === 'variant') return idMap.variants.get(asset.parent_id);
  if (asset.parent_type === 'profile') return 1;
  // unlinked — use parent_id as-is (design decision #1)
  return asset.parent_id;
}

async function insertAndWriteAsset(
  asset: BackupData['assets'][number],
  newParentId: number,
  fileBytes: Uint8Array,
  counters: AssetCounters,
  warnings: string[],
): Promise<void> {
  const resolvedParentType = (asset.parent_type === 'unlinked' ? 'word' : asset.parent_type) as ParentType;
  let newAssetId: number;
  try {
    newAssetId = await importAsset({
      parentType: resolvedParentType,
      parentId: newParentId,
      assetType: asset.asset_type,
      filename: asset.filename,
      name: asset.name,
      mimeType: asset.mime_type,
      fileSize: asset.file_size,
      durationMs: asset.duration_ms,
      width: asset.width,
      height: asset.height,
      createdAt: asset.created_at,
    });
  } catch (e: unknown) {
    warnings.push(`Asset ${asset.id}: DB insert failed — ${e instanceof Error ? e.message : String(e)}`);
    return;
  }

  const ext = /\.\w+$/.exec(asset.filename)?.[0] ?? '';
  const newFilename = `asset_${newAssetId}${ext}`;

  try {
    ensureAssetDirTree(resolvedParentType, newParentId, asset.asset_type);
    const destUri = getAssetFileUri(resolvedParentType, newParentId, asset.asset_type, newFilename);
    new FSFile(destUri).write(fileBytes);
    await updateAssetFilename(newAssetId, newFilename);
    if (asset.asset_type === 'audio') counters.audiosRestored++;
    else if (asset.asset_type === 'photo') counters.photosRestored++;
    else counters.videosRestored++;
  } catch (e: unknown) {
    try { await deleteAsset(newAssetId); } catch { /* best effort */ }
    warnings.push(`Asset ${asset.id}: file write failed — ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function importAssets(
  data: BackupData,
  idMap: IdMap,
  fileMap: Record<string, Uint8Array>,
): Promise<{ audiosRestored: number; photosRestored: number; videosRestored: number; warnings: string[] }> {
  const counters: AssetCounters = { audiosRestored: 0, photosRestored: 0, videosRestored: 0 };
  const warnings: string[] = [];

  for (const asset of data.assets) {
    const newParentId = resolveParentId(asset, idMap);
    if (newParentId === undefined) {
      warnings.push(`Asset ${asset.id}: parent ${asset.parent_type}/${asset.parent_id} not found`);
      continue;
    }
    const fileBytes = fileMap[`media/${asset.media_path}`];
    if (!fileBytes) {
      warnings.push(`Asset ${asset.id}: file not found in backup (${asset.media_path})`);
      continue;
    }
    await insertAndWriteAsset(asset, newParentId, fileBytes, counters, warnings);
  }

  return { ...counters, warnings };
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
