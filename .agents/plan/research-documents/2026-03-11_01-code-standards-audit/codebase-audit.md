# Codebase Audit: Existing Conventions in Palavrinhas

**Date:** 2026-03-11
**Purpose:** Baseline for the code standards documentation initiative

---

## 1. TypeScript Patterns

### Config (`tsconfig.json`)
- Extends `expo/tsconfig.base` — already sets `strict: true`, `esModuleInterop`, `jsx: react-native`
- Adds `paths: { "@/*": ["./*"] }` for root-relative imports
- No `noUncheckedIndexedAccess` (could be tightened) 
- `skipLibCheck: true` (inherited)

### Types vs Interfaces
- Domain entities (DB rows) defined as `interface` in `database.ts`: `Word`, `Variant`, `Category`, `DashboardStats`
- Function props use `React.ComponentProps` generics or inline type literals
- `type` used for union types and aliases (e.g. `type SortField`, `type Locale`)
- No enums found — string literals with union types preferred

### Type Assertions
- No `as any` in production code
- Occasional `as jest.Mock` in tests — acceptable in mock boundary

### Generics
- `query<T>()` and `run()` DB helpers use generics for return type
- TanStack Query infers from service return types — no explicit `useQuery<T>` annotation needed

---

## 2. Component Patterns

### Structure
```tsx
// Named export (not default)
export function AddWordModal({ visible, word, onClose, onSave }: Props) {
  // 1. hooks (all at top)
  // 2. derived state / memos
  // 3. handlers
  // 4. JSX
}
```

- All components are **named exports** (no `export default` for components)
- Props typed inline or with a local `type Props = { ... }` alias above the function
- `React.FC` **not used** — bare function signature preferred
- `forwardRef` not used (no imperative handles needed)
- `memo` used selectively (not defaulted everywhere)

### JSX
- Self-closing for elements with no children
- Ternary for conditional rendering; `&&` for presence checks
- No JSX fragments unless needed (`<>...</>`)

---

## 3. Hooks Patterns

### Naming & Location
- All custom hooks in `src/hooks/` — `useXxx.ts` (camelCase, starts with `use`)
- Mutation hooks: `useAddWord`, `useUpdateWord`, `useDeleteWord` (verb + noun)
- Query hooks: `useWords`, `useCategories` (noun only, or `useDashboardStats`)

### TanStack Query Pattern
```ts
export function useWords(search?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.words(search),
    queryFn: () => wordService.getWords(search),
    initialData: EMPTY_WORDS,  // module-level const, not inline []
  });
}
```

Key rules observed:
- `initialData` uses a **module-level const** (never inline `[]`) to avoid infinite effect loops
- `queryKey` always uses `QUERY_KEYS.*` (never raw strings)
- Mutations call `queryClient.invalidateQueries` via `WORD_MUTATION_KEYS` prefix arrays
- `useFocusEffect` for refetch lives **inside the hook**, not in screens

### useEffect
- Effect deps never include TQ data arrays
- Split effects that reset form state from effects that use TQ data

---

## 4. State Management

### Zustand Stores (`src/stores/`)
```ts
interface SettingsState {
  name: string; sex: string; birth: string; isOnboardingDone: boolean;
  hydrate: () => Promise<void>;
  setProfile: (name: string, sex: string, birth: string) => Promise<void>;
  setOnboardingDone: () => Promise<void>;
}
export const useSettingsStore = create<SettingsState>((set) => ({ ... }));
```
- Interface defined above `create()`
- Actions co-located with state (not separate slice)
- Non-reactive reads use `useAuthStore.getState()` (not `useAuthStore(s => s.x)`)
- Store hydration called at app start in `app/index.tsx`

### Selector hooks (`src/hooks/useSettings.ts`)
```ts
export function useChildProfile() {
  return useSettingsStore(s => ({ name: s.name, sex: s.sex, birth: s.birth }));
}
```
- Wrapper hooks expose subsets of store state — screens never import stores directly

---

## 5. File & Folder Naming

| Category | Convention | Example |
|---|---|---|
| Expo Router screens | lowercase | `home.tsx`, `words.tsx` |
| React components | PascalCase | `AddWordModal.tsx`, `UIComponents.tsx` |
| Hooks | camelCase prefixed with `use` | `useWords.ts`, `useSyncOnSuccess.ts` |
| Services | camelCase + `Service` suffix | `wordService.ts`, `variantService.ts` |
| Stores | camelCase + `Store` suffix | `settingsStore.ts`, `authStore.ts` |
| Utils | camelCase descriptive | `theme.ts`, `csvExport.ts`, `importHelpers.ts` |
| Tests | mirrors source with `.test.tsx?` | `AddWordModal.test.tsx` |
| DB file | lowercase | `database.ts` |

---

## 6. Import Conventions

### Order (observed, not lint-enforced)
1. React / React Native core
2. Expo packages
3. Third-party packages (TanStack, Zustand, gesture handler)
4. Internal absolute: `../../src/...`
5. Relative: `./`

### Path Alias
- `@/*` alias available but **rarely used** — most imports use relative paths `../../src/...`
- No barrel files (`index.ts`) — direct imports to source files

---

## 7. Styling Conventions

### Pattern
```ts
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  wordText:  { fontSize: 18, fontWeight: '600', color: COLORS.text },
});
```
- All styles via `StyleSheet.create()` at file bottom — no inline style objects in JSX (except `flex:1` shorthands)
- Colors **always** from `COLORS` in `src/utils/theme.ts` — no hardcoded hex values
- Style key names: camelCase, descriptive noun (container, header, title, row, badge)
- No styled-components or CSS-in-JS

---

## 8. Error Handling

### Async Operations
- `async/await` with `try/catch` for user-initiated actions
- `.catch(console.error)` for fire-and-forget (e.g. background sync)
- `try/finally` for operations that must reset loading state
- `Alert.alert()` for user-facing errors in screens/modals

### Promise chains
- Prefer `async/await` over `.then()` chains
- `.catch()` only for fire-and-forget patterns

---

## 9. Testing Conventions

### Organization
```
__tests__/
  unit/           pure logic, no rendering
  integration/    component render tests (RNTL)
  screens/        full screen tests
  e2e/            Maestro YAML flows
  helpers/        renderWithProviders, shared setup
```

### Jest patterns
```ts
describe('AddWordModal', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it('saves a new word on submit', async () => { ... });
});
```
- `describe` = module/component name; `it` = present-tense behaviour
- `jest.clearAllMocks()` in `beforeEach` — not `jest.resetAllMocks()`
- Database mocked via `jest.mock('../../src/database/database', () => ({ ... }))`
- Components wrapped in `renderWithProviders` (QueryClient + I18n)
- Zustand state seeded with `useXxxStore.setState({ ... })`

### Coverage targets
- 99% lines, 95% functions/branches/statements on changed code

---

## 10. Constants & Magic Values

- Colors: `COLORS` object in `src/utils/theme.ts`
- Category emojis/colors: `CATEGORY_COLORS`, `CATEGORY_EMOJIS` in same file
- Built-in category keys: `DEFAULT_CATEGORIES` array + `DEFAULT_CATEGORY_KEY_SET` Set in `src/utils/categoryKeys.ts`
- Query keys: `QUERY_KEYS` object in `src/hooks/queryKeys.ts`
- Mutation key arrays: `WORD_MUTATION_KEYS`, `VARIANT_MUTATION_KEYS`, etc. in `queryKeys.ts`
- No magic numbers/strings in component logic — derive from constants or translate via `t()`

---

## Summary: What Is Already Good

1. Consistent hook/component naming
2. Module-level empty-array constants (prevents infinite re-renders)
3. Centralized theme + query keys
4. Clear 3-tier state strategy (TQ / Zustand / useState)
5. Service layer isolating DB from hooks
6. `renderWithProviders` test helper
7. Strict TS mode

## Gaps to Address in Standards

1. `@/*` alias available but inconsistently used — standardize
2. No formal import order rule (currently not lint-enforced)
3. No documented rule for when to use `memo` / `useCallback`
4. `React.FC` avoidance not documented
5. No documented rule for prop drilling depth before reaching for Zustand
6. No documented accessibility (`testID`, `accessibilityLabel`) standard
7. No documented rule for component file size limits or splitting criteria
8. No documented pattern for loading/error/empty states in screens
