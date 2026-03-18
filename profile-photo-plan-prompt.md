# Profile Photo Feature — Refined Plan Prompt

```
/plan

## Feature: Baby Profile Photo

### Overview
Add an optional profile photo to the baby profile in Palavrinhas. The photo is stored
locally using the existing media asset foundation (`assets` table, `assetStorage`,
`assetService`). The plan must cover: storage model extension, a reusable `ProfileAvatar`
component, integration into onboarding, home screen, settings screen, and
`EditProfileModal`, plus full test coverage per project standards.

---

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

---

### `ProfileAvatar` Component (`src/components/ProfileAvatar.tsx`)

A single reusable component used in all render contexts.

Props:
  interface ProfileAvatarProps {
    size: 'sm' | 'md' | 'lg';   // 44dp | 72dp | 96dp circle
    photoUri?: string | null;   // local file URI from asset
    sex?: 'boy' | 'girl' | null; // fallback emoji selection
    onPress?: () => void;        // optional tap handler
    showDecorations?: boolean;   // default: true only for 'lg'; false for 'sm'/'md'
    testID?: string;
  }

Visual spec:
- **Circle frame:** `borderRadius: theme.shape.full`, border `2dp` using `colors.primary`
  from `useTheme()` (reactive to sex-theme).
- **Photo present:** `<Image>` with `resizeMode="cover"` clipped to the circle.
- **No photo:** emoji (`👧` / `👦` / `👶`) centered inside the circle on
  `colors.surface` background.
- **Decorations (lg only, positioned absolutely):**
  - Bottom-left: open book icon — `<Ionicons name="book-outline" size={20}
    color={colors.primary} />` in a small circle badge (`background: colors.surface`,
    `border: 1.5dp colors.border`, `borderRadius: theme.shape.full`, size 28dp).
  - Top-right: speech bubble icon — `<Ionicons name="chatbubble-ellipses-outline" size={16}
    color={colors.secondary} />` in a matching badge (size 24dp).
  - Both badges use `position: 'absolute'` outside the clip boundary of the circle so
    they overlay the frame edge (use `overflow: 'visible'` on the outer wrapper).
- All color tokens sourced from `useTheme()`. No hardcoded hex values.
- Touch target: if `onPress` is defined, wrap in `TouchableOpacity` with
  `hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}` to meet the 48dp minimum.

---

### Onboarding (`app/onboarding.tsx`)

- Add an optional photo step as the last step before the "Get started" CTA.
- Show `<ProfileAvatar size="lg" />` as a preview.
- Two actions: "Skip" (outline) and "Add photo" (primary). Both proceed to home.
- Tapping "Add photo" opens `expo-image-picker` with:
    `{ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 }`
  On success: call `useSaveProfilePhoto()` mutation before navigating.
- If the user skips, no asset is created.
- The step is clearly labelled as optional in the UI (`t('onboarding.photoOptional')`).
- Add i18n keys to both `en-US.ts` and `pt-BR.ts`:
    `onboarding.addPhoto`, `onboarding.photoOptional`, `onboarding.skipPhoto`.

---

### Home Screen (`app/(tabs)/home.tsx`)

- Replace the current `<Text style={styles.profileEmoji}>{emoji}</Text>` with
  `<ProfileAvatar size="lg" photoUri={photoAsset?.uri} sex={sex} onPress={/* open EditProfileModal */} />`.
- Maintain the existing `!!name` guard — the avatar block only renders when a name is set.
- If no photo is set, the emoji fallback renders inside the decorated frame.
- Tapping the avatar opens `EditProfileModal` (already rendered at the bottom of the
  screen) — set `showEditProfile(true)`.
- No additional "upload" button is needed; the tap affordance on the avatar is sufficient.

---

### Settings Screen (`app/(tabs)/settings.tsx`)

- In the Baby Profile card, replace `<Text style={styles.profileEmoji}>{profileEmoji}</Text>`
  with `<ProfileAvatar size="sm" photoUri={photoAsset?.uri} sex={childSex}
  showDecorations={false} />`.
- The existing `testID="settings-profile-emoji"` must be preserved on the new component
  for E2E test compatibility.

---

### EditProfileModal (`src/components/EditProfileModal.tsx`)

- Add a `<ProfileAvatar size="md" photoUri={photoUri} sex={sex} onPress={handlePickPhoto}
  showDecorations={false} />` at the top of the form, above the Name field.
- Display an edit hint below the avatar: a small text label `t('settings.tapToChangePhoto')`
  using `colors.textMuted` and `theme.typography.fontSize.sm`.
- "Remove photo" secondary/danger link-style button appears **only** when a photo exists.
  On confirm (Alert with cancel + destructive): call `useRemoveProfilePhoto()` mutation.
- `handlePickPhoto`: opens `expo-image-picker` (same config as onboarding), calls
  `useSaveProfilePhoto()` on success, updates local `photoUri` state optimistically.
- Photo state is managed as local `useState<string | null>` (URI), pre-filled from
  `useProfilePhoto()` when the modal opens (same `useEffect` pattern as name/sex/birth).
- Add i18n keys: `settings.tapToChangePhoto`, `settings.removePhoto`,
  `settings.removePhotoConfirm`.

---

### expo-image-picker Integration

- `expo-image-picker` is already planned in the media asset foundation — install it if
  not yet present.
- Request permissions with `requestMediaLibraryPermissionsAsync()` before launching picker.
- If permission denied: `Alert.alert(t('common.error'), t('settings.photoPermissionDenied'))`.
- Add `settings.photoPermissionDenied` i18n key.
- Add mock in `jest.setup.js` (per the media asset foundation plan).

---

### Test Coverage Requirements (≥ 99% lines, ≥ 95% branches)

- `__tests__/unit/profilePhotoStorage.test.ts` — `assetService` profile photo functions
  (save, remove, getProfilePhoto, singleton replacement logic).
- `__tests__/integration/ProfileAvatar.test.tsx` — renders with/without photo, with/without
  decorations, tap handler, all three sizes, sex fallback emoji, theme colors.
- `__tests__/integration/EditProfileModal.test.tsx` — add/remove photo flows, permission
  denied alert, modal pre-fill, remove button visibility.
- `__tests__/screens/onboarding.test.tsx` — add/skip photo step (extend existing suite).
- `__tests__/screens/home.test.tsx` — avatar renders, tap opens EditProfileModal (extend).
- `__tests__/screens/settings.test.tsx` — small avatar renders in profile card (extend).

---

### Design System Compliance

- All colors from `useTheme()` — no hardcoded hex.
- All spacing from `theme.spacing` (4pt grid).
- All border radii from `theme.shape`.
- Icons from `@expo/vector-icons` Ionicons — no emoji used as UI chrome.
- Touch targets ≥ 48dp via `hitSlop` where the visual element is smaller.
- `accessibilityRole="button"` and `accessibilityLabel={t('settings.editPhoto')}` on
  the tappable avatar.

---

### Acceptance Criteria

- [ ] `parent_type` union extended to `'profile'`; DB constraint updated
- [ ] `getProfilePhoto`, `deleteProfilePhoto` added to service + repository
- [ ] `useProfilePhoto`, `useSaveProfilePhoto`, `useRemoveProfilePhoto` hooks added
- [ ] `ProfileAvatar` component created with size variants and conditional decorations
- [ ] Onboarding photo step (optional, skippable) implemented
- [ ] Home screen uses `ProfileAvatar lg` with tap-to-edit; emoji fallback works
- [ ] Settings screen uses `ProfileAvatar sm` (no decorations)
- [ ] EditProfileModal add/change/remove photo flow implemented
- [ ] `expo-image-picker` installed and mocked in `jest.setup.js`
- [ ] All i18n keys added to both `en-US.ts` and `pt-BR.ts`
- [ ] All color/spacing/shape values use theme tokens
- [ ] `npm run ci` passes with ≥ 99% line / ≥ 95% branch coverage on new code
```
