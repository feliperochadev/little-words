import type { Migration } from '../migrator';

export const migration: Migration = {
  version: 5,
  name: '0005_add-notification-state',
  up: (db) => {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS notification_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  },
  down: (db) => {
    db.execSync('DROP TABLE IF EXISTS notification_state;');
  },
};
