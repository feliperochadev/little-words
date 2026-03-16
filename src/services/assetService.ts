import {
  getAssetById,
  addAsset,
  deleteAsset,
  deleteAssetsByParent,
  updateAssetFilename,
} from '../repositories/assetRepository';
import {
  saveAssetFile,
  deleteAssetFile,
  deleteAllAssetsForParent,
  deleteAllMedia,
  buildAssetFilename,
  getAssetFileUri,
} from '../utils/assetStorage';
import { validateMimeType, validateFileSize } from '../types/asset';
import type { Asset, ParentType, AssetType } from '../types/asset';

export type { Asset, NewAsset, ParentType, AssetType } from '../types/asset';

export { getAssetsByParent, getAssetsByParentAndType } from '../repositories/assetRepository';

export interface SaveAssetParams {
  sourceUri: string;
  parentType: ParentType;
  parentId: number;
  assetType: AssetType;
  mimeType: string;
  fileSize: number;
  durationMs?: number | null;
  width?: number | null;
  height?: number | null;
}

export async function saveAsset(params: SaveAssetParams): Promise<Asset> {
  const {
    sourceUri, parentType, parentId, assetType,
    mimeType, fileSize, durationMs, width, height,
  } = params;

  if (!validateMimeType(assetType, mimeType)) {
    throw new Error(`Invalid MIME type "${mimeType}" for asset type "${assetType}"`);
  }
  if (!validateFileSize(assetType, fileSize)) {
    throw new Error(`File size ${fileSize} exceeds limit for asset type "${assetType}"`);
  }

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

  // Update filename in DB before copying file
  await updateAssetFilename(assetId, filename);

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
