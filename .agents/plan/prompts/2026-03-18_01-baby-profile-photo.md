# Prompt — 2026-03-18_01-baby-profile-photo

## Original Prompt

### Overview
Add an optional profile photo to the baby profile in Palavrinhas. The photo is stored
locally using the existing media asset foundation (`assets` table, `assetStorage`,
`assetService`). The plan must cover: storage model extension, a reusable `ProfileAvatar`
component, integration into onboarding, home screen, settings screen, and
`EditProfileModal`, plus full test coverage per project standards.

### Storage Model

Extend `parent_type` in `src/types/asset.ts` to include `'profile'`:

    export type ParentType = 'word' | 'variant' | 'profile';

- Profile photo is stored as a singleton asset: `parent_type = 'profile'`, `parent_id = 1`,
  `asset_type = 'photo'`.
- Only one photo per profile is allowed. Saving a new photo must delete the previous one
  (DB record + file) atomically before inserting the new one.
- The `assets` table and existing `assetService`/`assetStorage` need no schema changes —
  only the TypeScript union type expands.
- Add `getProfilePhoto(): Promise<Asset | null>` and `deleteProfilePhoto(): Promise<void>`
  to `assetService` (and the matching repository functions).
- Add `useProfilePhoto()` query hook and `useSaveProfilePhoto()` / `useRemoveProfilePhoto()`
  mutation hooks in `src/hooks/useAssets.ts`, following existing TanStack Query patterns.
- `clearAllData()` already deletes all assets rows and calls `deleteAllMedia()` — no
  additional change needed.

### `ProfileAvatar` Component (`src/components/ProfileAvatar.tsx`)

Props:

    interface ProfileAvatarProps {
      size: 'sm' | 'md' | 'lg';
      photoUri?: string | null;
      sex?: 'boy' | 'girl' | null;
      onPress?: () => void;
      showDecorations?: boolean;
      testID?: string;
    }

Visual spec:
- Circle frame with `borderRadius: theme.shape.full`, border `2dp` using `colors.primary`.
- Photo present: `<Image>` with `resizeMode="cover"` clipped to the circle.
- No photo: emoji fallback centered on `colors.surface`.
- Decorations (lg only): book badge bottom-left, speech badge top-right.
- Touch target via `hitSlop` on `TouchableOpacity`.

### Onboarding (`app/onboarding.tsx`)

- Add an optional photo step as the last step before the "Get started" CTA.
- Show `<ProfileAvatar size="lg" />` as a preview.
- Two actions: "Skip" (outline) and "Add photo" (primary).
- `expo-image-picker` config: `{ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 }`.
- i18n keys: `onboarding.addPhoto`, `onboarding.photoOptional`, `onboarding.skipPhoto`.

### Home Screen (`app/(tabs)/home.tsx`)

- Replace emoji with `<ProfileAvatar size="lg">`.
- Tap opens `EditProfileModal`.

### Settings Screen (`app/(tabs)/settings.tsx`)

- Replace emoji with `<ProfileAvatar size="sm">`.
- Preserve `testID="settings-profile-emoji"`.

### EditProfileModal (`src/components/EditProfileModal.tsx`)

- Avatar at top of form with tap-to-change.
- "Remove photo" danger link when photo exists.
- i18n keys: `settings.tapToChangePhoto`, `settings.removePhoto`, `settings.removePhotoConfirm`.

### Test Coverage Requirements (>= 99% lines, >= 95% branches)

Unit, integration, and screen tests covering all new code paths.

### Acceptance Criteria

- `parent_type` union extended; DB constraint updated
- Service + repository + hooks for profile photo
- `ProfileAvatar` component with size variants and decorations
- Onboarding, home, settings, EditProfileModal integrations
- All i18n keys, theme tokens, and coverage targets met

---

## Refined Prompt

### 1. Prompt Analysis

**Intent:** Add an optional profile photo to the baby profile, leveraging the existing media asset foundation, with a reusable `ProfileAvatar` component rendered across onboarding, home, settings, and the edit modal.

**Weaknesses or ambiguities:**

- **DB CHECK constraint overlooked.** The prompt states "no schema changes" but the `assets` table in `src/db/init.ts` has `CHECK(parent_type IN ('word', 'variant'))`. A DB migration is required.
- **Onboarding is not step-based.** The current onboarding is a single `ScrollView` with inline fields — not discrete steps.
- **Home screen has no `EditProfileModal`.** The prompt says it's "already rendered" but only `AddWordModal` exists in `home.tsx`. The modal and its state must be added.
- **`PARENT_DIRS` map in `assetStorage.ts`** is a `Record<ParentType, string>` with only `word`/`variant`. Adding `'profile'` to the union causes a TS error unless the map is updated.
- **Image load failure not addressed.** The `<Image>` needs an `onError` fallback to the emoji.
- **Singleton replacement transaction semantics unspecified.** Should be: delete old → save new, in a single logical flow.

**Missing constraints:**

- Migration version number (0002).
- `init.ts` DDL must also be updated for fresh installs.
- `assetStorage.ts` `PARENT_DIRS` map must add `profile: 'profile'`.
- The home screen needs `EditProfileModal` added (import, state, render).
- Gallery-only picker (no camera).

### 2. Edge Cases

1. Migration for existing users with the CHECK constraint.
2. Photo saved during onboarding but app killed before `setOnboardingDone()`.
3. Double-tap race on "Add photo" button.
4. Photo URI invalidated after reinstall (acceptable: DB wiped too).
5. `sex === null` fallback to generic emoji.
6. File can't load at render time — `onError` fallback needed.
7. Permission revoked between picker launches.

### 3. Suggested Improvements

- Add DB migration `0002_add-profile-parent-type.ts` (recreate table pattern for SQLite).
- Clarify onboarding as inline section, not a separate step.
- Add `EditProfileModal` to `home.tsx` (currently missing).
- Add `profile: 'profile'` to `PARENT_DIRS` in `assetStorage.ts`.
- Add `onError` fallback in `ProfileAvatar`.
- Add loading guard for double-tap prevention.
- Add `settings.editPhoto` i18n key for accessibility label.

### 4. Refined Prompt

See the Design Document at `.agents/plan/design/2026-03-18_01-baby-profile-photo.md` for the complete, refined specification that addresses all identified gaps.
