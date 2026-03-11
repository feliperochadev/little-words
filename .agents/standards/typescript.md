# TypeScript Standards

---

## `interface` vs `type`

| Use | When |
|---|---|
| `interface` | Object shapes that represent entities or contracts (DB rows, component props when extending is possible) |
| `type` | Union types, intersections, aliases, and mapped types |

```ts
// ✅ Do — domain entity as interface
interface Word { id: number; word: string; date: string; categoryId: number; }

// ✅ Do — union as type
type SortField = 'word' | 'date' | 'category';

// ❌ Don't — enum (runtime overhead, poor tree-shaking)
enum SortField { Word = 'word', Date = 'date' }

// ✅ Do — const object + typeof instead of enum
const SORT_FIELDS = { word: 'word', date: 'date' } as const;
type SortField = typeof SORT_FIELDS[keyof typeof SORT_FIELDS];
```

---

## Strictness

The project uses `"strict": true` (inherited from `expo/tsconfig.base`). Do not relax it.

Recommended additions (not yet enabled — add via ADR if adopted):
- `noUncheckedIndexedAccess: true` — catches off-by-one bugs on array/record access
- `exactOptionalPropertyTypes: true` — distinguishes `undefined` from absent property

---

## Generics

- Constrain generics when possible: `<T extends object>` rather than bare `<T>`
- Use the existing DB helper pattern as the model:

```ts
// ✅ Do — generic with descriptive constraint
async function query<T extends object>(sql: string, params?: SQLiteBindParams): Promise<T[]>
```

---

## Banned Patterns

| Pattern | Why Banned | Alternative |
|---|---|---|
| `any` in production code | Defeats type safety | `unknown` + type narrowing |
| `@ts-ignore` | Silences without explanation | `@ts-expect-error` with comment |
| Non-null assertion `!` without comment | Hidden assumption | Add a comment justifying it, or refactor |
| `React.FC` | Hides return type, adds implicit `children` | Bare function with explicit return type |
| `enum` | Runtime overhead, poor tree-shaking | String literal unions or `as const` object |

```ts
// ❌ Don't
const value = data as any;
// @ts-ignore
const x = foo.bar;

// ✅ Do
const value = data as Word;  // at a verified type boundary
// @ts-expect-error: third-party type missing `foo` (tracked in issue #42)
const x = (foo as ExtendedFoo).bar;
```

---

## Type Assertions (`as T`)

Permitted **only** at module boundaries:
- Test mock setups: `jest.spyOn(...) as jest.Mock`
- Third-party coercion where the library's types are wrong

Never use `as T` to paper over a logic error.

---

## `as const` and `satisfies`

```ts
// ✅ Do — as const for immutable literals
const COLORS = { background: '#fff', text: '#1a1a1a' } as const;

// ✅ Do — satisfies for shape validation without widening
const config = { locale: 'en-US', fallback: 'pt-BR' } satisfies LocaleConfig;
```

---

## TanStack Query Type Inference

Do not annotate `useQuery` with an explicit type parameter — infer from the service return type:

```ts
// ✅ Do — type flows from wordService.getWords return type
export function useWords(search?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.words(search),
    queryFn: () => wordService.getWords(search),
    initialData: EMPTY_WORDS,
  });
}

// ❌ Don't — redundant explicit annotation
return useQuery<Word[]>({ ... });
```
