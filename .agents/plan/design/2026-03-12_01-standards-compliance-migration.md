# Design: Standards Compliance Migration

**Date:** 2026-03-12
**Status:** Draft
**Author:** Codex (apsc - cx)
**Related ADR:** N/A
**Research:** `.agents/plan/research-documents/2026-03-12_01-standards-compliance-migration/compliance-audit.md`

---

## Problem Statement

The current codebase is not fully compliant with the coding standards defined in `.agents/standards/`. The audit found recurring violations in component typing conventions, style usage, TypeScript strictness practices, and testing selector patterns. Without a targeted migration, future changes will continue to mix compliant and non-compliant patterns, increasing maintenance cost and review friction.

## Goals

- Bring `src/`, `app/`, and test suites into alignment with `.agents/standards/*`.
- Remove recurring banned patterns (`React.FC`, broad `any`, unsafe non-null assertions without justification, text-driven test selectors where avoidable).
- Standardize styling usage (`StyleSheet` usage and color constants) and accessibility/testID coverage for interactive elements.
- Migrate tests toward resilient selector and interaction patterns (`testID`, `userEvent`, Maestro `id:` selectors).
- Keep behavior and UX unchanged while improving implementation quality.

## Non-Goals

- Shipping new user-facing features.
- Introducing new dependencies or replacing core libraries.
- Reworking architecture beyond what is needed for standards compliance.
- Refactoring unrelated modules that are already compliant.

## Design

### Overview

Execute a staged migration by domain so each standards area is corrected systematically and validated by CI:

1. TypeScript and hooks safety pass.
2. Component and styling pass.
3. Jest and Maestro test modernization pass.
4. Final consistency pass across docs and standards references.

Each stage should be delivered with focused commits and explicit verification using `npm run ci`.

### Component / Module Breakdown

| Component | Responsibility | File(s) |
|-----------|---------------|---------|
| Type safety migration | Remove banned TS patterns (`any`, unsafe `!`, `React.FC`), preserve type inference patterns | `src/components/**/*.tsx`, `src/hooks/**/*.ts`, `src/database/database.ts`, `src/utils/**/*.ts`, `app/**/*.tsx` |
| Hooks/state compliance | Keep `useFocusEffect` inside hooks, ensure screen-level data fetching rules are respected | `src/hooks/*.ts`, `app/(tabs)/settings.tsx` |
| Styling/naming compliance | Replace inline style objects and hardcoded colors with `StyleSheet` + `COLORS`/constants | `app/**/*.tsx`, `src/components/**/*.tsx` |
| Accessibility/testID pass | Ensure interactive controls expose stable `testID` and accessibility metadata | `app/**/*.tsx`, `src/components/**/*.tsx` |
| Jest modernization | Prefer `renderWithProviders`, `getByTestId`, `userEvent` where applicable | `__tests__/integration/**/*.test.tsx`, `__tests__/screens/**/*.test.tsx` |
| Maestro selector migration | Replace app text selectors with `id:` selectors (except OS-level alerts) | `__tests__/e2e/**/*.yaml` |

### Data Flow

Migration workflow:

```
[Standards requirement]
  → [Codemod / manual refactor by domain]
  → [Unit/integration/screen/e2e test updates]
  → [npm run ci verification]
  → [Residual audit and cleanup]
```

Runtime app data flow is not intentionally changed in this migration.

### UI / UX Decisions

- Preserve existing UX behavior and copy unless a standards rule requires testability or accessibility metadata additions.
- Prioritize non-visible quality improvements (types, selectors, style structure) over visual redesign.
- Keep localization behavior unchanged (`en-US`/`pt-BR` keys and translations remain intact).

### Error Handling

- Replace broad `catch (e: any)` with typed/narrowed handling (`unknown` + explicit narrowing) where touched.
- Preserve existing user-facing error reporting patterns (`Alert.alert`, translated messages).
- Do not add silent fallbacks; surface or propagate errors consistently with existing app behavior.

## Alternatives Considered

- **Single massive migration PR:** rejected due to review risk and regression blast radius.
- **Lint-only enforcement without code migration:** rejected because current violations would remain and standards drift would persist.
- **Selective migration of only production code:** rejected because testing standards are a core part of `.agents/standards/testing.md`.

## Open Questions

- [ ] Should strict compliance be enforced incrementally per domain or blocked until full-repo migration is complete?
- [ ] Which hardcoded color usages remain acceptable exceptions (e.g., embedded brand SVG paths)?
- [ ] Should additional lint rules be introduced after migration to prevent regression, or kept as review-time policy only?

## Acceptance Criteria

- [ ] No `React.FC` usage in `src/components/**/*.tsx`.
- [ ] No production `any` usages in `src/` and `app/` (except explicitly documented third-party type-boundary exceptions).
- [ ] No screen-level `useFocusEffect` calls for data refetch patterns that belong in hooks.
- [ ] Inline style objects removed from JSX except explicitly allowed shorthand exceptions.
- [ ] Hardcoded hex colors removed from component/screen logic in favor of constants (with documented exceptions).
- [ ] Interactive app elements expose required `testID` and accessibility metadata per standards.
- [ ] Jest tests use resilient selectors and interaction APIs aligned with testing standards.
- [ ] Maestro flows use `id:` selectors for app-rendered UI assertions/interactions.
- [ ] `npm run ci` passes after migration.
