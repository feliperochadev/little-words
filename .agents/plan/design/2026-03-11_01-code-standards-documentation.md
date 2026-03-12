# Design: Code Standards & Conventions Documentation

**Date:** 2026-03-11
**Status:** Approved
**Author:** Claude (apsc - ce)
**Related ADR:** N/A
**Research:** `.agents/plan/research-documents/2026-03-11_01-code-standards-audit/`

---

## Problem Statement

There is no single, authoritative reference for how code should be written in this repository. Conventions exist implicitly in the codebase and in per-vendor readme files (CLAUDE.md, AGENTS.md, GEMINI.md), but these are agent-workflow instructions, not a developer-facing code quality guide. This creates risk of:

- Inconsistent patterns across files as the project grows
- AI agents introducing patterns that diverge from established conventions
- New contributors (human or AI) lacking guidance on non-obvious choices
- Knowledge locked in individual session summaries rather than living docs

## Goals

- Create a `.agents/standards/` directory holding authoritative, file-by-file standards documents
- Each document covers one domain (TypeScript, components, state, testing, etc.)
- Documents reflect what the project *already does* well, plus targeted upgrades from 2025–26 best practices
- Agent workflows reference the standards directory for code review and generation
- Standards are maintainable — short, scannable, with examples from the actual codebase

## Non-Goals

- Replacing or duplicating existing agent workflow docs (CLAUDE.md, AGENTS.md, GEMINI.md) — those cover *how to operate*; standards cover *how to code*
- Adding new tooling (no new linters, no Prettier, no architectural rewrites)
- Enforcing every rule via CI — standards are guidance, CI enforces only what exists already (ESLint, tsc, Jest)
- Covering backend or non-React Native patterns

---

## Design

### Overview

Create `.agents/standards/` with one index file and six domain files. Each file is:
- ~100–200 lines max
- Scannable (headers, tables, code examples)
- Grounded in the actual codebase (references real files/patterns)
- Annotated with `✅ Do` / `❌ Don't` pairs for clarity

### Proposed File Structure

```
.agents/standards/
  README.md                   ← index + how-to-use
  typescript.md               ← TS patterns, generics, type vs interface
  components.md               ← component structure, props, memo, RN specifics
  state-management.md         ← TQ + Zustand + useState decision rules
  hooks.md                    ← custom hook design, useEffect, closures
  testing.md                  ← Jest, RNTL, Maestro conventions
  styling-and-naming.md       ← StyleSheet, theme, file/variable naming
```

### File Content Breakdown

#### `README.md`
- What this directory is and who it's for (agents + human contributors)
- Quick reference table: topic → file
- How agents should use it: "read the relevant standard before making changes in that domain"
- Rule: standards must be updated alongside any architecture change that affects their domain

#### `typescript.md`
Based on: `tsconfig.json`, `database.ts`, existing hook/service types
- `interface` vs `type` rule
- Banned: `enum`, `any`, `React.FC`, non-null assertion without comment
- Required: `strict: true`, `as const` for literals, `satisfies` for validation
- Type assertion policy: only at module boundaries (mock setups, third-party coercion)
- `@ts-expect-error` over `@ts-ignore` with mandatory comment

#### `components.md`
Based on: `AddWordModal.tsx`, `UIComponents.tsx`, `app/(tabs)/*.tsx`
- Named exports only (no `export default`)
- Props: destructure at signature, no `React.FC`, explicit return type for public components
- Prop naming: `is*`/`has*`/`can*` for booleans, `handle*` for event handlers
- `memo` / `useCallback` policy: optimization only, never default
- Component size limit: ~200 lines JSX → extract sub-component
- Accessibility: `testID` required on all interactive/assertable elements; `accessibilityLabel` on interactive elements
- Loading/error/empty state: document the three-case pattern

#### `state-management.md`
Based on: `src/stores/`, `src/hooks/`, `app/index.tsx`
- Decision table: TQ vs Zustand vs useState
- TQ rules: `QUERY_KEYS.*` always, module-level `EMPTY_*` for initialData, `MUTATION_KEYS` for invalidation
- Zustand rules: interface before `create()`, `getState()` for non-reactive reads, selector hooks in `src/hooks/useSettings.ts`
- No direct store imports in screens — use selector hooks
- Hydrate at app entry point only

#### `hooks.md`
Based on: `src/hooks/`, `useSyncOnSuccess.ts`, `useWords.ts`
- Naming: `use` prefix always, verb+noun for mutations, noun for queries
- `useEffect` rules: one concern per effect, no TQ data in deps that also reset form state, named async inner function
- Returning closures: must be stable (useCallback if deps vary)
- Module-level const for empty defaults (not inline `[]`)
- When *not* to create a hook: simple `useState` with no shared concern → inline it

#### `testing.md`
Based on: `__tests__/`, `renderWithProviders.tsx`, `jest.setup.js`
- Directory rules: unit / integration / screens / e2e
- Describe = module name, it = present-tense behaviour description
- `jest.clearAllMocks()` in `beforeEach`
- DB mocked at `database.ts` module level
- `renderWithProviders` for all component tests
- Zustand state seeded via `useXxxStore.setState(...)`
- `getByTestId` preferred over `getByText`
- Maestro: `id:` selectors, `scrollUntilVisible` before off-screen assertions, `waitForAnimationToEnd` after transitions
- Coverage floor: 99% lines, 95% functions/branches/statements on changed code

#### `styling-and-naming.md`
Based on: `src/utils/theme.ts`, `words.tsx`, `UIComponents.tsx`
- `StyleSheet.create()` at file bottom, never inline style objects in JSX (except `flex: 1` shorthand)
- Colors via `COLORS.*` only — no hardcoded hex
- Style key names: camelCase noun (`container`, `wordRow`, `headerTitle`)
- File naming table (screens, components, hooks, services, stores, utils, tests)
- Variable naming: `SCREAMING_SNAKE_CASE` for module-level constants, `camelCase` for all others
- Boolean vars: `is*` / `has*` / `can*` prefix always
- Handler functions: `handle*` prefix

---

## Data Flow

Not applicable — this is a documentation initiative, not a feature with data flow.

---

## Alternatives Considered

### Single monolithic `CODING-STANDARDS.md`
- Simpler to create but becomes unwieldy (500+ lines), harder to navigate, harder for agents to reference the relevant section
- Rejected in favour of domain-scoped files

### Extend CLAUDE.md / AGENTS.md / GEMINI.md
- These files already contain workflow instructions; mixing code standards pollutes the agent-operation docs
- Cross-vendor sync becomes harder to maintain
- Rejected — keep concerns separate

### ESLint rules only
- Not all conventions can be expressed as lint rules (naming patterns, memo policy, test structure)
- ESLint is already CI-enforced; standards fill the gap for things lint can't catch
- Rejected as sole mechanism; lint is complementary

---

## Open Questions

- [x] Should standards reference specific file paths as examples? → Yes, rooted in the actual codebase
- [x] Should there be a `SCREAMING_SNAKE_CASE` rule for all module constants or only truly fixed ones? → Only truly fixed (`COLORS`, `DEFAULT_CATEGORIES`); query key objects stay camelCase (`QUERY_KEYS`)

---

## Acceptance Criteria

- [ ] `.agents/standards/README.md` exists with index table and usage instructions
- [ ] 6 domain files created covering TypeScript, components, state, hooks, testing, styling/naming
- [ ] Each file has `✅ Do` / `❌ Don't` examples grounded in actual codebase patterns
- [ ] All vendor readmes (CLAUDE.md, AGENTS.md, GEMINI.md) reference `.agents/standards/` in a "Code Standards" section
- [ ] Changelog entry `2026-03-11_13` added
