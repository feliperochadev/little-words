import { query, run } from '../db/client';
import type { Asset, NewAsset, ParentType, AssetType } from '../types/domain';

export const getAssetById = (id: number): Promise<Asset | null> =>
  query<Asset>('SELECT * FROM assets WHERE id = ?', [id])
    .then(rows => rows[0] ?? null);

export const getAssetsByParent = (
  parentType: ParentType,
  parentId: number,
): Promise<Asset[]> =>
  query<Asset>(
    'SELECT * FROM assets WHERE parent_type = ? AND parent_id = ? ORDER BY created_at DESC',
    [parentType, parentId]
  );

export const getAssetsByParentAndType = (
  parentType: ParentType,
  parentId: number,
  assetType: AssetType,
): Promise<Asset[]> =>
  query<Asset>(
    'SELECT * FROM assets WHERE parent_type = ? AND parent_id = ? AND asset_type = ? ORDER BY created_at DESC',
    [parentType, parentId, assetType]
  );

export const addAsset = async (asset: NewAsset): Promise<number> => {
  const result = await run(
    `INSERT INTO assets (parent_type, parent_id, asset_type, filename, name, mime_type, file_size, duration_ms, width, height)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      asset.parent_type,
      asset.parent_id,
      asset.asset_type,
      asset.filename,
      asset.name ?? null,
      asset.mime_type,
      asset.file_size,
      asset.duration_ms ?? null,
      asset.width ?? null,
      asset.height ?? null,
    ]
  );
  return result.insertId ?? 0;
};

export const updateAssetMeta = (id: number, filename: string, name: string) =>
  run('UPDATE assets SET filename = ?, name = ? WHERE id = ?', [filename, name, id]);

export const deleteAsset = (id: number) =>
  run('DELETE FROM assets WHERE id = ?', [id]);

export const deleteAssetsByParent = (
  parentType: ParentType,
  parentId: number,
) =>
  run('DELETE FROM assets WHERE parent_type = ? AND parent_id = ?', [parentType, parentId]);

export const updateAssetFilename = (id: number, filename: string) =>
  run('UPDATE assets SET filename = ? WHERE id = ?', [filename, id]);

export const getProfilePhoto = (): Promise<Asset | null> =>
  query<Asset>(
    "SELECT * FROM assets WHERE parent_type = 'profile' AND parent_id = 1 AND asset_type = 'photo' LIMIT 1",
    []
  ).then(rows => rows[0] ?? null);

export const deleteProfilePhotoAsset = (): Promise<void> =>
  run(
    "DELETE FROM assets WHERE parent_type = 'profile' AND parent_id = 1 AND asset_type = 'photo'",
    []
  ).then(() => undefined);
