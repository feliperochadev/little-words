import { query } from '../db/client';
import type { BackupCategory, BackupWord, BackupVariant, BackupAsset, BackupKeepsakeState } from '../types/backup';

export const getAllCategoriesForBackup = (): Promise<BackupCategory[]> =>
  query<BackupCategory>('SELECT id, name, color, emoji, created_at FROM categories ORDER BY id ASC');

export const getAllWordsForBackup = (): Promise<BackupWord[]> =>
  query<BackupWord>('SELECT id, word, category_id, date_added, notes, created_at FROM words ORDER BY id ASC');

export const getAllVariantsForBackup = (): Promise<BackupVariant[]> =>
  query<BackupVariant>('SELECT id, word_id, variant, date_added, notes, created_at FROM variants ORDER BY id ASC');

/**
 * Fetches all assets for backup, including unlinked ones.
 * The media_path column is computed here for use in the ZIP.
 */
export const getAllAssetsForBackup = (): Promise<(Omit<BackupAsset, 'media_path'>)[]> =>
  query<Omit<BackupAsset, 'media_path'>>(
    `SELECT id, parent_type, parent_id, asset_type, filename, name,
            mime_type, file_size, duration_ms, width, height, created_at
     FROM assets
     ORDER BY id ASC`
  );

export const getAllKeepsakeStateForBackup = (): Promise<BackupKeepsakeState[]> =>
  query<BackupKeepsakeState>('SELECT key, value FROM keepsake_state ORDER BY key ASC');
