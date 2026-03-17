# Design: Sex-Adaptive Theme & Icon Sweep

**Date:** 2026-03-17
**Status:** Draft
**Author:** Claude
**Related ADR:** N/A
**Prompt Record:** `.agents/plan/prompts/2026-03-17_02-sex-adaptive-theme-icon-sweep.md`
**Depends on:** `.agents/plan/ui-changes/2026-03-17_01-design-system.md` (implemented)

---

## Problem Statement

The design system (Phase 1–3 of the previous plan) is now in place: `src/theme/` provides tokens, two colour variants exist (Florzinha/Mel), the tab bar uses Ionicons, and seven new shared components are ready.

Two gaps remain:

1. **Theme does not follow the child's sex.** The app already tints accent colours (profile name, StatCards, bar chart, RefreshControl) to pink for girls and blue for boys — but via ad-hoc `accentColorBySex` lookups in `home.tsx`. The full colour palette (primary, secondary, background, borders, text) stays static regardless. This breaks the "calm, cohesive" brand promise when a boy profile has a pink primary button.

2. **~50 decorative emoji remain in UI chrome** across modals, buttons, chips, section titles, and inline annotations — after Phase 3 only replaced tab bar and SearchBar icons. These generic emoji undermine visual identity and feel inconsistent next to the Ionicons already in use.

## Goals

- Add a third colour variant (`breeze` — soft sky blue) for boy profiles
- Rename all variant identifiers to English: `florzinha` → `blossom`, `mel` → `honey`
- Make the runtime theme automatically derive from the child's sex (`girl` → `blossom`, `boy` → `breeze`, unset → `blossom`)
- Replace every remaining decorative emoji in UI chrome with Ionicons
- Preserve category emojis (user content) and profile sex emoji (👧👦👶) unchanged

## Non-Goals

- Dark mode
- Runtime user-facing theme picker
- Custom avatar illustrations for profile
- Replacing profile sex emoji (👧👦👶) — future phase
- Migrating all screens away from `COLORS` bridge (Phase 4 of original plan — separate scope)

---

## 1. Variant Rename & Breeze Addition

### 1.1 Identifier Rename Table

| Old ID | New ID | File rename |
|---|---|---|
| `florzinha` | `blossom` | `src/theme/variants/florzinha.ts` → `src/theme/variants/blossom.ts` |
| `mel` | `honey` | `src/theme/variants/mel.ts` → `src/theme/variants/honey.ts` |
| *(new)* | `breeze` | `src/theme/variants/breeze.ts` |

### 1.2 Config Changes

```typescript
// src/theme/config.ts
export type ThemeVariant = 'blossom' | 'honey' | 'breeze';

/**
 * Developer override. When set, this variant is used regardless of sex.
 * Set to null to use sex-adaptive selection (default).
 */
export const THEME_OVERRIDE: ThemeVariant | null = null;

/**
 * Fallback variant used for:
 * - Static StyleSheet.create() at module load time
 * - When sex is null (no profile set / onboarding incomplete)
 */
export const DEFAULT_VARIANT: ThemeVariant = 'blossom';
```

### 1.3 Breeze Colour Token Table

Soft sky blue palette — the cool-toned counterpart to Blossom (rose), maintaining the same calm, pastel character.

| Token | Hex | Description |
|---|---|---|
| `primary` | `#5B9FD4` | Soft cornflower blue — CTAs, active states |
| `primaryLight` | `#8CBDE6` | Pale sky blue — highlights |
| `primaryDark` | `#3D7CB5` | Deep blue — pressed states |
| `secondary` | `#C5DCF0` | Ice blue — chips, badges |
| `accent` | `#8CBDE6` | Light blue — icon accents |
| `profileGirl` | `#E88CBB` | Pink (same across all variants) |
| `profileGirlBg` | `#FFF0F7` | Pink tint |
| `profileBoy` | `#5B9FD4` | Uses primary blue |
| `profileBoyBg` | `#EFF5FB` | Blue tint |
| `success` | `#7ABD8C` | Sage green |
| `error` | `#D47B7B` | Soft coral red |
| `warning` | `#E8C879` | Warm gold |
| `info` | `#6C8FD4` | Periwinkle |
| `background` | `#F3F8FD` | Blue-tinted cream |
| `surface` | `#FFFFFF` | White |
| `surfaceHover` | `#EBF2FA` | Blue-tinted hover |
| `border` | `#D4E2F0` | Steel-tinted border |
| `borderFocus` | `#5B9FD4` | Primary (blue) |
| `backdrop` | `rgba(20, 35, 55, 0.45)` | Cool dark overlay |
| `text` | `#1E2D3A` | Deep navy — primary text |
| `textSecondary` | `#4A6478` | Medium slate |
| `textMuted` | `#8CA0B3` | Pale steel — placeholders |
| `textOnPrimary` | `#FFFFFF` | White |
| `textOnError` | `#FFFFFF` | White |

#### Category Colors (Breeze)

```typescript
['#5B9FD4', '#8CBDE6', '#C5DCF0', '#3D7CB5', '#7ABD8C',
 '#E8C879', '#6C8FD4', '#A08FB2', '#8CA0B3', '#D47B7B',
 '#8BAD7A', '#4A6478']
```

---

## 2. Theme Resolution Architecture

### 2.1 Static vs. Runtime Strategy

**Constraint:** `StyleSheet.create()` executes at module load time. Theme tokens used inside static StyleSheets cannot react to runtime state changes.

**Accepted approach (per user decision):**
- Static StyleSheets continue to use module-level `theme` export (resolved from `DEFAULT_VARIANT` or `THEME_OVERRIDE`)
- Shapes, spacing, typography, elevation, and motion are **identical across all variants** — so static StyleSheets are always correct for these tokens
- **Only colour-bearing props** need to be reactive — these are passed as inline style overrides from `useTheme()`

This means: structural layout (padding, borderRadius, shadow shapes) comes from static styles; colours (backgroundColor, borderColor, text color) that differ per variant are applied dynamically via `useTheme()`.

### 2.2 New Files

#### `src/theme/getThemeForSex.ts`

```typescript
import type { Theme } from './types';
import { THEME_OVERRIDE, DEFAULT_VARIANT, type ThemeVariant } from './config';
import { blossomColors } from './variants/blossom';
import { honeyColors } from './variants/honey';
import { breezeColors } from './variants/breeze';
import { typography } from './tokens/typography';
import { spacing } from './tokens/spacing';
import { shape } from './tokens/shape';
import { buildElevation } from './tokens/elevation';
import { motion } from './tokens/motion';

const colorMap: Record<ThemeVariant, ColorTokens> = {
  blossom: blossomColors,
  honey:   honeyColors,
  breeze:  breezeColors,
};

function resolveVariant(sex: 'girl' | 'boy' | null | undefined): ThemeVariant {
  if (THEME_OVERRIDE) return THEME_OVERRIDE;
  if (sex === 'girl') return 'blossom';
  if (sex === 'boy')  return 'breeze';
  return DEFAULT_VARIANT;  // 'blossom'
}

export function getThemeForSex(sex: 'girl' | 'boy' | null | undefined): Theme {
  const variant = resolveVariant(sex);
  const colors = colorMap[variant];
  return {
    colors,
    typography,
    spacing,
    shape,
    elevation: buildElevation(colors.text, colors.primary),
    motion,
  };
}
```

#### `src/hooks/useTheme.ts`

```typescript
import { useSettingsStore } from '../stores/settingsStore';
import { getThemeForSex } from '../theme/getThemeForSex';
import type { Theme } from '../theme/types';

export function useTheme(): Theme {
  const sex = useSettingsStore(state => state.sex);
  return getThemeForSex(sex);
}
```

### 2.3 Updated `src/theme/index.ts`

```typescript
import { THEME_OVERRIDE, DEFAULT_VARIANT, type ThemeVariant } from './config';
import { blossomColors } from './variants/blossom';
import { honeyColors } from './variants/honey';
import { breezeColors } from './variants/breeze';
import { typography } from './tokens/typography';
import { spacing } from './tokens/spacing';
import { shape } from './tokens/shape';
import { buildElevation } from './tokens/elevation';
import { motion } from './tokens/motion';
import type { Theme } from './types';

const colorMap: Record<ThemeVariant, ColorTokens> = {
  blossom: blossomColors,
  honey:   honeyColors,
  breeze:  breezeColors,
};

const activeVariant = THEME_OVERRIDE ?? DEFAULT_VARIANT;
const activeColors = colorMap[activeVariant];

/** Static module-level theme — used by StyleSheet.create() at import time. */
export const theme: Theme = {
  colors: activeColors,
  typography,
  spacing,
  shape,
  elevation: buildElevation(activeColors.text, activeColors.primary),
  motion,
};

// Convenience re-exports (unchanged)
export const colors = theme.colors;
export const { fontSize, fontWeight, lineHeight, letterSpacing } = theme.typography;
export const space = theme.spacing;
export const radii = theme.shape;
export const shadow = theme.elevation;

export type { Theme, ColorTokens, ThemeVariant } from './types';
```

### 2.4 Updated `src/utils/theme.ts` Bridge

The bridge continues to re-export `COLORS` from `src/theme` — Blossom colours as the default. No changes needed beyond what was already done in Phase 1.

### 2.5 Screens That Need `useTheme()`

Only screens that currently compute `accentColor` based on sex need to be updated to use `useTheme()`. Other screens import from the static `theme` export and get the default variant, which is correct since structural tokens don't vary.

| Screen | Current sex-dependent logic | Change |
|---|---|---|
| `home.tsx` | `accentColorBySex` lookup for StatCard, bar chart, RefreshControl tint, profile name, word chip colors | Replace `accentColorBySex` with `const { colors } = useTheme()`, use `colors.primary` for accent |
| `app/(tabs)/_layout.tsx` | `tabBarActiveTintColor: theme.colors.primary` (static) | Use `useTheme()` so tab bar tint follows sex |
| `settings.tsx` | No sex-dependent styling currently | Optional: use `useTheme()` for edit-profile button accent |
| `onboarding.tsx` | `accentColor` computed from selected sex locally | Use `getThemeForSex(sex)` for preview colours during onboarding |

---

## 3. Icon Sweep — Per-File Replacement Table

### 3.1 Component Prop Updates

#### `StatCard` (`src/components/UIComponents.tsx`)

Add optional `icon` prop alongside existing `emoji`:

```typescript
interface StatCardProps {
  emoji?: string;            // kept for backward compat
  icon?: React.ReactNode;    // new: renders Ionicons instead of emoji
  value: number | string;
  label: string;
  color: string;
  testID?: string;
}
```

Render logic: if `icon` is provided, render it; otherwise fall back to `<Text>{emoji}</Text>`.

#### `EmptyState` (`src/components/UIComponents.tsx`)

Same pattern:

```typescript
interface EmptyStateProps {
  emoji?: string;
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}
```

### 3.2 Full Replacement Table

| File | Line(s) | Current Emoji | Replacement | Notes |
|---|---|---|---|---|
| **home.tsx** | 54 | `🎂 {ageText}` | `<Ionicons name="gift-outline" size={12} /> {ageText}` | Inline icon before age text |
| **home.tsx** | 63 | `emoji="📝"` (StatCard) | `icon={<Ionicons name="create-outline" size={22} />}` | Total words |
| **home.tsx** | 64 | `emoji="🗣️"` (StatCard) | `icon={<Ionicons name="chatbubbles-outline" size={22} />}` | Total variants |
| **home.tsx** | 67 | `emoji="📅"` (StatCard) | `icon={<Ionicons name="today-outline" size={22} />}` | Words today |
| **home.tsx** | 68 | `emoji="📆"` (StatCard) | `icon={<Ionicons name="calendar-outline" size={22} />}` | Words this week |
| **home.tsx** | 69 | `emoji="🗓️"` (StatCard) | `icon={<Ionicons name="calendar-clear-outline" size={22} />}` | Words this month |
| **home.tsx** | 141 | `🌟` (empty hero) | `<Ionicons name="star-outline" size={64} />` | Dashboard empty state |
| **words.tsx** | 95 | `🗣️ {v}` (variant chip) | `<Ionicons name="chatbubble-outline" size={11} /> {v}` | Inline icon |
| **words.tsx** | 100 | `💬 {item.notes}` | `<Ionicons name="document-text-outline" size={11} /> {item.notes}` | Inline icon |
| **words.tsx** | 158 | `emoji={search ? '🔍' : '📝'}` (EmptyState) | `icon={<Ionicons name={search ? 'search-outline' : 'create-outline'} size={56} />}` | |
| **variants.tsx** | 79 | `💬 {item.notes}` | `<Ionicons name="document-text-outline" size={11} /> {item.notes}` | Inline icon |
| **variants.tsx** | 132 | `emoji="🗣️"` (EmptyState) | `icon={<Ionicons name="chatbubbles-outline" size={56} />}` | |
| **settings.tsx** | 116 | `🌐 {t('settings.language')}` | `<Ionicons name="globe-outline" size={17} /> {…}` | Section title |
| **settings.tsx** | 136 | `✓` (language check) | `<Ionicons name="checkmark" size={14} />` | Active language indicator |
| **settings.tsx** | 145 | `🏷️ {t('settings.categories')}` | `<Ionicons name="pricetag-outline" size={17} /> {…}` | Section title |
| **settings.tsx** | 159 | `›` (category chevron) | `<Ionicons name="chevron-forward" size={18} />` | Row chevron |
| **ManageCategoryModal** | 94 | `✏️` (edit action) | `<Ionicons name="pencil-outline" size={20} />` | Edit button icon |
| **ManageCategoryModal** | 101 | `🗑️` (delete action) | `<Ionicons name="trash-outline" size={20} />` | Delete button icon |
| **AddCategoryModal** | 141 | `🗑️ {t('common.remove')}` | `<Ionicons name="trash-outline" size={14} /> {…}` | Delete button |
| **AddWordModal** | 239 | `🗑️ {t('common.remove')}` | `<Ionicons name="trash-outline" size={14} /> {…}` | Delete button |
| **AddWordModal** | 273 | `📅 {formatDate(...)}` | `<Ionicons name="calendar-outline" size={12} /> {…}` | Duplicate date |
| **AddWordModal** | 275 | `🗣️ {count}` | `<Ionicons name="chatbubble-outline" size={12} /> {…}` | Duplicate variant count |
| **AddWordModal** | 278 | `💬 {notes}` | `<Ionicons name="document-text-outline" size={12} /> {…}` | Duplicate notes |
| **AddWordModal** | 380 | `🗣️ {v.variant}` | `<Ionicons name="chatbubble-outline" size={13} /> {…}` | Existing variant row |
| **AddWordModal** | 381 | `›` (chevron) | `<Ionicons name="chevron-forward" size={18} />` | Variant edit chevron |
| **AddWordModal** | 367 | `✕` (variant remove) | `<Ionicons name="close" size={16} />` | Inline remove button |
| **AddWordModal** | 402 | `✕` (new variant remove) | `<Ionicons name="close" size={16} />` | Inline remove button |
| **AddWordModal** | 292–293 | `‹` / `›` (carousel arrows) | `<Ionicons name="chevron-back" size={18} />` / `<Ionicons name="chevron-forward" size={18} />` | Category scroll arrows |
| **AddVariantModal** | 130 | `🗑️ {t('common.remove')}` | `<Ionicons name="trash-outline" size={14} /> {…}` | Delete button |
| **AddVariantModal** | 149 | `🔍` (search icon) | `<Ionicons name="search" size={16} />` | Word search box |
| **AddVariantModal** | 161 | `✕` (clear) | `<Ionicons name="close-circle" size={16} />` | Search clear |
| **DatePickerField** | 148 | `📅` (date btn icon) | `<Ionicons name="calendar-outline" size={18} />` | Date picker trigger |
| **DatePickerField** | 150 | `▾` (dropdown arrow) | `<Ionicons name="chevron-down" size={14} />` | Dropdown indicator |
| **ImportModal** | 253 | `📂` (file picker icon) | `<Ionicons name="folder-open-outline" size={22} />` | File picker button |
| **onboarding.tsx** | 302 | `📅` (date btn icon) | `<Ionicons name="calendar-outline" size={18} />` | Birth date button |
| **onboarding.tsx** | 306 | `▾` (dropdown arrow) | `<Ionicons name="chevron-down" size={14} />` | Dropdown indicator |

### 3.3 Emoji Preserved (Not Replaced)

| Emoji | Location | Reason |
|---|---|---|
| `CATEGORY_EMOJIS` array | `src/utils/theme.ts`, `AddCategoryModal` picker | User-chosen content |
| Category emoji in `CategoryBadge` | Everywhere categories render | User content |
| `cat.emoji` in category chips | `AddWordModal`, `settings.tsx` | User content |
| 👧 👦 👶 (profile sex) | `home.tsx`, `settings.tsx`, `onboarding.tsx` | Identity markers — future avatar phase |

---

## 4. Implementation Plan

### Phase A — Variant Rename & Breeze (Foundation)

| Step | Files | Description |
|---|---|---|
| A.1 | `src/theme/variants/blossom.ts` | Rename `florzinha.ts` → `blossom.ts`, rename export `florzinhaColors` → `blossomColors` |
| A.2 | `src/theme/variants/honey.ts` | Rename `mel.ts` → `honey.ts`, rename export `melColors` → `honeyColors` |
| A.3 | `src/theme/variants/breeze.ts` | New file — full Breeze colour token table |
| A.4 | `src/theme/config.ts` | Rewrite: export `ThemeVariant` type, `THEME_OVERRIDE`, `DEFAULT_VARIANT` |
| A.5 | `src/theme/types.ts` | Add `ThemeVariant` type export |
| A.6 | `src/theme/index.ts` | Update colorMap to use new variant names and three-variant map |
| A.7 | `src/theme/getThemeForSex.ts` | New — pure function `getThemeForSex(sex) → Theme` |
| A.8 | `src/hooks/useTheme.ts` | New — hook that reads `useSettingsStore().sex` and returns `getThemeForSex(sex)` |
| A.9 | `src/utils/theme.ts` | Update bridge if needed (import paths changed) |
| A.10 | All test files importing old variant names | Update imports |

**Estimated changes:** 3 renamed files, 3 new files, ~5 modified files
**Risk:** Low — purely additive with renames. Existing tests validate token structure.

### Phase B — Sex-Adaptive Screens

| Step | Files | Description |
|---|---|---|
| B.1 | `app/(tabs)/_layout.tsx` | Use `useTheme()` for `tabBarActiveTintColor` |
| B.2 | `app/(tabs)/home.tsx` | Replace `accentColorBySex` lookup with `useTheme().colors.primary`. Remove ad-hoc `COLORS.secondary`, `COLORS.accent`, `COLORS.success`, `COLORS.info` for StatCard colours — use themed semantic colours or pass `colors.primary` as accent. |
| B.3 | `app/onboarding.tsx` | Use `getThemeForSex(sex)` for preview accent colours |
| B.4 | `app/(tabs)/settings.tsx` | Optional: use `useTheme()` for accent on edit-profile button |

**Estimated changes:** ~4 modified files
**Risk:** Medium — changes visible accent colours on dashboard. Requires visual review.

### Phase C — Icon Sweep

| Step | Files | Description |
|---|---|---|
| C.1 | `src/components/UIComponents.tsx` | Add `icon` prop to `StatCard` and `EmptyState` |
| C.2 | `app/(tabs)/home.tsx` | Replace StatCard emoji props with Ionicons, replace empty-state emoji, replace 🎂 |
| C.3 | `app/(tabs)/words.tsx` | Replace variant chip 🗣️, note 💬, EmptyState emoji |
| C.4 | `app/(tabs)/variants.tsx` | Replace 💬 note, EmptyState emoji |
| C.5 | `app/(tabs)/settings.tsx` | Replace 🌐, 🏷️ section titles, ✓ checkmark, › chevrons |
| C.6 | `src/components/ManageCategoryModal.tsx` | Replace ✏️, 🗑️ |
| C.7 | `src/components/AddCategoryModal.tsx` | Replace 🗑️ |
| C.8 | `src/components/AddWordModal.tsx` | Replace 🗑️, 📅, 🗣️, 💬, ✕, ‹/› |
| C.9 | `src/components/AddVariantModal.tsx` | Replace 🗑️, 🔍, ✕ |
| C.10 | `src/components/DatePickerField.tsx` | Replace 📅, ▾ |
| C.11 | `src/components/ImportModal.tsx` | Replace 📂 |
| C.12 | `app/onboarding.tsx` | Replace 📅, ▾ |

**Estimated changes:** ~12 modified files
**Risk:** Medium — visual changes in every modal/screen. Requires per-screen visual verification.

### Phase D — Tests & Documentation

| Step | Files | Description |
|---|---|---|
| D.1 | `__tests__/unit/theme.test.ts` | Update for renamed variants + add Breeze tests + test `getThemeForSex()` |
| D.2 | `__tests__/integration/UIComponents.test.tsx` | Update for `icon` prop on StatCard/EmptyState |
| D.3 | `__tests__/hooks/useTheme.test.ts` | New — test that hook returns correct variant for girl/boy/null |
| D.4 | All existing tests with emoji text assertions | Update to use Ionicons or testID-based assertions |
| D.5 | `.agents/standards/design-system.md` | Update with Breeze variant, `useTheme()` hook docs, icon sweep coverage |
| D.6 | `CLAUDE.md`, `AGENTS.md`, `GEMINI.md` | Update theme architecture section with three variants + `useTheme()` |
| D.7 | `.agents/AGENTS-CHANGELOG.md` | Changelog entry |

**Estimated changes:** ~8 modified/new test files, ~4 doc files
**Risk:** Low — docs and tests only

---

## 5. Migration Notes

### 5.1 Import Update Checklist

Every file that currently imports from the old variant files must be updated:

```typescript
// Before
import { florzinhaColors } from './variants/florzinha';
import { melColors } from './variants/mel';

// After
import { blossomColors } from './variants/blossom';
import { honeyColors } from './variants/honey';
import { breezeColors } from './variants/breeze';
```

### 5.2 Static vs. Dynamic Usage Guide

| What to use | When |
|---|---|
| `import { theme } from '../theme'` | Inside `StyleSheet.create()` — structural tokens (spacing, shape, shadows, typography) |
| `const { colors } = useTheme()` | Inside component render — colour values that must react to sex changes |
| `getThemeForSex(sex)` | Outside React (pure functions, utilities, onboarding preview before Zustand is set) |

### 5.3 `home.tsx` Colour Simplification

Currently `home.tsx` uses 5 different colour values for 5 StatCards:

```typescript
// Before — ad-hoc colour choices
<StatCard color={accentColor} />       // sex-dependent
<StatCard color={COLORS.secondary} />  // static
<StatCard color={COLORS.accent} />     // static
<StatCard color={COLORS.success} />    // static
<StatCard color={COLORS.info} />       // static
```

After the change, all StatCards should use themed colours from `useTheme()`. The simplest approach:

```typescript
const { colors } = useTheme();
<StatCard color={colors.primary} />      // total words
<StatCard color={colors.secondary} />    // variants
<StatCard color={colors.accent} />       // today
<StatCard color={colors.success} />      // this week
<StatCard color={colors.info} />         // this month
```

This ensures all 5 colours shift together when the variant changes (Blossom → Breeze).

---

## Alternatives Considered

1. **React Context ThemeProvider:** Would wrap the entire app in a `<ThemeProvider>` that re-renders all children on sex change. Rejected: too heavy for a setting that changes once during onboarding. The hook-based approach is simpler and doesn't force unnecessary re-renders on unrelated screens.

2. **Merge Blossom and Breeze into one variant with sex-dependent overrides:** Would keep two variants (Honey + a single "adaptive" variant that swaps pink/blue based on sex). Rejected: a full third variant is cleaner — each has a complete token table, no conditional logic in colour definitions.

3. **Replace profile emoji (👧👦👶) with Ionicons now:** Could use `person-outline` or similar. Rejected: the user explicitly said these stay as identity markers. Custom avatar illustrations are a future phase.

---

## Open Questions

- [x] Static StyleSheet strategy — accepted: only colour props are reactive
- [x] Honey variant — kept as developer-only override
- [x] Inline annotations — replaced with Ionicons for full consistency

No remaining blockers.

---

## Acceptance Criteria

- [ ] Three named variants exist: `blossom`, `honey`, `breeze`
- [ ] `THEME_OVERRIDE = null` in config.ts (sex-adaptive by default)
- [ ] `useTheme()` hook returns Blossom for girl, Breeze for boy, Blossom for null
- [ ] `getThemeForSex()` is a pure function testable without React
- [ ] Tab bar tint colour follows the child's sex
- [ ] Dashboard (home.tsx) accent colours follow the child's sex — no more `accentColorBySex` object
- [ ] All emoji in the "Replacement Table" (section 3.2) are replaced with Ionicons
- [ ] Category emoji and profile sex emoji remain untouched
- [ ] `StatCard` and `EmptyState` accept an `icon` prop with `emoji` fallback
- [ ] All existing tests pass with updated imports/assertions
- [ ] New tests cover `getThemeForSex`, `useTheme`, Breeze variant structure, icon rendering
- [ ] `npm run ci` passes
- [ ] `.agents/standards/design-system.md` updated with three-variant architecture
- [ ] `CLAUDE.md`, `AGENTS.md`, `GEMINI.md` updated
