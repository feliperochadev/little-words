# Data Layer Standards

## Architecture

The data layer follows a strict three-tier hierarchy:

```
components/hooks → services → repositories → db/client
```

Only `src/db/init.ts` and `src/db/migrator.ts` may call `getDb()` directly.
No repository, service, or component may import from `src/db/client.ts` except via the `query`/`run`/`withTransaction` helpers.

## File Locations

| Layer | Path | Purpose |
|---|---|---|
| DB client | `src/db/client.ts` | Single connection, `query`, `run`, `withTransaction` helpers |
| Initialization | `src/db/init.ts` | DDL: CREATE TABLE, seeding, legacy data cleanup |
| Migrations | `src/db/migrator.ts` | Schema version management via `schema_migrations` table |
| Migration files | `src/db/migrations/` | Versioned `up`/`down` functions |
| Repositories | `src/repositories/` | Per-entity SQL functions, no React/hooks/Zustand |
| Services | `src/services/` | Thin wrappers or orchestration over repositories |
| Types | `src/types/domain.ts` | All entity interfaces |

## DB Client (`src/db/client.ts`)

```typescript
export const query = <T extends object>(sql: string, args?: SQLiteBindParams): Promise<T[]>
export const run = (sql: string, args?: SQLiteBindParams): Promise<{ insertId: number; rowsAffected: number }>
export const withTransaction = (fn: () => Promise<void>): Promise<void>
export const getDb = (): SQLiteDatabase  // init/migrator only
```

- `query` and `run` use expo-sqlite's background thread API (`getAllAsync`, `runAsync`) — does NOT block the JS thread.
- When `args` is `undefined`, the single-argument overloads are used (expo-sqlite does not accept `undefined` as a second arg).
- The database file is `little-words.db`, opened with `WAL` journal mode.

## Repositories

- One file per entity: `categoryRepository.ts`, `wordRepository.ts`, `variantRepository.ts`, `settingsRepository.ts`, `assetRepository.ts`, `dashboardRepository.ts`, `csvRepository.ts`.
- Only use `query`, `run`, `withTransaction` from `db/client`.
- No React, no hooks, no Zustand imports.
- All SQL uses `?` placeholders — never string interpolation.
- Return typed results: `Promise<T>`, `Promise<T[]>`, `Promise<{ insertId: number; rowsAffected: number }>`.
- Cascade deletes (e.g. variants on word delete) must run inside `withTransaction`.

## Services

- Services re-export repository functions or provide orchestration (multi-step, file cleanup, etc.).
- `categoryService.ts`, `wordService.ts`, `variantService.ts` — thin re-exports plus file cleanup on delete.
- `settingsService.ts` — re-exports `getSetting`/`setSetting`; provides `clearAllData` (DB + file cleanup) and `getChildProfile`/`setChildProfile` helpers.
- `dashboardService.ts` — real service: date math in JS, assembles `DashboardStats` via `Promise.all` over 8 repository calls.
- `assetService.ts` — atomic asset save (insert → copy file → update filename), rollback on failure.

## Migrations

- `src/db/migrator.ts` exports `runMigrations()`, `rollbackMigration(targetVersion)`, `getCurrentVersion()`.
- Uses sync methods (`withTransactionSync`, `runSync`, `getAllSync`, `getFirstSync`) since it runs at startup (splash screen).
- `schema_migrations` table tracks applied versions.
- Each migration file exports `{ version, name, up(db), down(db) }`.
- `up` and `down` are synchronous and receive the raw `SQLiteDatabase` instance.
- The initial schema migration (`0001`) has an irreversible `down` (throws "Cannot rollback initial schema").

## Initialization (`src/db/init.ts`)

- Uses sync DDL (`execSync`) — runs at splash screen startup.
- Creates all tables with `CREATE TABLE IF NOT EXISTS`.
- Seeds default categories on first run.
- Handles legacy PT-BR category name cleanup.
- Called from `app/index.tsx` before `runMigrations()`.

## Testing

- All repository tests use the shared `global.__mockDb` instance from `jest.setup.js`.
- Mock methods:
  - Async (repositories): `getAllAsync`, `runAsync`, `withTransactionAsync`
  - Sync (init/migrator): `execSync`, `runSync`, `getAllSync`, `getFirstSync`, `withTransactionSync`
- When a query has no bind parameters, `getAllAsync(sql)` is called with ONE argument — tests must match `expect.stringContaining(...)` without a second `undefined` argument.
- Integration tests mock at the **service layer** (e.g., `jest.mock('../../src/services/categoryService', ...)`), NOT at `database.ts` (which no longer exists).

## SQL Conventions

- `SELECT *` is acceptable for single-entity queries (avoids column list maintenance).
- Subquery counts use `(SELECT COUNT(*) FROM ... WHERE ...)` pattern for `asset_count`, `variant_count`.
- `GROUP_CONCAT` used for `variant_texts` aggregation.
- All `ORDER BY` clauses use explicit direction (`ASC`/`DESC`).
- `INSERT OR REPLACE INTO settings` for upsert operations.
- `INSERT INTO categories ... ON CONFLICT(name) DO NOTHING` for idempotent seeding.
