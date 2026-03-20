import type { Migration } from '../migrator';

export const migration: Migration = {
  version: 3,
  name: '0003_add-asset-name',
  up: (db) => {
    // SQLite supports adding nullable columns without table recreation
    db.execSync(`ALTER TABLE assets ADD COLUMN name TEXT;`);
  },
  down: (db) => {
    // SQLite does not support DROP COLUMN — recreate without the name column
    db.execSync(`
      CREATE TABLE IF NOT EXISTS assets_v2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parent_type TEXT NOT NULL CHECK(parent_type IN ('word', 'variant', 'profile')),
        parent_id INTEGER NOT NULL,
        asset_type TEXT NOT NULL CHECK(asset_type IN ('audio', 'photo', 'video')),
        filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        file_size INTEGER NOT NULL DEFAULT 0,
        duration_ms INTEGER,
        width INTEGER,
        height INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    db.execSync(`INSERT INTO assets_v2 SELECT id, parent_type, parent_id, asset_type, filename, mime_type, file_size, duration_ms, width, height, created_at FROM assets;`);
    db.execSync(`DROP TABLE assets;`);
    db.execSync(`ALTER TABLE assets_v2 RENAME TO assets;`);
    db.execSync(`CREATE INDEX IF NOT EXISTS idx_assets_parent ON assets(parent_type, parent_id);`);
    db.execSync(`CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(parent_type, parent_id, asset_type);`);
  },
};
