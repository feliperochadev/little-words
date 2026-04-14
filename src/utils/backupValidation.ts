import { strFromU8 } from 'fflate';
import type { BackupManifest, BackupData } from '../types/backup';

const SUPPORTED_VERSION = '1.0';

const KEEPSAKE_SAFE_PATH = 'keepsake/keepsake.jpg';

/** Path traversal guard — returns true if the path is safe */
function isPathSafe(path: string): boolean {
  if (!path) return false;
  if (path.startsWith('/') || path.startsWith('\\')) return false;
  if (path.includes('..')) return false;
  if (path === KEEPSAKE_SAFE_PATH) return true;
  // Allowed pattern: {words|variants|profile|unlinked}/{number}/{audio|photos|videos}/asset_{number}.{ext}
  const SAFE_PATH = /^(words|variants|profile|unlinked)\/\d+\/(audio|photos|videos)\/asset_\d+\.\w+$/;
  return SAFE_PATH.test(path);
}

export function validateManifestBytes(bytes: Uint8Array): BackupManifest {
  let manifest: unknown;
  try {
    manifest = JSON.parse(strFromU8(bytes));
  } catch {
    throw new Error('manifest.json is not valid JSON');
  }
  if (typeof manifest !== 'object' || manifest === null) throw new Error('manifest.json is malformed');
  const m = manifest as Record<string, unknown>;
  if (m['version'] !== SUPPORTED_VERSION) {
    const versionStr = typeof m['version'] === 'string' ? m['version'] : 'unknown';
    throw new Error(`Unsupported backup version: ${versionStr}`);
  }
  return m as unknown as BackupManifest;
}

export function validateDataBytes(bytes: Uint8Array): BackupData {
  let data: unknown;
  try {
    data = JSON.parse(strFromU8(bytes));
  } catch {
    throw new Error('data.json is not valid JSON');
  }
  if (typeof data !== 'object' || data === null) throw new Error('data.json is malformed');
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d['words'])) throw new Error('data.json: missing "words" array');
  if (!Array.isArray(d['variants'])) throw new Error('data.json: missing "variants" array');
  if (!Array.isArray(d['categories'])) throw new Error('data.json: missing "categories" array');
  if (!Array.isArray(d['assets'])) throw new Error('data.json: missing "assets" array');
  return data as BackupData;
}

export function validateMediaPaths(
  assets: { media_path: string }[],
  fileMap: Record<string, Uint8Array>,
): void {
  for (const asset of assets) {
    if (!isPathSafe(asset.media_path)) {
      throw new Error(`Unsafe file path detected: "${asset.media_path}"`);
    }
    const zipKey = `media/${asset.media_path}`;
    if (!(zipKey in fileMap)) {
      // Missing media files are handled as warnings at import time, not validation errors
    }
  }
}
