export type ParentType = 'word' | 'variant' | 'profile';
export type AssetType = 'audio' | 'photo' | 'video';

export interface Asset {
  id: number;
  parent_type: ParentType;
  parent_id: number;
  asset_type: AssetType;
  filename: string;
  name: string | null;
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
  name?: string | null;
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
  audio: 50 * 1024 * 1024,
  photo: 20 * 1024 * 1024,
  video: 200 * 1024 * 1024,
} as const;

export const MEDIA_ROOT_DIR = 'media';

export function validateMimeType(assetType: AssetType, mimeType: string): boolean {
  return ACCEPTED_MIME_TYPES[assetType].includes(mimeType);
}

export function validateFileSize(assetType: AssetType, fileSize: number): boolean {
  return fileSize > 0 && fileSize <= MAX_FILE_SIZE[assetType];
}

export function getExtensionForMime(mimeType: string): string {
  const ext = ASSET_EXTENSIONS[mimeType];
  if (!ext) {
    throw new Error(`Unsupported MIME type: ${mimeType}`);
  }
  return ext;
}
