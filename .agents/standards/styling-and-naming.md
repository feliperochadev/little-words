# Styling & Naming Standards

**Applies to:** All files in `src/`, `app/`

---

## 1. StyleSheet Rules

### Always Use `StyleSheet.create()`

Define styles at the **bottom of each file** in a single `StyleSheet.create()` call. Never use inline style objects in JSX (except the `style={{ flex: 1 }}` shorthand).

```tsx
// ✅ Do — StyleSheet at file bottom
export function WordCard({ item }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.wordText}>{item.word}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  wordText:  { fontSize: 18, fontWeight: '600', color: theme.colors.text },
});

// ❌ Don't — inline style objects create new references on every render
<View style={{ flex: 1, padding: 12 }}>
```

### Style Key Naming

- `camelCase` always
- Descriptive nouns: `container`, `header`, `title`, `row`, `badge`, `icon`
- Qualified nouns for variants: `wordText`, `wordRow`, `headerTitle`, `emptyContainer`
- No abbreviations: `container` not `cont`, `header` not `hdr`

### Colors

Always use theme tokens from `src/theme` (or `useTheme()` for runtime-reactive colors). Never hardcode hex values.

```ts
// ✅ Do
color: theme.colors.text
backgroundColor: theme.colors.background
borderColor: theme.colors.border

// ❌ Don't
color: '#333333'
backgroundColor: '#FFF9FB'
```

Category colors and emojis live in `src/theme/category.ts`.

---

## 2. File Naming

| Type | Convention | Example |
|------|-----------|---------|
| Expo Router screen | `lowercase.tsx` (framework requirement) | `home.tsx`, `words.tsx` |
| React component | `PascalCase.tsx` | `AddWordModal.tsx`, `UIComponents.tsx` |
| Custom hook | `useCamelCase.ts` | `useWords.ts`, `useSyncOnSuccess.ts` |
| Service | `camelCaseService.ts` | `wordService.ts`, `variantService.ts` |
| Zustand store | `camelCaseStore.ts` | `settingsStore.ts`, `authStore.ts` |
| Utility | `camelCase.ts` | `theme.ts`, `csvExport.ts`, `importHelpers.ts` |
| Test | mirrors source + `.test.ts(x)` | `AddWordModal.test.tsx`, `useSyncOnSuccess.test.ts` |
| Database | `lowercase.ts` | `database.ts` |

---

## 3. Variable & Function Naming

### Casing Rules

| Scope | Convention | Example |
|-------|-----------|---------|
| Variables and functions | `camelCase` | `searchQuery`, `handleSave` |
| React components | `PascalCase` | `WordCard`, `CategoryBadge` |
| Types and interfaces | `PascalCase` | `Word`, `DashboardStats`, `Props` |
| Module-level fixed constants | `SCREAMING_SNAKE_CASE` | `COLORS`, `DEFAULT_CATEGORIES`, `EMPTY_WORDS` |
| Query key objects | `SCREAMING_SNAKE_CASE` (object) + `camelCase` (keys) | `QUERY_KEYS.words(search)` |

### Boolean Variables

Always use `is*` / `has*` / `can*` prefix:

```ts
// ✅ Do
const isLoading = true;
const hasError = false;
const canSubmit = name.trim().length > 0;

// ❌ Don't
const loading = true;
const error = false;
const submitEnabled = true;
```

### Event Handlers

Internal handlers use `handle*` prefix. Props that accept handlers use `on*`:

```ts
// ✅ Do — internal function
function handleSave() { ... }
function handleDelete(id: number) { ... }

// ✅ Do — prop name
<WordCard onDelete={handleDelete} onEdit={handleEdit} />
```

### Async Functions

Verb + noun:

```ts
// ✅ Do
async function fetchWords() { ... }
async function loadSettings() { ... }
async function performSync(t: TranslateFunc) { ... }
```

---

## 4. Import Order

Maintain this order in every file (separate groups with a blank line):

```ts
// 1. React / React Native core
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';

// 2. Expo packages
import { useFocusEffect } from 'expo-router';

// 3. Third-party packages
import { useQuery } from '@tanstack/react-query';

// 4. Internal src imports (absolute or relative)
import { QUERY_KEYS } from '../hooks/queryKeys';
import { useWords } from '../hooks/useWords';
import { theme } from '../theme';

// 5. Type-only imports
import type { Word } from '../database/database';
```

Use the `@/*` path alias for imports that would require 3+ `../` segments.

---

## 5. Constants Location

| Constant type | File |
|---------------|------|
| UI colors/tokens | `src/theme/index.ts` → `theme`, `colors`, `space`, `radii`, `shadow` |
| Category colors/emojis | `src/theme/category.ts` → `CATEGORY_COLORS`, `CATEGORY_EMOJIS` |
| Shared layout constants | `src/theme/layout.ts` → `layout` |
| Built-in category keys | `src/utils/categoryKeys.ts` → `DEFAULT_CATEGORIES`, `DEFAULT_CATEGORY_KEY_SET` |
| TanStack Query keys | `src/hooks/queryKeys.ts` → `QUERY_KEYS`, `*_MUTATION_KEYS` |
| Module-level empty arrays | Top of the relevant hook file |

No magic strings or hex values in component or screen logic. Everything derives from constants or `t()`.
