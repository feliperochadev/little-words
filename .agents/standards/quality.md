# Code Quality Standards

Aligned with the **Sonar Way** quality gate active for this project. All conditions apply to **new code** introduced in every PR or push. Agents must not ship code that would break these thresholds.

---

## Sonar Way Quality Gate — New Code Conditions

| Metric | Threshold | Meaning |
|--------|-----------|---------|
| Maintainability Rating | **A** (≤ 0 debt ratio) | No new code smells rated above A |
| Reliability Rating | **A** (0 bugs) | No new bugs introduced |
| Coverage | **≥ 80 %** | New lines must be covered by tests |
| Duplicated Lines Density | **< 3 %** (gate) / **< 2 %** (project standard) | New code duplication must stay below 2 % |

> These are hard gates — a PR that fails any condition must **not be shipped** until fixed.

---

## Cognitive Complexity (S3776)

SonarCloud rule **S3776** — max allowed: **15** per function.

- **Extract sub-components in React**: When a component's JSX or logic becomes too complex, extract parts into smaller, focused sub-components. This is preferred over extracting just helper functions that return JSX, as sub-components have their own lifecycle and are easier to test and memoize.
- **Use Readonly for props**: Always wrap component props with `Readonly<Props>` to prevent accidental mutations and satisfy Sonar standards.
- Each `if`, `else if`, `for`, `while`, `catch`, `&&`, `||`, ternary `?:` adds +1.
- Nesting adds a bonus (+1 per nesting level beyond the first).

```tsx
// ❌ Don't — high complexity due to nested conditionals and alignment logic
export function TimelineItem({ item, index, isLeft }) {
  return (
    <View>
      {isLeft ? <Card content={item.text} /> : <Date text={item.date} />}
      <Dot />
      {isLeft ? <Date text={item.date} /> : <Card content={item.text} />}
    </View>
  );
}

// ✅ Do — extract sub-components and use layout tricks (like row-reverse)
function TimelinePane({ content, isLeft }) { ... }
export function TimelineItem({ item, index }) {
  const isLeft = index % 2 === 0;
  return (
    <View style={{ flexDirection: isLeft ? 'row' : 'row-reverse' }}>
      <TimelinePane content={<Card item={item} />} />
      <Dot />
      <TimelinePane content={<Date item={item} />} />
    </View>
  );
}
```

---

## SQL Duplication & CTEs

- **Avoid duplicated subqueries in UNION ALL**: When joining multiple tables (e.g., `words` and `variants`) and performing identical subqueries for each branch (like counting assets), use a **Common Table Expression (CTE)** to calculate the shared data once.
- **COALESCE for safety**: When joining with a CTE that might not have a match for every row, use `COALESCE(count, 0)` to ensure consistent numeric results.

```sql
-- ❌ Don't — duplicated subqueries in both UNION branches
SELECT id, (SELECT COUNT(*) FROM assets WHERE parent_id = w.id) AS audio_count FROM words w
UNION ALL
SELECT id, (SELECT COUNT(*) FROM assets WHERE parent_id = v.id) AS audio_count FROM variants v;

-- ✅ Do — calculate once in a CTE
WITH AssetStats AS (
  SELECT parent_id, COUNT(*) AS audio_count FROM assets GROUP BY parent_id
)
SELECT w.id, COALESCE(ast.audio_count, 0) FROM words w LEFT JOIN AssetStats ast ON ast.parent_id = w.id
UNION ALL
SELECT v.id, COALESCE(ast.audio_count, 0) FROM variants v LEFT JOIN AssetStats ast ON ast.parent_id = v.id;
```

---

## Function Nesting Depth (S2004)

SonarCloud rule **S2004** — functions must not be nested more than **4 levels deep**.

Each arrow function, callback, or closure counts as one nesting level. The component function itself is level 1.

```ts
// ❌ Don't — 5 levels deep (component → async handler → Promise callback → Alert buttons → onPress)
const withBackup = async (action) => {           // level 2
  await new Promise<void>((resolve) => {         // level 3
    Alert.alert('...', '...', [
      { onPress: () => {                         // level 4
        void Promise.resolve(action()).then(      // level 5 ← Sonar violation
          () => resolve()
        );
      }},
    ]);
  });
};

// ✅ Do — extract the Alert into a top-level helper that returns a Promise<boolean>
function promptBackupFailed(t): Promise<boolean> {  // level 1 (top-level)
  return new Promise<boolean>((resolve) => {         // level 2
    Alert.alert('...', '...', [
      { text: t('cancel'), style: 'cancel', onPress: () => resolve(false) },  // level 3
      { text: t('proceed'), onPress: () => resolve(true) },                   // level 3
    ]);
  });
}

const withBackup = async (action) => {           // level 2
  // ...
  const proceed = await promptBackupFailed(t);   // no extra nesting
  if (proceed) await action();
};
```

**Prevention:** whenever you find yourself writing `new Promise` inside an async handler that is itself inside another callback, extract the Promise into a standalone named function at the module top level.

---

## Unused Props / PropTypes (S6767)

Avoid defining props in a component or arguments in a callback that are never used.

- **Destructuring in `renderItem`**: In `FlatList`'s `renderItem`, ensure all destructured arguments (`item`, `index`) are actually used in the returned JSX or handlers.
- If an argument is required by the signature but not used, prefix it with an underscore (e.g., `{ item, _index }`).

```tsx
// ❌ Don't — 'index' is defined but never used
const renderItem = ({ item, index }) => <WordCard word={item.word} />;

// ✅ Do — use 'index' or remove it
const renderItem = ({ item, index }) => <WordCard word={item.word} isFirst={index === 0} />;
```

---

## Negated Conditions (S7735)

Avoid negated conditions in `if` statements and ternary expressions — prefer the positive form.

```ts
// ❌ Don't
if (!params) return str;
const val = x !== undefined ? parse(x) : defaultVal;

// ✅ Do
if (params) { return parse(str, params); }
return str;

const val = x === undefined ? defaultVal : parse(x);
```

---

## Avoid Repeated `push()` Calls (S7778)

When appending multiple items to the same array in sequence, prefer one `push(...)` call with all elements.

```ts
// ❌ Don't
items.push(first);
items.push(second);
items.push(third);

// ✅ Do
items.push(first, second, third);
```

---

## Extract Nested Ternaries (S3358)

Nested ternary expressions reduce readability and should be replaced with `if/else` or helper functions.

```ts
// ❌ Don't
const tpl = locale === 'pt-BR'
  ? (isFirst ? ptFirst : pt)
  : (isFirst ? enFirst : en);

// ✅ Do
let tpl;
if (locale === 'pt-BR') {
  tpl = isFirst ? ptFirst : pt;
} else {
  tpl = isFirst ? enFirst : en;
}
```

---

## Pseudorandom Generators In Security-Sensitive Paths (S2245)

Avoid `Math.random()` when Sonar flags a hotspot. Use deterministic selection when true randomness is not required by product behavior.

```ts
// ❌ Don't
const pick = list[Math.floor(Math.random() * list.length)];

// ✅ Do
const daySeed = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAY_MS);
const pick = list[daySeed % list.length];
```

---

## React `useState` Naming (S6754)

Always destructure `useState` into a `[value, setValue]` pair where the setter name is `set` + capitalized state name.

```ts
// ❌ Don't — setter name doesn't match convention
const [locale, setLocaleState] = useState<Locale>('en-US');

// ✅ Do — setter follows set{StateName} convention
const [locale, setLocale] = useState<Locale>('en-US');
```

If the state setter name conflicts with another function in scope, rename the other function (e.g., the public API wrapper becomes `handleSetLocale`), **not** the state setter.

---

## Code Duplication

- New code must stay **below 2 %** duplicated lines density (project standard — stricter than the Sonar gate's 3 %).
- Shared animation logic → `src/hooks/useModalAnimation.ts`
- Shared waveform playback animation → `src/hooks/useWaveformAnimation.ts`
- Shared audio/photo overlay state + handlers → `src/hooks/useAssetPreviewOverlays.ts`
- Shared overlay JSX pair rendering → `src/components/AssetPreviewOverlays.tsx`
- Shared color helpers → `src/utils/colorHelpers.ts` (`withOpacity`)
- Shared animation constants → `src/utils/animationConstants.ts` (`WAVEFORM`, `MODAL_ANIMATION`, `TIMING`)
- Before duplicating a block > 5 lines, extract a utility or hook.

**How to check duplication before shipping:**
1. Run `npm run ci` — the full suite also runs the Sonar-equivalent checks locally.
2. After merging a PR, review the SonarCloud "New Code" tab for "Duplicated Lines Density". If it shows ≥ 2 %, the PR must not be shipped until fixed.
3. As a manual proxy: count duplicated lines in your diff; if the same block (> 5 lines) appears in more than one file, extract it.

**Common duplication hotspots to watch:**

- **Waveform animation** — the `useEffect` that drives bar animations is token-for-token identical across `AudioPreviewOverlay`, `MediaLinkingModal`, and any future audio playback UI. Always use `useWaveformAnimation(isPlaying)` instead of inline.
- **Overlay state types** (`AudioOverlayState`, `PhotoOverlayState`) and their matching `useState` + overlay JSX pattern — use `useAssetPreviewOverlays()` + `<AssetPreviewOverlays>` instead of duplicating state and overlay pairs.
- **Media chip rendering** — components that render `<TouchableOpacity>` chips with an Ionicon + label + remove button (like `MediaChips` and `WordAssetChips`) share significant structure. Extract a reusable chip row component when the same chip shape appears in more than one layout branch.
- **Context value objects in providers** — always wrap the value object in `useMemo` (see S6481 below) to avoid the value changing on every render, which itself inflates duplication metrics across all consumers.

---

## Magic Numbers (S109)

Replace raw numeric literals with named constants.

```ts
// ❌ Don't
setTimeout(callback, 250);
opacity: 0.15

// ✅ Do
import { SLIDE_OUT_DURATION } from '../utils/animationConstants';
setTimeout(callback, SLIDE_OUT_DURATION);
const OPACITY_SUBTLE = 0.15;
```

All modal animation constants live in `src/utils/animationConstants.ts`.

---

## Test Coverage

| Scope | Target |
|-------|--------|
| New code (Sonar gate) | ≥ 80 % coverage (minimum gate — project standard supersedes this) |
| Changed code (project standard) | **99 % lines**, **95 % functions / branches / statements** |

- Every changed file must meet the project standard, not just the Sonar gate minimum.
- Coverage report is generated by `npm run test:coverage` → `./coverage/lcov.info`.
- SonarCloud ingests it via `sonar.javascript.lcov.reportPaths=./coverage/lcov.info`.

```bash
# Run locally to check coverage before shipping
npm run test:coverage
```

---

## Explicit Return Types (React Components)

Rule **S3800** is suppressed for `.tsx` files — React component return types are correctly inferred by TypeScript. Do not add redundant `JSX.Element` annotations.

```tsx
// ✅ Do — inferred return type for components
export default function WordsScreen() { ... }

// ❌ Don't — redundant annotation
export default function WordsScreen(): JSX.Element { ... }
```

For non-component functions, explicit return types are preferred for clarity.

---

## Node.js Built-in Imports (S7772)

Always use the `node:` protocol for Node.js built-in module imports.

```ts
// ❌ Don't
import { execFileSync } from 'child_process';
import os from 'os';

// ✅ Do
import { execFileSync } from 'node:child_process';
import os from 'node:os';
```

---

## Async Callbacks on Event Handler Props (S6544)

React Native props like `onPress`, `onChangeText`, `onSubmit` expect `() => void`. Passing `async () => Promise<void>` is a type mismatch (Sonar rule **S6544**, BUG/MAJOR).

```tsx
// ❌ Don't — async onPress returns Promise where void is expected
{ text: t('common.remove'), onPress: async () => {
    await deleteItem.mutateAsync({ id });
    onClose();
}}

// ✅ Do — use void operator to fire-and-forget
{ text: t('common.remove'), onPress: () => {
    void deleteItem.mutateAsync({ id }).then(() => { onClose(); });
}}

// ✅ Also fine — chain with .catch() for error handling
{ text: t('common.remove'), onPress: () => {
    deleteItem.mutateAsync({ id })
      .then(() => { onClose(); })
      .catch(() => { Alert.alert('Error', 'Could not delete.'); });
}}
```

---

## Useless Variable Assignments (S1854)

Remove dead assignments — variables that are assigned but never read before being overwritten or going out of scope.

```ts
// ❌ Don't — otherAssets is assigned but never used
const otherAssets = assets.filter(a => a.asset_type !== 'audio' && a.asset_type !== 'photo');

// ✅ Do — only compute what you actually use; delete unused destructuring
```

When filtering a list into multiple typed sub-arrays, only keep variables you render or pass somewhere. Delete the rest.

---

## Array Index as React List Keys (S6479)

Never use the array index as the `key` prop on list items. Always use a stable, unique identifier.

```tsx
// ❌ Don't — index keys cause subtle bugs when the list order changes
bars.map((height, i) => <Animated.View key={i} ... />)

// ✅ Do — use a domain ID or a stable derived string
bars.map((bar, i) => <Animated.View key={`waveform-bar-${i}`} ... />)

// ✅ For truly static, fixed-length arrays (e.g. waveform bars) a prefixed
//    string including the index is acceptable because the array never reorders:
linkingBarHeights.map((height, i) => <Animated.View key={`lbar-${i}`} ... />)
// ^ only acceptable when the array length is a compile-time constant and items
//    are never added, removed, or reordered at runtime.
```

For data arrays (assets, words, variants, categories) always use the entity's `id`.

---

## Prefer Optional Chaining (S6582)

Replace `x && x.y` (short-circuit guard) with optional chaining `x?.y`. It is shorter, reads more clearly, and avoids the `0`-is-falsy pitfall.

```ts
// ❌ Don't
if (!pendingMedia || pendingMedia.type !== 'audio') return;

// ✅ Do — use optional chaining and nullish coalescing together
if (pendingMedia?.type !== 'audio') return;

// ❌ Don't — redundant null guard before property access
const dur = pendingMedia && pendingMedia.durationMs;

// ✅ Do
const dur = pendingMedia?.durationMs;
```

---

## Context Value Must Be Memoized (S6481)

When a React Context provider's `value` is an object literal created inline, it gets a new reference on every render. Every consumer re-renders unnecessarily.

```tsx
// ❌ Don't — new object on every render
<MyContext.Provider value={{ foo, bar, handleAction }}>

// ✅ Do — stable reference via useMemo
const contextValue = useMemo(
  () => ({ foo, bar, handleAction }),
  [foo, bar, handleAction],
);
<MyContext.Provider value={contextValue}>
```

This applies to all providers in `src/providers/`. Wrap `contextValue` in `useMemo` with the exact deps that make up the object.

---

## Deprecated StyleSheet APIs (S1874)

`StyleSheet.absoluteFillObject` is deprecated. Use explicit absolute position properties instead.

```tsx
// ❌ Don't — deprecated API
backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' }

// ✅ Do — explicit properties
backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }

// ✅ Also fine — absoluteFill (non-deprecated) when no extra properties needed
<View style={StyleSheet.absoluteFill} />
```

---



## Updating Standards for New Sonar Issues / Security Hotspots

Whenever a new SonarCloud issue or security hotspot is surfaced — in a PR diff, via the API, or from the GitHub Security tab — **do not just fix the code: also update the standards files** so the same mistake is never made again.

### Triage routing

| Issue type | Where to document |
|------------|--------------------|
| Code smell, bug, reliability rule, security hotspot | `.agents/standards/quality.md` |
| Naming, casing, file organisation, component structure, StyleSheet usage | `.agents/standards/styling-and-naming.md` |

### Update steps

1. **Identify the rule ID** (e.g. `typescript:S6479`) from the issue detail.
2. **Open the correct standards file** based on the table above.
3. **Add a new `## <Rule Title> (<Rule ID>)` section** containing:
   - A one-line description of what the rule prohibits.
   - A `// ❌ Don't` code block from the actual offending code (or a minimal representative example).
   - A `// ✅ Do` code block showing the correct pattern.
   - Any project-specific caveats or exceptions.
4. **Add a checkbox** to the pre-commit checklist at the bottom of `quality.md` (even if the rule lives in `styling-and-naming.md` — the checklist is the single authoritative gate).
5. If the rule applies to all three vendor agents, update `CLAUDE.md`, `AGENTS.md`, and `GEMINI.md` via the cross-vendor documentation rule (only when the rule represents a workflow/architectural change, not a code-style detail — code style stays in `.agents/standards/`).

### Do this before closing the fix PR

A Sonar issue is not fully resolved until both the code is fixed **and** the corresponding rule is documented in the standards. Skipping the documentation step means the same issue will re-appear in a future PR.

---

Before every commit, verify new code:

- [ ] No function exceeds cognitive complexity 15
- [ ] No `let` variable that is never reassigned (use `const`)
- [ ] No unused imports or variables
- [ ] No useless variable assignments — every assigned variable must be read (S1854)
- [ ] No negated conditions where a positive form is clearer
- [ ] No duplicated block > 5 lines — extract a helper; new code duplication density **< 2 %**
- [ ] No array index as list key (S6479) — use a stable domain ID; prefixed index string only for truly static, fixed-length arrays
- [ ] No repeated sequential `array.push()` calls (S7778) — use one `push(a, b, c)` when appending multiple items
- [ ] No nested ternary expressions (S3358) — use `if/else` or extracted helpers
- [ ] No `Math.random()` in Sonar hotspot paths (S2245) — use deterministic or cryptographically secure alternatives as required
- [ ] Optional chaining used instead of `x && x.y` guards (S6582)
- [ ] Context provider `value` wrapped in `useMemo` (S6481)
- [ ] `useState` destructuring follows `[value, setValue]` naming
- [ ] Magic numbers replaced with named constants
- [ ] `node:` prefix used for all Node.js built-in imports
- [ ] No `async` callback on `onPress` / event handler props (S6544) — use `void fn()` instead
- [ ] No `StyleSheet.absoluteFillObject` (deprecated, S1874) — use explicit properties or `StyleSheet.absoluteFill`
