# SonarQube AI CodeFix Rules — Reference

This file documents the [SonarQube AI CodeFix rules](https://docs.sonarsource.com/sonarqube-server/quality-standards-administration/managing-rules/rules-for-ai-codefix#ai-codefix-rules)
applicable to this TypeScript / React Native project.

**Relevant rule sets:** `typescript:*`, `javascript:*`, `tssecurity:*`, `jssecurity:*`

Security and quality rules already covered in `security.md` and `quality.md` are not repeated here. This file focuses on rules not yet explicitly documented.

---

## Bugs

### S2259 — Null pointer dereference
Never call a method or access a property on a value that may be `null` or `undefined` without first narrowing its type.

```ts
// ❌ Don't — item may be undefined
const label = items[idx].label;

// ✅ Do
const label = items[idx]?.label ?? '';
```

### S6544 — Async callback on event handlers (covered in quality.md)

### S1751 — Loop with at most one iteration
A loop body that always `return`s, `break`s, or `throw`s on the first iteration should be a simple `if` statement.

```ts
// ❌ Don't
for (const item of list) {
  return item.value;  // always exits on first iteration
}

// ✅ Do
return list[0]?.value;
```

### S3984 — Promise created but not used
Every `Promise` returned by an `async` function or `then` chain must be either `await`ed, `return`ed, or intentionally discarded with `void`.

```ts
// ❌ Don't — fire-and-forget without intent
deleteWord.mutateAsync({ id });

// ✅ Do — explicit void
void deleteWord.mutateAsync({ id });

// ✅ Also fine — awaited
await deleteWord.mutateAsync({ id });
```

---

## Code Smells

### S1172 — Unused function parameters
Remove unused parameters, or prefix with `_` if required by an interface/signature.

```ts
// ❌ Don't
function format(value: string, locale: string) {
  return value.trim();   // locale is unused
}

// ✅ Do — prefix with _ to signal intentional non-use
function format(value: string, _locale: string) {
  return value.trim();
}
```

### S1481 — Unused local variables
Every declared variable must be used. Unused variables produce dead code and can mask bugs.

```ts
// ❌ Don't
const unused = computeSomething();
return result;

// ✅ Do — remove the declaration entirely
return result;
```

### S1854 — Dead store (value assigned but never read)
Do not assign a value to a variable that is immediately overwritten or never read.

```ts
// ❌ Don't
let result = '';
result = computeResult();  // initial assignment never read
return result;

// ✅ Do
const result = computeResult();
return result;
```

### S3358 — Ternary operator nesting
Nested ternary expressions reduce readability. Extract a helper or use `if/else`.

```ts
// ❌ Don't
const label = x ? a : y ? b : c;

// ✅ Do
function getLabel(x: boolean, y: boolean) {
  if (x) return a;
  if (y) return b;
  return c;
}
```

### S1066 — Collapsible `if` statements
Two consecutive `if` statements with no `else` branch and identical bodies should be combined with `&&`.

```ts
// ❌ Don't
if (a) {
  if (b) { doThing(); }
}

// ✅ Do
if (a && b) { doThing(); }
```

### S3972 — Conditional followed by same condition
Do not check the same condition in consecutive `if` / `else if` branches.

```ts
// ❌ Don't
if (x > 0) { a(); }
if (x > 0) { b(); }  // same condition

// ✅ Do
if (x > 0) { a(); b(); }
```

### S3973 — Misleading one-liner
Every `if`, `for`, `while`, or `else` body must use braces — even for single-statement bodies.

```ts
// ❌ Don't
if (flag) doThing();

// ✅ Do
if (flag) { doThing(); }
```

### S1135 — Track TODO comments
`// TODO:` comments must reference a tracked issue. Never leave orphan TODOs in production code.

```ts
// ❌ Don't
// TODO: fix later

// ✅ Do
// TODO(#42): refactor after migration
```

### S125 — Commented-out code
Remove commented-out code from production files. Use version control to recover deleted code.

### S1128 — Unnecessary imports
Remove imports that are not referenced in the file.

### S1874 — Deprecated APIs (covered in quality.md)

---

## Security

### S2068 — Hardcoded credentials
Never embed passwords, tokens, or API keys in source code (covered in `security.md`).

### S2612 — Insecure file permissions
Do not grant world-writable permissions when creating files in scripts.

```ts
// ❌ Don't
fs.chmodSync(filePath, 0o777);

// ✅ Do
fs.chmodSync(filePath, 0o644);
```

### S5659 — JWT without signature verification
If any JWT handling is added, always verify the signature — never decode without verification.

### S4830 — Weak TLS configuration
Any HTTPS client must use TLS 1.2 or higher and must not disable certificate validation.

### S2245 — Weak pseudo-random number generator
Use `crypto.getRandomValues()` (or `expo-crypto`) for security-sensitive random values, not `Math.random()`.

```ts
// ❌ Don't — for security-sensitive use
const token = Math.random().toString(36);

// ✅ Do
import * as Crypto from 'expo-crypto';
const token = await Crypto.digestStringAsync(
  Crypto.CryptoDigestAlgorithm.SHA256,
  `${Date.now()}-${Math.random()}`
);
```

### S5332 — Insecure protocol (http://)
All network calls must use HTTPS. Never fall back to plain HTTP.

### S3330 — Cookies without HttpOnly flag
If cookies are used (e.g. WebView), always set the `HttpOnly` flag.

---

## TypeScript-Specific Rules

### S4325 — Unnecessary type assertion
Do not cast with `as T` when the type is already `T`.

```ts
// ❌ Don't
const name = (user.name as string).trim();  // name is already string

// ✅ Do
const name = user.name.trim();
```

### S4322 — Type assertion to less specific type
Avoid `as unknown as T` double-cast patterns — they defeat the type system.

### S4157 — Generic type parameter used only once
A type parameter that appears only in one position is usually better expressed as a concrete type.

```ts
// ❌ Don't
function wrap<T>(value: T): { value: T } { return { value }; }
// T only serves as pass-through; can be replaced with any

// ✅ Do — use explicit generic only when T appears in multiple positions
function pair<T>(a: T, b: T): [T, T] { return [a, b]; }
```

### S4156 — Namespace with only one export
Replace a `namespace` with only one export with a regular module export.

### S2966 — Non-null assertion on optional chaining
Avoid `?.!` — it contradicts the intent of optional chaining.

```ts
// ❌ Don't
const value = obj?.prop!.trim();

// ✅ Do
const value = obj?.prop?.trim() ?? '';
```

### S3257 — Unnecessary public modifier
In TypeScript, class members are `public` by default. The `public` keyword is redundant.

```ts
// ❌ Don't
class MyClass {
  public name: string = '';
}

// ✅ Do
class MyClass {
  name: string = '';
}
```

### S1533 — Prefer arrow functions
Use arrow function expressions over `function` keyword expressions for callbacks and inline functions.

```ts
// ❌ Don't
arr.map(function(item) { return item.id; });

// ✅ Do
arr.map((item) => item.id);
```

---

## React & React Native Specific

### S6747 — Unnecessary JSX spread
Do not spread all props of an object onto a component. Pass only what is needed.

```ts
// ❌ Don't
<Component {...props} />  // spreads unknown keys

// ✅ Do
<Component label={props.label} onPress={props.onPress} />
```

### S6749 — No useless fragments
Never wrap a single element or no elements in a `<>...</>` fragment.

```tsx
// ❌ Don't
return <><Text>{value}</Text></>;

// ✅ Do
return <Text>{value}</Text>;
```

### S6750 — Avoid JSX as a prop name
Component props named `jsx` shadow the JSX transform and should be renamed.

### S6754 — useState setter naming (covered in quality.md)

### S6635 — Prefer `Array.at(-1)` over `arr[arr.length - 1]`
Use `.at(-1)` for the last element.

```ts
// ❌ Don't
const last = items[items.length - 1];

// ✅ Do
const last = items.at(-1);
```

---

## Complete Rule ID Reference

For the full, canonical list of TypeScript AI CodeFix rules, see:
https://docs.sonarsource.com/sonarqube-server/quality-standards-administration/managing-rules/rules-for-ai-codefix#ai-codefix-rules-for-typescript-and-typescript-security

Key TypeScript rule IDs tracked by SonarCloud in this project include (non-exhaustive):

| Category | Rule IDs |
|----------|----------|
| Bugs | S2259, S1751, S3984, S6544, S2187, S2201 |
| Security | S2068, S2612, S4036, S5659, S4830, S2245, S5332, S3330, S5042, S2631 |
| Code Smells | S1172, S1481, S1854, S3358, S1066, S3972, S3973, S1135, S125, S1128, S1874 |
| TypeScript | S4325, S4322, S4157, S4156, S2966, S3257, S1533, S4326, S1774 |
| React | S6747, S6749, S6750, S6754, S6635 |
| Complexity | S3776 (cognitive > 15 — covered in quality.md) |

---

## Sonar Rule Checklist

Before every commit, verify new code:

- [ ] No null/undefined dereference without type narrowing (S2259)
- [ ] All fire-and-forget Promises use `void` (S3984)
- [ ] No unused parameters — prefix with `_` if unavoidable (S1172)
- [ ] No unused variables or dead stores (S1481, S1854)
- [ ] No nested ternaries — extract helper if needed (S3358)
- [ ] All `if/for/while` bodies use braces (S3973)
- [ ] No commented-out code (S125)
- [ ] No unnecessary type assertions (S4325, S2966)
- [ ] No insecure protocols or weak crypto (S5332, S2245)
- [ ] No unnecessary JSX fragments (S6749)
