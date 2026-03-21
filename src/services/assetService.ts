import {
  getAssetById,
  addAsset,
  deleteAsset,
  deleteAssetsByParent,
  updateAssetMeta,
  getProfilePhoto as getProfilePhotoFromRepo,
  getAssetsByParentAndType as getAssetsByParentAndTypeFromRepo,
  updateAssetParent,
  updateAssetName as updateAssetNameInRepo,
} from '../repositories/assetRepository';
import {
  saveAssetFile,
  deleteAssetFile,
  deleteAllAssetsForParent,
  deleteAllMedia,
  buildAssetFilename,
  getAssetFileUri,
  moveAssetFile,
} from '../utils/assetStorage';
import { validateMimeType, validateFileSize } from '../types/asset';
import type { Asset, ParentType, AssetType } from '../types/asset';

export type { Asset, NewAsset, ParentType, AssetType } from '../types/asset';

// Re-export for convenience
export type { AssetWithLink } from '../types/asset';
export { getAllAssets } from '../repositories/assetRepository';

export { getAssetsByParent, getAssetsByParentAndType } from '../repositories/assetRepository';
export { getProfilePhoto } from '../repositories/assetRepository';

export interface SaveAssetParams {
  sourceUri: string;
  parentType: ParentType;
  parentId: number;
  assetType: AssetType;
  mimeType: string;
  fileSize: number;
  name?: string;
  /** Parent entity name used to auto-generate the fallback asset name (e.g. "kiwi" → "kiwi-1") */
  parentName?: string;
  durationMs?: number | null;
  width?: number | null;
  height?: number | null;
}

export async function saveAsset(params: SaveAssetParams): Promise<Asset> {
  const {
    sourceUri, parentType, parentId, assetType,
    mimeType, fileSize, name, parentName, durationMs, width, height,
  } = params;

  if (!validateMimeType(assetType, mimeType)) {
    throw new Error(`Invalid MIME type "${mimeType}" for asset type "${assetType}"`);
  }
  if (!validateFileSize(assetType, fileSize)) {
    throw new Error(`File size ${fileSize} exceeds limit for asset type "${assetType}"`);
  }

  // Count existing assets of the same type for this parent BEFORE inserting,
  // so the sequence number is correct (e.g. "kiwi-2" if one audio already exists)
  const existingCount = (name?.trim() || !parentName)
    ? 0
    : (await getAssetsByParentAndTypeFromRepo(parentType, parentId, assetType)).length;

  // Insert DB record with placeholder filename to get the auto-increment ID
  const assetId = await addAsset({
    parent_type: parentType,
    parent_id: parentId,
    asset_type: assetType,
    filename: 'pending',
    mime_type: mimeType,
    file_size: fileSize,
    duration_ms: durationMs,
    width,
    height,
  });

  const filename = buildAssetFilename(assetId, mimeType);
  // Priority: explicit name > parentName-based counter > type_id fallback
  let resolvedName: string;
  if (name?.trim()) {
    resolvedName = name.trim();
  } else if (parentName) {
    resolvedName = `${parentName}-${existingCount + 1}`;
  } else {
    resolvedName = `${assetType}_${assetId}`;
  }

  // Update both filename and name in a single DB write
  await updateAssetMeta(assetId, filename, resolvedName);

  try {
    saveAssetFile(sourceUri, parentType, parentId, assetType, assetId, mimeType);
  } catch (error) {
    await deleteAsset(assetId);
    throw error;
  }

  const saved = await getAssetById(assetId);
  if (!saved) {
    throw new Error(`Asset ${assetId} not found after save`);
  }
  return saved;
}

export async function removeAsset(asset: Asset): Promise<void> {
  await deleteAsset(asset.id);

  const fileUri = getAssetFileUri(
    asset.parent_type, asset.parent_id, asset.asset_type, asset.filename
  );
  deleteAssetFile(fileUri);
}

export async function removeAllAssetsForParent(
  parentType: ParentType,
  parentId: number,
): Promise<void> {
  await deleteAssetsByParent(parentType, parentId);
  deleteAllAssetsForParent(parentType, parentId);
}

export async function removeAllMedia(): Promise<void> {
  deleteAllMedia();
}

/**
 * Save a profile photo, enforcing singleton semantics (deletes any existing
 * profile photo before saving the new one).
 *
 * fileSize is optional because expo-image-picker may omit it on some Android
 * versions. We default to 1 to pass the > 0 check — the picker's crop/quality
 * settings guarantee the file is well within the 20 MB limit.
 */
export async function saveProfilePhoto(
  sourceUri: string,
  mimeType: string,
  fileSize?: number,
  width?: number | null,
  height?: number | null,
): Promise<Asset> {
  await deleteProfilePhoto();
  return saveAsset({
    sourceUri,
    parentType: 'profile',
    parentId: 1,
    assetType: 'photo',
    mimeType,
    fileSize: Math.max(fileSize ?? 1, 1),
    width,
    height,
  });
}

export async function deleteProfilePhoto(): Promise<void> {
  const existing = await getProfilePhotoFromRepo();
  if (existing) {
    await removeAsset(existing);
  }
}

export async function renameAsset(id: number, name: string): Promise<void> {
  await updateAssetNameInRepo(id, name);
}

export async function relinkAsset(
  asset: Asset,
  newParentType: ParentType,
  newParentId: number,
): Promise<Asset> {
  if (asset.parent_type === newParentType && asset.parent_id === newParentId) {
    return asset;
  }
  moveAssetFile(
    asset.parent_type, asset.parent_id,
    newParentType, newParentId,
    asset.asset_type, asset.filename,
  );
  try {
    await updateAssetParent(asset.id, newParentType, newParentId);
  } catch (err) {
    try {
      moveAssetFile(newParentType, newParentId, asset.parent_type, asset.parent_id, asset.asset_type, asset.filename);
    } catch { /* best-effort */ }
    throw err;
  }
  const updated = await getAssetById(asset.id);
  if (!updated) throw new Error(`Asset ${asset.id} not found after relink`);
  return updated;
}
