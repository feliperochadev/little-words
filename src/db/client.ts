import { openDatabaseSync, type SQLiteBindParams, type SQLiteDatabase } from 'expo-sqlite';

const db: SQLiteDatabase = openDatabaseSync('little-words.db');
db.execSync('PRAGMA journal_mode = WAL;');

// True async query helpers — uses expo-sqlite's background thread API
export const query = <T extends object>(sql: string, args?: SQLiteBindParams): Promise<T[]> =>
  args !== undefined ? db.getAllAsync<T>(sql, args) : db.getAllAsync<T>(sql);

export const run = async (
  sql: string,
  args?: SQLiteBindParams,
): Promise<{ insertId: number; rowsAffected: number }> => {
  const result = await (args !== undefined ? db.runAsync(sql, args) : db.runAsync(sql));
  return { insertId: result.lastInsertRowId, rowsAffected: result.changes };
};

// Async transaction helper
export const withTransaction = (fn: () => Promise<void>): Promise<void> =>
  db.withTransactionAsync(fn);

// Direct DB access for init/migrator only — do NOT use in repositories
export const getDb = (): SQLiteDatabase => db;
