import { query, run, withTransaction } from '../db/client';
import type { Variant } from '../types/domain';

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

export const addVariant = async (
  wordId: number,
  variant: string,
  dateAdded: string,
  notes?: string,
): Promise<number> => {
  const result = await run(
    'INSERT INTO variants (word_id, variant, date_added, notes) VALUES (?, ?, ?, ?)',
    [wordId, variant, dateAdded, notes ?? null]
  );
  return result.insertId ?? 0;
};

export const updateVariant = (id: number, variant: string, dateAdded: string, notes?: string) =>
  run(
    'UPDATE variants SET variant=?, date_added=?, notes=? WHERE id=?',
    [variant, dateAdded, notes ?? null, id]
  );

export const deleteVariant = (id: number): Promise<void> =>
  withTransaction(async () => {
    await run(
      `DELETE FROM assets WHERE parent_type = 'variant' AND parent_id = ?`,
      [id]
    );
    await run('DELETE FROM variants WHERE id = ?', [id]);
  });
