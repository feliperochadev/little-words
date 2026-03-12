# React Native + TypeScript Best Practices (2025–2026)

**Date:** 2026-03-11
**Purpose:** Industry baseline for the Palavrinhas code standards documentation

---

## TypeScript

### Type-First Design
- Prefer `interface` for object shapes that may be extended; `type` for unions, intersections, and aliases
- Avoid `enum` — prefer `const` object + `typeof` pattern or string literal unions (better tree-shaking, no runtime overhead)
- `satisfies` operator (TS 4.9+) for validating shapes without widening: `const config = { ... } satisfies Config`
- `as const` for literal narrowing on immutable objects/arrays
- Avoid `any`; use `unknown` + type narrowing for truly unknown input

### Strictness
- Always `"strict": true` in tsconfig
- `noUncheckedIndexedAccess: true` recommended for arrays/records (catches off-by-one bugs)
- `exactOptionalPropertyTypes: true` catches undefined vs absent distinction

### Generic Constraints
- Constrain generics when possible: `<T extends object>` not `<T>`
- Named type parameters: `TItem`, `TKey` for clarity in complex generics

### Common Anti-Patterns to Avoid
- No `@ts-ignore` — use `@ts-expect-error` with a comment if suppression is truly needed
- No non-null assertion (`!`) without a code comment justifying it
- No `as T` type assertion except at boundaries (mock setups, third-party coercion)

---

## React & Components

### Function Components
- Always use named function declarations or named `const` arrow functions — never anonymous exports
- Never use `React.FC` — it hides return type and adds implicit `children`
- Prefer explicit return type `JSX.Element` or `React.ReactElement` for public components
- Keep components **pure where possible** — side effects only in explicit handlers or `useEffect`

### Props Design
- Destructure props at the function signature level
- Use `Readonly<Props>` or `type Props = Readonly<{...}>` for component props to signal immutability
- Avoid boolean prop names that aren't `is*` / `has*` / `can*` (e.g. `isVisible`, `hasError`)
- Limit props to what a component *needs*, not what it *might* need — no over-provisioning

### Memo & Callbacks
- `React.memo` is an **optimization**, not a default — only apply when profiling shows unnecessary re-renders
- `useCallback` is only needed when passing a callback to a memoized child or as a stable `useEffect` dep
- `useMemo` for expensive derived computations (sorting, filtering large lists) — not for primitive derivations

### Component Size
- Single-responsibility: one component, one concern
- If a component exceeds ~200 lines of JSX, extract sub-components
- Avoid deeply nested JSX (> 4 levels) — extract named sub-components

---

## React Native Specifics

### Performance
- Use `FlatList` / `FlashList` for lists > ~10 items — never `map()` inside `ScrollView` for unbounded data
- `keyExtractor` must return a stable unique string (ID, not array index)
- Use `removeClippedSubviews={true}` on long FlatLists
- Avoid anonymous functions in `renderItem` — define outside or use `useCallback`

### Accessibility
- Every interactive element must have `accessibilityLabel` or `accessibilityHint`
- Every assertable or tappable element must have a `testID`
- `testID` for list items must include the item's unique key: `testID={`word-item-${item.id}`}`
- Use `accessible={true}` on grouped elements that should be read as one unit

### Platform
- Use `Platform.select()` or `Platform.OS` for platform-specific values, not `if/else`
- Native-only code must be guarded by `isNativeBuild()` — never rely on platform for native-build detection

### Gestures & Animations
- Prefer `react-native-reanimated` worklets for frame-rate-safe animations
- Avoid `setNativeProps` (deprecated in Fabric/New Architecture)

---

## Hooks

### Rules & Design
- Never call hooks conditionally — move conditions inside the hook
- Custom hooks must start with `use` and call at least one other hook
- A hook that only wraps `useState` + `useEffect` with no abstraction benefit — just inline it
- Hooks returning closures: the closure must be a stable reference (use `useCallback` if deps change frequently)

### useEffect
- Each effect should have exactly one concern
- `cleanup` function required for subscriptions, timers, and event listeners
- Prefer splitting one effect with many deps into multiple focused effects
- Never use `useLayoutEffect` unless measuring DOM (rare in RN)

### Data Fetching
- All server/SQLite state via TanStack Query — no direct database calls in components or screens
- `queryKey` arrays must be deterministic — same inputs = same key
- `staleTime` and `gcTime` set explicitly for queries where freshness matters
- Mutations call `invalidateQueries` on success — never manually set query data

---

## State Management

### Choosing the Right Layer
| Scenario | Tool |
|---|---|
| Server/DB data (words, categories) | TanStack Query |
| Cross-screen user profile / auth | Zustand |
| Form input, modal visibility, sort order | useState |
| Derived from existing state | useMemo / selector |

### Zustand Best Practices
- Store interface declared separately before `create()`
- Actions and state co-located in same store (no separate slice files for small stores)
- Use `getState()` for reads outside React render cycle (event handlers, callbacks)
- `immer` middleware optional for deeply nested state updates
- Hydrate stores at app entry point — never lazy-hydrate in a component

---

## Error Handling

### Hierarchy
1. **Recoverable UI errors**: catch in handler, show `Alert` or inline error message
2. **Background / fire-and-forget**: `.catch(console.error)` — never swallow silently
3. **Unrecoverable**: let crash to error boundary or global handler

### Async/Await
- Always `try/catch` for `await` expressions that can fail
- `finally` for cleanup that must always run (setLoading(false), setRefreshing(false))
- Never use `async` in `useEffect` directly — extract named async function inside

```ts
// ✅ Correct
useEffect(() => {
  async function load() {
    try { ... } catch (e) { ... }
  }
  load();
}, []);
```

---

## Imports & Module Boundaries

### Import Order (standardized)
1. React / React Native core
2. Expo packages (`expo-*`, `@expo/*`)
3. Third-party packages
4. Internal absolute imports (`@/` alias or `../../src/`)
5. Relative imports (`./`)
6. Type-only imports (`import type`)

### Path Aliases
- Use `@/*` alias for cross-directory imports to avoid `../../..` chains
- Relative imports only for same-directory or one-level siblings

### Barrel Files
- Barrel files (`index.ts`) reduce refactoring surface — use for public APIs of folders with 3+ exports
- Never re-export everything (`export * from`) — be explicit

---

## Testing

### Test Quality Principles
- Tests document behaviour, not implementation — test what the component *does*, not how
- Prefer `getByTestId` / `findByTestId` over `getByText` for stability
- Use `userEvent` (RNTL 12+) over `fireEvent` for more realistic interactions
- `waitFor` with assertions, not `waitFor(() => {})` bare
- No `act()` wrapping unless explicitly needed (RNTL handles most cases)

### Coverage as a Floor, Not a Goal
- 99% line coverage minimum on changed code — but strive for meaningful assertions
- A test that hits a line without asserting behaviour is a false pass

### Mocking Strategy
- Mock at module boundaries (database, network, native modules)
- Never mock the thing you're testing
- Prefer `jest.spyOn` + `mockReturnValue` over `jest.mock` for partial mocking

---

## Naming Conventions

### Variables & Functions
- `camelCase` for all variables, functions, and hook names
- `PascalCase` for React components, types, interfaces, and classes
- `SCREAMING_SNAKE_CASE` for module-level constants that are truly fixed (`COLORS`, `DEFAULT_CATEGORIES`)
- Boolean variables: `isLoading`, `hasError`, `canSubmit` — always `is/has/can` prefix
- Event handlers: `handle` prefix: `handleSave`, `handleClose`, `handleDelete`
- Async functions: verb + noun: `fetchWords`, `loadSettings`, `performSync`

### Files
- React component files: `PascalCase.tsx`
- Hook files: `useCamelCase.ts`
- Utility files: `camelCase.ts`
- Service files: `camelCaseService.ts`
- Store files: `camelCaseStore.ts`
- Test files: mirror source with `.test.ts(x)` suffix
- Screen files (Expo Router): `lowercase.tsx` (framework requirement)

---

## Code Smell Checklist

Flags that warrant a review:
- [ ] Component with 3+ `useState` calls that are always updated together → consolidate or lift to a hook
- [ ] `useEffect` with > 4 dependencies → likely doing too much; split
- [ ] Direct DB import in a screen or component → route through service + hook
- [ ] Raw query key strings (`['words']`) → use `QUERY_KEYS.*`
- [ ] Inline `[]` as default for TQ data → use module-level const
- [ ] `useSettingsStore()` in a screen → use selector hook from `useSettings.ts`
- [ ] Hardcoded color hex value → use `COLORS.*` from `theme.ts`
- [ ] `@ts-ignore` without explanation → add comment or fix the type
- [ ] `any` in production code → replace with specific type or `unknown`
- [ ] More than 200 lines of JSX in one component file → extract sub-component
