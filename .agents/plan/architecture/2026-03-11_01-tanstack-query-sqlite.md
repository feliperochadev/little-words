# ADR-0001: TanStack Query with Local SQLite for Server State

**Date:** 2026-03-11
**Status:** Accepted
**Deciders:** Felipe Rocha (engineering)

---

## Context

The app uses `expo-sqlite` as its only data source. All screens called database functions directly, managed results with `useState`, and relied on `useFocusEffect` + callback chains for data synchronisation after mutations:

```
Screen → database.ts (direct import) → setWords(data)
After mutate: modal.onSave() → parent.load() → full refetch
```

This pattern caused:
- Duplicate queries: `getCategories()` called in 3+ places with no shared cache
- Manual refresh chains: every mutation needed an `onSave` callback to trigger parent refetch
- Tab-focus polling: `useFocusEffect` fired full refetches on every tab visit regardless of data freshness
- Google Drive sync scattered: triggered only from certain screens post-save

## Decision Drivers

- Eliminate duplicate queries through a shared cache
- Remove manual `load()` / `onSave` callback chains from screens and modals
- Centralise mutation side-effects (cache invalidation, Google Drive sync)
- Keep `database.ts` untouched — no risk to the SQL layer
- Maintain testability

## Considered Options

1. **React Context + custom cache** — build a custom caching layer over SQLite with Context
2. **TanStack Query (React Query v5) wrapping SQLite** — use the library's query/mutation infrastructure with SQLite as the data source
3. **Zustand for all state** — put all server data in a Zustand store and reload manually

## Decision

**Chosen option: TanStack Query v5 wrapping SQLite** (Option 2).

TanStack Query is data-source-agnostic; its `queryFn` only needs to return a `Promise`. All `database.ts` functions already return Promises, making them drop-in `queryFn` implementations with zero modification to the data layer.

### Pros
- Automatic deduplication: two components querying `['words']` make only one DB call
- Cache invalidation-driven refresh: mutations invalidate relevant keys, all subscribers re-render automatically — no `onSave` callbacks needed for data refresh
- Background refetch on app foreground via `focusManager` + `AppState`
- Tab-focus refetch via `useFocusEffect(() => query.refetch())` inside custom hooks — screens stay clean
- Google Drive sync centralised in mutation `onSuccess` hooks
- Built-in loading / error states replace manual `useState` flags

### Cons
- New dependency
- `QueryClientProvider` required in test renders (mitigated by `renderWithProviders` utility)
- React Native tabs don't trigger `window.focus` events — requires manual `useFocusEffect` integration inside hooks

## Consequences

### Positive
- Screens become pure UI: no DB imports, no `useFocusEffect`, no `load()` functions
- Mutations in any modal automatically refresh the parent screen list
- Google Drive sync fires after every successful word/variant mutation, not just from the Words screen

### Negative / Risks
- Migration is screen-by-screen; mixed patterns exist during transition — old screens still use direct DB calls until migrated (acceptable, both patterns coexist)
- Zustand stores hydrate asynchronously on app start; a brief loading state is required

## Architecture

```
Screen (no DB imports, no useFocusEffect)
  ↓
Custom Hook (useWords, useDashboard, etc.)
  ↓ useQuery / useMutation
TanStack Query (cache layer)
  ↓ queryFn / mutationFn
Service Layer (src/services/ — thin wrappers)
  ↓
database.ts (unchanged raw SQLite)

Global State (Zustand):
  settingsStore — child profile, onboarding
  authStore     — Google auth, last sync
```

## Query Key Strategy

| Key | Invalidated by |
|-----|---------------|
| `['words', { search }]` | add/update/delete word, add/update/delete variant (count changes), add/delete category (name changes) |
| `['words', wordId, 'variants']` | add/update/delete variant |
| `['variants']` | add/update/delete variant |
| `['categories']` | add/update/delete category |
| `['dashboard']` | add/update/delete word, add/update/delete variant |

## Links

- Related issues: state management refactor (2026-03-11)
- TanStack Query docs: https://tanstack.com/query/v5
- Migration tracked in `.agents/AGENTS-CHANGELOG.md` entry `2026-03-11_03`
