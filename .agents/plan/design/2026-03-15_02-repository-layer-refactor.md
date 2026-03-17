# Design: Repository Layer Refactor

**Date:** 2026-03-15
**Status:** Approved
**Author:** claude
**Related ADR:** 2026-03-15_02-drizzle-orm-repository-layer.md

---

## Problem Statement

The application's data access layer is a single 524-line `src/database/database.ts` file that mixes database connection, table creation, raw SQL queries, TypeScript interfaces, transactional operations, and initialization logic. This monolith has 23 direct consumers and makes it impossible to test, maintain, or evolve the data layer independently.

Additionally, several components (`ImportModal`, `AddWordModal`, `AddVariantModal`, `ManageCategoryModal`) and utilities (`i18n.tsx`, `csvExport.ts`) bypass the service layer entirely, importing directly from `database.ts`.

## Goals

- Extract per-entity repositories from the monolithic `database.ts`
- Separate concerns: connection, schema/types, queries, initialization
- Switch from sync-wrapped-in-Promise to true async queries (`getAllAsync`/`runAsync`)
- Add a lightweight versioned migration runner for future schema evolution
- Fix architectural violations where components bypass the service layer
- Maintain 100% backward compatibility with existing service API and TanStack Query hooks
- Enable future ORM adoption by establishing clean repository boundaries
- Create a `data-layer.md` code standard documenting repository/migration/client conventions
- Zero new dependencies

## Non-Goals

- Adopting Drizzle ORM or any ORM (deferred per ADR 2026-03-15_02)
- Changing the service layer's public API
- Modifying TanStack Query hooks or Zustand stores
- Changing the database schema or table structure
- Adding new features or UI changes

## Design

### Overview

Extract `database.ts` into a layered structure:

```
src/
  db/
    client.ts          # DB connection + async query/run helpers
    init.ts            # Table creation, seeding, legacy cleanup
    migrator.ts        # Lightweight versioned migration runner
    migrations/
      0001_initial-schema.ts
      index.ts         # Migration registry
  repositories/
    categoryRepository.ts
    wordRepository.ts
    variantRepository.ts
    assetRepository.ts
    settingsRepository.ts
    dashboardRepository.ts
    csvRepository.ts
  types/
    domain.ts          # All entity types (extracted from database.ts)
    asset.ts           # UNCHANGED
```

### Component / Module Breakdown

| Component | Responsibility | File(s) |
|-----------|---------------|---------|
| DB Client | Database connection, PRAGMA setup, async `query<T>()` and `run()` helpers, `withTransaction()` | `src/db/client.ts` |
| DB Init | Table DDL, index creation, category seeding, legacy cleanup | `src/db/init.ts` |
| Migrator | Version-tracked incremental schema migrations with up/down support | `src/db/migrator.ts` |
| Migrations | Individual migration files (one per schema change) | `src/db/migrations/*.ts` |
| Domain Types | `Category`, `Word`, `Variant`, `DashboardStats`, helper row types | `src/types/domain.ts` |
| Category Repo | CRUD + `deleteCategoryWithUnlink`, `getWordCountByCategory`, `unlinkWordsFromCategory` | `src/repositories/categoryRepository.ts` |
| Word Repo | CRUD + `getWords` (with JOINs/subqueries), `findWordByName`, `deleteWord` (transactional) | `src/repositories/wordRepository.ts` |
| Variant Repo | CRUD + `getAllVariants` (with JOIN/subquery), `findVariantByName`, `deleteVariant` (transactional) | `src/repositories/variantRepository.ts` |
| Asset Repo | CRUD + `getByParent`, `getByParentAndType`, `deleteByParent`, `updateFilename` | `src/repositories/assetRepository.ts` |
| Settings Repo | `get`, `set`, `clearAllData` (transactional with re-seed) | `src/repositories/settingsRepository.ts` |
| Dashboard Repo | Count queries, category stats, recent words, monthly progress | `src/repositories/dashboardRepository.ts` |
| CSV Repo | Raw data query for CSV export (no formatting) | `src/repositories/csvRepository.ts` |

### Data Flow

**Before (monolith):**
```
Component/Hook → Service → database.ts (connection + SQL + types)
Component → database.ts (bypass!)
```

**After (layered):**
```
Component/Hook → Service → Repository → db/client.ts (connection)
                                      → types/domain.ts (types)
```

### Detailed Module Design

#### `src/db/client.ts`

```typescript
import { openDatabaseSync, type SQLiteBindParams } from 'expo-sqlite';

const db = openDatabaseSync('little-words.db');
db.execSync('PRAGMA journal_mode = WAL;');

// True async query helpers — uses expo-sqlite's background thread API
export const query = <T extends object>(sql: string, args?: SQLiteBindParams): Promise<T[]> =>
  db.getAllAsync<T>(sql, args);

export const run = async (sql: string, args?: SQLiteBindParams): Promise<{ insertId: number; rowsAffected: number }> => {
  const result = await db.runAsync(sql, args);
  return { insertId: result.lastInsertRowId, rowsAffected: result.changes };
};

// Async transaction helper
export const withTransaction = (fn: () => Promise<void>): Promise<void> =>
  db.withTransactionAsync(fn);

// Direct DB access for init/migrator only
export const getDb = () => db;
```

Key decisions:
- **True async queries:** `getAllAsync()` and `runAsync()` run on a background thread, unblocking the JS thread during query execution. This improves responsiveness on low-end devices, especially for complex queries like `getDashboardStats` (8 queries) and `getWords` (JOINs + subqueries).
- **Same return signatures:** The `query<T>()` and `run()` functions return the same types as before — `Promise<T[]>` and `Promise<{ insertId, rowsAffected }>`. Since all consumers already `await` these, the switch is **transparent**.
- `withTransaction()` uses `db.withTransactionAsync()` — the async callback version. Transaction functions inside repositories must now `await` their queries.
- `getDb()` is exposed only for `init.ts` and `migrator.ts` (which need direct DB access for DDL and migration tracking).
- PRAGMA WAL is set synchronously at module load time (one-time, before any async work).

**Migration from sync to async inside transactions:**

Before (sync inside sync transaction):
```typescript
db.withTransactionSync(() => {
  db.runSync('DELETE FROM assets WHERE ...', [id]);
  db.runSync('DELETE FROM words WHERE id = ?', [id]);
});
```

After (async inside async transaction):
```typescript
await withTransaction(async () => {
  await run('DELETE FROM assets WHERE ...', [id]);
  await run('DELETE FROM words WHERE id = ?', [id]);
});
```

#### `src/db/migrator.ts`

A lightweight, version-tracked migration runner that provides incremental schema evolution without an ORM dependency.

```typescript
import { getDb } from './client';
import { migrations } from './migrations';

export interface Migration {
  version: number;
  name: string;
  up: (db: SQLiteDatabase) => void;
  down: (db: SQLiteDatabase) => void;
}

export const runMigrations = async (): Promise<void> => {
  const db = getDb();

  // Ensure migration tracking table exists
  db.execSync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const applied = db.getAllSync<{ version: number }>('SELECT version FROM schema_migrations ORDER BY version');
  const appliedSet = new Set(applied.map(r => r.version));

  const pending = migrations
    .filter(m => !appliedSet.has(m.version))
    .sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    db.withTransactionSync(() => {
      migration.up(db);
      db.runSync('INSERT INTO schema_migrations (version, name) VALUES (?, ?)', [migration.version, migration.name]);
    });
  }
};

export const rollbackMigration = async (targetVersion: number): Promise<void> => {
  const db = getDb();
  const applied = db.getAllSync<{ version: number }>('SELECT version FROM schema_migrations ORDER BY version DESC');

  for (const { version } of applied) {
    if (version <= targetVersion) break;
    const migration = migrations.find(m => m.version === version);
    if (!migration) throw new Error(`Migration ${version} not found in registry`);

    db.withTransactionSync(() => {
      migration.down(db);
      db.runSync('DELETE FROM schema_migrations WHERE version = ?', [version]);
    });
  }
};

export const getCurrentVersion = (): number => {
  const db = getDb();
  const row = db.getFirstSync<{ version: number }>('SELECT MAX(version) as version FROM schema_migrations');
  return row?.version ?? 0;
};
```

**Migration file format** (`src/db/migrations/0001_initial-schema.ts`):
```typescript
import type { Migration } from '../migrator';

export const migration: Migration = {
  version: 1,
  name: '0001_initial-schema',
  up: (db) => {
    // Initial schema is created by init.ts — this is a baseline marker
  },
  down: (db) => {
    // Cannot reverse initial schema
    throw new Error('Cannot rollback initial schema');
  },
};
```

**Migration registry** (`src/db/migrations/index.ts`):
```typescript
import type { Migration } from '../migrator';
import { migration as m0001 } from './0001_initial-schema';

export const migrations: Migration[] = [m0001];
```

Key decisions:
- **Sync DDL inside migrator:** Migrations use `execSync`/`runSync` via `getDb()` because DDL must complete before the app proceeds. This happens at startup on the splash screen, so blocking is acceptable.
- **`schema_migrations` table:** Tracks which migrations have been applied. Simpler than storing version in `settings` because it records all applied migrations (not just the latest), enabling gap detection.
- **Each migration runs in its own transaction:** If a migration fails, only that migration rolls back. Previously applied migrations are safe.
- **`down` functions are required** but can throw for irreversible migrations (like initial schema). This makes rollback explicit rather than silently skipping.
- **Version is an integer, name is for humans.** The registry is the source of truth for ordering — no filesystem ordering dependency.

**App startup flow** (updated `app/index.tsx`):
```
1. initDatabase()      → creates tables if not exist, seeds categories
2. runMigrations()     → applies any pending migrations above baseline
3. hydrate stores      → Zustand, locale, etc.
4. navigate            → tabs or onboarding
```

#### `src/db/init.ts`

Extracted from `initDatabase()`. Contains:
- All `CREATE TABLE IF NOT EXISTS` statements
- Index creation (`idx_assets_parent`, `idx_assets_type`)
- Legacy settings cleanup
- Default category seeding
- Legacy PT-BR category migration

Called from `app/index.tsx` exactly as `initDatabase()` is today.

```typescript
import { getDb } from './client';
import { DEFAULT_CATEGORIES } from '../utils/categoryKeys';

export const initDatabase = (): Promise<void> => { ... };
```

#### `src/types/domain.ts`

All entity types extracted from `database.ts`:

```typescript
// Core entities
export interface Category { id: number; name: string; color: string; emoji: string; created_at: string; }
export interface Word { id: number; word: string; category_id: number | null; /* ... joined fields, computed fields */ }
export interface Variant { id: number; word_id: number; variant: string; /* ... */ }

// Dashboard types
export interface DashboardStats { totalWords: number; /* ... */ }
export interface CountRow { count: number; }
export interface CategoryCountRow { name: string; count: number; color: string; emoji: string; }
export interface MonthProgressRow { month: string; count: number; }

// Settings/CSV helper types
export interface SettingRow { value: string; }
export interface CsvRow { word: string | null; categoria: string | null; data: string | null; variante: string | null; }
```

#### Repository Pattern

Each repository is a plain object (not a class) exporting functions. Example:

```typescript
// src/repositories/categoryRepository.ts
import { query, run, withTransaction } from '../db/client';
import type { Category } from '../types/domain';

export const getCategories = (): Promise<Category[]> =>
  query<Category>('SELECT * FROM categories ORDER BY name ASC');

export const addCategory = async (name: string, color: string, emoji: string): Promise<number> => {
  const result = await run('INSERT INTO categories (name, color, emoji) VALUES (?, ?, ?)', [name, color, emoji]);
  return result.insertId ?? 0;
};

// ... etc
```

**Function signatures are identical to current `database.ts` exports.** This ensures services need only change their import path.

### Service Layer Changes (Import Path Only)

**Before:**
```typescript
// src/services/categoryService.ts
export { getCategories, addCategory, ... } from '../database/database';
export type { Category } from '../database/database';
```

**After:**
```typescript
// src/services/categoryService.ts
export { getCategories, addCategory, ... } from '../repositories/categoryRepository';
export type { Category } from '../types/domain';
```

### Component Import Fixes

These components currently bypass the service layer:

| Component | Current import from `database.ts` | Fix |
|-----------|----------------------------------|-----|
| `ImportModal.tsx` | `getCategories`, `addCategory`, `findWordByName`, `addWord`, `addVariant` | Import from services |
| `ManageCategoryModal.tsx` | `getWordCountByCategory` | Import from `categoryService` |
| `AddWordModal.tsx` | `findWordByName`, types | Import from `wordService` + `types/domain` |
| `AddVariantModal.tsx` | `findVariantByName`, types | Import from `variantService` + `types/domain` |
| `i18n.tsx` | `getSetting`, `setSetting` | Import from `settingsService` |
| `csvExport.ts` | `getAllDataForCSV` | Import from `csvService` (new thin wrapper) |
| `sortHelpers.ts` | `Word`, `Variant` types | Import from `types/domain` |

For `csvExport.ts`, we create a thin `csvService.ts` that wraps the raw CSV repository query and applies the `resolveCategoryName` formatting. The existing `getAllDataForCSV` function signature is preserved.

### `getAllDataForCSV` Split

**Repository (`csvRepository.ts`):** Returns raw rows without formatting.
```typescript
export const getCsvRows = (): Promise<CsvRow[]> =>
  query<CsvRow>(`SELECT w.word, c.name as categoria, ... UNION ALL ...`);
```

**Service (`csvService.ts`):** Applies formatting.
```typescript
export const getAllDataForCSV = async (
  resolveCategoryName: (name: string) => string,
  headerRow = 'palavra,categoria,data,variante',
): Promise<string> => {
  const rows = await getCsvRows();
  const header = headerRow + '\n';
  const body = rows.map((r) => /* ... formatting ... */).join('\n');
  return header + body;
};
```

### `getDashboardStats` Split

**Repository (`dashboardRepository.ts`):** Individual query functions.
```typescript
export const getTotalWordCount = (): Promise<number> => { ... };
export const getTotalVariantCount = (): Promise<number> => { ... };
export const getWordCountForDate = (date: string): Promise<number> => { ... };
export const getWordCountSinceDate = (date: string): Promise<number> => { ... };
export const getCategoryCounts = (): Promise<CategoryCountRow[]> => { ... };
export const getRecentWords = (limit: number): Promise<Word[]> => { ... };
export const getMonthlyProgress = (limit: number): Promise<MonthProgressRow[]> => { ... };
```

**Service (`dashboardService.ts`):** Assembles the stats object.
```typescript
export const getDashboardStats = async (): Promise<DashboardStats> => {
  const now = new Date();
  // ... date math ...
  const [totalWords, totalVariants, wordsToday, ...] = await Promise.all([
    getTotalWordCount(),
    getTotalVariantCount(),
    getWordCountForDate(todayStr),
    // ...
  ]);
  return { totalWords, totalVariants, ... };
};
```

### Error Handling

- Repository functions maintain the same error propagation as today (Promise rejection via async/await)
- Transactional operations (`deleteWord`, `deleteCategoryWithUnlink`, `clearAllData`) use `withTransactionAsync` — if any `await` inside throws, the transaction rolls back automatically
- Migration failures throw and halt startup — the app shows an error state rather than proceeding with a broken schema
- No new error handling patterns introduced for consumers

### Implementation Strategy (Phased)

The refactor is done in phases to minimize risk:

**Phase 1 — Foundation (no consumer changes)**
1. Create `src/db/client.ts` (extract connection + async helpers)
2. Create `src/db/init.ts` (extract initialization)
3. Create `src/db/migrator.ts` + `src/db/migrations/0001_initial-schema.ts`
4. Create `src/types/domain.ts` (extract types)
5. `database.ts` imports from these new files and re-exports everything — zero consumer changes

**Phase 2 — Repositories (one entity at a time)**
6. Create `src/repositories/categoryRepository.ts` — imports from `db/client.ts`, exports same functions
7. Update `categoryService.ts` to import from repository
8. Repeat for words, variants, assets, settings, dashboard, csv

**Phase 3 — Fix service bypass**
9. Update components to import from services instead of `database.ts`
10. Update utilities to import from services/types instead of `database.ts`

**Phase 4 — Cleanup & Standards**
11. Delete `src/database/database.ts`
12. Update all test imports
13. Create `.agents/standards/data-layer.md`
14. Update `.agents/standards/README.md` with data-layer entry
15. Update `CLAUDE.md` architecture section to reflect new structure

### Test Strategy

- **`jest.setup.js` mock update:** The mock must now provide `getAllAsync`, `runAsync`, and `withTransactionAsync` in addition to (or instead of) the sync variants. Since `db/client.ts` uses only async methods, the sync mocks become unused by production code but may remain for `init.ts`/`migrator.ts` which use sync DDL.
- **Mock shape change:**
  ```typescript
  // jest.setup.js — updated mock
  global.__mockDb = {
    getAllAsync: jest.fn().mockResolvedValue([]),
    runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
    withTransactionAsync: jest.fn(async (fn) => fn()),
    // Keep sync for init/migrator
    execSync: jest.fn(),
    runSync: jest.fn().mockReturnValue({ lastInsertRowId: 1, changes: 1 }),
    getAllSync: jest.fn().mockReturnValue([]),
    getFirstSync: jest.fn().mockReturnValue(null),
    withTransactionSync: jest.fn((fn) => fn()),
  };
  ```
- **Existing test files** (`database.test.ts`, `assetDatabase.test.ts`) are renamed/reorganized to match the new repository structure
- **Service tests** remain unchanged — they test service behavior, not SQL
- **New repository tests** can be added for complex queries
- **Integration tests** that import from `database.ts` update their imports to repositories
- **Migrator tests:** New unit tests for `runMigrations`, `rollbackMigration`, `getCurrentVersion`

### Standards Deliverable: `.agents/standards/data-layer.md`

A new code standard file documenting the repository/data layer conventions established by this refactor. Topics covered:

1. **Architecture overview** — client -> repository -> service -> hook layering
2. **Repository rules** — no React/hooks/Zustand deps, parameterized queries only, async-first
3. **Client rules** — single connection point, async helpers, PRAGMA setup
4. **Migration rules** — file naming, version numbering, up/down requirements, transaction wrapping
5. **Type rules** — domain types in `types/domain.ts`, co-located with no query logic
6. **Transaction patterns** — when to use `withTransaction`, cascade delete patterns
7. **Import boundary enforcement** — components must import from services (never repositories), services import from repositories (never client), only repositories import from client
8. **SQL style** — parameterized queries only (never string interpolation), `LOWER()` for case-insensitive, `datetime('now')` for timestamps
9. **Testing** — mock patterns for async client, repository test structure

This file is added to `.agents/standards/README.md` and referenced from `CLAUDE.md`.

## Alternatives Considered

**Drizzle ORM (Option 1 from ADR):** Rejected due to critical bugs in transaction handling, migration system, and statement finalization. See ADR 2026-03-15_02 for full analysis.

**Hybrid Drizzle for schema/types (Option 3 from ADR):** Rejected because it still introduces Drizzle as a dependency with its bugs for marginal type inference benefit.

## Resolved Questions

- [x] **Phase approach:** Single PR. The refactor is purely structural with no logic changes — intermediate re-export shims add temporary complexity for no lasting value.
- [x] **Dashboard service rewrite:** Part of this refactor. The date math is ~5 lines and deferring would leave `dashboardRepository` violating the "no business logic" rule from day one.
- [x] **csvService.ts creation:** No new file. `csvExport.ts` already is the CSV formatting layer — it imports directly from `csvRepository` instead of `database.ts`. Adding a `csvService.ts` would be one layer too many.
- [x] **`init.ts` sync vs async:** Stay sync. It runs once at startup behind a loading screen. Converting to async adds complexity without UX benefit and risks ordering issues with the migration runner.

## Acceptance Criteria

- [ ] `src/database/database.ts` is deleted
- [ ] `src/db/client.ts` is the sole database connection point, using true async (`getAllAsync`/`runAsync`/`withTransactionAsync`)
- [ ] `src/db/init.ts` handles all initialization (tables, seeding, cleanup)
- [ ] `src/db/migrator.ts` + `src/db/migrations/` provide versioned migration support with up/down
- [ ] `src/types/domain.ts` contains all entity types
- [ ] One repository per entity: categories, words, variants, assets, settings, dashboard, csv
- [ ] All services import from repositories (no `database.ts` imports anywhere)
- [ ] No component imports from `database.ts` — all go through services
- [ ] All repository function signatures match the current `database.ts` exports
- [ ] `npm run ci` passes (lint + typecheck + tests + semgrep)
- [ ] Test coverage meets thresholds: 99% lines, 95% functions/branches/statements
- [ ] No new production dependencies added
- [ ] `initDatabase()` + `runMigrations()` called from `app/index.tsx` works identically
- [ ] `.agents/standards/data-layer.md` created with full repository/migration/client conventions
- [ ] `.agents/standards/README.md` updated with data-layer entry
- [ ] `CLAUDE.md` architecture section updated to reflect new structure
- [ ] All three vendor readmes (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`) updated if shared rules change
