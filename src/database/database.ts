import { openDatabaseSync, type SQLiteBindParams } from 'expo-sqlite';
import { DEFAULT_CATEGORIES } from '../utils/categoryKeys';
import type { Asset, NewAsset, ParentType, AssetType } from '../types/asset';

export type { Asset, NewAsset, ParentType, AssetType };

const db = openDatabaseSync('little-words.db');

// ─── INIT ─────────────────────────────────────────────────────────────────────

export const initDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      db.execSync(`PRAGMA journal_mode = WAL;`);

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
            parent_type TEXT NOT NULL CHECK(parent_type IN ('word', 'variant')),
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

// Helper: SELECT → array
const query = <T extends object>(sql: string, args: SQLiteBindParams = []): Promise<T[]> => {
  try {
    const rows = db.getAllSync<T>(sql, args);
    return Promise.resolve(rows);
  } catch (error) {
    return Promise.reject(error);
  }
};

// Helper: INSERT / UPDATE / DELETE
const run = (sql: string, args: SQLiteBindParams = []): Promise<{ insertId: number; rowsAffected: number }> => {
  try {
    const result = db.runSync(sql, args);
    return Promise.resolve({ insertId: result.lastInsertRowId, rowsAffected: result.changes });
  } catch (error) {
    return Promise.reject(error);
  }
};

// ─── CATEGORIES ───────────────────────────────────────────────────────────────

export interface Category {
  id: number;
  name: string;
  color: string;
  emoji: string;
  created_at: string;
}

export const getCategories = (): Promise<Category[]> =>
  query<Category>('SELECT * FROM categories ORDER BY name ASC');

export const addCategory = async (name: string, color: string, emoji: string): Promise<number> => {
  const result = await run('INSERT INTO categories (name, color, emoji) VALUES (?, ?, ?)', [name, color, emoji]);
  return result.insertId ?? 0;
};

export const updateCategory = (id: number, name: string, color: string, emoji: string) =>
  run('UPDATE categories SET name=?, color=?, emoji=? WHERE id=?', [name, color, emoji, id]);

export const unlinkWordsFromCategory = (id: number) =>
  run('UPDATE words SET category_id = NULL WHERE category_id = ?', [id]);

export const getWordCountByCategory = async (id: number): Promise<number> => {
  const rows = await query<{ count: number }>('SELECT COUNT(*) as count FROM words WHERE category_id = ?', [id]);
  return rows[0]?.count ?? 0;
};

export const deleteCategory = (id: number) =>
  run('DELETE FROM categories WHERE id=?', [id]);

export const deleteCategoryWithUnlink = (id: number): Promise<void> =>
  new Promise((resolve, reject) => {
    try {
      db.withTransactionSync(() => {
        db.runSync('UPDATE words SET category_id = NULL WHERE category_id = ?', [id]);
        db.runSync('DELETE FROM categories WHERE id = ?', [id]);
      });
      resolve();
    } catch (error) {
      reject(error);
    }
  });

// ─── WORDS ────────────────────────────────────────────────────────────────────

export interface Word {
  id: number;
  word: string;
  category_id: number | null;
  category_name?: string;
  category_color?: string;
  category_emoji?: string;
  date_added: string;
  notes: string | null;
  created_at: string;
  variant_count?: number;
  variant_texts?: string;
  asset_count?: number;
}

export const getWords = (search?: string): Promise<Word[]> => {
  const base = `
    SELECT w.*, c.name as category_name, c.color as category_color, c.emoji as category_emoji,
           (SELECT COUNT(*) FROM variants v WHERE v.word_id = w.id) as variant_count,
           (SELECT GROUP_CONCAT(v.variant, '|||') FROM variants v WHERE v.word_id = w.id ORDER BY v.created_at ASC) as variant_texts,
           (SELECT COUNT(*) FROM assets a WHERE a.parent_type = 'word' AND a.parent_id = w.id) as asset_count
    FROM words w LEFT JOIN categories c ON w.category_id = c.id
  `;
  if (search?.trim()) {
    return query<Word>(base + ` WHERE LOWER(w.word) LIKE LOWER(?) ORDER BY w.created_at DESC`, [`%${search.trim()}%`]);
  }
  return query<Word>(base + ' ORDER BY w.created_at DESC');
};

export const findWordByName = (word: string): Promise<Word | null> =>
  query<Word>(`
    SELECT w.*, c.name as category_name, c.color as category_color, c.emoji as category_emoji,
           (SELECT COUNT(*) FROM variants v WHERE v.word_id = w.id) as variant_count
    FROM words w LEFT JOIN categories c ON w.category_id = c.id
    WHERE LOWER(w.word) = LOWER(?)
    LIMIT 1
  `, [word.trim()]).then(rows => rows[0] ?? null);

export const addWord = async (word: string, categoryId: number | null, dateAdded: string, notes?: string): Promise<number> => {
  const result = await run(
    'INSERT INTO words (word, category_id, date_added, notes) VALUES (?, ?, ?, ?)',
    [word, categoryId, dateAdded, notes || null]
  );
  return result.insertId ?? 0;
};

export const updateWord = (id: number, word: string, categoryId: number | null, dateAdded: string, notes?: string) =>
  run('UPDATE words SET word=?, category_id=?, date_added=?, notes=? WHERE id=?', [word, categoryId, dateAdded, notes || null, id]);

export const deleteWord = (id: number): Promise<void> =>
  new Promise((resolve, reject) => {
    try {
      db.withTransactionSync(() => {
        // Delete assets for all variants of this word
        const variantRows = db.getAllSync<{ id: number }>(
          'SELECT id FROM variants WHERE word_id = ?', [id]
        );
        for (const v of variantRows) {
          db.runSync(
            `DELETE FROM assets WHERE parent_type = 'variant' AND parent_id = ?`,
            [v.id]
          );
        }
        // Delete assets for the word itself
        db.runSync(
          `DELETE FROM assets WHERE parent_type = 'word' AND parent_id = ?`,
          [id]
        );
        // Delete the word (CASCADE removes variants)
        db.runSync('DELETE FROM words WHERE id = ?', [id]);
      });
      resolve();
    } catch (error) {
      reject(error);
    }
  });

// ─── VARIANTS ─────────────────────────────────────────────────────────────────

export interface Variant {
  id: number;
  word_id: number;
  variant: string;
  date_added: string;
  notes: string | null;
  created_at: string;
  main_word?: string;
  asset_count?: number;
}

export const getVariantsByWord = (wordId: number): Promise<Variant[]> =>
  query<Variant>('SELECT * FROM variants WHERE word_id=? ORDER BY created_at DESC', [wordId]);

export const findVariantByName = (wordId: number, variant: string): Promise<Variant | null> =>
  query<Variant>(
    'SELECT * FROM variants WHERE word_id=? AND LOWER(variant)=LOWER(?) LIMIT 1',
    [wordId, variant.trim()]
  ).then(rows => rows[0] ?? null);

export const getAllVariants = (): Promise<Variant[]> =>
  query<Variant>(`
    SELECT v.*, w.word as main_word,
           (SELECT COUNT(*) FROM assets a WHERE a.parent_type = 'variant' AND a.parent_id = v.id) as asset_count
    FROM variants v
    JOIN words w ON v.word_id = w.id
    ORDER BY v.created_at DESC
  `);

export const addVariant = async (wordId: number, variant: string, dateAdded: string, notes?: string): Promise<number> => {
  const result = await run(
    'INSERT INTO variants (word_id, variant, date_added, notes) VALUES (?, ?, ?, ?)',
    [wordId, variant, dateAdded, notes || null]
  );
  return result.insertId ?? 0;
};

export const updateVariant = (id: number, variant: string, dateAdded: string, notes?: string) =>
  run('UPDATE variants SET variant=?, date_added=?, notes=? WHERE id=?', [variant, dateAdded, notes || null, id]);

export const deleteVariant = (id: number): Promise<void> =>
  new Promise((resolve, reject) => {
    try {
      db.withTransactionSync(() => {
        db.runSync(
          `DELETE FROM assets WHERE parent_type = 'variant' AND parent_id = ?`,
          [id]
        );
        db.runSync('DELETE FROM variants WHERE id = ?', [id]);
      });
      resolve();
    } catch (error) {
      reject(error);
    }
  });

// ─── ASSETS ───────────────────────────────────────────────────────────────────

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
    `INSERT INTO assets (parent_type, parent_id, asset_type, filename, mime_type, file_size, duration_ms, width, height)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      asset.parent_type,
      asset.parent_id,
      asset.asset_type,
      asset.filename,
      asset.mime_type,
      asset.file_size,
      asset.duration_ms ?? null,
      asset.width ?? null,
      asset.height ?? null,
    ]
  );
  return result.insertId ?? 0;
};

export const deleteAsset = (id: number) =>
  run('DELETE FROM assets WHERE id = ?', [id]);

export const deleteAssetsByParent = (
  parentType: ParentType,
  parentId: number,
) =>
  run('DELETE FROM assets WHERE parent_type = ? AND parent_id = ?', [parentType, parentId]);

export const updateAssetFilename = (id: number, filename: string) =>
  run('UPDATE assets SET filename = ? WHERE id = ?', [filename, id]);

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalWords: number;
  totalVariants: number;
  wordsThisMonth: number;
  wordsThisWeek: number;
  wordsToday: number;
  categoryCounts: { name: string; count: number; color: string; emoji: string }[];
  recentWords: Word[];
  monthlyProgress: { month: string; count: number }[];
}

interface CountRow {
  count: number;
}

interface CategoryCountRow {
  name: string;
  count: number;
  color: string;
  emoji: string;
}

interface MonthProgressRow {
  month: string;
  count: number;
}

interface SettingRow {
  value: string;
}

interface CsvRow {
  word: string | null;
  categoria: string | null;
  data: string | null;
  variante: string | null;
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const [totalWordsRow] = await query<CountRow>('SELECT COUNT(*) as count FROM words');
  const [totalVariantsRow] = await query<CountRow>('SELECT COUNT(*) as count FROM variants');
  const [todayRow] = await query<CountRow>('SELECT COUNT(*) as count FROM words WHERE date_added = ?', [todayStr]);
  const [weekRow] = await query<CountRow>('SELECT COUNT(*) as count FROM words WHERE date_added >= ?', [weekAgo]);
  const [monthRow] = await query<CountRow>('SELECT COUNT(*) as count FROM words WHERE date_added >= ?', [monthStart]);

  const categoryCounts = await query<CategoryCountRow>(`
    SELECT c.name, c.color, c.emoji, COUNT(w.id) as count
    FROM categories c LEFT JOIN words w ON w.category_id = c.id
    GROUP BY c.id ORDER BY count DESC
  `);

  const recentWords = await query<Word>(`
    SELECT w.*, c.name as category_name, c.color as category_color, c.emoji as category_emoji
    FROM words w LEFT JOIN categories c ON w.category_id = c.id
    ORDER BY w.created_at DESC LIMIT 10
  `);

  const monthlyProgress = await query<MonthProgressRow>(`
    SELECT strftime('%Y-%m', date_added) as month, COUNT(*) as count
    FROM words GROUP BY month ORDER BY month ASC LIMIT 12
  `);

  return {
    totalWords:      totalWordsRow?.count ?? 0,
    totalVariants:   totalVariantsRow?.count ?? 0,
    wordsToday:      todayRow?.count ?? 0,
    wordsThisWeek:   weekRow?.count ?? 0,
    wordsThisMonth:  monthRow?.count ?? 0,
    categoryCounts,
    recentWords,
    monthlyProgress,
  };
};

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

export const getSetting = async (key: string): Promise<string | null> => {
  const rows = await query<SettingRow>('SELECT value FROM settings WHERE key=?', [key]);
  return rows.length > 0 ? rows[0].value : null;
};

export const setSetting = (key: string, value: string) =>
  run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);

// ─── CSV ──────────────────────────────────────────────────────────────────────

export const getAllDataForCSV = async (
  resolveCategoryName: (name: string) => string,
  headerRow = 'palavra,categoria,data,variante',
): Promise<string> => {
  const rows = await query<CsvRow>(`
    SELECT w.word, c.name as categoria, w.date_added as data, '' as variante
    FROM words w LEFT JOIN categories c ON w.category_id = c.id
    UNION ALL
    SELECT w.word, c.name as categoria, v.date_added as data, v.variant as variante
    FROM variants v
    JOIN words w ON v.word_id = w.id
    LEFT JOIN categories c ON w.category_id = c.id
    ORDER BY data ASC
  `);

  const header = headerRow + '\n';
  const body = rows.map((r) =>
    `"${(r.word || '').replaceAll('"', '""')}","${(resolveCategoryName(r.categoria || '') || '').replaceAll('"', '""')}","${r.data || ''}","${(r.variante || '').replaceAll('"', '""')}"`
  ).join('\n');

  return header + body;
};

// ─── RESET ────────────────────────────────────────────────────────────────────

export const clearAllData = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      db.withTransactionSync(() => {
        db.execSync('DELETE FROM assets;');
        db.execSync('DELETE FROM variants;');
        db.execSync('DELETE FROM words;');
        db.execSync('DELETE FROM categories;');
        db.execSync('DELETE FROM settings;');
        // Re-seed using locale-neutral keys
        for (const { key, color, emoji } of DEFAULT_CATEGORIES) {
          db.runSync(
            'INSERT INTO categories (name, color, emoji) VALUES (?, ?, ?);',
            [key, color, emoji]
          );
        }
      });
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};
