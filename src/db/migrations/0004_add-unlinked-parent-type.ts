import type { Migration } from '../migrator';

export const migration: Migration = {
  version: 4,
  name: '0004_add-unlinked-parent-type',
  up: (db) => {
    // Recreate assets table with 'unlinked' added to parent_type CHECK constraint
    db.execSync(`
      CREATE TABLE IF NOT EXISTS assets_v4 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parent_type TEXT NOT NULL CHECK(parent_type IN ('word', 'variant', 'profile', 'unlinked')),
        parent_id INTEGER NOT NULL,
        asset_type TEXT NOT NULL CHECK(asset_type IN ('audio', 'photo', 'video')),
        filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        file_size INTEGER NOT NULL DEFAULT 0,
        duration_ms INTEGER,
        width INTEGER,
        height INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        name TEXT
      );
    `);

    // Identify the real profile photo: the most recent photo stored with parent_type='profile'.
    // All other parent_type='profile' records were unlinked media — migrate them to 'unlinked'.
    db.execSync(`
      INSERT INTO assets_v4
        (id, parent_type, parent_id, asset_type, filename, mime_type,
         file_size, duration_ms, width, height, created_at, name)
      SELECT
        id,
        CASE
          WHEN parent_type = 'profile' AND asset_type = 'photo'
               AND id = (
                 SELECT id FROM assets
                 WHERE parent_type = 'profile' AND asset_type = 'photo'
                 ORDER BY created_at DESC
                 LIMIT 1
               )
          THEN 'profile'
          WHEN parent_type = 'profile' THEN 'unlinked'
          ELSE parent_type
        END,
        parent_id, asset_type, filename, mime_type,
        file_size, duration_ms, width, height, created_at, name
      FROM assets;
    `);

    db.execSync(`DROP TABLE assets;`);
    db.execSync(`ALTER TABLE assets_v4 RENAME TO assets;`);
    db.execSync(`CREATE INDEX IF NOT EXISTS idx_assets_parent ON assets(parent_type, parent_id);`);
    db.execSync(`CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(parent_type, parent_id, asset_type);`);
  },
  down: (db) => {
    // Revert: move 'unlinked' back to 'profile', remove 'unlinked' from CHECK
    db.execSync(`
      CREATE TABLE IF NOT EXISTS assets_v3 (
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
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        name TEXT
      );
    `);
    db.execSync(`
      INSERT INTO assets_v3
        (id, parent_type, parent_id, asset_type, filename, mime_type,
         file_size, duration_ms, width, height, created_at, name)
      SELECT
        id,
        CASE WHEN parent_type = 'unlinked' THEN 'profile' ELSE parent_type END,
        parent_id, asset_type, filename, mime_type,
        file_size, duration_ms, width, height, created_at, name
      FROM assets;
    `);
    db.execSync(`DROP TABLE assets;`);
    db.execSync(`ALTER TABLE assets_v3 RENAME TO assets;`);
    db.execSync(`CREATE INDEX IF NOT EXISTS idx_assets_parent ON assets(parent_type, parent_id);`);
    db.execSync(`CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(parent_type, parent_id, asset_type);`);
  },
};
