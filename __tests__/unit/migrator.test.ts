import { runMigrations, rollbackMigration, getCurrentVersion } from '../../src/db/migrator';

const mockDb = (globalThis as any).__mockDb;

describe('migrator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('runMigrations', () => {
    it('creates schema_migrations table if not exists', async () => {
      mockDb.getAllSync.mockReturnValueOnce([{ version: 1 }]); // already applied
      await runMigrations();
      expect(mockDb.execSync).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS schema_migrations'),
      );
    });

    it('resolves on success when no pending migrations', async () => {
      // All migrations are already applied
      mockDb.getAllSync.mockReturnValueOnce([{ version: 1 }]);
      await expect(runMigrations()).resolves.toBeUndefined();
    });

    it('applies pending migrations in version order', async () => {
      // No migrations applied yet
      mockDb.getAllSync.mockReturnValueOnce([]);
      await runMigrations();
      // Should have called withTransactionSync for the migration
      expect(mockDb.withTransactionSync).toHaveBeenCalled();
    });

    it('records applied migration in schema_migrations', async () => {
      mockDb.getAllSync.mockReturnValueOnce([]); // no applied migrations
      await runMigrations();
      expect(mockDb.runSync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO schema_migrations'),
        expect.arrayContaining([1, '0001_initial-schema']),
      );
    });

    it('skips migrations that are already applied', async () => {
      mockDb.getAllSync.mockReturnValueOnce([{ version: 1 }, { version: 2 }, { version: 3 }, { version: 4 }]); // all applied
      await runMigrations();
      // withTransactionSync should NOT have been called since all migrations are already applied
      expect(mockDb.withTransactionSync).not.toHaveBeenCalled();
    });

    it('rejects when execSync throws', async () => {
      mockDb.execSync.mockImplementationOnce(() => { throw new Error('DDL error'); });
      await expect(runMigrations()).rejects.toThrow('DDL error');
    });

    it('rejects when withTransactionSync throws', async () => {
      mockDb.getAllSync.mockReturnValueOnce([]); // no applied migrations
      mockDb.withTransactionSync.mockImplementationOnce(() => { throw new Error('tx error'); });
      await expect(runMigrations()).rejects.toThrow('tx error');
    });
  });

  describe('rollbackMigration', () => {
    it('resolves when no applied migrations exist', async () => {
      mockDb.getAllSync.mockReturnValueOnce([]);
      await expect(rollbackMigration(0)).resolves.toBeUndefined();
    });

    it('skips versions at or below targetVersion', async () => {
      mockDb.getAllSync.mockReturnValueOnce([{ version: 1 }]);
      await rollbackMigration(1); // target = 1, so version 1 is skipped
      expect(mockDb.withTransactionSync).not.toHaveBeenCalled();
    });

    it('throws when migration is not found in registry', async () => {
      mockDb.getAllSync.mockReturnValueOnce([{ version: 999 }]); // unknown version
      await expect(rollbackMigration(0)).rejects.toThrow('Migration 999 not found in registry');
    });

    it('throws for initial schema down (irreversible)', async () => {
      mockDb.getAllSync.mockReturnValueOnce([{ version: 1 }]);
      // Attempting to roll back below version 1
      mockDb.withTransactionSync.mockImplementationOnce((fn: () => void) => fn());
      await expect(rollbackMigration(0)).rejects.toThrow('Cannot rollback initial schema');
    });

    it('rolls back migration v2 (add-profile-parent-type) to target version 1', async () => {
      mockDb.getAllSync.mockReturnValueOnce([{ version: 2 }]);
      mockDb.withTransactionSync.mockImplementationOnce((fn: () => void) => fn());
      await rollbackMigration(1);
      expect(mockDb.execSync).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM assets WHERE parent_type = 'profile'"),
      );
      expect(mockDb.execSync).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS assets_old'),
      );
      expect(mockDb.runSync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM schema_migrations WHERE version = ?'),
        expect.arrayContaining([2]),
      );
    });

    it('rejects when getAllSync throws', async () => {
      mockDb.getAllSync.mockImplementationOnce(() => { throw new Error('read error'); });
      await expect(rollbackMigration(0)).rejects.toThrow('read error');
    });
  });

  describe('getCurrentVersion', () => {
    it('returns the current version from schema_migrations', () => {
      mockDb.getFirstSync.mockReturnValueOnce({ version: 1 });
      const version = getCurrentVersion();
      expect(version).toBe(1);
      expect(mockDb.getFirstSync).toHaveBeenCalledWith(
        expect.stringContaining('SELECT MAX(version) as version FROM schema_migrations'),
      );
    });

    it('returns 0 when no migrations have been applied', () => {
      mockDb.getFirstSync.mockReturnValueOnce(null);
      const version = getCurrentVersion();
      expect(version).toBe(0);
    });

    it('returns 0 when version is undefined', () => {
      mockDb.getFirstSync.mockReturnValueOnce({});
      const version = getCurrentVersion();
      expect(version).toBe(0);
    });
  });
});
