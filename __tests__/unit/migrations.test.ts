import { migration as migration0003 } from '../../src/db/migrations/0003_add-asset-name';
import { migration as migration0004 } from '../../src/db/migrations/0004_add-unlinked-parent-type';

function makeDb() {
  return { execSync: jest.fn() };
}

describe('migration 0003 — add-asset-name', () => {
  it('has correct version and name', () => {
    expect(migration0003.version).toBe(3);
    expect(migration0003.name).toBe('0003_add-asset-name');
  });

  describe('up', () => {
    it('adds name column to assets table', () => {
      const db = makeDb();
      migration0003.up(db as any);
      expect(db.execSync).toHaveBeenCalledTimes(1);
      expect(db.execSync).toHaveBeenCalledWith(
        expect.stringContaining('ALTER TABLE assets ADD COLUMN name TEXT')
      );
    });
  });

  describe('down', () => {
    it('recreates assets table without name column', () => {
      const db = makeDb();
      migration0003.down(db as any);
      // Should call execSync 6 times: CREATE, INSERT, DROP, RENAME, idx_parent, idx_type
      expect(db.execSync).toHaveBeenCalledTimes(6);
    });

    it('creates assets_v2 with the old schema (no name column)', () => {
      const db = makeDb();
      migration0003.down(db as any);
      expect(db.execSync).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS assets_v2')
      );
    });

    it('copies data from assets to assets_v2', () => {
      const db = makeDb();
      migration0003.down(db as any);
      expect(db.execSync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO assets_v2 SELECT')
      );
    });

    it('drops old assets table and renames assets_v2', () => {
      const db = makeDb();
      migration0003.down(db as any);
      expect(db.execSync).toHaveBeenCalledWith(expect.stringContaining('DROP TABLE assets'));
      expect(db.execSync).toHaveBeenCalledWith(
        expect.stringContaining('ALTER TABLE assets_v2 RENAME TO assets')
      );
    });

    it('recreates indexes on the restored assets table', () => {
      const db = makeDb();
      migration0003.down(db as any);
      expect(db.execSync).toHaveBeenCalledWith(
        expect.stringContaining('idx_assets_parent')
      );
      expect(db.execSync).toHaveBeenCalledWith(
        expect.stringContaining('idx_assets_type')
      );
    });
  });
});

describe('migration 0004 — add-unlinked-parent-type', () => {
  it('has correct version and name', () => {
    expect(migration0004.version).toBe(4);
    expect(migration0004.name).toBe('0004_add-unlinked-parent-type');
  });

  describe('up', () => {
    it('creates assets_v4 with unlinked in CHECK constraint', () => {
      const db = makeDb();
      migration0004.up(db as any);
      expect(db.execSync).toHaveBeenCalledWith(
        expect.stringContaining("'unlinked'")
      );
      expect(db.execSync).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS assets_v4')
      );
    });

    it('inserts data with CASE expression migrating stale profile rows', () => {
      const db = makeDb();
      migration0004.up(db as any);
      expect(db.execSync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO assets_v4')
      );
      expect(db.execSync).toHaveBeenCalledWith(
        expect.stringContaining('CASE')
      );
    });

    it('drops old assets table and renames assets_v4', () => {
      const db = makeDb();
      migration0004.up(db as any);
      expect(db.execSync).toHaveBeenCalledWith(expect.stringContaining('DROP TABLE assets'));
      expect(db.execSync).toHaveBeenCalledWith(
        expect.stringContaining('ALTER TABLE assets_v4 RENAME TO assets')
      );
    });

    it('recreates indexes', () => {
      const db = makeDb();
      migration0004.up(db as any);
      expect(db.execSync).toHaveBeenCalledWith(
        expect.stringContaining('idx_assets_parent')
      );
      expect(db.execSync).toHaveBeenCalledWith(
        expect.stringContaining('idx_assets_type')
      );
    });

    it('calls execSync the expected number of times', () => {
      const db = makeDb();
      migration0004.up(db as any);
      // CREATE TABLE, INSERT, DROP, RENAME, idx_parent, idx_type = 6
      expect(db.execSync).toHaveBeenCalledTimes(6);
    });
  });

  describe('down', () => {
    it('creates assets_v3 without unlinked in CHECK constraint', () => {
      const db = makeDb();
      migration0004.down(db as any);
      expect(db.execSync).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS assets_v3')
      );
      // Must NOT contain 'unlinked' in the CREATE statement
      const firstCall = db.execSync.mock.calls[0][0] as string;
      expect(firstCall).not.toContain("'unlinked'");
    });

    it('maps unlinked rows back to profile on insert', () => {
      const db = makeDb();
      migration0004.down(db as any);
      expect(db.execSync).toHaveBeenCalledWith(
        expect.stringContaining("WHEN parent_type = 'unlinked' THEN 'profile'")
      );
    });

    it('drops assets and renames assets_v3', () => {
      const db = makeDb();
      migration0004.down(db as any);
      expect(db.execSync).toHaveBeenCalledWith(expect.stringContaining('DROP TABLE assets'));
      expect(db.execSync).toHaveBeenCalledWith(
        expect.stringContaining('ALTER TABLE assets_v3 RENAME TO assets')
      );
    });

    it('recreates indexes', () => {
      const db = makeDb();
      migration0004.down(db as any);
      expect(db.execSync).toHaveBeenCalledWith(
        expect.stringContaining('idx_assets_parent')
      );
    });

    it('calls execSync the expected number of times', () => {
      const db = makeDb();
      migration0004.down(db as any);
      // CREATE TABLE, INSERT, DROP, RENAME, idx_parent, idx_type = 6
      expect(db.execSync).toHaveBeenCalledTimes(6);
    });
  });
});
