# Baby Profile Card + Onboarding Edit Mode

**Date:** 2026-03-17
**Type:** UI/UX Refactor
**Files in scope:** `app/(tabs)/settings.tsx`, `app/onboarding.tsx`

---

## Pre-requirements

1. Create a separated branch from `implement-new-design-system` to work on that (work using git work tree also)

## Part 1 — Baby Profile Card (`settings.tsx`)

In the Baby Profile `<Card>`:

1. Display the sex emoji next to the child's name:
   - Use the same `emojiBySex` map already defined in `onboarding.tsx` (`{ girl: '👧', boy: '👦' }`).
   - Fallback to `'👶'` when sex is null/undefined.
2. Add birth date below (or inline) using `formatDisplayDate` from `src/utils/dateHelpers`.
   - Read `birth` from `useSettingsStore`. `birth` is stored as a `YYYY-MM-DD` string; parse it to a `Date` before passing to `formatDisplayDate`.
   - Show `—` when birth is null/undefined.
3. The "Edit Profile" button behaviour is unchanged — it still calls `router.push('/onboarding?edit=true')`.

---

## Part 2 — Onboarding screen in edit mode (`onboarding.tsx`)

Detect edit mode via `useLocalSearchParams()`:

```ts
const { edit } = useLocalSearchParams<{ edit?: string }>();
const isEditMode = edit === 'true';
```

### Pre-fill fields when `isEditMode` is true

- `name` initialised from `useSettingsStore().name`
- `sex` initialised from `useSettingsStore().sex`
- `birthDate` initialised by parsing `useSettingsStore().birth` (YYYY-MM-DD → Date)

### UI changes when `isEditMode` is true

- Hide `<BrandHeader />`, the large profile emoji, the welcome title, and the subtitle (the top decorative section).
- Show a simple page title using the existing `t('settings.editProfile')` i18n key.
- Replace the single `continueBtn` with a two-button row matching the `AddWordModal` pattern:
  - **Cancel** (outline variant): calls `router.back()` — discards all local state changes.
  - **Save** (primary variant): validates fields (same rules as `handleContinue`), calls `setProfile({ name, sex, birth })` only (does **not** call `setOnboardingDone()`), then `router.back()`.
- The Cancel/Save row must always be visible in edit mode (not gated by `allFilled`), but Save should be disabled/show validation errors if required fields are empty.
- Back gesture / hardware back button should behave like Cancel (navigate back, changes discarded).

### Normal mode (non-edit) behaviour

Unchanged — no regressions to the first-run onboarding flow.

---

## Edge Cases to Cover

- User changes sex then presses Cancel → original sex is restored (discard local state).
- User clears the name then presses Save → validation blocks with alert.
- Birth date set to a future date → existing future-date validation still blocks save.
- Back gesture in edit mode → treated as Cancel.
- First-time onboarding (no existing profile, `isEditMode` false) → Cancel button does not appear.
- `birth` stored as null/undefined → birth date field shows placeholder, not a crash.

---

## Constraints

- All new and modified logic must have tests (≥ 99% line, ≥ 95% branch).
- Run `npm run ci` before considering done.
- Follow existing theme/color conventions: `useTheme()` for dynamic colors, `THEME_COLORS` for static styles in `StyleSheet.create()`.
- No new dependencies.
- Update `CLAUDE.md` and `CLAUDE-CHANGELOG.md` after CI passes.
