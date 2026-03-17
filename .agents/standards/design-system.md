# Design System Standard

This document is the authoritative reference for Palavrinhas visual design. Read it before touching any component, screen style, or theme value.

---

## Theme Architecture

All design tokens live in `src/theme/`. **Never hardcode hex colors, font sizes, spacing values, border radii, or shadow values** in components or screens.

```
src/theme/
├── config.ts              ← DEFAULT_VARIANT, GIRL_VARIANT, BOY_VARIANT constants
├── index.ts               ← Exports: theme, colors, space, radii, shadow, ThemeVariant
├── types.ts               ← TypeScript interfaces for all token groups
├── getThemeForSex.ts      ← Pure fn: getThemeForSex(sex) → Theme (no React)
├── tokens/
│   ├── typography.ts      ← fontSize, fontWeight, lineHeight, letterSpacing
│   ├── spacing.ts         ← 4pt grid (0, 4, 8, 12, 16, 20, 24, 28, 32, 40)
│   ├── shape.ts           ← Border radii: xs(4) sm(8) md(12) lg(16) xl(20) 2xl(24) full(9999)
│   ├── elevation.ts       ← buildElevation() → none / sm / md / lg shadow presets
│   └── motion.ts          ← Durations (100–500ms) and easing strings
└── variants/
    ├── blossom.ts         ← Dusty rose + lavender (girl default)
    ├── honey.ts           ← Warm amber + honey
    └── breeze.ts          ← Sky blue (boy default)
```

**Runtime hook** (`src/hooks/useTheme.ts`): reads `sex` from Zustand store and returns the matching theme. Use this in components that render theme colors as inline props.

```typescript
import { useTheme } from '../hooks/useTheme';

function MyComponent() {
  const { colors } = useTheme(); // reactive — updates when sex changes
  return <View style={{ backgroundColor: colors.primary }} />;
}
```

### Imports

```typescript
// ✅ Correct — import from src/theme
import { theme } from '../theme';
import { colors, space, radii, shadow } from '../theme';

// ❌ Wrong — do not import from removed bridge file
import { COLORS } from '../utils/theme';
```

### Variant Switching

**Runtime (sex-adaptive):** The app automatically selects a variant based on the child's sex stored in `useSettingsStore`:
- `sex === 'girl'` → **blossom** (dusty rose)
- `sex === 'boy'` → **breeze** (sky blue)
- `sex === null` → **blossom** (default)

**Variant assignment:** controlled entirely from `src/theme/config.ts` — change `GIRL_VARIANT`, `BOY_VARIANT`, or `DEFAULT_VARIANT` to reassign which variant a sex receives without touching any logic.

```typescript
// src/theme/config.ts
export type ThemeVariant = 'blossom' | 'honey' | 'breeze';
export const DEFAULT_VARIANT: ThemeVariant = 'blossom'; // fallback when sex is null
export const GIRL_VARIANT: ThemeVariant = 'blossom';    // variant used when sex === 'girl'
export const BOY_VARIANT: ThemeVariant = 'breeze';      // variant used when sex === 'boy'
```

**Static styles** (StyleSheet.create): use the module-level `theme` export from `src/theme` — these use `DEFAULT_VARIANT` colors and are fine for structural layout.

**Dynamic color props** (inline styles, tintColor, etc.): always use `const { colors } = useTheme()` inside the component. This is reactive to store changes.

**Onboarding preview** (before store is hydrated): use `getThemeForSex(sex)` from `src/theme/getThemeForSex` — it's a pure function with no React dependency.

---

## Token Usage Rules

### Colors

Always use semantic token names, not raw hex:

| Use case | Token |
|---|---|
| Primary CTAs, active tab | `theme.colors.primary` |
| Card/sheet backgrounds | `theme.colors.surface` |
| App background | `theme.colors.background` |
| Primary body text | `theme.colors.text` |
| Supporting text | `theme.colors.textSecondary` |
| Placeholders, hints | `theme.colors.textMuted` |
| Input/divider borders | `theme.colors.border` |
| Focused input border | `theme.colors.borderFocus` |
| Modal backdrop | `theme.colors.backdrop` |
| Destructive actions | `theme.colors.error` |
| Success states | `theme.colors.success` |

For opacity variants use `withOpacity(color, 'XX')` from `src/utils/colorHelpers` — never string concat (`color + '20'`).

### Typography

```typescript
// ✅ Correct
fontSize: theme.typography.fontSize.lg    // 16
fontWeight: theme.typography.fontWeight.bold  // '700'

// ❌ Wrong
fontSize: 16
fontWeight: '700'
```

Font size scale: `xs(10) sm(12) md(14) lg(16) xl(18) 2xl(20) 3xl(26) 4xl(30)`

### Spacing

Use the 4pt grid. Named steps: `'0'(0) '1'(4) '2'(8) '3'(12) '4'(16) '5'(20) '6'(24) '7'(28) '8'(32) '10'(40)`

```typescript
paddingHorizontal: theme.spacing['5']  // 20 — standard screen padding
paddingVertical:   theme.spacing['4']  // 16 — standard card padding
gap:               theme.spacing['3']  // 12 — standard list item gap
```

### Shape (Border Radius)

```typescript
// Scale: xs(4) sm(8) md(12) lg(16) xl(20) 2xl(24) full(9999)
borderRadius: theme.shape.lg    // inputs, buttons, cards
borderRadius: theme.shape.xl    // stat cards, pill badges
borderRadius: theme.shape['2xl'] // bottom sheets
borderRadius: theme.shape.full  // avatars, circle icons
```

### Elevation (Shadows)

```typescript
const elev = buildElevation(theme.colors.text, theme.colors.primary);

// Use elev.sm for subtle lift (stat badges)
// Use elev.md for cards and sheets
// Use elev.lg for primary CTAs (colored shadow)
...elev.md,  // spread shadow props onto StyleSheet
```

---

## Component Library

### Shared Components (`src/components/`)

| Component | File | Use For |
|---|---|---|
| `Button` | `UIComponents.tsx` | All primary/secondary/outline/danger actions |
| `Card` | `UIComponents.tsx` | Content containers with elevation |
| `SearchBar` | `UIComponents.tsx` | Search inputs with Ionicons icons |
| `CategoryBadge` | `UIComponents.tsx` | Category chips with user-chosen emoji |
| `EmptyState` | `UIComponents.tsx` | Zero-state screens with emoji + CTA |
| `StatCard` | `UIComponents.tsx` | Dashboard metric cards |
| `Input` | `Input.tsx` | All text fields in modals and forms |
| `Label` | `Label.tsx` | Form field labels (uppercase, semibold) |
| `ScreenHeader` | `ScreenHeader.tsx` | Screen title + primary action button |
| `SortBar` | `SortBar.tsx` | Sort toggle + count display + dropdown menu |
| `BottomSheet` | `BottomSheet.tsx` | All modal bottom sheets |
| `IconButton` | `IconButton.tsx` | Icon-only pressables (close, delete, clear) |
| `LanguagePicker` | `LanguagePicker.tsx` | Locale selector in settings and onboarding |

### Button Size Guide

| Size | Use case | Min height |
|---|---|---|
| `sm` | Header pill buttons, inline actions | 36dp |
| `md` (default) | Standard CTAs, modal primary actions | 48dp |
| `lg` | Onboarding CTAs, full-width forms | 56dp |

---

## Icon Strategy

Use `@expo/vector-icons` (Ionicons family) for all UI chrome icons. **Never use emoji as UI icons.**

```typescript
import { Ionicons } from '@expo/vector-icons';
<Ionicons name="search" size={18} color={theme.colors.textMuted} />
```

| Purpose | Icon name |
|---|---|
| Home tab | `home` |
| Words tab | `book` |
| Variants tab | `chatbubble-ellipses` |
| Settings tab | `settings-sharp` |
| Search | `search` |
| Clear input | `close-circle` |
| Delete | `trash` |
| Calendar/date | `calendar` |
| Import file | `folder-open` |
| Close modal | `close` |
| Chevron (settings) | `chevron-forward` |
| Sort/dropdown | `chevron-down` |

**Category emojis** (`CATEGORY_EMOJIS`) remain as emoji — they are user-facing content, not UI chrome.

---

## Touch Targets

All interactive elements must have a minimum touchable area of **48×48dp**.

- Use `hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}` when the visual element is smaller.
- `IconButton` enforces this automatically (`Math.max(size, 48)`).
- `SearchBar` clear button uses a 48dp wrapper view.
- `Button` with `size="md"` has `minHeight: 48`.

---

## Accessibility

| Requirement | Rule |
|---|---|
| Touch targets | All interactive elements ≥ 48×48dp |
| Contrast ratio | Text on background ≥ 4.5:1 (WCAG AA) for `fontSize.md` and below; ≥ 3:1 for `fontSize.xl`+ |
| `accessibilityRole` | `button` on all Pressable/TouchableOpacity with `onPress`; `search` on SearchBar input; `header` on page titles |
| `accessibilityLabel` | All icon-only buttons must have a descriptive label |
| Disabled state | `opacity: 0.5` + `disabled` prop |

---

## Design Variants

### Blossom (girl default)
Dusty rose + lavender. Cool-tinted pastels. Mood: gentle nursery watercolors.
`primary: #C77DAB`, `background: #FAF5F8`, `text: #3A2535`

### Honey
Warm amber + honey. Mood: sunlit kitchen, homey and proud.
`primary: #D2864B`, `background: #FBF6EE`, `text: #3A2815`

### Breeze (boy default)
Sky blue + calm. Mood: airy and fresh.
`primary: #5B9FD4`, `background: #F3F8FD`, `text: #1E2D3A`

All variants share identical typography, spacing, shape, elevation, and motion tokens. Only color values differ.
