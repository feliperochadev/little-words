import type { Migration } from '../migrator';

export const migration: Migration = {
  version: 6,
  name: 'add-keepsake-state',
  up(db) {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS keepsake_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  },
  down(db) {
    db.execSync('DROP TABLE IF EXISTS keepsake_state;');
  },
};
