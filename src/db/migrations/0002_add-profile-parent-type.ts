import type { Migration } from '../migrator';

export const migration: Migration = {
  version: 2,
  name: '0002_add-profile-parent-type',
  up: (db) => {
    // SQLite does not support ALTER CONSTRAINT. Recreate the table with the
    // expanded CHECK so existing users upgrading get the correct constraint.
    db.execSync(`
      CREATE TABLE IF NOT EXISTS assets_new (
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
    db.execSync(`INSERT INTO assets_new SELECT * FROM assets;`);
    db.execSync(`DROP TABLE assets;`);
    db.execSync(`ALTER TABLE assets_new RENAME TO assets;`);
    db.execSync(`CREATE INDEX IF NOT EXISTS idx_assets_parent ON assets(parent_type, parent_id);`);
    db.execSync(`CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(parent_type, parent_id, asset_type);`);
  },
  down: (db) => {
    // Remove any profile assets before reverting the constraint
    db.execSync(`DELETE FROM assets WHERE parent_type = 'profile';`);
    db.execSync(`
      CREATE TABLE IF NOT EXISTS assets_old (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parent_type TEXT NOT NULL CHECK(parent_type IN ('word', 'variant')),
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
    db.execSync(`INSERT INTO assets_old SELECT * FROM assets;`);
    db.execSync(`DROP TABLE assets;`);
    db.execSync(`ALTER TABLE assets_old RENAME TO assets;`);
    db.execSync(`CREATE INDEX IF NOT EXISTS idx_assets_parent ON assets(parent_type, parent_id);`);
    db.execSync(`CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(parent_type, parent_id, asset_type);`);
  },
};
