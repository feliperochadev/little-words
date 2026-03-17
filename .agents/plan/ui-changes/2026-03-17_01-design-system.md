# Design: Palavrinhas Design System

**Date:** 2026-03-17
**Status:** Draft
**Author:** Claude
**Related ADR:** N/A
**Prompt Record:** `.agents/plan/prompts/2026-03-17_01-design-system.md`

---

## Problem Statement

Palavrinhas has grown organically — each screen and modal defines its own inline styles with ad-hoc font sizes, border radii, spacing values, and shadow configurations. Emoji characters are used as icons throughout (tab bar, buttons, stats, empty states), giving the app a generic feel rather than a unique brand identity. There is no formal design token layer, no spacing grid, no typography scale, and no mechanism to switch visual themes at dev time.

The primary persona — a stressed, time-constrained mother of a toddler — needs an interface that is **visually calm, immediately intuitive, and emotionally reassuring**. Achieving this requires consistency, not just good individual components.

## Goals

- Establish a formal design token system (colors, typography, spacing, shape, elevation, motion)
- Consolidate all visual constants into a single, switchable theme layer
- Replace generic emoji icons with branded SVG icons from `@expo/vector-icons` (already bundled with Expo)
- Enforce consistent touch targets (minimum 48×48dp) across all interactive elements
- Design two complete theme variants ("Florzinha" and "Mel") with full token tables
- Create a developer-facing config mechanism to switch between variants with a one-line change
- Produce a phased migration plan that can be implemented incrementally

## Non-Goals

- Dark mode (explicitly out of scope for this plan)
- Breadcrumbs or multi-level navigation (app uses flat tab navigation)
- Runtime theme switching for end users (developer-only config)
- Adopting an external component library (Tamagui, Gluestack, etc.)
- Custom font files (system fonts only, matching current approach)
- Haptic feedback patterns

---

## 1. Component Audit

### 1.1 Current Token Inventory (`src/utils/theme.ts`)

| Token Group | Constants | Values |
|---|---|---|
| Brand palette | `primary`, `primaryLight`, `primaryDark`, `secondary`, `accent` | 5 hex colors (terracota family) |
| Profile colors | `profileGirl`, `profileGirlBg`, `profileBoy`, `profileBoyBg` | 4 hex colors |
| Semantic | `success`, `error`, `warning`, `info` | 4 hex colors |
| Surfaces | `background`, `cardBackground`, `border`, `white` | 4 hex colors |
| Text | `text`, `textSecondary`, `textLight` | 3 hex colors |
| Category | `CATEGORY_COLORS` (12 hex), `CATEGORY_EMOJIS` (16 emoji) | Arrays |
| Fonts | `FONTS.regular`, `FONTS.medium`, `FONTS.bold` | All `'System'` |
| Layout | `LAYOUT.TEXTAREA_HEIGHT`, `HIGHLIGHT_BORDER_RADIUS`, `STAT_ICON_SIZE`, `STAT_ICON_RADIUS`, `EMPTY_STATE_VERTICAL_PADDING` | 5 numeric constants |

**Missing from token layer:** typography scale (font sizes, line heights, letter spacing), spacing scale, border radius scale, shadow/elevation presets, animation durations/easings, touch target minimums.

### 1.2 Shared Components (`src/components/UIComponents.tsx`)

| Component | Props | Used In | Issues |
|---|---|---|---|
| `Button` | `title`, `onPress`, `variant` (4), `loading`, `disabled`, `style`, `textStyle`, `testID` | Settings, EmptyState, ImportModal | Solid foundation. Missing `size` prop, `icon` prop. Touch target may be < 48dp at small sizes. |
| `Card` | `children`, `style`, `onPress`, `testID` | All screens, all modals | Good. Shadow uses `COLORS.primary` as shadowColor — should be neutral. |
| `SearchBar` | `value`, `onChangeText`, `placeholder`, `testID` | Words, Variants | Uses 🔍 emoji as icon. Clear button (✕) has no `testID`, tiny touch target (~20dp). |
| `CategoryBadge` | `name`, `color`, `emoji`, `size` (2) | Words screen | Uses emoji for category icon — by design (user-chosen). No issues. |
| `EmptyState` | `emoji`, `title`, `subtitle`, `action` | Words, Variants | Uses emoji — should be replaced with branded illustration or icon. |
| `StatCard` | `emoji`, `value`, `label`, `color`, `testID` | Home screen | Uses emoji — should be replaced with branded icon. Icon bg area is 44×44 (below 48dp). |

### 1.3 Components NOT in UIComponents.tsx (duplicated patterns)

| Pattern | Where Duplicated | Notes |
|---|---|---|
| **Screen header** (title + add button) | `words.tsx:L110-119`, `variants.tsx:L85-91` | Same layout, same add button style, copy-pasted. Should be a `ScreenHeader` component. |
| **Sort bar** (sort button + count) | `words.tsx:L126-148`, `variants.tsx:L97-119` | Identical pattern, identical styles. Should be a `SortBar` component. |
| **Sort menu** (dropdown options) | `words.tsx:L133-148`, `variants.tsx:L104-119` | Copy-pasted. Should be a `SortMenu` or `Dropdown` component. |
| **Add button** (pill CTA in header) | `words.tsx:L202-207`, `variants.tsx:L158-159` | Same style block. Should use `Button` with a new `size="small"` variant. |
| **Modal bottom sheet** (backdrop + sheet + handle) | All 5 modals | Same backdrop rgba, same borderRadius 28, same handle bar, same padding 24. Should be a `BottomSheet` component. |
| **Delete button** (red destructive) | All edit modals | Same `withOpacity(COLORS.error, '20')` background, same icon 🗑️. Should be part of `Button variant="danger"`. |
| **Label text** | All modals | Same `fontSize: 13, fontWeight: '700', color: COLORS.textSecondary`. Should be a `Label` component or text variant. |
| **Input field** | All modals, onboarding | Same `fontSize: 16, borderRadius: 14, borderWidth: 2, borderColor: COLORS.border`. Should be an `Input` component. |
| **Tab bar icons** | `_layout.tsx:L7-14` | Uses emoji (🏠📚🗣️⚙️) — key brand touchpoint needing custom icons. |
| **Language picker** | `settings.tsx:L118-140`, `onboarding.tsx:L226-250` | Same UI, different borderRadius (14 vs 16). Should be a `LanguagePicker` component. |

### 1.4 Inconsistencies Found

| Category | Issue | Locations |
|---|---|---|
| **Border radii** | Containers use 28, cards use 20, inputs use 14, buttons use 16/20, sort menu uses 14, badges use 20 — no clear scale | Everywhere |
| **Shadows** | Cards: `shadowOpacity: 0.08, shadowRadius: 12, elevation: 3`. Buttons: `shadowOpacity: 0.3, shadowRadius: 8, elevation: 4`. Stats: `shadowOpacity: 0.06, shadowRadius: 8, elevation: 2`. No standard. | UIComponents.tsx |
| **Backdrop opacity** | `rgba(0,0,0,0.5)` in most modals, `rgba(0,0,0,0.45)` in ManageCategoryModal and DatePickerField | All modals |
| **Font sizes** | Titles range from 20-30, body from 13-16, labels from 11-13 — at least 15 distinct values | Everywhere |
| **Font weights** | '300', '400', '500', '600', '700', '800', '900' all used — 7 distinct values | Everywhere |
| **Spacing** | paddingHorizontal: 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32 — 11 distinct values | Everywhere |
| **Opacity helper** | `withOpacity()` used in most files, but `settings.tsx` and `AddCategoryModal.tsx` also use raw string concat (`cat.color + '25'`, `selectedColor + '30'`) | Scattered |

---

## 2. Design System Specification

### 2.1 Color Tokens (Semantic)

Colors are organized by semantic role, not by visual value. Each theme variant provides its own values for these token names.

```typescript
interface ColorTokens {
  // ── Brand ──
  primary:       string;  // Main CTA, active tab, key actions
  primaryLight:  string;  // Hover/highlight states, subtle emphasis
  primaryDark:   string;  // Pressed states
  secondary:     string;  // Chips, badges, bubbles
  accent:        string;  // Icons, accents

  // ── Profile ──
  profileGirl:   string;  // Girl accent
  profileGirlBg: string;  // Girl background tint
  profileBoy:    string;  // Boy accent
  profileBoyBg:  string;  // Boy background tint

  // ── Semantic ──
  success:       string;  // Positive confirmations
  error:         string;  // Destructive actions, errors
  warning:       string;  // Warnings, duplicate indicators
  info:          string;  // Informational badges

  // ── Surface ──
  background:    string;  // App background
  surface:       string;  // Cards, sheets, inputs
  surfaceHover:  string;  // Interactive surface highlight
  border:        string;  // Dividers, input borders
  borderFocus:   string;  // Focused input borders
  backdrop:      string;  // Modal backdrop (rgba)

  // ── Text ──
  text:          string;  // Primary text
  textSecondary: string;  // Supporting text
  textMuted:     string;  // Placeholders, hints
  textOnPrimary: string;  // Text on primary-colored backgrounds
  textOnError:   string;  // Text on error-colored backgrounds
}
```

### 2.2 Typography Tokens

A constrained scale based on a 1.25 ratio (Major Third), rounded to integers. All using system font.

```typescript
interface TypographyTokens {
  fontSize: {
    xs:    10;   // Bar labels, version text
    sm:    12;   // Captions, dates, meta
    md:    14;   // Body text, descriptions
    lg:    16;   // Inputs, buttons, section text
    xl:    18;   // Card values, sub-headings
    '2xl': 20;   // Modal titles, word text
    '3xl': 26;   // Page titles
    '4xl': 30;   // Onboarding hero title
  };
  fontWeight: {
    regular:  '400';
    medium:   '500';
    semibold: '600';
    bold:     '700';
    heavy:    '800';
    black:    '900';
  };
  lineHeight: {
    tight:  1.2;   // Headings (multiply by fontSize)
    normal: 1.5;   // Body text
    relaxed: 1.7;  // Long-form descriptions
  };
  letterSpacing: {
    tight:   -0.2;
    normal:   0;
    wide:     0.5;  // Buttons, labels
    wider:    1.0;  // Uppercase labels
  };
}
```

### 2.3 Spacing Tokens

4pt grid system. 8 named steps cover all current needs.

```typescript
interface SpacingTokens {
  space: {
    '0':   0;
    '1':   4;    // Minimal gaps (icon-to-text inside badges)
    '2':   8;    // Tight gaps (between chips, between meta items)
    '3':  12;    // Standard small gap (card marginBottom, list item gaps)
    '4':  16;    // Standard padding (card internal, section gaps)
    '5':  20;    // Screen padding (horizontal)
    '6':  24;    // Large padding (modal container, field spacing)
    '7':  28;    // Onboarding content padding
    '8':  32;    // Extra padding (empty state horizontal)
    '10': 40;    // Empty state vertical, bottom spacer
  };
}
```

### 2.4 Shape Tokens

A clear radius scale replacing the current 7+ distinct values.

```typescript
interface ShapeTokens {
  radii: {
    xs:    4;    // Progress bars, tiny elements
    sm:    8;    // Inner elements (highlight wheel)
    md:   12;    // Sort buttons, dropdown items, badges, small buttons
    lg:   16;    // Inputs, buttons, language selectors, cards
    xl:   20;    // Stat cards, word chips, pill buttons
    '2xl': 24;   // Bottom sheet radius (from current 28 → standardize to 24)
    full: 9999;  // Perfectly round (circle icons, avatar)
  };
}
```

### 2.5 Elevation Tokens

Three levels of elevation, standardized across all components.

```typescript
interface ElevationTokens {
  shadow: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    };
    sm: {
      shadowColor: string,        // theme.colors.text
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 1,
    };
    md: {
      shadowColor: string,        // theme.colors.text
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    };
    lg: {
      shadowColor: string,        // theme.colors.primary
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    };
  };
}
```

### 2.6 Motion Tokens

```typescript
interface MotionTokens {
  duration: {
    instant:  100;   // Opacity changes, color transitions
    fast:     200;   // Button press feedback
    normal:   300;   // Modal open/close, sheet slide
    slow:     500;   // Page transitions
  };
  easing: {
    easeOut:    'cubic-bezier(0.0, 0, 0.2, 1)';    // Entries
    easeIn:     'cubic-bezier(0.4, 0, 1, 1)';       // Exits
    easeInOut:  'cubic-bezier(0.4, 0, 0.2, 1)';     // Standard
  };
}
```

### 2.7 Touch Target Minimum

All interactive elements must have a minimum touchable area of **48×48dp** (Android Material Design baseline). Where the visual element is smaller (e.g. a 36dp icon), use `hitSlop` or wrapping `Pressable` padding to expand the touch area.

---

## 3. Component Library Plan

### 3.1 Components to Create or Refactor

| Component | Status | Changes |
|---|---|---|
| `Button` | Refactor | Add `size` prop (`sm` / `md` / `lg`), add `icon` prop (accepts icon component), add `iconPosition` (`left` / `right`). Enforce 48dp min height on `md`/`lg`. |
| `Card` | Refactor | Use `shadow.md` token. Change `shadowColor` from `COLORS.primary` to neutral `colors.text`. |
| `SearchBar` | Refactor | Replace 🔍 emoji with `Ionicons.search` icon. Replace ✕ text with `Ionicons.close-circle` icon. Add `testID` to clear button. Enforce 48dp touch target on clear. |
| `CategoryBadge` | Keep | Emoji is user-chosen content, not decoration — keep as-is. |
| `EmptyState` | Refactor | Replace `emoji` prop with `icon` prop (accepts icon component or illustration). Keep fallback to emoji for backwards compat during migration. |
| `StatCard` | Refactor | Replace `emoji` prop with `icon` prop. Increase icon container to 48×48dp. |
| `Input` | **New** | Extract from modal inline styles. Props: `value`, `onChangeText`, `placeholder`, `multiline`, `label`, `error`, `focused` border color. Standard `fontSize: lg`, `borderRadius: lg`. |
| `Label` | **New** | Extract from modal inline styles. Props: `children`, `size` (`sm` / `md`). Standard `fontSize: sm`, `fontWeight: bold`, `color: textSecondary`, `letterSpacing: wide`. |
| `ScreenHeader` | **New** | Extract from words/variants. Props: `title`, `action` (button props). Standard layout. |
| `SortBar` | **New** | Extract from words/variants. Props: `currentLabel`, `count`, `countLabel`, `onToggle`, `options`, `selectedKey`, `onSelect`. |
| `BottomSheet` | **New** | Extract modal chrome. Props: `visible`, `onClose`, `children`, `testID`. Standard backdrop, sheet radius, handle bar, safe area padding. Pan-gesture dismiss. |
| `LanguagePicker` | **New** | Extract from settings/onboarding. Props: `locale`, `onSelect`, `accentColor`. |
| `IconButton` | **New** | For icon-only actions (close, delete, clear). Props: `icon`, `onPress`, `variant` (`default` / `danger` / `ghost`), `size`. Enforces 48dp touch target. |

### 3.2 Icon Strategy

Replace emoji decorations with `@expo/vector-icons` (Ionicons family, already bundled with Expo SDK 55).

| Current Emoji | Replacement Icon | Context |
|---|---|---|
| 🏠 (tab) | `Ionicons.home` | Tab bar |
| 📚 (tab) | `Ionicons.book` | Tab bar |
| 🗣️ (tab) | `Ionicons.chatbubble-ellipses` | Tab bar |
| ⚙️ (tab) | `Ionicons.settings-sharp` | Tab bar |
| 🔍 (search) | `Ionicons.search` | SearchBar |
| ✕ (clear) | `Ionicons.close-circle` | SearchBar, modals |
| 📝 (stat) | `Ionicons.create` | Dashboard stat |
| 🗣️ (stat) | `Ionicons.chatbubbles` | Dashboard stat |
| 📅 (stat) | `Ionicons.today` | Dashboard stat |
| 📆 (stat) | `Ionicons.calendar` | Dashboard stat |
| 🗓️ (stat) | `Ionicons.calendar-outline` | Dashboard stat |
| 🗑️ (delete) | `Ionicons.trash` | Modal delete buttons |
| 📅 (date) | `Ionicons.calendar` | Date picker button |
| 📂 (file) | `Ionicons.folder-open` | Import file picker |
| 🌟 (empty) | `Ionicons.sparkles` | Dashboard empty state |
| ✕ (modal close) | `Ionicons.close` | Modal headers |
| › (chevron) | `Ionicons.chevron-forward` | Settings list rows |
| ▾ (dropdown) | `Ionicons.chevron-down` | Sort buttons, date fields |

**Category emojis** (`CATEGORY_EMOJIS`) remain as emoji — these are user-facing content, not UI chrome. They stay in the theme as a separate `categoryEmojis` array.

### 3.3 Accessibility Requirements

| Requirement | Specification |
|---|---|
| Touch targets | All interactive elements ≥ 48×48dp |
| Contrast ratio | Text on background ≥ 4.5:1 (WCAG AA) for `fontSize.md` and below; ≥ 3:1 for `fontSize.xl` and above |
| `accessibilityRole` | `button` on all `TouchableOpacity`/`Pressable` with `onPress`; `search` on SearchBar input; `header` on page titles |
| `accessibilityLabel` | All icon-only buttons must have a label (e.g. `accessibilityLabel={t('common.delete')}`) |
| Disabled state | `opacity: 0.5` + `disabled` prop (current pattern is correct) |

---

## 4. Two Design System Variants

### 4.1 Variant A — "Florzinha" (Little Flower)

**Visual character:** Soft, airy, and feminine. Cool-tinted pastels with lavender and rose accents. Like a nursery watercolor painting — gentle, dreamy, reassuring.

**Emotional intent:** "Everything is okay. Take your time. This moment matters."

**Target UX outcome:** Low visual stress, high scannability, gentle delight in micro-interactions.

#### Color Tokens

| Token | Hex | Description |
|---|---|---|
| `primary` | `#C77DAB` | Dusty rose — CTAs, active states |
| `primaryLight` | `#E4A8CC` | Light rose — highlights |
| `primaryDark` | `#A85D8B` | Deep rose — pressed states |
| `secondary` | `#D4C5E2` | Soft lavender — chips, badges |
| `accent` | `#E4A8CC` | Rose — icon accents |
| `profileGirl` | `#E88CBB` | Pink |
| `profileGirlBg` | `#FFF0F7` | Pink tint |
| `profileBoy` | `#7BAFD4` | Soft blue |
| `profileBoyBg` | `#F0F5FA` | Blue tint |
| `success` | `#8CC5A0` | Sage green |
| `error` | `#D47B7B` | Soft coral red |
| `warning` | `#E8C879` | Warm gold |
| `info` | `#8B9FD4` | Periwinkle |
| `background` | `#FAF5F8` | Rose-tinted cream |
| `surface` | `#FFFFFF` | White |
| `surfaceHover` | `#F8EFF4` | Rose-tinted hover |
| `border` | `#E8D8E2` | Mauve-tinted border |
| `borderFocus` | `#C77DAB` | Primary (rose) |
| `backdrop` | `rgba(60, 30, 50, 0.45)` | Warm dark overlay |
| `text` | `#3A2535` | Deep plum — primary text |
| `textSecondary` | `#6B4D60` | Medium plum |
| `textMuted` | `#A88B9C` | Light plum — placeholders |
| `textOnPrimary` | `#FFFFFF` | White |
| `textOnError` | `#FFFFFF` | White |

#### Category Colors

```typescript
['#C77DAB', '#E4A8CC', '#D4C5E2', '#A85D8B', '#8CC5A0',
 '#E8C879', '#7BAFD4', '#8B9FD4', '#C4A87A', '#D47B7B',
 '#9BBD8C', '#6B4D60']
```

### 4.2 Variant B — "Mel" (Honey)

**Visual character:** Warm, cozy, and nurturing. Honey golds, warm ambers, and soft terracotta. Like a sunlit kitchen on a lazy morning — safe, inviting, homey.

**Emotional intent:** "You're doing great. Let's celebrate every little word together."

**Target UX outcome:** Warm emotional connection, high engagement, feelings of pride and accomplishment.

#### Color Tokens

| Token | Hex | Description |
|---|---|---|
| `primary` | `#D2864B` | Warm amber — CTAs, active states |
| `primaryLight` | `#EDBE76` | Light gold — highlights |
| `primaryDark` | `#B86A2F` | Deep amber — pressed states |
| `secondary` | `#F4D8B2` | Soft peach — chips, badges |
| `accent` | `#EDBE76` | Golden — icon accents |
| `profileGirl` | `#E88CBB` | Pink (same as Florzinha) |
| `profileGirlBg` | `#FFF0F5` | Pink tint |
| `profileBoy` | `#74B9FF` | Blue |
| `profileBoyBg` | `#F0F7FF` | Blue tint |
| `success` | `#7ABD6E` | Green |
| `error` | `#D4694B` | Terracotta red |
| `warning` | `#F0C96B` | Warm amber |
| `info` | `#6C8FD4` | Steel blue |
| `background` | `#FBF6EE` | Warm cream |
| `surface` | `#FFFFFF` | White |
| `surfaceHover` | `#F8F0E4` | Warm hover |
| `border` | `#EDD9C2` | Warm beige |
| `borderFocus` | `#D2864B` | Primary (amber) |
| `backdrop` | `rgba(55, 35, 20, 0.45)` | Warm dark overlay |
| `text` | `#3A2815` | Deep brown — primary text |
| `textSecondary` | `#7A5F3E` | Medium brown |
| `textMuted` | `#B09570` | Sandy — placeholders |
| `textOnPrimary` | `#FFFFFF` | White |
| `textOnError` | `#FFFFFF` | White |

#### Category Colors

```typescript
['#D2864B', '#EDBE76', '#F4D8B2', '#B86A2F', '#7ABD6E',
 '#F0C96B', '#6C8FD4', '#A08FB2', '#C8A87A', '#E87C6A',
 '#8BAD7A', '#7A5F3E']
```

### 4.3 Shared Tokens (Same for Both Variants)

Typography, spacing, shape, elevation, and motion tokens are **identical** between Florzinha and Mel. Only color values change. This ensures components work without modification regardless of variant.

---

## 5. Variant Config Mechanism

### 5.1 File Structure

```
src/theme/
├── config.ts              ← One-line variant selector
├── index.ts               ← Re-exports active theme
├── types.ts               ← Theme type definitions
├── tokens/
│   ├── typography.ts      ← Shared typography scale
│   ├── spacing.ts         ← Shared spacing scale
│   ├── shape.ts           ← Shared border radius scale
│   ├── elevation.ts       ← Shared shadow presets
│   └── motion.ts          ← Shared animation tokens
└── variants/
    ├── florzinha.ts        ← Florzinha color tokens
    └── mel.ts              ← Mel color tokens
```

### 5.2 Config File (`src/theme/config.ts`)

```typescript
/**
 * Active design system variant.
 *
 * Change this single constant to switch the entire app's visual identity.
 * Both variants use the same token structure — only color values differ.
 *
 * Available: 'florzinha' | 'mel'
 */
export const ACTIVE_THEME: 'florzinha' | 'mel' = 'florzinha';
```

### 5.3 Theme Index (`src/theme/index.ts`)

```typescript
import { ACTIVE_THEME } from './config';
import { florzinhaColors } from './variants/florzinha';
import { melColors } from './variants/mel';
import { typography } from './tokens/typography';
import { spacing } from './tokens/spacing';
import { shape } from './tokens/shape';
import { elevation } from './tokens/elevation';
import { motion } from './tokens/motion';
import type { Theme } from './types';

const colorMap = {
  florzinha: florzinhaColors,
  mel: melColors,
} as const;

export const theme: Theme = {
  colors: colorMap[ACTIVE_THEME],
  typography,
  spacing,
  shape,
  elevation,
  motion,
};

// Convenience re-exports for migration (allows `import { colors } from '@/theme'`)
export const colors = theme.colors;
export const { fontSize, fontWeight, lineHeight, letterSpacing } = theme.typography;
export const space = theme.spacing;
export const radii = theme.shape;
export const shadow = theme.elevation;
```

### 5.4 Migration Compatibility

During migration, `src/utils/theme.ts` remains functional and re-exports from `src/theme/index.ts`:

```typescript
// src/utils/theme.ts (migration bridge — remove after Phase 4)
import { colors } from '../theme';

/** @deprecated Import from '@/theme' instead */
export const COLORS = colors;

// CATEGORY_COLORS and CATEGORY_EMOJIS stay here during migration,
// then move to src/theme/tokens/categories.ts
export const CATEGORY_COLORS = [...];
export const CATEGORY_EMOJIS = [...];
export const FONTS = { regular: 'System', medium: 'System', bold: 'System' };
export const LAYOUT = { ... };
```

### 5.5 How to Switch Variants

**One-line change in `src/theme/config.ts`:**

```diff
- export const ACTIVE_THEME: 'florzinha' | 'mel' = 'florzinha';
+ export const ACTIVE_THEME: 'florzinha' | 'mel' = 'mel';
```

Restart the dev server. The entire app switches to the Mel variant.

---

## 6. Markdown Mock Descriptions

### 6.1 Mock A — "Florzinha"

**Mood:** A nursery painted in watercolors. Soft rose and lavender float against a barely-there pink-cream background. Everything feels hushed and gentle, like whispering to a sleeping baby.

#### Primary Button
- **Background:** `#C77DAB` (dusty rose)
- **Text:** `#FFFFFF` (white), `fontSize: 16`, `fontWeight: 700`
- **Shape:** `borderRadius: 16`, `paddingVertical: 14`, `paddingHorizontal: 24`
- **Shadow:** Subtle rose glow — `shadowColor: #C77DAB`, `shadowOpacity: 0.15`, `elevation: 4`
- **Pressed:** Background deepens to `#A85D8B`
- **Disabled:** `opacity: 0.5`

#### Card
- **Background:** `#FFFFFF` on `#FAF5F8` cream-rose background
- **Shape:** `borderRadius: 16`, `padding: 16`
- **Shadow:** Neutral — `shadowColor: #3A2535`, `shadowOpacity: 0.08`, `elevation: 3`
- **Border:** None (shadow-only elevation)

#### SearchBar
- **Background:** `#FFFFFF` with `borderColor: #E8D8E2` (mauve border)
- **Icon:** `Ionicons.search` in `#A88B9C` (muted plum), size 18
- **Input text:** `#3A2535` (deep plum), placeholder in `#A88B9C`
- **Clear icon:** `Ionicons.close-circle` in `#A88B9C`, 48dp touch target

#### Tab Bar
- **Background:** `#FFFFFF` with `borderTopColor: #E8D8E2`
- **Active icon:** `Ionicons` in `#C77DAB` (dusty rose), `opacity: 1`
- **Inactive icon:** Same icons in `#A88B9C` (muted), `opacity: 0.6`
- **Active label:** `#C77DAB`, `fontWeight: 700`

#### Before / After vs. Current `theme.ts`

| Token | Current | Florzinha | Change |
|---|---|---|---|
| `primary` | `#D2694B` (terracota) | `#C77DAB` (dusty rose) | Warm → Cool |
| `background` | `#FAF4EC` (warm cream) | `#FAF5F8` (rose cream) | Neutral → Rose tint |
| `text` | `#371E19` (dark brown) | `#3A2535` (deep plum) | Brown → Purple-tinted |
| `border` | `#EDD9C8` (warm beige) | `#E8D8E2` (mauve) | Warm → Cool |
| `secondary` | `#F4C3B2` (peach) | `#D4C5E2` (lavender) | Warm → Cool |

---

### 6.2 Mock B — "Mel"

**Mood:** A sunlit kitchen table with honey jars and warm bread. Amber and gold tones wrap around crisp white cards on a buttery cream background. Everything feels homey, accomplished, and proud — like a fridge door covered in finger paintings.

#### Primary Button
- **Background:** `#D2864B` (warm amber)
- **Text:** `#FFFFFF` (white), `fontSize: 16`, `fontWeight: 700`
- **Shape:** `borderRadius: 16`, `paddingVertical: 14`, `paddingHorizontal: 24`
- **Shadow:** Warm glow — `shadowColor: #D2864B`, `shadowOpacity: 0.15`, `elevation: 4`
- **Pressed:** Background deepens to `#B86A2F`
- **Disabled:** `opacity: 0.5`

#### Card
- **Background:** `#FFFFFF` on `#FBF6EE` warm cream background
- **Shape:** `borderRadius: 16`, `padding: 16`
- **Shadow:** Neutral — `shadowColor: #3A2815`, `shadowOpacity: 0.08`, `elevation: 3`

#### SearchBar
- **Background:** `#FFFFFF` with `borderColor: #EDD9C2` (warm beige border)
- **Icon:** `Ionicons.search` in `#B09570` (sandy), size 18
- **Input text:** `#3A2815` (deep brown), placeholder in `#B09570`
- **Clear icon:** `Ionicons.close-circle` in `#B09570`, 48dp touch target

#### Tab Bar
- **Background:** `#FFFFFF` with `borderTopColor: #EDD9C2`
- **Active icon:** `Ionicons` in `#D2864B` (warm amber), `opacity: 1`
- **Inactive icon:** Same icons in `#B09570` (sandy), `opacity: 0.6`
- **Active label:** `#D2864B`, `fontWeight: 700`

#### Before / After vs. Current `theme.ts`

| Token | Current | Mel | Change |
|---|---|---|---|
| `primary` | `#D2694B` (terracota) | `#D2864B` (amber) | Slightly warmer, more golden |
| `background` | `#FAF4EC` (warm cream) | `#FBF6EE` (warm cream) | Very similar, slightly lighter |
| `text` | `#371E19` (dark brown) | `#3A2815` (deep brown) | Nearly identical |
| `border` | `#EDD9C8` (warm beige) | `#EDD9C2` (warm beige) | Nearly identical |
| `secondary` | `#F4C3B2` (peach) | `#F4D8B2` (light peach) | Warmer, more golden |

**Note:** Mel is the closest variant to the current app. Switching to Mel would feel like a refinement rather than a redesign. Florzinha would feel like a fresh new identity.

---

## 7. UI Change Implementation Plan

### Phase 1 — Token Extraction (Foundation)

**Goal:** Create the theme infrastructure without changing any visual output.

| Step | Files | Description |
|---|---|---|
| 1.1 | `src/theme/types.ts` | Define `Theme`, `ColorTokens`, etc. interfaces |
| 1.2 | `src/theme/tokens/*.ts` | Create typography, spacing, shape, elevation, motion token files |
| 1.3 | `src/theme/variants/florzinha.ts`, `mel.ts` | Create color token files for both variants |
| 1.4 | `src/theme/config.ts`, `index.ts` | Create config selector and theme index |
| 1.5 | `src/utils/theme.ts` | Refactor to re-export from `src/theme/index.ts` (bridge) |

**Estimated changes:** ~10 new files, ~1 modified file
**Test coverage:** Unit tests for theme index, config switching, and token type checks
**Risk:** Low — no visual changes, purely additive

### Phase 2 — Component Refactor (Core Library)

**Goal:** Refactor existing components and create new shared components.

| Step | Files | Description |
|---|---|---|
| 2.1 | `src/components/UIComponents.tsx` | Refactor `Button` (add `size`, `icon` props), `Card` (neutral shadow), `SearchBar` (icon swap), `EmptyState` (icon prop), `StatCard` (icon prop, 48dp target) |
| 2.2 | `src/components/Input.tsx` | New — extract input pattern from modals |
| 2.3 | `src/components/Label.tsx` | New — extract label pattern from modals |
| 2.4 | `src/components/ScreenHeader.tsx` | New — extract header + action button pattern |
| 2.5 | `src/components/SortBar.tsx` | New — extract sort bar + dropdown pattern |
| 2.6 | `src/components/BottomSheet.tsx` | New — extract modal chrome (backdrop, sheet, handle, safe area) |
| 2.7 | `src/components/IconButton.tsx` | New — icon-only pressable with 48dp enforcement |
| 2.8 | `src/components/LanguagePicker.tsx` | New — extract from settings + onboarding |

**Estimated changes:** ~1 refactored file, ~7 new files
**Test coverage:** Integration tests for each new/refactored component; render tests with both theme variants to verify token usage
**Risk:** Medium — must maintain exact visual parity with current output until Phase 4

### Phase 3 — Icon Replacement

**Goal:** Replace all decorative emoji with `@expo/vector-icons` (Ionicons).

| Step | Files | Description |
|---|---|---|
| 3.1 | `app/(tabs)/_layout.tsx` | Replace tab bar emoji with Ionicons |
| 3.2 | `src/components/UIComponents.tsx` | Replace SearchBar 🔍/✕ with Ionicons |
| 3.3 | `app/(tabs)/home.tsx` | Replace StatCard emoji with Ionicons |
| 3.4 | All modals | Replace 🗑️, 📂, ✕, ›, ▾ with Ionicons |
| 3.5 | `app/onboarding.tsx` | Replace 📅 with Ionicons |

**Estimated changes:** ~10 modified files
**Test coverage:** Update E2E tests if any asserted on emoji text; unit tests for icon rendering
**Risk:** Medium — visual change, requires careful review. `@expo/vector-icons` is already bundled, no new dependency.

### Phase 4 — Screen Audit & Migration

**Goal:** Replace all `COLORS.*` imports with `theme.*` tokens. Apply shared components. Remove inline style duplication.

| Step | Files | Description |
|---|---|---|
| 4.1 | `app/(tabs)/home.tsx` | Use theme tokens, `ScreenHeader`, `BottomSheet` if applicable |
| 4.2 | `app/(tabs)/words.tsx` | Use `ScreenHeader`, `SortBar`, `Input`, theme tokens |
| 4.3 | `app/(tabs)/variants.tsx` | Use `ScreenHeader`, `SortBar`, theme tokens |
| 4.4 | `app/(tabs)/settings.tsx` | Use `LanguagePicker`, `Label`, `IconButton` for chevrons, theme tokens |
| 4.5 | `app/onboarding.tsx` | Use `LanguagePicker`, `Input`, `Label`, `BottomSheet`, theme tokens |
| 4.6 | All modals | Use `BottomSheet`, `Input`, `Label`, `IconButton`, theme tokens |
| 4.7 | `src/utils/theme.ts` | Remove bridge — delete deprecated `COLORS` re-export |

**Estimated changes:** ~12 modified files, 1 deleted bridge
**Test coverage:** Full screen render tests with both variants; integration tests for each modal; E2E regression suite
**Risk:** High — touching every screen. Must be done incrementally (one screen per PR if possible). Full E2E test run after each screen migration.

### Phase 5 — Variant Wiring & Polish

**Goal:** Verify both variants render correctly end-to-end. Final cleanup.

| Step | Files | Description |
|---|---|---|
| 5.1 | All test files | Run full test suite with `ACTIVE_THEME = 'florzinha'`, then with `'mel'` |
| 5.2 | `src/theme/config.ts` | Set default to chosen variant |
| 5.3 | Cleanup | Remove any remaining `withOpacity` string concat patterns — ensure all use `withOpacity()` helper or theme tokens |
| 5.4 | Documentation | Update `CLAUDE.md`, `AGENTS.md`, `GEMINI.md` with new theme architecture |

**Estimated changes:** ~5 modified files, documentation updates
**Test coverage:** Full CI pass with both variants; visual regression (manual screenshot comparison)
**Risk:** Low — polish and verification only

---

## Alternatives Considered

1. **Adopt Tamagui or Gluestack:** Full-featured theme-aware component libraries. Rejected: adds a heavy dependency, steep learning curve, and the app's component count is small enough to maintain in-house. Would require rewriting all tests.

2. **NativeWind / Tailwind CSS:** Utility-class approach for RN styling. Rejected: introduces a build-step dependency, doesn't naturally support the theme variant switching requirement, and the team isn't using utility-class patterns elsewhere.

3. **React Native Paper or RN Elements:** Pre-built themed component libraries. Rejected: over-engineered for this app's needs (4 screens, 6 components). Would impose their design language rather than building our own brand identity.

4. **Runtime theme switching (React Context):** Would allow users to switch themes at runtime. Rejected: explicitly scoped out of this plan. The config mechanism is developer-only. Could be added later by replacing the static import with a Context provider.

---

## Open Questions

- [ ] **Variant selection:** Which variant (Florzinha or Mel) should be the default? Mel is closest to the current look; Florzinha is a fresh identity.
- [ ] **Profile emoji:** Should 👧/👦/👶 remain as emoji or be replaced with custom avatar illustrations in a future phase?
- [ ] **Category emojis:** Should `CATEGORY_EMOJIS` remain as emoji long-term, or should they eventually be replaced with a custom icon set for full brand consistency?
- [ ] **Animation library:** Should motion tokens be implemented with React Native's `Animated` API, `react-native-reanimated` (already a transitive dep via Expo), or `LayoutAnimation`?

---

## Acceptance Criteria

- [ ] `src/theme/` directory exists with config, index, types, tokens, and variants
- [ ] Changing `ACTIVE_THEME` in `config.ts` switches the entire app's visual identity
- [ ] All colors used by components come from theme tokens (no hardcoded hex in screen files)
- [ ] All decorative emoji replaced with `@expo/vector-icons` (Ionicons)
- [ ] All interactive elements have ≥ 48×48dp touch targets
- [ ] Text contrast ratios meet WCAG AA (≥ 4.5:1 for body, ≥ 3:1 for large text)
- [ ] No duplicate style patterns across screens — all extracted to shared components
- [ ] Full CI passes with both Florzinha and Mel variants
- [ ] Zero new runtime dependencies added (only `@expo/vector-icons`, already bundled)
- [ ] New `.agents/standards/design-system.md` standard created — covering theme architecture (`src/theme/`), token usage rules (colors, typography, spacing, shape, elevation, motion), component library conventions, icon strategy (Ionicons over emoji), touch target requirements, accessibility baselines, and variant switching procedure
- [ ] `.agents/standards/README.md` updated with `Design System | .agents/standards/design-system.md` row in the Quick Reference table
- [ ] All vendor readme files (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`) updated: Code Standards table includes `Design System | .agents/standards/design-system.md` row, and Architecture section documents the `src/theme/` layer and variant config mechanism
