# Hooks Standards

---

## Naming & Location

All custom hooks live in `src/hooks/` and follow these naming rules:

| Type | Pattern | Examples |
|---|---|---|
| Query (read) | Noun only | `useWords`, `useCategories`, `useDashboardStats` |
| Mutation (write) | Verb + Noun | `useAddWord`, `useUpdateVariant`, `useDeleteCategory` |
| Selector/wrapper | `use` + concept | `useSyncOnSuccess` |

Hook files use `camelCase` prefixed with `use`: `useWords.ts`, `useSyncOnSuccess.ts`.

---

## When NOT to Create a Hook

If it is just `useState` + no shared logic or reuse benefit, keep it inline in the component.

```ts
// ❌ Don't — trivial wrapper adds indirection for no benefit
function useModalOpen() {
  const [isOpen, setIsOpen] = useState(false);
  return { isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) };
}

// ✅ Do — inline in the component
const [isAddWordOpen, setIsAddWordOpen] = useState(false);
```

Create a hook when: logic is shared across ≥ 2 consumers, or when it wraps TanStack Query / Zustand with domain semantics.

---

## `useEffect` Rules

1. **One concern per effect** — if removing one dep would break one behaviour but not another, split.
2. **Named async inner function** — never use `async` directly on the effect callback.
3. **Cleanup required** for subscriptions, timers, and event listeners.
4. **Never include TQ data arrays** in deps of an effect that also resets form state (see [state-management.md](state-management.md)).

```ts
// ✅ Do — named async inner function
useEffect(() => {
  async function load() {
    try {
      const data = await settingsService.get('locale');
      setLocale(data ?? 'en-US');
    } catch (e) {
      console.error(e);
    }
  }
  load();
}, []);

// ❌ Don't — async effect callback
useEffect(async () => {
  const data = await settingsService.get('locale');
  setLocale(data);
}, []);
```

---

## Stable Empty-Array Constants

Never use inline `[]` as a default for TQ `initialData` when the result feeds a `useEffect` dep:

```ts
// ✅ Do — module-level const, stable reference
const EMPTY_WORDS: Word[] = [];

export function useWords(search?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.words(search),
    queryFn: () => wordService.getWords(search),
    initialData: EMPTY_WORDS,
  });
}

// ❌ Don't — new array ref every render
return useQuery({ ..., initialData: [] });
```

Name the constant `EMPTY_<PLURAL_ENTITY>` (e.g. `EMPTY_WORDS`, `EMPTY_VARIANTS`, `EMPTY_CATEGORIES`).

---

## Returning Closures

If a hook returns a function that callers put in a `useEffect` dep or pass to a memoized child, it must be stable:

```ts
// ✅ Do — stable callback from hook
export function useSyncOnSuccess() {
  const { isConnected } = useAuthStore();
  return useCallback(async () => {
    if (!isConnected) return;
    await performSync().catch(console.error);
  }, [isConnected]);
}

// ❌ Don't — new function reference every render
export function useSyncOnSuccess() {
  const { isConnected } = useAuthStore();
  return async () => { ... };  // new ref on every render
}
```

---

## TanStack Query Hook Pattern

Follow this template for all query hooks:

```ts
export function useWords(search?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.words(search),    // always QUERY_KEYS.*
    queryFn: () => wordService.getWords(search),
    initialData: EMPTY_WORDS,              // module-level const
  });
}
```

And for mutations:

```ts
export function useAddWord() {
  const queryClient = useQueryClient();
  const syncOnSuccess = useSyncOnSuccess();
  return useMutation({
    mutationFn: (params: AddWordParams) => wordService.addWord(params),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: WORD_MUTATION_KEYS });
      await syncOnSuccess();
    },
  });
}
```

---

## `useFocusEffect`

Belongs inside the **hook**, not in the screen:

```ts
// ✅ Do — in src/hooks/useDashboardStats.ts
export function useDashboardStats() {
  const result = useQuery({ ... });
  useFocusEffect(useCallback(() => { result.refetch(); }, [result.refetch]));
  return result;
}

// ❌ Don't — in a screen
export default function HomeScreen() {
  const { data, refetch } = useDashboardStats();
  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));
  ...
}
```
