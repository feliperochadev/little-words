---
name: 2026-03-17_02-sex-adaptive-theme-icon-sweep
plan: .agents/plan/ui-changes/2026-03-17_02-sex-adaptive-theme-icon-sweep.md
status: done
started: 2026-03-17
completed: 2026-03-17
agent: claude
worktree: false
---

## Summary

Implements sex-adaptive theming (blossom/honey/breeze variants), adds `useTheme()` hook and `getThemeForSex()` pure function, and replaces all decorative emoji with Ionicons across every modal and screen.

## Resume patch (rate-limit follow-up)

Resumed and finished the missing runtime theme migration for controls that were still falling back to blossom defaults in boy mode.

- Converted remaining runtime-sensitive color usage from static `COLORS` to `useTheme().colors` in:
  - `app/(tabs)/settings.tsx`
  - `src/components/AddCategoryModal.tsx`
  - `src/components/AddVariantModal.tsx`
  - `src/components/ImportModal.tsx`
- Kept `app/(tabs)/words.tsx`, `app/(tabs)/variants.tsx`, and `src/components/AddWordModal.tsx` on the existing adaptive path, with a follow-up token compatibility fix (`textLight` → `textMuted`) where needed.
- Added focused regressions for boy/breeze rendering:
  - `__tests__/screens/settings.test.tsx`
  - `__tests__/integration/AddCategoryModal.test.tsx`
  - `__tests__/integration/AddVariantModal.test.tsx`
  - `__tests__/integration/ImportModal.test.tsx`
- Validation: `npm run ci` passes after the resumed fixes.

## Resume patch 2 (button-specific blossom fallback)

Addressed the remaining blossom-like fallback affecting button controls in boy mode by fixing the shared `Button` runtime theming path.

- Root-cause fix:
  - `src/components/UIComponents.tsx` `Button` now uses `useTheme()` runtime colors (`primary`, `secondary`, `danger`, `outline`, loading spinner, border/shadow/text), instead of static `theme.colors` values.
- Surface follow-ups:
  - Added stable test IDs for modal action buttons:
    - `src/components/AddCategoryModal.tsx`: `category-cancel-btn`
    - `src/components/AddVariantModal.tsx`: `variant-cancel-btn`, `variant-save-btn`
    - `src/components/AddWordModal.tsx`: `word-cancel-btn`, `word-save-btn`
  - `app/(tabs)/words.tsx`: added `words-add-btn` testID for `+ New` action.
- Regression tests added/updated:
  - `__tests__/integration/UIComponents.test.tsx`
  - `__tests__/integration/AddCategoryModal.test.tsx`
  - `__tests__/integration/AddVariantModal.test.tsx`
  - `__tests__/integration/AddWordModal.test.tsx`
  - `__tests__/screens/settings.test.tsx`
  - `__tests__/screens/words.test.tsx`
- Validation:
  - Focused test run for changed suites passed.
  - `npm run ci` passed.

## Resume patch 3 (home background + breeze tone tune)

Fixed the remaining home-screen blossom fallback and tuned breeze background to a lighter near-white blue.

- `app/(tabs)/home.tsx`:
  - Home container backgrounds now use runtime `useTheme().colors.background` on the root `SafeAreaView` and `ScrollView`.
  - Added `testID="home-scroll"` for style verification in tests.
- `src/theme/variants/breeze.ts`:
  - Updated `background` from `#F3F8FD` to `#F8FCFF` for a lighter, more near-white blue base.
- Tests:
  - `__tests__/screens/home.test.tsx` now asserts boy profile uses breeze background on the home container.
- Validation:
  - `npm test -- --runTestsByPath __tests__/screens/home.test.tsx` passed.
  - `npm run ci` passed.

## Resume patch 4 (words variant icon contrast)

Improved visibility of the variant icon in words list rows for both blossom and breeze themes.

- `app/(tabs)/words.tsx`:
  - Changed variant icon from `chatbubble-outline` to filled `chatbubble`.
  - Increased icon size (`11` → `12`) and switched icon color to `colors.primaryDark` for stronger contrast.
  - Added `testID` per variant icon: `word-variant-icon-${variantText}`.
- Tests:
  - `__tests__/screens/words.test.tsx`: added assertion that boy profile variant icon uses `getThemeForSex('boy').colors.primaryDark`.
- Validation:
  - `npm test -- --runTestsByPath __tests__/screens/words.test.tsx` passed.
  - `npm run ci` passed.

## Resume patch 5 (variant chip color inversion)

Final readability tweak on words variant chips to invert icon/text color assignment.

- `app/(tabs)/words.tsx`:
  - Swapped variant chip colors so the icon now uses `colors.secondary` and the variant text uses `colors.primaryDark`.
  - Added per-variant text testID: `word-variant-text-${variantText}` for precise style assertions.
- Tests:
  - `__tests__/screens/words.test.tsx`: updated regression to assert boy mode renders the swapped mapping (`icon=secondary`, `text=primaryDark`).
- Validation:
  - `npm test -- __tests__/screens/words.test.tsx --runInBand` passed.
  - `npm run ci` passed.

## Resume patch 6 (emoji-to-ionicon UI chrome cleanup)

Replaced remaining generic emoji UI chrome in home/words/variants/settings/import/category-modal surfaces with semantic Ionicons, while keeping content emojis (category/user data) unchanged.

- Screen/icon updates:
  - `app/(tabs)/home.tsx`: added section header icons for monthly progress (`bar-chart-outline`), by category (`pricetags-outline`), and recent words (`sparkles-outline`).
  - `app/(tabs)/words.tsx`: replaced title emoji with `book-outline`; added explicit sort icon `calendar-outline`.
  - `app/(tabs)/variants.tsx`: replaced title emoji with `chatbubbles-outline`; added sort icon `calendar-outline`; replaced hint emoji with `bulb-outline`.
  - `app/(tabs)/settings.tsx`: replaced title gear emoji with `settings-outline`; added import/export header icons and semantic action button icons (`download-outline`, `save-outline`, `share-social-outline`).
  - `src/components/ImportModal.tsx`: replaced text-symbol close/title treatment with Ionicons (`download-outline` in title and `close` in dismiss button).
  - `src/components/AddCategoryModal.tsx`: added semantic title icon (`pricetag-outline`) for category modal header.
- i18n cleanup:
  - `src/i18n/en-US.ts` and `src/i18n/pt-BR.ts`: removed emoji prefixes from affected UI-chrome labels (home section titles, words/variants titles + sort labels, settings title/import/export/edit/share labels, category modal titles, import modal title/tab text).
- Tests updated:
  - `__tests__/screens/home.test.tsx`
  - `__tests__/screens/words.test.tsx`
  - `__tests__/screens/variants.test.tsx`
  - `__tests__/screens/settings.test.tsx`
  - `__tests__/integration/ImportModal.test.tsx`
- Validation:
  - Focused suites for touched screens/modals passed.
  - `npm run ci` passed.

## Changes

| File | Action | Notes |
|------|--------|-------|
| `src/theme/variants/blossom.ts` | created | Renamed from florzinha.ts; export renamed to blossomColors |
| `src/theme/variants/honey.ts` | created | Renamed from mel.ts; export renamed to honeyColors |
| `src/theme/variants/breeze.ts` | created | New sky-blue palette for boy variant |
| `src/theme/config.ts` | modified | ACTIVE_THEME → THEME_OVERRIDE + DEFAULT_VARIANT; ThemeVariant type |
| `src/theme/index.ts` | modified | colorMap for all three variants; exports ThemeVariant |
| `src/theme/getThemeForSex.ts` | created | Pure function: girl→blossom, boy→breeze, null→blossom |
| `src/hooks/useTheme.ts` | created | React hook reading sex from Zustand store |
| `app/(tabs)/_layout.tsx` | modified | useTheme() for reactive tabBarActiveTintColor |
| `app/(tabs)/home.tsx` | modified | useTheme() replaces accentColorBySex; StatCards use Ionicons |
| `app/(tabs)/words.tsx` | modified | Ionicons for variant/notes icons and EmptyState |
| `app/(tabs)/variants.tsx` | modified | Ionicons for notes icon and EmptyState |
| `app/(tabs)/settings.tsx` | modified | Ionicons for section headers, checkmark, chevron |
| `app/onboarding.tsx` | modified | getThemeForSex() for preview accent; Ionicons icons |
| `src/components/UIComponents.tsx` | modified | EmptyState + StatCard accept icon?: React.ReactNode |
| `src/components/AddWordModal.tsx` | modified | All emoji → Ionicons; testIDs on remove buttons |
| `src/components/AddVariantModal.tsx` | modified | All emoji → Ionicons; testID on clear button |
| `src/components/AddCategoryModal.tsx` | modified | Delete button emoji → Ionicons |
| `src/components/ManageCategoryModal.tsx` | modified | Edit/delete emoji → Ionicons |
| `src/components/DatePickerField.tsx` | modified | Calendar/arrow emoji → Ionicons |
| `src/components/ImportModal.tsx` | modified | Folder emoji → Ionicons |
| `__tests__/hooks/useTheme.test.ts` | created | Hook unit tests |
| `__tests__/unit/theme.test.ts` | modified | Updated for renamed variants + breeze + getThemeForSex |
| `__tests__/integration/UIComponents.test.tsx` | modified | Tests for icon prop on EmptyState and StatCard |
| `__tests__/integration/DatePickerField.test.tsx` | modified | testID-based assertion replaces emoji text |
| `__tests__/integration/ManageCategoryModal.test.tsx` | modified | Text-based assertion replaces emoji |
| `__tests__/integration/AddWordModal.test.tsx` | modified | testID-based assertions for remove buttons |
| `__tests__/integration/AddVariantModal.test.tsx` | modified | testID-based assertion for clear button |
| `.agents/standards/design-system.md` | modified | Updated variants, file tree, variant switching docs |
| `CLAUDE.md` | modified | Updated Theme & Design System section; added useTheme hook |
| `AGENTS.md` | modified | Updated Coding Style section for new theme architecture |
| `GEMINI.md` | modified | Updated theme.ts description |
| `.agents/AGENTS-CHANGELOG.md` | modified | Added entry 2026-03-17_3 |
