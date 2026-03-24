import { query, run } from '../db/client';

interface StateRow { value: string }

export const getNotificationState = async (key: string): Promise<string | null> => {
  const rows = await query<StateRow>('SELECT value FROM notification_state WHERE key=?', [key]);
  return rows.length > 0 ? rows[0].value : null;
};

export const setNotificationState = (key: string, value: string) =>
  run(
    "INSERT OR REPLACE INTO notification_state (key, value, updated_at) VALUES (?, ?, datetime('now'))",
    [key, value],
  );

export const clearNotificationState = () =>
  run('DELETE FROM notification_state');

export interface AnniversaryCandidate {
  id: number;
  word: string;
  date_added: string;
}

export const getWordsWithUpcomingAnniversaries = (): Promise<AnniversaryCandidate[]> =>
  query<AnniversaryCandidate>(`
    SELECT id, word, date_added FROM words
    WHERE (
      date(date_added, '+1 month') BETWEEN date('now') AND date('now', '+30 days')
      OR
      date(date_added, '+1 year') BETWEEN date('now') AND date('now', '+30 days')
    )
  `);

export const getEmptyCategoryNames = (): Promise<{ name: string }[]> =>
  query<{ name: string }>(`
    SELECT c.name FROM categories c
    LEFT JOIN words w ON w.category_id = c.id
    GROUP BY c.id
    HAVING COUNT(w.id) = 0
  `);

export const getTotalNonProfileAssetCount = async (): Promise<number> => {
  const rows = await query<{ count: number }>(
    "SELECT COUNT(*) as count FROM assets WHERE parent_type != 'profile'",
  );
  return rows[0]?.count ?? 0;
};
