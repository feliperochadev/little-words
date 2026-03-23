import { File as FSFile, Directory, Paths } from 'expo-file-system';
import { MEDIA_ROOT_DIR, getExtensionForMime } from '../types/asset';
import type { ParentType, AssetType } from '../types/asset';

const PARENT_DIRS: Record<ParentType, string> = {
  word: 'words',
  variant: 'variants',
  profile: 'profile',
  unlinked: 'unlinked',
};

const ASSET_TYPE_DIRS: Record<AssetType, string> = {
  audio: 'audio',
  photo: 'photos',
  video: 'videos',
};

export function getMediaRootUri(): string {
  return `${Paths.document.uri}${MEDIA_ROOT_DIR}/`;
}

export function getParentDirUri(parentType: ParentType, parentId: number): string {
  return `${getMediaRootUri()}${PARENT_DIRS[parentType]}/${parentId}/`;
}

export function getAssetDirUri(
  parentType: ParentType,
  parentId: number,
  assetType: AssetType,
): string {
  return `${getParentDirUri(parentType, parentId)}${ASSET_TYPE_DIRS[assetType]}/`;
}

export function buildAssetFilename(assetId: number, mimeType: string): string {
  return `asset_${assetId}${getExtensionForMime(mimeType)}`;
}

export function getAssetFileUri(
  parentType: ParentType,
  parentId: number,
  assetType: AssetType,
  filename: string,
): string {
  return `${getAssetDirUri(parentType, parentId, assetType)}${filename}`;
}

export function ensureDir(dirUri: string): void {
  const dir = new Directory(dirUri);
  if (!dir.exists) {
    dir.create();
  }
}

export function ensureAssetDirTree(
  parentType: ParentType,
  parentId: number,
  assetType: AssetType,
): void {
  ensureDir(getMediaRootUri());
  ensureDir(`${getMediaRootUri()}${PARENT_DIRS[parentType]}/`);
  ensureDir(getParentDirUri(parentType, parentId));
  ensureDir(getAssetDirUri(parentType, parentId, assetType));
}

export function saveAssetFile(
  sourceUri: string,
  parentType: ParentType,
  parentId: number,
  assetType: AssetType,
  assetId: number,
  mimeType: string,
): string {
  ensureAssetDirTree(parentType, parentId, assetType);

  const filename = buildAssetFilename(assetId, mimeType);
  const destUri = getAssetFileUri(parentType, parentId, assetType, filename);

  const source = new FSFile(sourceUri);
  const dest = new FSFile(destUri);
  source.copy(dest);

  return dest.uri;
}

export function deleteAssetFile(fileUri: string): void {
  try {
    const file = new FSFile(fileUri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Best-effort: file may already be deleted
  }
}

export function deleteAllAssetsForParent(
  parentType: ParentType,
  parentId: number,
): void {
  try {
    const dirUri = getParentDirUri(parentType, parentId);
    const dir = new Directory(dirUri);
    if (dir.exists) {
      dir.delete();
    }
  } catch {
    // Best-effort cleanup
  }
}

export function deleteAllMedia(): void {
  try {
    const dir = new Directory(getMediaRootUri());
    if (dir.exists) {
      dir.delete();
    }
  } catch {
    // Best-effort cleanup
  }
}

export function assetFileExists(fileUri: string): boolean {
  try {
    const file = new FSFile(fileUri);
    return file.exists;
  } catch {
    return false;
  }
}

/**
 * Moves an asset file from one parent directory to another.
 * The filename stays the same; only the directory changes.
 * Returns the new file URI.
 */
export function moveAssetFile(
  sourceParentType: ParentType,
  sourceParentId: number,
  destParentType: ParentType,
  destParentId: number,
  assetType: AssetType,
  filename: string,
): string {
  if (sourceParentType === destParentType && sourceParentId === destParentId) {
    return getAssetFileUri(sourceParentType, sourceParentId, assetType, filename);
  }
  const sourceUri = getAssetFileUri(sourceParentType, sourceParentId, assetType, filename);
  ensureAssetDirTree(destParentType, destParentId, assetType);
  const destUri = getAssetFileUri(destParentType, destParentId, assetType, filename);
  const source = new FSFile(sourceUri);
  const dest = new FSFile(destUri);
  source.copy(dest);
  deleteAssetFile(sourceUri);
  return destUri;
}
