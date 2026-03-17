# Prompt — 2026-03-17_03-sonar-colors-deprecation-cleanup

## Original Prompt
There are a lot of sonar issues from this branch most of them are related to `'COLORS' is deprecated` check and fix them: https://sonarcloud.io/project/issues?issueStatuses=OPEN%2CCONFIRMED&id=feliperochadev_little-words&pullRequest=35

---

## Refined Prompt

### 1. Prompt Analysis
- **Intent:** Remove or migrate deprecated `COLORS` bridge usage (`src/utils/theme`) causing Sonar issues in PR #35, while preserving UI behavior and theme correctness.
- **Weaknesses or ambiguities:** Sonar issue list is not directly accessible from static HTML without authenticated JS execution; “most issues” is vague and does not define scope boundaries (code vs docs/tests).
- **Missing constraints or context:** Needs explicit migration target (`src/theme` and `useTheme()`), treatment of static splash/onboarding contexts, whether tests/docs should be updated, and required verification command(s).

### 2. Edge Cases
- Static module styles that currently rely on `COLORS` may need runtime `useTheme()` conversion to avoid stale blossom defaults.
- Non-reactive startup screens (`app/index.tsx`, `app/loading.tsx`) should use safe static tokens without introducing hooks.
- Some references are intentional compatibility checks (`__tests__/unit/theme.test.ts`, bridge exports) and should remain.
- Replacing `COLORS.white`/`COLORS.textLight` must map to valid current tokens (`surface`, `textMuted`, etc.) to avoid visual regressions.
- Existing shipped icon/theme work must remain unchanged.

### 3. Suggested Improvements
- Scope to production TypeScript files first (`app/**/*.tsx`, `src/**/*.tsx`, `src/**/*.ts`) and exclude docs unless directly tied to Sonar quality gate.
- Use migration rules:
  - Runtime UI surfaces: `useTheme()` + `colors`.
  - Static non-reactive surfaces: import from `src/theme` (`colors`) instead of bridge.
  - Keep bridge-only tests as-is unless failing.
- Require validation: run targeted suites for touched screens/components, then `npm run ci`.
- Capture a small before/after audit list of migrated files in implementation notes/changelog.

### 4. Clarifying Questions
None — proceed with the default migration strategy above.

### 5. Refined Prompt
Fix Sonar issues in this branch related to deprecated `COLORS` usage from `src/utils/theme`.

Scope:
- Audit TypeScript production files for `COLORS` references and `from '../utils/theme'` bridge imports.
- Migrate deprecated usage to current design-system patterns:
  - Runtime-reactive UI surfaces: `useTheme()` and `colors`.
  - Static/non-reactive contexts (startup screens, static helpers): import token values from `src/theme` directly instead of the bridge.
- Preserve behavior/UI and avoid unrelated refactors.
- Do not remove intentional compatibility coverage in bridge-focused unit tests unless required.

Targets likely include:
- `app/loading.tsx`
- `app/index.tsx`
- `app/(tabs)/home.tsx`
- `app/onboarding.tsx`
- `src/components/ManageCategoryModal.tsx`
- `src/components/BrandHeader.tsx`
- `src/components/DatePickerField.tsx`

Validation:
1. Run targeted tests for touched screens/components.
2. Run `npm run ci`.
3. Fix any regressions.

Documentation:
- Update implementation tracking notes and changelog entry with migrated files and verification outcome.
