import { query, run, withTransaction } from '../db/client';
import type { Category } from '../types/domain';

export const getCategories = (): Promise<Category[]> =>
  query<Category>('SELECT * FROM categories ORDER BY name ASC');

export const addCategory = async (name: string, color: string, emoji: string): Promise<number> => {
  const result = await run(
    'INSERT INTO categories (name, color, emoji) VALUES (?, ?, ?)',
    [name, color, emoji]
  );
  return result.insertId ?? 0;
};

export const updateCategory = (id: number, name: string, color: string, emoji: string) =>
  run('UPDATE categories SET name=?, color=?, emoji=? WHERE id=?', [name, color, emoji, id]);

export const unlinkWordsFromCategory = (id: number) =>
  run('UPDATE words SET category_id = NULL WHERE category_id = ?', [id]);

export const getWordCountByCategory = async (id: number): Promise<number> => {
  const rows = await query<{ count: number }>(
    'SELECT COUNT(*) as count FROM words WHERE category_id = ?',
    [id]
  );
  return rows[0]?.count ?? 0;
};

export const deleteCategory = (id: number) =>
  run('DELETE FROM categories WHERE id=?', [id]);

export const deleteCategoryWithUnlink = (id: number): Promise<void> =>
  withTransaction(async () => {
    await run('UPDATE words SET category_id = NULL WHERE category_id = ?', [id]);
    await run('DELETE FROM categories WHERE id = ?', [id]);
  });
