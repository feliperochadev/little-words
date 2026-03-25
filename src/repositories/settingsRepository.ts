import { query, run, withTransaction } from '../db/client';
import type { SettingRow } from '../types/domain';
import { DEFAULT_CATEGORIES } from '../utils/categoryKeys';

export const getSetting = async (key: string): Promise<string | null> => {
  const rows = await query<SettingRow>('SELECT value FROM settings WHERE key=?', [key]);
  return rows.length > 0 ? rows[0].value : null;
};

export const setSetting = (key: string, value: string) =>
  run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);

export const clearAllData = (): Promise<void> =>
  withTransaction(async () => {
    await run('DELETE FROM assets');
    await run('DELETE FROM variants');
    await run('DELETE FROM words');
    await run('DELETE FROM categories');
    await run('DELETE FROM settings');
    await run('DELETE FROM notification_state');
    // Re-seed using locale-neutral keys
    for (const { key, color, emoji } of DEFAULT_CATEGORIES) {
      await run(
        'INSERT INTO categories (name, color, emoji) VALUES (?, ?, ?);',
        [key, color, emoji]
      );
    }
  });
