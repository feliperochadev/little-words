# ADR: Drizzle ORM for Repository Layer Refactor

**Date:** 2026-03-15
**Status:** Accepted
**Deciders:** claude, user

---

## Context

The application's entire data access layer lives in a single `src/database/database.ts` file (~524 lines) that mixes:
- Database connection (`openDatabaseSync`)
- Table creation DDL (5 tables)
- Raw SQL queries (~30 exported functions)
- TypeScript interfaces (`Category`, `Word`, `Variant`, `DashboardStats`, etc.)
- Transactional operations (`withTransactionSync` for cascade deletes)
- Initialization logic (seeding, legacy data cleanup, PRAGMAs)

This monolith has **23 direct consumers** across services, components, utilities, i18n, and tests. It violates separation of concerns and makes the data layer untestable in isolation.

The proposed refactor introduces a **repository pattern** with an ORM to achieve type-safe queries, modular entity repositories, and clean separation between schema, queries, and business logic.

## Decision Drivers

- **Type safety:** Eliminate raw SQL string queries; get compile-time validation of schema changes.
- **Modularity:** Per-entity repositories that scale to 50+ entities without a monolithic file.
- **Maintainability:** Schema definitions as code, inferred types, and migration support.
- **Compatibility:** Must not break the existing service layer, TanStack Query hooks, or Zustand stores.
- **Expo ecosystem fit:** Must work with Expo SDK 55 and expo-sqlite ~55.0.10.
- **Reliability:** Transactions must be safe for cascade deletes (word -> variants -> assets).

## Considered Options

### 1. **Full Drizzle ORM** — Replace raw SQL with Drizzle query builder + `sql` fragments

Drizzle ORM (`drizzle-orm/expo-sqlite`) provides a type-safe query builder, schema-as-code via `sqliteTable`, inferred TypeScript types, and migration generation via `drizzle-kit`.

### 2. **Repository pattern WITHOUT ORM** — Keep raw SQL, organize into repositories

Extract queries from `database.ts` into per-entity repository files, keeping the same `query<T>()`/`run()` helpers and raw SQL strings. Add a shared `db/client.ts` for the connection. Define types separately in `types/domain.ts`.

### 3. **Drizzle for schema + types only, raw SQL for complex queries** — Hybrid approach

Use Drizzle's `sqliteTable` for schema definitions and type inference, but write all queries as raw SQL via Drizzle's `sql` template literal or the existing `query<T>()`/`run()` helpers. Get the type safety benefits without depending on the query builder.

## Decision

**Chosen option: Option 2 — Repository pattern WITHOUT ORM**, because the research reveals critical reliability issues with Drizzle's expo-sqlite integration that directly affect this application's core operations.

### Critical Drizzle Bugs Affecting This App

| Bug | Impact on Palavrinhas | Severity |
|-----|----------------------|----------|
| **Transaction rollback failure** — errors inside `db.transaction()` are NOT rolled back ([#4519](https://github.com/drizzle-team/drizzle-orm/issues/4519)) | `deleteWord`, `deleteVariant`, `deleteCategoryWithUnlink`, `clearAllData` all rely on transactional integrity for cascade deletes. A failed transaction could leave orphaned assets or partially deleted data. | **Critical** |
| **Statement finalization leaks** — prepared statements are never finalized ([#4519](https://github.com/drizzle-team/drizzle-orm/issues/4519)) | Long-running app sessions would accumulate leaked statement handles, causing memory pressure and potential database locks. | **High** |
| **Multiple migration crashes** — generating a 2nd+ migration crashes the app on reopen ([#2384](https://github.com/drizzle-team/drizzle-orm/issues/2384)) | Any schema evolution (adding tables, columns) would crash the app for all users. | **Critical** |
| **Silent migration failures** — initial migration can fail without error ([#1922](https://github.com/drizzle-team/drizzle-orm/issues/1922)) | Users could launch the app with no tables created, causing immediate crashes. | **High** |

### Why Option 2 Over Option 1

The primary goal of this refactor is **architectural separation** (repository pattern, modular files, clean imports), not ORM adoption. Drizzle's value proposition is type-safe queries, but:

1. **~60% of this app's queries require `sql` template literals anyway** (GROUP_CONCAT, correlated subqueries, UNION ALL, LOWER(), strftime). Using Drizzle's query builder for only simple CRUD while falling back to `sql` fragments for everything else provides marginal type-safety benefit at the cost of two mental models.

2. **The transaction bugs are disqualifying.** This app's cascade delete operations (word -> variants -> assets) are the most critical data integrity paths. A non-rolling-back transaction is worse than no transaction at all because it creates a false sense of safety.

3. **The migration system is not production-ready.** The app has real users with real data. Silent migration failures or crash-on-second-migration are unacceptable risks.

4. **expo-sqlite's sync API is already fast and well-understood.** The current `query<T>()`/`run()` helpers work correctly and are trivial to maintain.

### Why Option 2 Over Option 3

Option 3 (hybrid) still introduces Drizzle as a dependency with its associated bugs (statement leaks, migration issues) for marginal benefit. The schema-as-code and type inference benefits can be approximated with TypeScript interfaces in a dedicated `types/domain.ts` file — less elegant but zero new dependencies and zero new bugs.

### What Option 2 Delivers

- **Per-entity repositories** with the same function signatures as the current `database.ts` exports
- **Shared `db/client.ts`** as the single database entry point with **true async queries** (`getAllAsync`/`runAsync`/`withTransactionAsync`) — unblocking the JS thread during query execution
- **`types/domain.ts`** for all entity types, separated from query logic
- **`db/init.ts`** for table creation, seeding, and legacy cleanup (extracted from `initDatabase`)
- **`db/migrator.ts`** — lightweight versioned migration runner with up/down support, tracked in a `schema_migrations` table. Provides the same incremental migration capability as ORM migration systems without the ORM dependency or its bugs.
- **Clean import boundaries** — services import from repositories, not from a monolith
- **`.agents/standards/data-layer.md`** — code standard documenting repository, migration, and client conventions
- **Zero new dependencies** — no risk of ORM bugs

### Pros
- Achieves the primary goal: modular, testable, well-separated data layer
- Zero new dependencies — no supply chain risk, no new bugs
- True async queries via `getAllAsync`/`runAsync` — unblocks JS thread on low-end devices
- Lightweight migration runner provides versioned schema evolution without ORM bugs
- No Metro bundler configuration changes needed
- Transaction safety preserved (uses proven `withTransactionAsync`)
- Incremental adoption possible — can migrate one entity at a time
- Documented via `.agents/standards/data-layer.md` for consistent future development

### Cons
- No compile-time SQL validation — raw SQL errors only surface at runtime
- Manual type definitions must be kept in sync with schema DDL
- Migration files must be written manually (no auto-generation from schema diff)
- Less "modern" approach — doesn't leverage ORM ecosystem

## Consequences

### Positive
- Immediate architectural improvement without introducing risk
- True async queries improve responsiveness on low-end devices
- Lightweight migration runner enables safe schema evolution for post-beta releases
- Service layer imports change from `../database/database` to `../repositories/*` — same function signatures
- Components that bypass services (`ImportModal`, `AddWordModal`, etc.) get routed through services as part of this refactor
- New `data-layer.md` standard ensures consistent development going forward
- Foundation for future ORM adoption when Drizzle's expo-sqlite bugs are resolved

### Negative / Risks
- Raw SQL typos won't be caught at compile time — mitigated by comprehensive test coverage (99% line, 95% function requirement)
- Manual type/schema sync — mitigated by co-locating types with their repository and reviewing both in PRs
- Migration files must be manually written — mitigated by clear conventions in `data-layer.md` and a registry pattern that prevents ordering issues
- If Drizzle fixes its bugs later, this refactor doesn't block adoption — repositories can be internally migrated to Drizzle without changing their public API

## Future Consideration: Drizzle ORM Adoption

This ADR does NOT reject Drizzle permanently. It defers adoption until:
- [ ] Transaction rollback bug is fixed and released
- [ ] Statement finalization leak is resolved
- [ ] Migration system handles multiple migrations reliably
- [ ] At least one minor version ships with all three fixes

When these conditions are met, the repository layer provides a clean internal boundary for adopting Drizzle — each repository can be migrated independently without changing the service layer.

## Links

- Drizzle transaction bug: https://github.com/drizzle-team/drizzle-orm/issues/4519
- Drizzle migration crash: https://github.com/drizzle-team/drizzle-orm/issues/2384
- Drizzle silent migration failure: https://github.com/drizzle-team/drizzle-orm/issues/1922
- Drizzle expo-sqlite docs: https://orm.drizzle.team/docs/connect-expo-sqlite
- Related ADR: 2026-03-11_01-tanstack-query-sqlite.md
