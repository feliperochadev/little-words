import { zipSync, strToU8 } from 'fflate';
import { File as FSFile, Directory, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Constants from 'expo-constants';
import {
  getAllCategoriesForBackup,
  getAllWordsForBackup,
  getAllVariantsForBackup,
  getAllAssetsForBackup,
} from '../repositories/backupRepository';
import { getAssetFileUri } from './assetStorage';
import { useSettingsStore } from '../stores/settingsStore';
import type { BackupManifest, BackupData, BackupAsset } from '../types/backup';
import type { ParentType, AssetType } from '../types/asset';

const ASSET_TYPE_DIRS: Record<AssetType, string> = {
  audio: 'audio',
  photo: 'photos',
  video: 'videos',
};

const PARENT_DIRS: Record<string, string> = {
  word: 'words',
  variant: 'variants',
  profile: 'profile',
  unlinked: 'unlinked',
};

function buildMediaPath(
  parentType: string,
  parentId: number,
  assetType: AssetType,
  filename: string,
): string {
  const parentDir = PARENT_DIRS[parentType] ?? parentType;
  const assetDir = ASSET_TYPE_DIRS[assetType] ?? assetType;
  return `${parentDir}/${parentId}/${assetDir}/${filename}`;
}

function buildBackupFilename(t: (key: string) => string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dd = pad(now.getDate());
  const mm = pad(now.getMonth() + 1);
  const yyyy = now.getFullYear();
  const hh = pad(now.getHours());
  const min = pad(now.getMinutes());
  // Sanitize app name for use in filename (replace spaces with hyphens)
  const appName = t('brandHeader.appName').replaceAll(/\s+/g, '-');
  return `${appName}-export-${dd}-${mm}-${yyyy}_${hh}-${min}.zip`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

export async function buildBackupZip(
  t: (key: string) => string,
  locale: string,
): Promise<Uint8Array> {
  const [categories, words, variants, rawAssets] = await Promise.all([
    getAllCategoriesForBackup(),
    getAllWordsForBackup(),
    getAllVariantsForBackup(),
    getAllAssetsForBackup(),
  ]);

  const { name, sex, birth } = useSettingsStore.getState();
  const appVersion = Constants.expoConfig?.version ?? '0.0.0';

  // Build asset list with computed media paths
  const assetsWithPaths: BackupAsset[] = rawAssets.map(asset => ({
    ...asset,
    sex: undefined,
    media_path: buildMediaPath(asset.parent_type, asset.parent_id, asset.asset_type, asset.filename),
  }));

  const manifest: BackupManifest = {
    version: '1.0',
    exported_at: new Date().toISOString(),
    app_version: appVersion,
    word_count: words.length,
    variant_count: variants.length,
    category_count: categories.length,
    asset_count: assetsWithPaths.length,
    locale,
  };

  const data: BackupData = {
    version: '1.0',
    settings: {
      name: name ?? '',
      sex,
      birth: birth ?? '',
      locale,
    },
    categories,
    words,
    variants,
    assets: assetsWithPaths,
  };

  // Build fflate file map
  const fileMap: Record<string, Uint8Array> = {
    'manifest.json': strToU8(JSON.stringify(manifest, null, 2)),
    'data.json': strToU8(JSON.stringify(data, null, 2)),
  };

  // Read each media file into the ZIP map
  for (const asset of assetsWithPaths) {
    const fileUri = getAssetFileUri(
      asset.parent_type as ParentType,
      asset.parent_id,
      asset.asset_type,
      asset.filename,
    );
    try {
      const file = new FSFile(fileUri);
      if (file.exists) {
        const bytes = await file.bytes();
        fileMap[`media/${asset.media_path}`] = bytes;
      }
    } catch {
      // File missing or unreadable — skip; import will log a warning
    }
  }

  return zipSync(fileMap, { level: 1 });
}

async function writeTempBackup(t: (key: string) => string, locale: string): Promise<string> {
  const zipBytes = await buildBackupZip(t, locale);
  const filename = buildBackupFilename(t);
  const file = new FSFile(Paths.cache, filename);
  file.write(zipBytes);
  return file.uri;
}

export async function shareFullBackup(
  t: (key: string) => string,
  locale: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const fileUri = await writeTempBackup(t, locale);
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) return { success: false, error: 'Sharing not available on this device.' };
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/zip',
      dialogTitle: t('backup.shareDialogTitle'),
      UTI: 'public.zip-archive',
    });
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function saveFullBackupToDevice(
  t: (key: string) => string,
  locale: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const zipBytes = await buildBackupZip(t, locale);
    const filename = buildBackupFilename(t);

    let dir: Directory;
    try {
      dir = await Directory.pickDirectoryAsync();
    } catch {
      return { success: false, error: 'cancelled' };
    }

    const file = dir.createFile(filename, 'application/zip');
    file.write(zipBytes);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}
