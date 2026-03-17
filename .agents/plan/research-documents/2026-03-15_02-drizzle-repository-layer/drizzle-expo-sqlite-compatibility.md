# Drizzle ORM + expo-sqlite Compatibility Research

**Date:** 2026-03-15
**Purpose:** Evaluate Drizzle ORM for use with Expo SDK 55 / expo-sqlite ~55.0.10

## Versions

- `drizzle-orm`: v0.45.1 (latest stable as of 2026-03)
- `drizzle-kit`: v0.22.8+
- Import path: `drizzle-orm/expo-sqlite`
- Compatible with `openDatabaseSync` from expo-sqlite SDK 55

## What Works

- Basic CRUD via query builder (select, insert, update, delete)
- Schema definitions via `sqliteTable`
- Type inference via `$inferSelect` / `$inferInsert`
- `sql` template literals for complex queries (GROUP_CONCAT, subqueries, UNION ALL, LOWER, strftime)
- `useLiveQuery` hook for reactive queries (with `enableChangeListener: true`)
- Initial migration generation via `drizzle-kit generate`

## Critical Bugs

### 1. Transaction Rollback Failure

**Issue:** [#4519](https://github.com/drizzle-team/drizzle-orm/issues/4519)
**Severity:** Critical

When an error occurs inside a `db.transaction()` callback with the expo-sqlite driver, the transaction is NOT rolled back and the error is NOT caught. Even manual `tx.rollback()` calls throw an uncaught `DrizzleError`.

**Impact on Palavrinhas:** `deleteWord`, `deleteVariant`, `deleteCategoryWithUnlink`, and `clearAllData` all rely on transactional integrity. A failed mid-transaction delete could leave orphaned assets, partially deleted words, or a corrupted category-word relationship.

### 2. Statement Finalization Leak

**Issue:** [#4519](https://github.com/drizzle-team/drizzle-orm/issues/4519)
**Severity:** High

Drizzle prepares and executes SQLite statements but never calls `finalize()` on them. This causes:
- Accumulated memory pressure over long sessions
- Retained database locks that can block writes
- Potential `SQLITE_BUSY` errors under concurrent access

### 3. Multiple Migration Crash

**Issue:** [#2384](https://github.com/drizzle-team/drizzle-orm/issues/2384)
**Severity:** Critical

When generating a second or subsequent migration with `drizzle-kit generate`, the app immediately crashes on reopen with no error logs. Only the initial migration works reliably.

**Impact:** Any future schema evolution (adding columns, new tables) would crash the app for all existing users.

### 4. Silent Initial Migration Failure

**Issue:** [#1922](https://github.com/drizzle-team/drizzle-orm/issues/1922)
**Severity:** High

The initial migration can fail silently, leaving the database with no tables. The `useMigrations` hook reports `success: true` even when tables were not created.

### 5. Metro Bundler Configuration Required

Expo's Metro bundler does not recognize `.sql` files by default. Drizzle migrations are `.sql` files that must be bundled as strings via a Babel inline-import plugin. Without this configuration, the app crashes at startup when trying to load migrations.

## Workarounds Documented by Community

- Skip Drizzle migrations entirely; create tables manually and use Drizzle only for queries
- Use `db.run(sql\`...\`)` for transactions instead of `db.transaction()`
- Pin to a single initial migration and never regenerate

## Assessment

The combination of broken transactions, statement leaks, and unreliable migrations makes Drizzle ORM unsuitable for production use with expo-sqlite in its current state (v0.45.1). The bugs affect the exact operations that are most critical in this application (cascade deletes, data initialization).

**Recommendation:** Defer Drizzle adoption until the transaction and migration bugs are fixed. Proceed with a repository pattern using the existing raw SQL approach.

## Sources

- https://orm.drizzle.team/docs/connect-expo-sqlite
- https://orm.drizzle.team/docs/get-started/expo-new
- https://orm.drizzle.team/docs/sql
- https://orm.drizzle.team/docs/transactions
- https://github.com/drizzle-team/drizzle-orm/issues/4519
- https://github.com/drizzle-team/drizzle-orm/issues/2384
- https://github.com/drizzle-team/drizzle-orm/issues/1922
- https://github.com/expo/expo/issues/32714
