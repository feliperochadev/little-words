# Design: Baby Profile Photo

**Date:** 2026-03-18
**Status:** Approved
**Author:** Claude
**Related ADR:** N/A

---

## Problem Statement

The baby profile in Palavrinhas shows a hardcoded emoji (girl/boy/baby) across the home, settings, and onboarding screens. Parents want to personalize the app with an actual photo of their child, making the experience more intimate and personal.

## Goals

- Allow parents to optionally set a profile photo for their baby
- Reuse the existing media asset infrastructure (no new tables or storage patterns)
- Provide a single, reusable `ProfileAvatar` component used everywhere the profile image appears
- Support add, change, and remove photo flows
- Maintain emoji fallback when no photo is set
- Meet project coverage requirements (>= 99% lines, >= 95% branches)

## Non-Goals

- Multiple profile photos / photo gallery
- Photo cropping beyond `expo-image-picker`'s built-in square crop
- Cloud backup of the profile photo
- Animated avatar or sticker overlays

---

## Design

### Overview

The profile photo is stored as a singleton asset in the existing `assets` table with `parent_type = 'profile'`, `parent_id = 1`, `asset_type = 'photo'`. Only one photo is allowed at a time — saving a new photo deletes the previous one. A reusable `ProfileAvatar` component renders the photo (or emoji fallback) at three sizes across four screens.

### Component / Module Breakdown

| Component | Responsibility | File(s) |
|-----------|---------------|---------|
| DB migration 0002 | Widen `assets` CHECK constraint to include `'profile'` | `src/db/migrations/0002_add-profile-parent-type.ts`, `src/db/migrations/index.ts` |
| Init DDL update | Include `'profile'` in CHECK for fresh installs | `src/db/init.ts` |
| ParentType union | Add `'profile'` to the TypeScript type | `src/types/asset.ts` |
| Domain type alias | Keep `ParentType` re-export in sync | `src/types/domain.ts` |
| PARENT_DIRS map | Add `profile: 'profile'` directory mapping | `src/utils/assetStorage.ts` |
| Repository functions | `getProfilePhoto()`, `deleteProfilePhotoAsset()` | `src/repositories/assetRepository.ts` |
| Service functions | `getProfilePhoto()`, `saveProfilePhoto()`, `deleteProfilePhoto()` | `src/services/assetService.ts` |
| Query hooks | `useProfilePhoto()`, `useSaveProfilePhoto()`, `useRemoveProfilePhoto()` | `src/hooks/useAssets.ts` |
| useProfilePhotoPicker | Shared photo picker UX hook — source Alert, permissions, remove confirm | `src/hooks/useProfilePhotoPicker.ts` |
| ProfileAvatar | Reusable avatar component (sm/md/lg) with decorations and `tapHint` | `src/components/ProfileAvatar.tsx` |
| Onboarding integration | Avatar at top of screen, tappable via `useProfilePhotoPicker` | `app/onboarding.tsx` |
| Home integration | Replace emoji with avatar; tapping opens photo viewer Modal or picker | `app/(tabs)/home.tsx` |
| Settings integration | Replace emoji with `md` avatar in horizontal card layout | `app/(tabs)/settings.tsx` |
| EditProfileModal | Add photo picker via `useProfilePhotoPicker`, remove photo, avatar at top | `src/components/EditProfileModal.tsx` |
| i18n keys | Add all new translation keys | `src/i18n/en-US.ts`, `src/i18n/pt-BR.ts` |

### Data Flow

#### Save Profile Photo
```
User taps avatar / "Add photo" button
  → Alert.alert (source picker: "Take Photo" | "Choose from Library" | "Cancel")
    → user selects source
      → request camera or media-library permission
      → launchCameraAsync / launchImageLibraryAsync (square crop, quality 0.8)
        → useSaveProfilePhoto mutation
          → assetService.saveProfilePhoto(sourceUri, mimeType, fileSize)
            → deleteProfilePhoto() if existing (DB row + file)
            → assetRepository.addAsset({ parent_type: 'profile', parent_id: 1, ... })
            → assetStorage.saveAssetFile(sourceUri, 'profile', 1, 'photo', id, mime)
            → assetRepository.updateAssetFilename(id, filename)
          → invalidate TQ queries (['assets'], ['dashboard'])
  → UI updates via query refetch
```

#### Load Profile Photo
```
Component renders → useProfilePhoto() hook
  → TQ query: QUERY_KEYS.assetsByType('profile', 1, 'photo')
    → assetRepository.getAssetsByParentAndType('profile', 1, 'photo')
    → Returns Asset[] → take first (singleton) → pass URI to ProfileAvatar
  → ProfileAvatar renders <Image> or emoji fallback
```

#### Remove Profile Photo
```
User taps "Remove photo" → Alert confirmation
  → useRemoveProfilePhoto mutation
    → assetService.deleteProfilePhoto()
      → assetRepository query for existing profile asset
      → assetRepository.deleteAsset(id)
      → assetStorage.deleteAssetFile(uri)
    → invalidate TQ queries
  → UI falls back to emoji
```

---

## Detailed Specifications

### 1. Database Migration (`0002_add-profile-parent-type`)

**File:** `src/db/migrations/0002_add-profile-parent-type.ts`

SQLite does not support `ALTER TABLE ... ALTER CONSTRAINT`. The migration must:

1. Create `assets_new` with expanded CHECK: `CHECK(parent_type IN ('word', 'variant', 'profile'))`
2. Copy all rows from `assets` to `assets_new`
3. Drop `assets`
4. Rename `assets_new` to `assets`
5. Recreate both indices (`idx_assets_parent`, `idx_assets_type`)

**Down migration:** reverse the process, deleting any `profile` rows first, then recreating with the original constraint.

**Also update:** `src/db/init.ts` line 54 — change CHECK to include `'profile'` so fresh installs get the correct constraint.

**Register:** Add to `src/db/migrations/index.ts` exports array.

### 2. Type & Storage Updates

**`src/types/asset.ts`:**
```ts
export type ParentType = 'word' | 'variant' | 'profile';
```

**`src/types/domain.ts`** (if it re-exports ParentType): ensure it picks up the expanded union.

**`src/utils/assetStorage.ts`:**
```ts
const PARENT_DIRS: Record<ParentType, string> = {
  word: 'words',
  variant: 'variants',
  profile: 'profile',
};
```

This gives the file path: `Documents/media/profile/1/photos/asset_{id}.jpg`

### 3. Repository Additions (`src/repositories/assetRepository.ts`)

```ts
export const getProfilePhoto = (): Promise<Asset | null> =>
  query<Asset>(
    "SELECT * FROM assets WHERE parent_type = 'profile' AND parent_id = 1 AND asset_type = 'photo' LIMIT 1",
    []
  ).then(rows => rows[0] ?? null);

export const deleteProfilePhotoAsset = (): Promise<void> =>
  run("DELETE FROM assets WHERE parent_type = 'profile' AND parent_id = 1 AND asset_type = 'photo'", [])
    .then(() => undefined);
```

### 4. Service Additions (`src/services/assetService.ts`)

```ts
export { getProfilePhoto } from '../repositories/assetRepository';

export async function saveProfilePhoto(
  sourceUri: string,
  mimeType: string,
  fileSize: number,
  width?: number | null,
  height?: number | null,
): Promise<Asset> {
  // Delete existing profile photo (singleton enforcement)
  await deleteProfilePhoto();

  // Save new photo using the existing saveAsset flow
  return saveAsset({
    sourceUri,
    parentType: 'profile',
    parentId: 1,
    assetType: 'photo',
    mimeType,
    fileSize,
    width,
    height,
  });
}

export async function deleteProfilePhoto(): Promise<void> {
  const existing = await getProfilePhoto();
  if (existing) {
    await removeAsset(existing);
  }
}
```

The `getProfilePhoto` function is re-exported from the repository. The `saveProfilePhoto` function enforces singleton semantics by deleting any existing profile photo before saving the new one.

### 5. Hook Additions (`src/hooks/useAssets.ts`)

```ts
export function useProfilePhoto() {
  return useQuery({
    queryKey: QUERY_KEYS.assetsByType('profile', 1, 'photo'),
    queryFn: () => assetService.getProfilePhoto(),
  });
}

export function useSaveProfilePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      sourceUri: string;
      mimeType: string;
      fileSize: number;
      width?: number | null;
      height?: number | null;
    }) => assetService.saveProfilePhoto(
      params.sourceUri, params.mimeType, params.fileSize,
      params.width, params.height
    ),
    onSuccess: () => {
      ASSET_MUTATION_KEYS.forEach(key =>
        queryClient.invalidateQueries({ queryKey: key })
      );
    },
  });
}

export function useRemoveProfilePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => assetService.deleteProfilePhoto(),
    onSuccess: () => {
      ASSET_MUTATION_KEYS.forEach(key =>
        queryClient.invalidateQueries({ queryKey: key })
      );
    },
  });
}
```

### 6. ProfileAvatar Component (`src/components/ProfileAvatar.tsx`)

```ts
interface ProfileAvatarProps {
  size: 'sm' | 'md' | 'lg';       // 44dp | 108dp | 144dp
  photoUri?: string | null;
  sex?: 'boy' | 'girl' | null;     // fallback emoji selection
  onPress?: () => void;
  showDecorations?: boolean;        // default: true for 'lg', false for 'sm'/'md'
  tapHint?: string;                 // hint text shown inside circle when no photo and size ≠ sm
  testID?: string;
}
```

**Size constants (as implemented — 50% increase from original design):**
```ts
const AVATAR_SIZES = { sm: 44, md: 108, lg: 144 } as const;
```

**`tapHint` rendering:** When `tapHint` is provided and no photo and `size !== 'sm'`: emoji renders at `0.65×` scale, followed by hint text (`9px`, `fontWeight: '600'`, `textAlign: 'center'`) constrained to `diameter × 0.78` width to prevent clipping of longer Portuguese text.

**Rendering logic:**

1. Outer `View` with `overflow: 'visible'` (for decoration badges)
2. Inner circle `View` with `borderRadius: shape.full`, `borderWidth: 2`, `borderColor: colors.primary`, `overflow: 'hidden'`, dimensions from `AVATAR_SIZES[size]`
3. If `photoUri` is truthy: `<Image source={{ uri: photoUri }} style={{ width, height }} resizeMode="cover" onError={() => setImageFailed(true)} />`
4. If no `photoUri` or image failed: emoji text centered (`sex === 'girl'` → `'👧'`, `sex === 'boy'` → `'👦'`, else `'👶'`). Emoji font size scales with avatar size.
5. If `onPress`: wrap everything in `<TouchableOpacity activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={...}>`.

**Decorations (rendered when `showDecorations` is true — default `true` for `lg`, `false` otherwise):**

- **Bottom-left badge** (28dp circle): `<Ionicons name="book-outline" size={20} color={colors.primary} />` in a circle with `backgroundColor: colors.surface`, `borderWidth: 1.5`, `borderColor: colors.border`. Positioned: `bottom: -4, left: -4`.
- **Top-right badge** (24dp circle): `<Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.secondary} />`. Positioned: `top: -2, right: -2`.

**Colors:** All from `useTheme()` — no hardcoded hex.

### 7. Onboarding Integration (`app/onboarding.tsx`)

The onboarding is a single `ScrollView` — not a step wizard. The `ProfileAvatar lg` is placed at the **top of the screen** (above the title), tappable at any time to trigger the photo picker.

**New state:**
```ts
const [selectedPhoto, setSelectedPhoto] = useState<{ uri: string; mimeType?: string; fileSize?: number } | null>(null);
```

**New hooks:**
```ts
const saveProfilePhoto = useSaveProfilePhoto();
const { handlePickPhoto } = useProfilePhotoPicker({
  onPhotoSelected: (photo) => setSelectedPhoto(photo),
});
```

**UI (avatar at top of screen, always visible):**
```
[ProfileAvatar lg, photoUri=selectedPhoto?.uri, sex=sex, onPress=handlePickPhoto,
 tapHint=t('onboarding.tapToAddPhoto')]
```

Sex buttons changed to row layout (`flexDirection: 'row'`, `gap: 8`, `paddingVertical: 14`, emoji `fontSize: 22`).

**`handleContinue` modification:**
After `setChildProfile()` and `setSetting('onboarding_done', '1')`:
```ts
if (selectedPhoto) {
  await saveProfilePhoto.mutateAsync({
    sourceUri: selectedPhoto.uri,
    mimeType: selectedPhoto.mimeType ?? 'image/jpeg',
    fileSize: selectedPhoto.fileSize ?? 0,
  });
}
```

**i18n keys added:**
- `onboarding.addPhoto` — "Add photo"
- `onboarding.photoOptional` — "Add a photo (optional)"
- `onboarding.changePhoto` — "Change photo"
- `onboarding.tapToAddPhoto` — "tap to add photo"
- `onboarding.welcome` — updated to `'Welcome! 💕'` (removed "to Little Words")

### 8. Home Screen Integration (`app/(tabs)/home.tsx`)

**Changes:**

1. **Import** `ProfileAvatar`, `useProfilePhoto`, `useProfilePhotoPicker`.
2. **Add query:** `const { data: profilePhoto } = useProfilePhoto();` — returns `ProfilePhotoAsset | null` with computed `uri` field via TQ `select`.
3. **Photo picker hook:**
```ts
const { handlePickPhoto } = useProfilePhotoPicker({
  onPhotoSelected: async (photo) => { await saveMutation.mutateAsync(photo); },
  onPhotoRemoved: async () => { await removeMutation.mutateAsync(); },
});
```
4. **`emptyHero` block** moved before the stats grid (renders when `totalWords === 0`).
5. **Replace emoji with avatar:**
```tsx
<ProfileAvatar
  size="lg"
  photoUri={profilePhoto?.uri ?? null}
  sex={sex}
  onPress={profilePhoto ? () => setViewerVisible(true) : handlePickPhoto}
  tapHint={profilePhoto ? undefined : t('onboarding.tapToAddPhoto')}
  testID="home-profile-avatar"
/>
```
6. **Photo viewer Modal** (`testID="home-photo-viewer"`): fullscreen overlay showing photo at full size with "Change photo" and "Remove photo" action buttons. Opens when avatar is tapped and a photo exists.
7. **Remove** old `emojiBySex`, `emoji`, `profileEmoji` style, and `EditProfileModal` usage.

### 9. Settings Screen Integration (`app/(tabs)/settings.tsx`)

**Changes:**

1. **Import** `ProfileAvatar` from `../../src/components/ProfileAvatar`
2. **Import** `useProfilePhoto` from `../../src/hooks/useAssets`
3. **Add query:** `const { data: profilePhoto } = useProfilePhoto();`
4. **Compute URI** (same pattern as home).
5. **Replace in profile section with horizontal card layout:**
```tsx
// Before: stacked emoji
<Text style={styles.profileEmoji} testID="settings-profile-emoji">{profileEmoji}</Text>
<Text ...>{childName} · {sexLabel}</Text>

// After: horizontal row — avatar on left, text column on right
<View style={styles.profileRow}>
  <ProfileAvatar
    size="md"               // ← upgraded from sm to md (108dp)
    photoUri={profilePhotoUri}
    sex={childSex}
    showDecorations={false}
    testID="settings-profile-emoji"
  />
  <View style={styles.profileTextCol}>
    <Text ... testID="settings-profile-name">{childName} · {sexLabel}</Text>
    {childBirthDate && (
      <Text ... testID="settings-profile-birth">
        {t('settings.profileBirthLabel')}: {formatDisplayDate(childBirthDate)} · {formatAgeText(...)}
      </Text>
    )}
  </View>
</View>
```

**New styles:**
```ts
profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4 },
profileTextCol: { flex: 1 },
profileNameInline: { marginBottom: 0 },
```

6. **Remove** the old `emojiBySex` and `profileEmoji` computation.
7. **Remove** `profileEmoji` style.

### 10. EditProfileModal Integration (`src/components/EditProfileModal.tsx`)

**New imports:**
```ts
import { ProfileAvatar } from './ProfileAvatar';
import { useProfilePhoto, useSaveProfilePhoto, useRemoveProfilePhoto } from '../hooks/useAssets';
import { useProfilePhotoPicker } from '../hooks/useProfilePhotoPicker';
```

**New state & hooks:**
```ts
const { data: profilePhotoAsset } = useProfilePhoto();
const savePhoto = useSaveProfilePhoto();
const removePhoto = useRemoveProfilePhoto();
const [photoUri, setPhotoUri] = useState<string | null>(null);

const { handlePickPhoto, handleRemovePhoto } = useProfilePhotoPicker({
  onPhotoSelected: async (photo) => {
    setPhotoUri(photo.uri); // optimistic local preview
    await savePhoto.mutateAsync(photo);
  },
  onPhotoRemoved: async () => {
    setPhotoUri(null);
    await removePhoto.mutateAsync();
  },
});
```

**Pre-fill photo URI on modal open** (add to existing `useEffect`):
```ts
useEffect(() => {
  if (!visible) return;
  // ... existing name/sex/birth pre-fill
  setPhotoUri(profilePhotoAsset?.uri ?? null);
}, [visible, storedName, storedSex, storedBirth, profilePhotoAsset]);
```

**UI additions (at top of ScrollView, before Name label):**

```tsx
<View style={s.avatarSection}>
  <ProfileAvatar
    size="lg"
    photoUri={photoUri}
    sex={sex}
    onPress={handlePickPhoto}
    showDecorations={false}
    tapHint={photoUri ? undefined : t('onboarding.tapToAddPhoto')}
    testID="edit-profile-avatar"
  />
  {photoUri && (
    <Text style={[s.photoHint, { color: THEME_COLORS.textMuted }]}>
      {t('settings.tapToChangePhoto')}
    </Text>
  )}
  {photoUri && (
    <TouchableOpacity onPress={handleRemovePhoto} testID="edit-profile-remove-photo-btn">
      <Text style={[s.removePhotoText, { color: THEME_COLORS.error }]}>
        {t('settings.removePhoto')}
      </Text>
    </TouchableOpacity>
  )}
</View>
```

Sex buttons changed to row layout (same as onboarding). `ImagePicker`, `pickingPhoto`, and inline `launchPicker`/`handlePickPhoto`/`handleRemovePhoto` removed — all delegated to `useProfilePhotoPicker`.

**New styles:**
```ts
avatarSection: { alignItems: 'center', marginBottom: 20 },
photoHint: { fontSize: 13, marginTop: 8 },
removePhotoText: { fontSize: 13, fontWeight: '600', marginTop: 4 },
```

### 11. i18n Keys

**`src/i18n/en-US.ts` additions:**

```ts
// In onboarding:
addPhoto: 'Add photo',
photoOptional: 'Add a photo (optional)',
skipPhoto: 'Skip',
changePhoto: 'Change photo',

// In settings:
tapToChangePhoto: 'Tap to change photo',
removePhoto: 'Remove photo',
removePhotoConfirm: 'Are you sure you want to remove the profile photo?',
editPhoto: 'Edit photo',
photoPermissionDenied: 'Photo library access is required to select a photo. Please enable it in Settings.',
photoSourceTitle: 'Add Photo',
photoSourceCamera: 'Take Photo',
photoSourceGallery: 'Choose from Library',
```

**`src/i18n/pt-BR.ts` additions:**

```ts
// In onboarding:
addPhoto: 'Adicionar foto',
photoOptional: 'Adicione uma foto (opcional)',
skipPhoto: 'Pular',
changePhoto: 'Trocar foto',

// In settings:
tapToChangePhoto: 'Toque para trocar a foto',
removePhoto: 'Remover foto',
removePhotoConfirm: 'Tem certeza que deseja remover a foto do perfil?',
editPhoto: 'Editar foto',
photoPermissionDenied: 'O acesso à galeria de fotos é necessário para selecionar uma foto. Por favor, habilite nas Configurações.',
photoSourceTitle: 'Adicionar foto',
photoSourceCamera: 'Tirar foto',
photoSourceGallery: 'Escolher da galeria',
```

### 12. expo-image-picker

Already installed (`~55.0.12`). Already mocked in `jest.setup.js`.

**Usage pattern (both onboarding and EditProfileModal):**
```ts
const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
if (status !== 'granted') {
  Alert.alert(t('common.error'), t('settings.photoPermissionDenied'));
  return;
}

const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
});

if (result.canceled) return;

const asset = result.assets[0];
// Use asset.uri, asset.mimeType ?? 'image/jpeg', asset.fileSize ?? 0
```

Consider extracting a shared `pickProfilePhoto(t)` utility to avoid duplication between onboarding and EditProfileModal.

---

### UI / UX Decisions

- **Camera + gallery via Alert:** Both camera and gallery sources are exposed through a single `Alert.alert` source picker. This avoids a native ActionSheet dependency and keeps the implementation consistent with existing Alert-based interactions throughout the app.
- **Onboarding:** Photo section appears inline after the preview card (not a separate step/screen). The `ProfileAvatar` at `lg` size is tappable (same as the button below it) — both trigger the source picker Alert. The main CTA "Start with [name]" still handles navigation, so no separate "Skip" button is needed.
- **Home screen:** Tapping the avatar opens the full `EditProfileModal` (not a photo-only picker). This is intentional — the avatar is the entry point to all profile editing, matching the existing settings pattern.
- **EditProfileModal:** Photo is saved immediately on pick (not deferred to the "Save" button). The remove-photo action also takes effect immediately. This matches user expectations for photo interactions and avoids complexity of tracking "pending" photo changes.
- **Settings:** Medium avatar (72dp) without decorations, displayed in a horizontal card layout with the avatar on the left and profile text on the right. Upgraded from `sm` (44dp) to `md` (72dp) for better visual presence.
- **Decorations:** Only shown at `lg` size on the home screen. The book and speech bubble icons are thematic to the app's purpose (recording words/language).

### Error Handling

- **Permission denied:** Alert with clear message directing user to OS Settings.
- **Picker cancelled:** No-op, silently returns.
- **Image load failure:** `ProfileAvatar` catches `onError` from `<Image>` and falls back to emoji. Uses local `imageFailed` state.
- **Save failure:** If `saveProfilePhoto` throws, the optimistic local URI is cleared and the mutation error surfaces. In EditProfileModal, the previous photo remains. In onboarding, no photo is saved but navigation still proceeds.
- **Double-tap prevention:** `pickingPhoto` boolean state guards against concurrent picker launches.
- **File size validation:** `expo-image-picker` with `allowsEditing: true` and `quality: 0.8` produces files well under the 20 MB limit. If `fileSize` is 0 or unavailable from the picker result, the validation in `assetService.saveAsset` will reject it. Two options:
  1. Read file size via `expo-file-system` before saving.
  2. Skip `fileSize` validation for profile photos (since the picker constrains output).
  Recommended: Option 1 — read the actual file size from the picker result (`result.assets[0].fileSize`) and pass it through.

---

## Alternatives Considered

1. **Store photo path in settings table (key-value):** Simpler (no migration needed), but breaks the established asset pattern and loses metadata (MIME type, dimensions). The asset table is the canonical place for media files.

2. **Separate step/screen in onboarding:** More prominent, but the onboarding is a single ScrollView. Adding a separate screen would require refactoring to a step navigator. Inline section is simpler and consistent with current design.

3. **Camera + gallery via ActionSheet:** Native ActionSheet adds a cross-platform dependency. Using `Alert.alert` with button callbacks achieves the same "Take Photo / Choose from Library / Cancel" UX without additional libraries and is consistent with how other Alerts are implemented in the app.

4. **Deferred photo save (on "Save" button in EditProfileModal):** Would require tracking "pending" photo state, handling cancel/rollback, and complicating the data flow. Immediate save is simpler and matches user mental model for photo interactions.

---

## Open Questions

All resolved — no blockers.

---

## Acceptance Criteria

- [x] Migration `0002_add-profile-parent-type` widens `assets` CHECK constraint to include `'profile'`
- [x] `init.ts` DDL updated with `'profile'` in CHECK for fresh installs
- [x] `PARENT_DIRS` in `assetStorage.ts` includes `profile: 'profile'`
- [x] `ParentType` union in `asset.ts` includes `'profile'`
- [x] `getProfilePhoto()`, `saveProfilePhoto()`, `deleteProfilePhoto()` in service + repository
- [x] `useProfilePhoto()`, `useSaveProfilePhoto()`, `useRemoveProfilePhoto()` hooks
- [x] `useProfilePhotoPicker` hook extracted — encapsulates source Alert, permissions, remove confirm; used in home, onboarding, EditProfileModal
- [x] `ProfileAvatar` component with `sm`/`md`/`lg` sizes (44/108/144dp), `tapHint` prop, emoji fallback, `onError` image fallback, conditional decorations
- [x] Onboarding: `ProfileAvatar lg` at top of screen, tappable; sex buttons in row layout
- [x] Home screen: `ProfileAvatar lg` with tap → photo viewer Modal (if photo) or picker (if no photo); `emptyHero` moved before stats grid
- [x] Settings screen uses `ProfileAvatar md` (108dp) in horizontal card layout, `testID="settings-profile-emoji"` preserved; birth/age on separate lines
- [x] EditProfileModal shows avatar (`lg`) at top with `tapHint`; `tapToChangePhoto` hint shown only when photo exists; remove-photo link; all via `useProfilePhotoPicker`
- [x] Camera support: `requestCameraPermissionsAsync` + `launchCameraAsync` delegated through `useProfilePhotoPicker`
- [x] Double-tap guard on photo picker (inside `useProfilePhotoPicker`)
- [x] All i18n keys added to `en-US.ts` and `pt-BR.ts` including `tapToAddPhoto`, updated `welcome`
- [x] All color/spacing/shape values use theme tokens (no hardcoded hex)
- [x] `accessibilityRole="button"` and translated `accessibilityLabel` on tappable avatar
- [x] Sonar nested ternary rule satisfied (explicit `if/else` blocks in ProfileAvatar)
- [x] `npm run ci` passed — 1119 tests, 0 semgrep findings

---

## Test Plan

### Unit Tests

**`__tests__/unit/profilePhotoService.test.ts`:**
- `getProfilePhoto()` returns null when no photo exists
- `getProfilePhoto()` returns the asset when a photo exists
- `saveProfilePhoto()` calls `deleteProfilePhoto()` then `saveAsset()` (singleton enforcement)
- `saveProfilePhoto()` validates MIME type and file size
- `deleteProfilePhoto()` removes DB record and file when photo exists
- `deleteProfilePhoto()` is a no-op when no photo exists
- `saveProfilePhoto()` rollback: if file copy fails, DB record is cleaned up

**`__tests__/unit/migrator.test.ts`:**
- Migration 0002 `up`: recreates table with expanded CHECK constraint, preserves existing rows, recreates indices
- Migration 0002 `down`: reverses the process, removes profile rows first

### Integration Tests

**`__tests__/integration/useProfilePhotoPicker.test.tsx`:**
- `handlePickPhoto` guard (no concurrent launch)
- Alert structure (camera + library + cancel buttons)
- Camera success path, cancel path, permission denied path
- Library success path, cancel path, permission denied path
- `handleRemovePhoto` confirm and cancel paths
- Optional `onPhotoRemoved` callback

**`__tests__/integration/ProfileAvatar.test.tsx`:**
- Renders at all three sizes (sm=44, md=108, lg=144) with correct dimensions
- Shows photo when `photoUri` is provided
- Shows girl/boy/baby emoji fallback by `sex` prop
- Falls back to emoji on image `onError`
- Shows decorations by default at `lg` size; hides at `sm`/`md`
- Hides decorations when `showDecorations={false}`
- Calls `onPress` when tapped; no `TouchableOpacity` when undefined
- Forwards `testID`; correct accessibility attributes
- Renders `tapHint` text and scaled emoji when no photo and size ≠ sm

**`__tests__/integration/editProfileModal.test.tsx`:**
- Shows avatar at top of form; pre-fills photo from hook on open
- `tapHint` shown when no photo; `tapToChangePhoto` shown when photo exists
- Tapping avatar triggers picker (via `useProfilePhotoPicker`)
- Permission denied alert; saves photo on successful pick
- "Remove photo" link only when photo exists; confirmation alert; removal mutation called
- Double-tap guard prevents concurrent picker launches

### Screen Tests

**`__tests__/screens/onboarding.test.tsx` (extend existing):**
- Avatar visible at top of screen always
- Tapping avatar opens source picker Alert
- Camera and gallery picker paths
- Photo saved during `handleContinue` when selected
- Continue without photo — navigates to home
- Permission denied alert shown

**`__tests__/screens/home.test.tsx` (extend existing):**
- `ProfileAvatar` renders in profile block
- Avatar shows photo when profile photo exists
- Avatar shows emoji fallback when no photo
- Tapping avatar opens `EditProfileModal`
- `EditProfileModal` visible state toggles correctly

**`__tests__/screens/settings.test.tsx` (extend existing):**
- Small `ProfileAvatar` renders in profile card
- Avatar has `testID="settings-profile-emoji"`
- Shows photo when profile photo exists
- Shows emoji fallback when no photo

---

## Files Changed (Summary)

| File | Change Type |
|------|-------------|
| `src/types/asset.ts` | Modify (extend ParentType) |
| `src/db/init.ts` | Modify (CHECK constraint) |
| `src/db/migrations/0002_add-profile-parent-type.ts` | **New** |
| `src/db/migrations/index.ts` | Modify (register migration) |
| `src/utils/assetStorage.ts` | Modify (PARENT_DIRS) |
| `src/repositories/assetRepository.ts` | Modify (add functions) |
| `src/services/assetService.ts` | Modify (add functions) |
| `src/hooks/useAssets.ts` | Modify (add hooks) |
| `src/hooks/useProfilePhotoPicker.ts` | **New** (shared photo picker UX hook) |
| `src/components/ProfileAvatar.tsx` | **New** |
| `app/onboarding.tsx` | Modify (avatar at top, useProfilePhotoPicker, sex row layout) |
| `app/(tabs)/home.tsx` | Modify (avatar + photo viewer Modal, emptyHero reorder) |
| `app/(tabs)/settings.tsx` | Modify (md avatar, horizontal card, birth/age split) |
| `src/components/EditProfileModal.tsx` | Modify (lg avatar, tapHint, useProfilePhotoPicker, sex row layout) |
| `src/i18n/en-US.ts` | Modify (add keys incl. tapToAddPhoto, updated welcome) |
| `src/i18n/pt-BR.ts` | Modify (add keys incl. tapToAddPhoto, updated welcome) |
| `__tests__/unit/profilePhotoService.test.ts` | **New** |
| `__tests__/integration/ProfileAvatar.test.tsx` | **New** |
| `__tests__/integration/useProfilePhotoPicker.test.tsx` | **New** |
| `__tests__/integration/editProfileModal.test.tsx` | Extend |
| `__tests__/screens/onboarding.test.tsx` | Extend |
| `__tests__/screens/home.test.tsx` | Extend |
| `__tests__/screens/settings.test.tsx` | Extend |

**Total:** 23 files (5 new, 18 modified/extended)
