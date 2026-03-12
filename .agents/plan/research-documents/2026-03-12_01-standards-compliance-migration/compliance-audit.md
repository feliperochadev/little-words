# Standards Compliance Audit

**Date:** 2026-03-12
**Scope:** `.agents/standards/*.md` versus current repository implementation (`app/`, `src/`, `__tests__/`)
**Method:** Static code search + targeted file inspection + baseline CI execution

---

## Baseline Verification

- `npm run ci` completed successfully (lint + typecheck + tests).
- Passing CI does **not** imply full standards compliance because several standards are not lint-enforced.

---

## Compliance Summary by Standard File

| Standard | Status | Notes |
|---|---|---|
| `typescript.md` | ❌ Partial | Banned patterns present (`any`, non-null assertion without justification, `React.FC`) |
| `components.md` | ❌ Partial | `React.FC` widely used; inline styles remain; accessibility/testID coverage inconsistent |
| `hooks.md` | ⚠️ Mostly compliant | Hook naming/query key usage is good, but one screen still uses `useFocusEffect`; non-null assertion remains |
| `state-management.md` | ⚠️ Mostly compliant | `QUERY_KEYS` usage is consistent; refetch behavior still appears in `app/(tabs)/settings.tsx` |
| `styling-and-naming.md` | ❌ Partial | Inline style objects and hardcoded colors in app/component logic |
| `testing.md` | ❌ Partial | RNTL tests still rely heavily on `getByText`/`fireEvent`; Maestro has many text selectors |

---

## Key Findings (Evidence)

### 1) `React.FC` usage in components (banned by standards)

- Count: **12 matches** across `src/components`.
- Examples:
  - `src/components/UIComponents.tsx:25`
  - `src/components/AddCategoryModal.tsx:27`
  - `src/components/AddVariantModal.tsx:26`
  - `src/components/ImportModal.tsx:91`

### 2) `any` usage in production code

- Count: **28 matches** across `src/` + `app/`.
- Examples:
  - `src/database/database.ts:99` (`args: any[]`)
  - `src/database/database.ts:276` (`query<any>(...)`)
  - `src/components/AddCategoryModal.tsx:139` (`catch (e: any)`)
  - `src/components/ImportModal.tsx:84` (`catch (e: any)`)
  - `app/onboarding.tsx:46` (`event: any`)

### 3) Non-null assertions without justification

- Examples:
  - `src/hooks/useVariants.ts:29` (`wordId!`)
  - `src/components/AddVariantModal.tsx:133` (`effectiveWord!.id`)
  - `app/(tabs)/words.tsx:71-72` (`item.category_id!`, `item.category_name!`)
  - `app/onboarding.tsx:195` (`birthDate!`)

### 4) Screen-level `useFocusEffect` instead of hook-level refetch

- Violation:
  - `app/(tabs)/settings.tsx:67` (`useFocusEffect(...)`)
- Positive contrast:
  - Hook-level usage exists in `src/hooks/useWords.ts`, `src/hooks/useVariants.ts`, `src/hooks/useDashboard.ts`.

### 5) Inline style objects in JSX

- Count: **8 matches** across `app/` + `src/components/`.
- Examples:
  - `app/(tabs)/settings.tsx:175`
  - `app/(tabs)/settings.tsx:284`
  - `app/onboarding.tsx:265`
  - `src/components/UIComponents.tsx:199`

### 6) Hardcoded hex colors in component/screen logic

- Multiple matches in app/components, including:
  - `app/onboarding.tsx:141`, `app/onboarding.tsx:433-434`
  - `app/(tabs)/home.tsx:33`, `app/(tabs)/home.tsx:66`
  - `src/components/AddWordModal.tsx:496-500`
  - `src/components/UIComponents.tsx:238`
- Note: color constants inside `src/utils/theme.ts` and `src/utils/categoryKeys.ts` are expected and not violations.

### 7) Jest selector/interaction patterns diverge from testing standards

- `getByText(`: **35 matches** in test files.
- `fireEvent.`: **208 matches** in test files.
- Examples:
  - `__tests__/integration/UIComponents.test.tsx:8-9`, `:15`, `:153`
  - `__tests__/screens/home.test.tsx:44`

### 8) Maestro text selector usage

- Text `assertVisible` / `tapOn` matches: **132** across e2e flows.
- Examples:
  - `__tests__/e2e/onboarding.yaml:11-12`, `:21`, `:24-26`
  - `__tests__/e2e/search-sort-words.yaml:16`, `:19-20`, `:31-32`, `:47`

---

## Positive Compliance Signals

- No `enum` usage found in `src/` + `app/`.
- No `@ts-ignore` usage found in `src/` + `app/`.
- No explicit `useQuery<T>` generic annotations found in hooks.
- No raw query key arrays (`queryKey: [...]`) found in hooks.
- No `initialData: []` anti-pattern found in hooks.

---

## Conclusion

The repository is **not fully compliant** with `.agents/standards/`. The biggest gaps are in:

1. Component typing/style conventions.
2. Type safety cleanup in production code.
3. Test selector and interaction standards.

A dedicated staged migration plan is required before claiming compliance.
