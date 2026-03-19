import { getDb } from './client';
import { DEFAULT_CATEGORIES } from '../utils/categoryKeys';

export const initDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const db = getDb();

      db.withTransactionSync(() => {
        db.execSync(`
          CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            color TEXT NOT NULL DEFAULT '#FF6B9D',
            emoji TEXT DEFAULT '📝',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          );
        `);

        db.execSync(`
          CREATE TABLE IF NOT EXISTS words (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word TEXT NOT NULL,
            category_id INTEGER,
            date_added TEXT NOT NULL,
            notes TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (category_id) REFERENCES categories(id)
          );
        `);

        db.execSync(`
          CREATE TABLE IF NOT EXISTS variants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word_id INTEGER NOT NULL,
            variant TEXT NOT NULL,
            date_added TEXT NOT NULL,
            notes TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
          );
        `);

        db.execSync(`
          CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
          );
        `);

        db.execSync(`
          CREATE TABLE IF NOT EXISTS assets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            parent_type TEXT NOT NULL CHECK(parent_type IN ('word', 'variant', 'profile')),
            parent_id INTEGER NOT NULL,
            asset_type TEXT NOT NULL CHECK(asset_type IN ('audio', 'photo', 'video')),
            filename TEXT NOT NULL,
            mime_type TEXT NOT NULL,
            file_size INTEGER NOT NULL DEFAULT 0,
            duration_ms INTEGER,
            width INTEGER,
            height INTEGER,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          );
        `);
        db.execSync(`CREATE INDEX IF NOT EXISTS idx_assets_parent ON assets(parent_type, parent_id);`);
        db.execSync(`CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(parent_type, parent_id, asset_type);`);

        // Remove legacy Google Sync settings from older releases.
        db.execSync(`
          DELETE FROM settings
          WHERE key IN ('google_signed_in', 'google_user_email', 'google_file_id', 'google_last_sync');
        `);

        // Seed default categories using locale-neutral keys.
        // The display name is resolved at render time via useCategoryName().
        for (const { key, color, emoji } of DEFAULT_CATEGORIES) {
          db.runSync(
            `INSERT OR IGNORE INTO categories (name, color, emoji) VALUES (?, ?, ?);`,
            [key, color, emoji]
          );
        }

        // Clean up any legacy PT-BR category names that may exist from older builds.
        // Reassign their words to the canonical key row, then delete the legacy row.
        const legacyMap: [string, string][] = [
          ['Animais', 'animals'], ['Comida', 'food'], ['Família', 'family'],
          ['Familia', 'family'], ['família', 'family'], ['familia', 'family'],
          ['Objetos', 'objects'], ['Ações', 'actions'], ['Acoes', 'actions'],
          ['Natureza', 'nature'], ['Corpo', 'body'], ['Outros', 'others'],
          ['Lugares', 'places'],
        ];
        for (const [legacy, canonical] of legacyMap) {
          const legacyRow = db.getFirstSync<{ id: number }>(
            `SELECT id FROM categories WHERE name = ?`, [legacy]
          );
          if (!legacyRow) continue;
          const canonicalRow = db.getFirstSync<{ id: number }>(
            `SELECT id FROM categories WHERE name = ?`, [canonical]
          );
          if (canonicalRow) {
            // Reassign words from legacy to canonical, then delete legacy
            db.runSync(`UPDATE words SET category_id = ? WHERE category_id = ?`, [canonicalRow.id, legacyRow.id]);
            db.runSync(`DELETE FROM categories WHERE id = ?`, [legacyRow.id]);
          } else {
            // No canonical key row yet — just rename in place
            db.runSync(`UPDATE categories SET name = ? WHERE id = ?`, [canonical, legacyRow.id]);
          }
        }
      });
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};
