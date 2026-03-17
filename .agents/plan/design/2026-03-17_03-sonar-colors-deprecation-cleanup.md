# Design: Sonar COLORS Deprecation Cleanup

**Date:** 2026-03-17
**Status:** Approved
**Author:** codex
**Related ADR:** N/A

---

## Problem Statement

PR #35 has multiple Sonar findings tied to deprecated `COLORS` usage from `src/utils/theme` (bridge module). These references remain across startup screens and shared UI components, creating quality-gate noise and risking non-reactive theme behavior where runtime sex-adaptive colors are expected.

## Goals

- Eliminate deprecated `COLORS` bridge usage from production runtime files in scope.
- Keep UI behavior and existing sex-adaptive theming behavior unchanged.
- Pass repository CI after migration (`npm run ci`).

## Non-Goals

- Reworking the theme architecture beyond replacing deprecated bridge usage.
- Replacing content emojis or unrelated iconography in this task.

## Design

### Overview

Perform a targeted migration for files still importing `COLORS` from `src/utils/theme`:

- Use `useTheme()` for runtime-reactive UI surfaces in components/screens.
- Use direct token imports from `src/theme` for static startup-only screens that do not require runtime switching.
- Preserve existing component contracts and tests, adding only minimal updates needed by changed props/styles.

### Component / Module Breakdown

| Component | Responsibility | File(s) |
|-----------|---------------|---------|
| Startup screens | Replace deprecated static `COLORS` import with canonical theme token import | `app/loading.tsx`, `app/index.tsx` |
| Home screen | Remove bridge color usage and route all runtime colors through `useTheme()` | `app/(tabs)/home.tsx` |
| Onboarding screen | Migrate deprecated color constants in style/runtime surfaces to current theme API | `app/onboarding.tsx` |
| Shared UI components | Remove deprecated bridge imports and use `useTheme()`/theme tokens | `src/components/ManageCategoryModal.tsx`, `src/components/BrandHeader.tsx`, `src/components/DatePickerField.tsx` |
| Verification | Ensure regressions are caught and CI passes | `__tests__/...` as required |

### Data Flow

```
Developer migration → Replace deprecated imports/usages → Runtime render with canonical theme tokens → Sonar issue reduction
```

### UI / UX Decisions

- No user-facing copy changes.
- No interaction-flow changes.
- Color values should remain visually equivalent where static tokens are replaced.
- Runtime-reactive screens/components continue to use sex-adaptive colors via `useTheme()`.

### Error Handling

- If token mapping is ambiguous (e.g., old `textLight` style intent), map to nearest supported token (`textMuted`) and verify via tests.
- Any CI/test breakages are fixed within migration scope before completion.

## Alternatives Considered

- Keep bridge usage and suppress Sonar warnings: rejected because it preserves technical debt and conflicts with design-system guidance.
- Big-bang migration of all bridge exports including tests/docs: rejected as higher risk and out of scope for this cleanup.

## Open Questions

- [x] None for execution scope.

## Acceptance Criteria

- [ ] No deprecated `COLORS` imports remain in targeted production files listed in scope.
- [ ] Touched screens/components keep behavior and render correctly with existing theme logic.
- [ ] `npm run ci` passes.
