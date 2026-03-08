import { openDatabaseSync } from 'expo-sqlite';
import { DEFAULT_CATEGORIES } from '../utils/categoryKeys';

const db = openDatabaseSync('palavrinhas.db');

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

        // Seed default categories using locale-neutral keys.
        // The display name is resolved at render time via useCategoryName().
        for (const { key, color, emoji } of DEFAULT_CATEGORIES) {
          db.runSync(
            `INSERT OR IGNORE INTO categories (name, color, emoji) VALUES (?, ?, ?);`,
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

// Helper: SELECT → array
const query = <T>(sql: string, args: any[] = []): Promise<T[]> => {
  try {
    const rows = db.getAllSync<T>(sql, args);
    return Promise.resolve(rows);
  } catch (error) {
    return Promise.reject(error);
  }
};

// Helper: INSERT / UPDATE / DELETE
const run = (sql: string, args: any[] = []): Promise<{ insertId: number; rowsAffected: number }> => {
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
}

export const getWords = (search?: string): Promise<Word[]> => {
  const base = `
    SELECT w.*, c.name as category_name, c.color as category_color, c.emoji as category_emoji,
           (SELECT COUNT(*) FROM variants v WHERE v.word_id = w.id) as variant_count
    FROM words w LEFT JOIN categories c ON w.category_id = c.id
  `;
  if (search && search.trim()) {
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

export const deleteWord = (id: number) =>
  run('DELETE FROM words WHERE id=?', [id]);

// ─── VARIANTS ─────────────────────────────────────────────────────────────────

export interface Variant {
  id: number;
  word_id: number;
  variant: string;
  date_added: string;
  notes: string | null;
  created_at: string;
  main_word?: string;
}

export const getVariantsByWord = (wordId: number): Promise<Variant[]> =>
  query<Variant>('SELECT * FROM variants WHERE word_id=? ORDER BY created_at DESC', [wordId]);

export const getAllVariants = (): Promise<Variant[]> =>
  query<Variant>(`
    SELECT v.*, w.word as main_word FROM variants v
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

export const deleteVariant = (id: number) =>
  run('DELETE FROM variants WHERE id=?', [id]);

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

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const [totalWordsRow]    = await query<any>('SELECT COUNT(*) as count FROM words');
  const [totalVariantsRow] = await query<any>('SELECT COUNT(*) as count FROM variants');
  const [todayRow]         = await query<any>('SELECT COUNT(*) as count FROM words WHERE date_added = ?', [todayStr]);
  const [weekRow]          = await query<any>('SELECT COUNT(*) as count FROM words WHERE date_added >= ?', [weekAgo]);
  const [monthRow]         = await query<any>('SELECT COUNT(*) as count FROM words WHERE date_added >= ?', [monthStart]);

  const categoryCounts = await query<any>(`
    SELECT c.name, c.color, c.emoji, COUNT(w.id) as count
    FROM categories c LEFT JOIN words w ON w.category_id = c.id
    GROUP BY c.id ORDER BY count DESC
  `);

  const recentWords = await query<Word>(`
    SELECT w.*, c.name as category_name, c.color as category_color, c.emoji as category_emoji
    FROM words w LEFT JOIN categories c ON w.category_id = c.id
    ORDER BY w.created_at DESC LIMIT 10
  `);

  const monthlyProgress = await query<any>(`
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
  const rows = await query<any>('SELECT value FROM settings WHERE key=?', [key]);
  return rows.length > 0 ? rows[0].value : null;
};

export const setSetting = (key: string, value: string) =>
  run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);

// ─── CSV ──────────────────────────────────────────────────────────────────────

export const getAllDataForCSV = async (resolveCategoryName: (name: string) => string): Promise<string> => {
  const rows = await query<any>(`
    SELECT w.word, c.name as categoria, w.date_added as data, '' as variante
    FROM words w LEFT JOIN categories c ON w.category_id = c.id
    UNION ALL
    SELECT w.word, c.name as categoria, v.date_added as data, v.variant as variante
    FROM variants v
    JOIN words w ON v.word_id = w.id
    LEFT JOIN categories c ON w.category_id = c.id
    ORDER BY data ASC
  `);

  const header = 'palavra,categoria,data,variante\n';
  const body = rows.map((r: any) =>
    `"${(r.word || '').replace(/"/g, '""')}","${(resolveCategoryName(r.categoria || '') || '').replace(/"/g, '""')}","${r.data || ''}","${(r.variante || '').replace(/"/g, '""')}"`
  ).join('\n');

  return header + body;
};

// ─── RESET ────────────────────────────────────────────────────────────────────

export const clearAllData = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      db.withTransactionSync(() => {
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