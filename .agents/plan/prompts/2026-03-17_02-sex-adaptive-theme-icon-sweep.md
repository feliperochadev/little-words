# Prompt — 2026-03-17_02-sex-adaptive-theme-icon-sweep

## Original Prompt

Ok I really liked the florzinha theme, but now I'm thinking, when it's a boy selected we have a light blue tone for the buttons and some actions on home page. I think would make sense to keep this consistent when It's a girl use the florzinha theme, when it's a boy use an variant of that with this blue. and change the theme name to english and in the config create a possibility to select based on the sex, Another thing is while the components like more uniform and consistent we still are using generic emojis in the title of the screens, inside the buttons like edit, remove, import, export sort by, save, share, onboarding, edit profile and so on, I want to those emojis being replaced by unique icons that are consistent with the system design that we are using. write this refine prompt into a .md file

---

## Refined Prompt

### 1. Prompt Analysis

- **Intent:**
  1. Introduce a third design system variant ("Breeze" — soft blue, for boy profile) alongside the existing "Blossom" (Florzinha renamed) and "Honey" (Mel renamed).
  2. Rename all variants to English identifiers.
  3. Make the active theme derive automatically from the child's sex profile setting, with a developer-override fallback.
  4. Complete the icon sweep: replace every remaining decorative emoji used as UI chrome (action buttons, status indicators, screen annotations) with Ionicons — consistent with the system already in place.

- **Weaknesses or ambiguities in the original:**
  - "Change the theme name to English" — unclear if this means the `ACTIVE_THEME` string identifiers, the variant display names, or both.
  - "Create a possibility to select based on the sex" — unclear implementation strategy. The current theme is resolved at module-import time (static constant). Sex is in Zustand store (runtime). These two approaches conflict and need a design decision.
  - "Some actions on home page" with blue — which specific elements? (Only the accent/primary-coloured elements, or all theme tokens?)
  - "Emojis in the title of the screens" — screens don't actually have emoji in their `<Text>` title elements; the emoji are in buttons, chips, empty states, and inline annotations. Needs to be specified accurately.
  - "Sort by, save, share" buttons — these exist but the exact icon mapping hasn't been specified.
  - No fallback variant specified for when sex is `null` (no profile set yet, or during onboarding).

- **Missing constraints or context:**
  - Runtime theme switching strategy: hook-based vs. context-based vs. re-computed at component render.
  - Category emoji in `AddCategoryModal` are **user content** — must NOT be replaced.
  - Profile emoji (👧 👦 👶) in settings and home profile block — are these in scope or preserved as representational content?
  - The `StatCard` and `EmptyState` components currently take an `emoji` string prop — they need an `icon` prop added (or the prop type broadened to accept either).
  - Whether the `Honey` (Mel) variant is kept as a third option or replaced entirely by the sex-adaptive system.

---

### 2. Edge Cases

- **sex = null (unset / onboarding not complete):** The app renders the dashboard and some screens before onboarding finishes. Theme must fall back gracefully — recommended default is `'blossom'` (the user said they liked it most).
- **Variant identifier rename:** Existing `ACTIVE_THEME = 'mel'` in `config.ts` must be updated to `'honey'` to avoid a runtime key-miss bug after renaming.
- **Module-level theme instantiation:** `src/theme/index.ts` currently computes `theme` at import time from a static constant. Sex-based switching requires a different resolution strategy — the module-level `theme` export can remain as the developer-override default, but a `useTheme()` hook must re-derive it from the store at runtime.
- **Multiple renders during sex change:** If a parent re-assigns sex in settings, components must re-render with the correct theme without a full app restart.
- **Emoji in `StatCard.emoji` prop:** Five calls in `home.tsx` pass emoji strings. After the `icon` prop is added, these call sites must be updated to pass Ionicons components instead.
- **Emoji in `EmptyState.emoji` prop:** Four call sites pass emoji. Replacing the prop type means updating every call site.
- **`AddWordModal` duplicate-word preview** shows `🗣️` and `💬` as inline decorators in list items — these are data annotations, not action buttons. Decide: replace with small Ionicons or keep as subtle content markers?
- **`BrandHeader` component** — may contain emoji or brand-specific text that should not be changed.
- **Tests:** All existing tests that assert on emoji text (e.g., `getByText('🗑️')`) must be updated.

---

### 3. Suggested Improvements

- **Name all three variants clearly in English:**
  - `'florzinha'` → `'blossom'` (soft rose + lavender — girl default)
  - `'mel'` → `'honey'` (warm amber — currently in use, can remain as developer override)
  - New: `'breeze'` (soft sky blue — boy default)

- **Define `getThemeForSex()` utility and `useTheme()` hook:**
  - `src/theme/getThemeForSex.ts` — pure function `(sex: 'girl' | 'boy' | null) => Theme`
  - `src/hooks/useTheme.ts` — hook that reads `useSettingsStore().sex` and returns the derived theme
  - Keep `ACTIVE_THEME` in `config.ts` as a developer override (fallback when `useTheme()` is not in a component context, e.g., static StyleSheets)
  - For static StyleSheets that need theme values at module load time (currently computed from `ACTIVE_THEME`), use `getThemeForSex(null)` as the default. Components calling `useTheme()` will get the correct per-sex version.

- **Specify the Breeze color palette fully:**
  - Derive from Blossom structure, replacing warm pink/rose tones with cool blue equivalents
  - `primary: '#5B9FD4'` (soft cornflower blue), `background: '#F3F8FD'` (blue-tinted cream), `text: '#1E2D3A'` (deep navy), `secondary: '#C5DCF0'` (pale blue)

- **Complete Ionicons mapping for remaining emoji:**

  | Emoji | Location | Ionicons name |
  |---|---|---|
  | 🗑️ (remove/delete) | All modals action buttons | `trash-outline` |
  | ✏️ (edit) | ManageCategoryModal | `pencil-outline` |
  | 📂 (import file) | ImportModal | `folder-open-outline` |
  | 📅 (date) | DatePickerField, AddWordModal, onboarding | `calendar-outline` |
  | 📤 (export/share) | Settings screen | `share-outline` |
  | 💾 (save) | If used as save button | `checkmark-circle-outline` |
  | 🗣️ (variant chip prefix) | words.tsx variant chips, AddWordModal | `chatbubble-outline` |
  | 💬 (notes inline) | words.tsx, variants.tsx, AddWordModal | `document-text-outline` |
  | 🎂 (age in profile block) | home.tsx profileAge | `gift-outline` |
  | 🌟 (dashboard empty state) | home.tsx emptyEmoji | `sparkles-outline` (or `star-outline`) |
  | 📝 (StatCard: total words) | home.tsx | `create-outline` |
  | 🗣️ (StatCard: variants) | home.tsx | `chatbubbles-outline` |
  | 📅 (StatCard: today) | home.tsx | `today-outline` |
  | 📆 (StatCard: this week) | home.tsx | `calendar-outline` |
  | 🗓️ (StatCard: this month) | home.tsx | `calendar-clear-outline` |
  | 🔍 (AddVariantModal inline search) | AddVariantModal | Already `Ionicons.search` in SearchBar — remove the standalone emoji |

  **Do NOT replace:**
  - Category emojis in `AddCategoryModal` emoji picker (`CATEGORY_EMOJIS`) — user-chosen content
  - Category emoji in `CategoryBadge` — user content
  - Profile emoji 👧👦👶 in settings sex display and home profile block — representational identity content (keep for now, may be replaced by custom avatar in a future phase per the open question in the plan)
  - `BrandHeader` content

- **Update `StatCard` and `EmptyState` component props:**
  - `StatCard`: keep `emoji` prop for backward compat, add `icon?: React.ReactNode` prop; when `icon` is provided, render it instead of the emoji `<Text>`
  - `EmptyState`: same pattern — add `icon?: React.ReactNode`, fallback to `emoji` string when `icon` not provided

- **Specify fallback behaviour clearly:** `sex === null` → `'blossom'` variant (matches user preference)

---

### 4. Clarifying Questions — Resolved

1. **`useTheme()` hook vs. static StyleSheet:** ✅ Accepted — only colour-bearing style props passed dynamically update reactively; shapes/spacing from `StyleSheet.create()` remain static from the `ACTIVE_THEME` default.

2. **Honey variant:** ✅ Keep `'honey'` as a named variant (with full token table) but do not wire it to any sex — it remains accessible only via the `ACTIVE_THEME` developer override.

3. **Inline data annotations** (🗣️ in variant chips, 💬 in note previews): ✅ Replace with small Ionicons anyway for full consistency.

---

### 5. Refined Prompt

> **Plan a UI change for two improvements to the Palavrinhas Design System:**
>
> **Part A — Sex-Adaptive Theme**
>
> 1. Rename all theme variants to English identifiers: `'florzinha'` → `'blossom'`, `'mel'` → `'honey'`, and add a new third variant `'breeze'` (soft sky blue for boy profiles).
>
> 2. Define the full `'breeze'` color token table — a cool-toned blue equivalent of `'blossom'`, with `primary` around `#5B9FD4` (soft cornflower blue), `background` a blue-tinted cream, `text` a deep navy, and secondary in pale blue. All other tokens (typography, spacing, shape, elevation, motion) remain shared across all three variants.
>
> 3. Add a `getThemeForSex(sex: 'girl' | 'boy' | null): Theme` pure function in `src/theme/getThemeForSex.ts`. Mapping: `'girl'` → `blossom`, `'boy'` → `breeze`, `null` → `blossom` (default).
>
> 4. Add a `useTheme()` hook in `src/hooks/useTheme.ts` that reads `useSettingsStore().sex` and returns `getThemeForSex(sex)`. This is the runtime theme accessor for components.
>
> 5. Keep `ACTIVE_THEME` in `config.ts` (renamed values) as a developer-override constant. The module-level `theme` export in `index.ts` continues to use `ACTIVE_THEME` — this covers static StyleSheets. Components needing sex-reactive colours call `useTheme()` instead. Keep `'honey'` as a fully-defined named variant (all token values present) accessible only via `ACTIVE_THEME` override, not wired to any sex.
>
> 6. Update `home.tsx` to call `useTheme()` so accent colours (StatCard, bar chart, RefreshControl tint, word chips, profile name colour) correctly follow the child's sex.
>
> **Part B — Icon Sweep (Remaining Emoji in UI Chrome)**
>
> Replace all remaining decorative emoji used as UI chrome icons with `@expo/vector-icons` Ionicons, consistent with the icon strategy established in the current design system.
>
> Target locations and mappings:
> - `StatCard` (home.tsx): 📝→`create-outline`, 🗣️→`chatbubbles-outline`, 📅→`today-outline`, 📆→`calendar-outline`, 🗓️→`calendar-clear-outline` — update `StatCard` to accept an `icon` prop (renders Ionicons component), keep `emoji` prop as fallback.
> - `home.tsx` empty state: 🌟→`star-outline` — update `EmptyState` with `icon` prop, keep `emoji` fallback.
> - `home.tsx` profile age: 🎂→`Ionicons gift-outline` inline.
> - `words.tsx` variant chip prefix: 🗣️→`Ionicons chatbubble-outline` (size 11, inline before variant text).
> - `words.tsx` note preview: 💬→`Ionicons document-text-outline` (size 11, inline before note text).
> - `variants.tsx` note preview: 💬→`Ionicons document-text-outline` (size 11, inline).
> - `words.tsx` EmptyState: 🔍/📝→`search-outline`/`create-outline`.
> - `variants.tsx` EmptyState: 🗣️→`chatbubbles-outline`.
> - `ManageCategoryModal`: ✏️→`pencil-outline`, 🗑️→`trash-outline`.
> - `AddCategoryModal`: 🗑️→`trash-outline`.
> - `AddVariantModal`: 🗑️→`trash-outline`, inline 🔍→remove (SearchBar already has Ionicons).
> - `AddWordModal`: 🗑️→`trash-outline`, 📅→`calendar-outline`, 🗣️→`chatbubble-outline`, 💬→`document-text-outline`.
> - `DatePickerField`: 📅→`calendar-outline`.
> - `ImportModal`: 📂→`folder-open-outline`.
> - `onboarding.tsx` date button: 📅→`calendar-outline`.
>
> **Do NOT replace:** `CATEGORY_EMOJIS` picker in `AddCategoryModal` (user-chosen content), `CategoryBadge` emoji (user content), profile 👧👦👶 sex indicators (identity markers — future avatar phase).
>
> **Deliverables:** UI change plan document at `.agents/plan/ui-changes/2026-03-17_02-sex-adaptive-theme-icon-sweep.md` covering: variant rename table, `breeze` full color token table, `getThemeForSex` function spec, `useTheme` hook spec, static-vs-runtime StyleSheet strategy, updated `home.tsx` theme usage, and per-file icon replacement table.
