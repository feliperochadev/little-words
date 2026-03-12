# State Management Standards

---

## Decision Table

| Scenario | Tool |
|---|---|
| Words, variants, categories, dashboard (SQLite data) | **TanStack Query v5** |
| Child profile, Google auth, onboarding flag (cross-screen) | **Zustand v5** |
| Modal visibility, form inputs, sort order (local UI) | **useState** |
| Derived from existing state | `useMemo` or inline selector |

When in doubt: if it needs to survive a navigation change, it's Zustand or TQ. If it resets on unmount, it's `useState`.

---

## TanStack Query Rules

### Query keys

Always use `QUERY_KEYS.*` from `src/hooks/queryKeys.ts` — never raw strings.

```ts
// ✅ Do
queryKey: QUERY_KEYS.words(search),

// ❌ Don't
queryKey: ['words', search],
```

### Empty-array defaults

Always use a **module-level constant** for `initialData` — never an inline `[]`.

```ts
// ✅ Do — module-level const prevents infinite effect loops
const EMPTY_WORDS: Word[] = [];

export function useWords(search?: string) {
  return useQuery({ ..., initialData: EMPTY_WORDS });
}

// ❌ Don't — new reference on every render
return useQuery({ ..., initialData: [] });
```

### Mutations and invalidation

Mutations call `queryClient.invalidateQueries` on success via `*_MUTATION_KEYS` prefix arrays:

```ts
// ✅ Do
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: WORD_MUTATION_KEYS });
},

// ❌ Don't — manually setting query data after mutation
onSuccess: (newWord) => {
  queryClient.setQueryData(QUERY_KEYS.words(), prev => [...prev, newWord]);
},
```

### `useFocusEffect` refetch

Lives **inside the query hook**, not in screens:

```ts
// ✅ Do — in src/hooks/useDashboardStats.ts
useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

// ❌ Don't — in a screen component
useFocusEffect(useCallback(() => { refetchStats(); }, [refetchStats]));
```

### `useEffect` deps

Never include TQ data arrays in the deps of a `useEffect` that also resets form state. Split into two separate effects:

```ts
// ✅ Do — separate effects for separate concerns
useEffect(() => { setFormWord(word?.word ?? ''); }, [word?.word]);
useEffect(() => { if (words.length > 0) scrollRef.current?.scrollToEnd(); }, [words.length]);

// ❌ Don't — combined effect with TQ data array as dep
useEffect(() => {
  setFormWord('');
  scrollRef.current?.scrollToEnd();
}, [words]);  // new array ref on every render → infinite loop
```

---

## Zustand Rules

### Store structure

```ts
// ✅ Do — interface declared before create()
interface SettingsState {
  name: string;
  isOnboardingDone: boolean;
  hydrate: () => Promise<void>;
  setProfile: (name: string, sex: string, birth: string) => Promise<void>;
}
export const useSettingsStore = create<SettingsState>((set) => ({ ... }));

// ❌ Don't — inline type inside create()
export const useSettingsStore = create<{ name: string; }>((set) => ({ ... }));
```

### Reads inside React components

Use selector hooks from `src/hooks/` (currently `useSettings.ts` is removed in favour of direct store access — use `useSettingsStore` / `useAuthStore` directly in screens):

```ts
// ✅ Do — direct store access in screens
const { name, sex, birth } = useSettingsStore();

// ✅ Do — non-reactive read (callbacks, outside render)
const { isConnected } = useAuthStore.getState();

// ❌ Don't — subscribe to the whole store when only one field is needed
// (creates unnecessary re-renders; use a selector if performance matters)
const store = useSettingsStore();
```

### Hydration

Both stores are hydrated **once** at app entry in `app/index.tsx`. Never lazy-hydrate inside a component.

```ts
// ✅ Do — in app/index.tsx
await useSettingsStore.getState().hydrate();
await useAuthStore.getState().hydrate();
```

### Test setup

Seed store state directly in tests:

```ts
// ✅ Do
useSettingsStore.setState({ name: 'Ana', sex: 'F', birth: '2023-01-01', isOnboardingDone: true });
useAuthStore.setState({ isConnected: false });
```

---

## `useState` Scope

`useState` is for values that are purely local to a component and don't need to survive navigation:

- Modal open/close flags (`isAddWordOpen`)
- Form field values before submission (`inputWord`, `selectedCategory`)
- Sort/filter UI state (`sortField`, `sortAsc`)
- Loading/refreshing flags for user-initiated actions

If the same state is needed in two unrelated siblings, lift to Zustand — not prop drilling.
