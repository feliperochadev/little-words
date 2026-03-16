import { query } from '../db/client';
import type { CountRow, CategoryCountRow, MonthProgressRow, Word } from '../types/domain';

export const getTotalWordCount = async (): Promise<number> => {
  const rows = await query<CountRow>('SELECT COUNT(*) as count FROM words');
  return rows[0]?.count ?? 0;
};

export const getTotalVariantCount = async (): Promise<number> => {
  const rows = await query<CountRow>('SELECT COUNT(*) as count FROM variants');
  return rows[0]?.count ?? 0;
};

export const getWordCountForDate = async (date: string): Promise<number> => {
  const rows = await query<CountRow>(
    'SELECT COUNT(*) as count FROM words WHERE date_added = ?',
    [date]
  );
  return rows[0]?.count ?? 0;
};

export const getWordCountSinceDate = async (date: string): Promise<number> => {
  const rows = await query<CountRow>(
    'SELECT COUNT(*) as count FROM words WHERE date_added >= ?',
    [date]
  );
  return rows[0]?.count ?? 0;
};

export const getCategoryCounts = (): Promise<CategoryCountRow[]> =>
  query<CategoryCountRow>(`
    SELECT c.name, c.color, c.emoji, COUNT(w.id) as count
    FROM categories c LEFT JOIN words w ON w.category_id = c.id
    GROUP BY c.id ORDER BY count DESC
  `);

export const getRecentWords = (limit: number): Promise<Word[]> =>
  query<Word>(`
    SELECT w.*, c.name as category_name, c.color as category_color, c.emoji as category_emoji
    FROM words w LEFT JOIN categories c ON w.category_id = c.id
    ORDER BY w.created_at DESC LIMIT ?
  `, [limit]);

export const getMonthlyProgress = (limit: number): Promise<MonthProgressRow[]> =>
  query<MonthProgressRow>(`
    SELECT strftime('%Y-%m', date_added) as month, COUNT(*) as count
    FROM words GROUP BY month ORDER BY month ASC LIMIT ?
  `, [limit]);
