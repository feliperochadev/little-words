import { query, run } from '../db/client';

interface StateRow { value: string }

export const getKeepsakeState = async (key: string): Promise<string | null> => {
  const rows = await query<StateRow>('SELECT value FROM keepsake_state WHERE key=?', [key]);
  return rows.length > 0 ? rows[0].value : null;
};

export const setKeepsakeState = (key: string, value: string) =>
  run(
    'INSERT OR REPLACE INTO keepsake_state (key, value) VALUES (?, ?)',
    [key, value],
  );

export const deleteKeepsakeState = (key: string) =>
  run('DELETE FROM keepsake_state WHERE key=?', [key]);

export const clearKeepsakeState = () =>
  run('DELETE FROM keepsake_state');

export const getAllKeepsakePhotoOverrides = async (): Promise<Record<number, string>> => {
  const rows = await query<{ key: string; value: string }>(
    "SELECT key, value FROM keepsake_state WHERE key LIKE 'photo_override_%'",
  );
  const overrides: Record<number, string> = {};
  for (const row of rows) {
    const wordId = Number(row.key.replace('photo_override_', ''));
    if (!Number.isNaN(wordId)) {
      overrides[wordId] = row.value;
    }
  }
  return overrides;
};

interface EarliestWordRow {
  id: number;
  word: string;
  date_added: string;
  category_emoji: string | null;
}

export const getEarliestWords = (limit: number): Promise<EarliestWordRow[]> =>
  query<EarliestWordRow>(
    `SELECT w.id, w.word, w.date_added, c.emoji as category_emoji
     FROM words w
     LEFT JOIN categories c ON c.id = w.category_id
     ORDER BY w.date_added ASC
     LIMIT ?`,
    [limit],
  );

export const getWordPhotoFilename = async (wordId: number): Promise<string | null> => {
  const rows = await query<{ filename: string }>(
    "SELECT filename FROM assets WHERE parent_type='word' AND parent_id=? AND asset_type='photo' ORDER BY created_at ASC LIMIT 1",
    [wordId],
  );
  return rows.length > 0 ? rows[0].filename : null;
};

export const getTotalWordCount = async (): Promise<number> => {
  const rows = await query<{ count: number }>('SELECT COUNT(*) as count FROM words');
  return rows[0]?.count ?? 0;
};
