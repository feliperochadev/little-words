export interface BackupManifest {
  version: '1.0';
  exported_at: string;       // ISO 8601
  app_version: string;
  word_count: number;
  variant_count: number;
  category_count: number;
  asset_count: number;
  locale: string;
}

export interface BackupCategory {
  id: number;
  name: string;
  color: string;
  emoji: string;
  created_at: string;
}

export interface BackupWord {
  id: number;
  word: string;
  category_id: number | null;
  date_added: string;
  notes: string | null;
  created_at: string;
}

export interface BackupVariant {
  id: number;
  word_id: number;
  variant: string;
  date_added: string;
  notes: string | null;
  created_at: string;
}

export interface BackupAsset {
  id: number;
  parent_type: 'word' | 'variant' | 'profile' | 'unlinked';
  parent_id: number;
  asset_type: 'audio' | 'photo' | 'video';
  filename: string;
  name: string | null;
  mime_type: string;
  file_size: number;
  duration_ms: number | null;
  width: number | null;
  height: number | null;
  created_at: string;
  /** Relative path within the ZIP's media/ directory, e.g. "words/1/audio/asset_5.m4a" */
  media_path: string;
}

export interface BackupSettings {
  name: string;
  sex: 'girl' | 'boy' | null;
  birth: string;
  locale: string;
}

export interface BackupData {
  version: '1.0';
  settings: BackupSettings;
  categories: BackupCategory[];
  words: BackupWord[];
  variants: BackupVariant[];
  assets: BackupAsset[];
}

export interface BackupImportResult {
  categoriesAdded: number;
  wordsAdded: number;
  wordsSkipped: number;
  variantsAdded: number;
  audiosRestored: number;
  photosRestored: number;
  videosRestored: number;
  assetWarnings: string[];
}
