import { getDb } from './client';
import { migrations } from './migrations';
import type { SQLiteDatabase } from 'expo-sqlite';

export interface Migration {
  version: number;
  name: string;
  up: (db: SQLiteDatabase) => void;
  down: (db: SQLiteDatabase) => void;
}

export const runMigrations = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const db = getDb();

      // Ensure migration tracking table exists
      db.execSync(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);

      const applied = db.getAllSync<{ version: number }>(
        'SELECT version FROM schema_migrations ORDER BY version'
      );
      const appliedSet = new Set(applied.map(r => r.version));

      const pending = migrations
        .filter(m => !appliedSet.has(m.version))
        .sort((a, b) => a.version - b.version);

      for (const migration of pending) {
        db.withTransactionSync(() => {
          migration.up(db);
          db.runSync(
            'INSERT INTO schema_migrations (version, name) VALUES (?, ?)',
            [migration.version, migration.name]
          );
        });
      }

      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

export const rollbackMigration = (targetVersion: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const db = getDb();
      const applied = db.getAllSync<{ version: number }>(
        'SELECT version FROM schema_migrations ORDER BY version DESC'
      );

      for (const { version } of applied) {
        if (version <= targetVersion) break;
        const migration = migrations.find(m => m.version === version);
        if (!migration) throw new Error(`Migration ${version} not found in registry`);

        db.withTransactionSync(() => {
          migration.down(db);
          db.runSync('DELETE FROM schema_migrations WHERE version = ?', [version]);
        });
      }

      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

export const getCurrentVersion = (): number => {
  const db = getDb();
  const row = db.getFirstSync<{ version: number }>(
    'SELECT MAX(version) as version FROM schema_migrations'
  );
  return row?.version ?? 0;
};
