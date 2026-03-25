# Component Standards

---

## Internationalisation (i18n) — Mandatory Rule

**All user-visible strings must come from the i18n catalogues** (`src/i18n/en-US.ts` and `src/i18n/pt-BR.ts`). Never hardcode text that appears in the UI, notifications, or any output the user sees directly in component, service, or hook files.

```ts
// ✅ Do — get text from i18n
const { t } = useI18n();
return <Text>{t('notifications.nudge3dTitle')}</Text>;

// ✅ Do — in a non-React service, import the catalogue directly
import enUS from '../i18n/en-US';
import ptBR from '../i18n/pt-BR';
const cat = locale === 'pt-BR' ? ptBR : enUS;
const title = cat.notifications.nudge3dTitle;

// ❌ Don't — hardcode strings in component or service files
const EN_STRINGS = { nudge3dTitle: 'New sounds today?' };
```

This rule applies to:
- Component JSX text and props
- Service/hook functions that produce user-visible content (notifications, alerts, etc.)
- Any file that renders or schedules content in both supported locales

---

## File Structure

Every component file follows this order:

```tsx
// 1. Imports
import React from 'react';
import { View, StyleSheet } from 'react-native';

// 2. Types
type Props = { visible: boolean; onClose: () => void; };

// 3. Component (named export)
export function AddWordModal({ visible, onClose }: Props) {
  // a. hooks (all at top)
  // b. derived state / memos
  // c. handlers
  // d. JSX return
}

// 4. Styles (at file bottom)
const styles = StyleSheet.create({ ... });
```

---

## Exports

```ts
// ✅ Do — named export
export function WordCard({ word }: Props) { ... }

// ❌ Don't — default export for components
export default function WordCard({ word }: Props) { ... }
```

Expo Router screen files (`app/`) must use `export default` as required by the framework. All other components use named exports.

---

## Props

```ts
// ✅ Do — local type alias, destructured at signature
type Props = { word: string; date: string; onDelete: () => void; };
export function WordCard({ word, date, onDelete }: Props) { ... }

// ❌ Don't — React.FC (hides return type, adds implicit children)
const WordCard: React.FC<Props> = ({ word }) => { ... };

// ❌ Don't — inline object type at call site
export function WordCard({ word }: { word: string }) { ... }
```

**Prop naming conventions:**

| Pattern | Use for |
|---|---|
| `is*` / `has*` / `can*` | Booleans (`isVisible`, `hasError`, `canDelete`) |
| `on*` | Event callbacks (`onClose`, `onSave`, `onDelete`) |
| `handle*` | Internal handlers — never exposed as props |

---

## `memo` / `useCallback` / `useMemo`

These are **optimizations**, not defaults. Apply only when profiling shows unnecessary re-renders.

```ts
// ✅ Do — memo on a list item that re-renders frequently
export const WordItem = React.memo(function WordItem({ word }: Props) { ... });

// ❌ Don't — memo on every component by default
export const SimpleLabel = React.memo(function SimpleLabel({ text }: Props) { ... });

// ✅ Do — useCallback when passing to a memoized child or as stable useEffect dep
const handleDelete = useCallback(() => { deleteWord(id); }, [id, deleteWord]);

// ❌ Don't — useCallback for inline handlers that are never deps
const handlePress = useCallback(() => setOpen(true), []);  // no benefit
```

---

## Component Size

- **Single responsibility**: one component, one concern.
- If a component exceeds **~200 lines of JSX**, extract a named sub-component.
- Avoid deeply nested JSX (> 4 levels) — extract and name the inner block.

---

## Loading / Error / Empty States

Every screen or component that fetches data must handle all three cases:

```tsx
// ✅ Do — three-case pattern
if (isLoading) return <ActivityIndicator />;
if (error) return <ErrorMessage message={t('errors.load')} />;
if (words.length === 0) return <EmptyState message={t('words.empty')} />;
return <WordList words={words} />;
```

Do not render partial UI when data is unavailable.

---

## Accessibility

- Every **interactive** element must have `accessibilityLabel` (or `accessibilityHint`).
- Every **interactive or assertable** element must have a `testID`.
- List items must include the item key in `testID`:

```tsx
// ✅ Do
<TouchableOpacity
  testID={`word-item-${item.word}`}
  accessibilityLabel={item.word}
  onPress={() => handleOpen(item)}
>

// ❌ Don't — generic testID that can't address individual items
<TouchableOpacity testID="word-item">
```

- Use `accessible={true}` on grouped elements that should be read as one unit by screen readers.

---

## React Native Performance

- Use `FlatList` (or `FlashList`) for lists > ~10 items — never `map()` inside `ScrollView` for unbounded data.
- `keyExtractor` must return a **stable unique string** (ID, not array index).
- Define `renderItem` outside the component or with `useCallback` — never as an anonymous inline function.
- Add `removeClippedSubviews={true}` on long `FlatList`s.

---

## Conditional Rendering

```tsx
// ✅ Do — ternary for two branches
{isEditing ? <EditForm /> : <DisplayRow />}

// ✅ Do — && for presence check
{hasError && <ErrorBanner />}

// ❌ Don't — && with a number (renders 0)
{words.length && <WordList />}  // renders "0" when empty

// ✅ Do — explicit boolean check
{words.length > 0 && <WordList />}
```
