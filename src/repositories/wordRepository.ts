import { query, run, withTransaction } from '../db/client';
import type { Word } from '../types/domain';

export const getWords = (search?: string): Promise<Word[]> => {
  const base = `
    SELECT w.*, c.name as category_name, c.color as category_color, c.emoji as category_emoji,
           (SELECT COUNT(*) FROM variants v WHERE v.word_id = w.id) as variant_count,
           (SELECT GROUP_CONCAT(v.variant, '|||') FROM variants v WHERE v.word_id = w.id ORDER BY v.created_at ASC) as variant_texts,
           (SELECT COUNT(*) FROM assets a WHERE a.parent_type = 'word' AND a.parent_id = w.id) as asset_count
    FROM words w LEFT JOIN categories c ON w.category_id = c.id
  `;
  if (search?.trim()) {
    return query<Word>(
      base + ` WHERE LOWER(w.word) LIKE LOWER(?) ORDER BY w.created_at DESC`,
      [`%${search.trim()}%`]
    );
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

export const addWord = async (
  word: string,
  categoryId: number | null,
  dateAdded: string,
  notes?: string,
): Promise<number> => {
  const result = await run(
    'INSERT INTO words (word, category_id, date_added, notes) VALUES (?, ?, ?, ?)',
    [word, categoryId, dateAdded, notes ?? null]
  );
  return result.insertId ?? 0;
};

export const updateWord = (
  id: number,
  word: string,
  categoryId: number | null,
  dateAdded: string,
  notes?: string,
) =>
  run(
    'UPDATE words SET word=?, category_id=?, date_added=?, notes=? WHERE id=?',
    [word, categoryId, dateAdded, notes ?? null, id]
  );

export const deleteWord = (id: number): Promise<void> =>
  withTransaction(async () => {
    // Delete assets for all variants of this word
    const variantRows = await query<{ id: number }>(
      'SELECT id FROM variants WHERE word_id = ?',
      [id]
    );
    for (const v of variantRows) {
      await run(
        `DELETE FROM assets WHERE parent_type = 'variant' AND parent_id = ?`,
        [v.id]
      );
    }
    // Delete assets for the word itself
    await run(
      `DELETE FROM assets WHERE parent_type = 'word' AND parent_id = ?`,
      [id]
    );
    // Delete the word (CASCADE removes variants)
    await run('DELETE FROM words WHERE id = ?', [id]);
  });

/** Inserts a word preserving the original created_at timestamp from a backup. */
export const importWord = async (
  word: string,
  categoryId: number | null,
  dateAdded: string,
  notes: string | null,
  createdAt: string,
): Promise<number> => {
  const result = await run(
    'INSERT INTO words (word, category_id, date_added, notes, created_at) VALUES (?, ?, ?, ?, ?)',
    [word, categoryId, dateAdded, notes, createdAt],
  );
  return result.insertId ?? 0;
};

export const getVariantsByWord = (wordId: number) =>
  query<import('../types/domain').Variant>(
    'SELECT * FROM variants WHERE word_id=? ORDER BY created_at DESC',
    [wordId]
  );
