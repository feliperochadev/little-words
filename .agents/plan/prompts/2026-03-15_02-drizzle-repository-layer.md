# Prompt — 2026-03-15_02-drizzle-repository-layer

## Original Prompt

Refactor the application's data layer from raw SQL in a single database.ts to a proper repository pattern with Drizzle ORM. The current architecture has a single database.ts file mixing database connection, raw SQL queries, TypeScript interfaces, and table creation. Refactor to: (1) Drizzle ORM schemas for type-safe table definitions, (2) a dedicated db/client.ts for database connection, (3) per-entity repositories (categories, words, variants, assets, settings, dashboard), (4) Drizzle-inferred types replacing manual interfaces, (5) drizzle-kit migration support. The service layer and TanStack Query hooks must NOT change structure — only their import source changes from database.ts to repositories. The existing entities are: categories, words, variants, assets, settings, and a dashboard stats aggregation. Complex queries include: getWords (with JOINs, subqueries for variant_count, variant_texts, asset_count), getDashboardStats (5 count queries + 3 aggregation queries), getAllDataForCSV (UNION ALL query), deleteWord/deleteVariant/deleteCategoryWithUnlink (transactional with cascade), initDatabase (table creation + seeding + legacy cleanup). The app uses expo-sqlite with synchronous API wrapped in Promises.

## Refined Prompt

### 1. Prompt Analysis

- **Intent:** Replace the monolithic `database.ts` (raw SQL + interfaces + connection) with a layered architecture: Drizzle ORM schemas, a single DB client, per-entity repositories, inferred types, and migration support — while keeping the service layer and hooks untouched.

- **Weaknesses or ambiguities:**
  - **Drizzle + expo-sqlite sync API compatibility:** The current code uses `openDatabaseSync`, `getAllSync`, `runSync`, `execSync`, `withTransactionSync`. Drizzle ORM's expo-sqlite driver expects the async API. The prompt doesn't address this fundamental mismatch or how to bridge it.
  - **"Repositories must not depend on React, hooks, or Zustand"** is stated, but the `getDashboardStats` function computes derived data (date math, aggregation) that blurs the line between repository and service. Where does this logic live?
  - **`initDatabase` migration strategy is ambiguous:** The prompt says to use `drizzle-kit generate` for migrations, but `initDatabase` also does seeding (DEFAULT_CATEGORIES) and legacy data cleanup (PT-BR category renaming). These are not schema migrations — the prompt doesn't specify where they go.
  - **Transaction support:** Several operations (`deleteWord`, `deleteCategoryWithUnlink`, `clearAllData`) use `withTransactionSync`. The prompt doesn't specify how Drizzle transactions replace this pattern, or whether raw SQL is acceptable inside transactions.
  - **Complex queries may not map cleanly to Drizzle:** `getWords` uses correlated subqueries (`SELECT COUNT(*) FROM variants...`, `GROUP_CONCAT`), and `getAllDataForCSV` uses `UNION ALL`. These may require `sql` template literals rather than the query builder — the prompt should acknowledge this.
  - **`getAllDataForCSV` accepts a callback** (`resolveCategoryName`) and builds a formatted string. This is presentation logic, not a repository concern. Its placement needs a decision.
  - **Service layer "only import source changes"** is optimistic — `categoryService.ts` re-exports directly from `database.ts`. If repository method signatures change (e.g., return Drizzle row types instead of manual interfaces), service re-exports break.
  - **No mention of the `app/index.tsx` initialization call** — `initDatabase()` is called at app startup. The prompt needs to specify what replaces it.
  - **Components bypass the service layer** — `ImportModal.tsx`, `AddWordModal.tsx`, `AddVariantModal.tsx`, `ManageCategoryModal.tsx`, and `i18n.tsx` all import directly from `database.ts`. The prompt assumes only services need updating but the reality is broader.

- **Missing constraints or context:**
  - Drizzle ORM version and expo-sqlite driver compatibility with Expo SDK 55 / expo-sqlite 55.
  - Whether the database name stays `little-words.db` or changes to `app.db`.
  - How to handle the `PRAGMA journal_mode = WAL` setting in Drizzle.
  - Whether existing data must survive the migration (existing users have data in `little-words.db`).
  - Test strategy: 130+ tests mock `expo-sqlite` via `jest.setup.js`. The mock layer must be updated for Drizzle.

### 2. Edge Cases

- **Drizzle doesn't support `GROUP_CONCAT`** natively — `getWords` and `getAllVariants` use it. Must fall back to `sql` template literals.
- **Correlated subqueries** in SELECT clauses (`variant_count`, `asset_count`) are not expressible in Drizzle's query builder — requires raw SQL fragments via `sql`.
- **`UNION ALL`** in `getAllDataForCSV` is not supported by Drizzle's builder — requires `sql` or `db.all(sql\`...\`)`.
- **Date arithmetic** in `getDashboardStats` happens in JS before querying. Repository must accept date parameters rather than computing them internally.
- **`clearAllData` re-seeds categories** after deleting everything — this couples reset logic with seed logic.
- **`findWordByName` / `findVariantByName`** use `LOWER()` for case-insensitive matching — Drizzle supports this via `sql` but not via `eq`.
- **Mock layer in tests:** `global.__mockDb` simulates `getAllSync`/`runSync`/`execSync`. Drizzle wraps these internally, so the mock strategy must change.
- **Transaction rollback bugs:** Drizzle's expo-sqlite driver has known issues where errors inside transactions are NOT rolled back. This directly affects `deleteWord`, `deleteVariant`, `deleteCategoryWithUnlink`, and `clearAllData`.

### 3. Suggested Improvements

- Explicitly address the sync/async API gap. Drizzle's expo-sqlite driver uses `openDatabaseSync` but its query methods return Promises.
- Acknowledge raw SQL fragments. State that `sql` template literals from `drizzle-orm` are acceptable for complex queries — "no raw SQL" means "no string concatenation", not "no SQL expressions".
- Define where `initDatabase` logic goes: schema creation -> Drizzle migrations; PRAGMA -> `db/client.ts`; seeding -> `db/seed.ts`; legacy cleanup -> one-time migration.
- Specify return type compatibility. Repository methods must return types structurally compatible with existing interfaces.
- Define `getAllDataForCSV` placement. Move formatting to service layer; repository provides raw row data only.
- Specify test migration strategy.
- Keep database filename as `little-words.db`.
- Split `getDashboardStats` — repository provides raw queries, service assembles the shape.
- Fix the service bypass: components importing from `database.ts` must be redirected to services or repositories.

### 4. Clarifying Questions

1. **Data preservation:** Must existing users' data in `little-words.db` survive? (This affects whether we can change table definitions or must match them exactly.)
2. **Drizzle version pinning:** Should we pin to a specific Drizzle ORM version, or use latest?
3. **Test approach:** Prefer mocking Drizzle's `db` object, or switching to a real in-memory SQLite for tests?
4. **`getAllDataForCSV`:** Keep in a repository (accepting the callback parameter), or move the formatting to the service layer?
5. **Transaction safety:** Given Drizzle's known transaction rollback bugs, is the risk acceptable or should we consider alternatives?

### 5. Refined Prompt

Refactor the data layer from raw SQL in `database.ts` to a repository pattern with Drizzle ORM.

**Current state:** A single `src/database/database.ts` file contains: the SQLite connection (`openDatabaseSync`), table creation DDL, raw SQL queries via `getAllSync`/`runSync`/`execSync`, TypeScript interfaces (`Category`, `Word`, `Variant`, `DashboardStats`), transactional operations (`withTransactionSync`), and initialization logic (seeding, legacy cleanup, PRAGMAs).

**Target architecture:**

```
src/
  db/
    client.ts              # Single DB entry point (drizzle + openDatabaseSync)
    schema/
      categories.ts        # sqliteTable definition
      words.ts
      variants.ts
      assets.ts
      settings.ts
      index.ts             # Re-exports all schemas
    seed.ts                # Category seeding + legacy cleanup (called at init)
    migrations/            # Generated by drizzle-kit
    drizzle.config.ts
  repositories/
    categoryRepository.ts
    wordRepository.ts
    variantRepository.ts
    assetRepository.ts
    settingsRepository.ts
    dashboardRepository.ts
  services/                # UNCHANGED in structure
  hooks/                   # UNCHANGED in structure
  stores/                  # UNCHANGED
  types/
    asset.ts               # UNCHANGED (validation logic stays here)
    domain.ts              # Drizzle-inferred types + extended view types
```

**Constraints:**

1. **Database filename:** Keep `little-words.db`.
2. **Service layer contract:** Services change only their import paths. Method signatures remain structurally compatible. Type re-exports point at `types/domain.ts`.
3. **TanStack Query hooks:** Zero changes.
4. **Zustand stores:** Zero changes.
5. **Raw SQL fragments are acceptable** via Drizzle's `sql` template literal for GROUP_CONCAT, correlated subqueries, UNION ALL, LOWER() comparisons, and strftime.
6. **Transactions:** Replace `withTransactionSync` with Drizzle's `db.transaction()`.
7. **PRAGMA and initialization:** PRAGMA in `db/client.ts`; table creation via Drizzle migrations; seeding in `db/seed.ts`.
8. **`getAllDataForCSV`:** Move string formatting to service layer. Repository provides raw row data only.
9. **`getDashboardStats`:** Repository provides individual query methods. Service assembles the `DashboardStats` object.
10. **Types:** Use Drizzle inferred types as base. Extended view types in `types/domain.ts`.
11. **Tests:** Update mock strategy for Drizzle.
12. **Expo compatibility:** Verify drizzle-orm works with Expo SDK 55 / expo-sqlite ~55.0.10.
13. **Component imports:** Components that bypass services and import from database.ts must be redirected to use services or repositories.
