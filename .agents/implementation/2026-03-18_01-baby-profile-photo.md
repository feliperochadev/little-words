---
name: 2026-03-18_01-baby-profile-photo
plan: .agents/plan/design/2026-03-18_01-baby-profile-photo.md
status: done
started: 2026-03-18
agent: claude
worktree: false
---

## Summary

Added optional baby profile photo feature: singleton asset storage, reusable `ProfileAvatar` component with size variants and decorations, and full integration into onboarding, home, settings, and `EditProfileModal`. Phase 2: camera + gallery source picker via Alert, tappable onboarding avatar. Phase 3 (UI/UX polish): avatar sizes increased 50% (md=108dp, lg=144dp), avatar moved to onboarding top, emptyHero moved before stats grid, EditProfileModal theme reactivity fixed, home screen photo viewer modal added, settings birth/age split to two lines. Phase 4 (polish follow-up): onboarding title simplified, `tapHint` prop added to `ProfileAvatar` for in-frame "tap to add photo" affordance, sex buttons changed to row layout, EditProfileModal avatar enlarged to `lg`, photo viewer i18n key bug fixed.

## Changes

| File | Action | Notes |
|------|--------|-------|
| `src/types/asset.ts` | modified | Extended `ParentType` union to include `'profile'` |
| `src/db/init.ts` | modified | Updated assets table DDL CHECK constraint for fresh installs |
| `src/db/migrations/0002_add-profile-parent-type.ts` | created | Migration v2 to recreate assets table with expanded constraint |
| `src/db/migrations/index.ts` | modified | Registered migration v2 |
| `src/utils/assetStorage.ts` | modified | Added `profile` entry to `PARENT_DIRS` record |
| `src/repositories/assetRepository.ts` | modified | Added `getProfilePhoto()` and `deleteProfilePhotoAsset()` |
| `src/services/assetService.ts` | modified | Added `getProfilePhoto()`, `saveProfilePhoto()`, `deleteProfilePhoto()` |
| `src/hooks/useAssets.ts` | modified | Added `useProfilePhoto`, `useSaveProfilePhoto`, `useRemoveProfilePhoto` |
| `src/components/ProfileAvatar.tsx` | created | Reusable avatar component (sm/md/lg, photo/emoji, decorations) |
| `app/onboarding.tsx` | modified | Added optional photo step with picker integration |
| `app/(tabs)/home.tsx` | modified | Replaced emoji Text with ProfileAvatar lg, tap opens EditProfileModal |
| `app/(tabs)/settings.tsx` | modified | Replaced emoji Text with ProfileAvatar sm (no decorations) |
| `src/components/EditProfileModal.tsx` | modified | Added photo picker, avatar, remove photo, pre-fill from hook |
| `src/i18n/en-US.ts` | modified | Added 9 new i18n keys for photo flows |
| `src/i18n/pt-BR.ts` | modified | Added matching 9 Portuguese i18n keys |
| `__tests__/unit/profilePhotoService.test.ts` | created | Unit tests for getProfilePhoto, saveProfilePhoto, deleteProfilePhoto |
| `__tests__/integration/ProfileAvatar.test.tsx` | created | Integration tests for all avatar variants, photo/emoji, decorations, press |
| `__tests__/integration/useAssets.test.tsx` | modified | Added describe blocks for useProfilePhoto, useSaveProfilePhoto, useRemoveProfilePhoto |
| `__tests__/integration/editProfileModal.test.tsx` | modified | Migrated to renderWithProviders; added 8 photo-related tests |
| `__tests__/screens/onboarding.test.tsx` | modified | Added assetService mock; added 7 photo section tests |
| `__tests__/screens/home.test.tsx` | modified | Added assetService mock; added 2 avatar tests |
| `__tests__/screens/settings.test.tsx` | modified | Added assetService mock; updated 3 emoji assertions for ProfileAvatar |
| `__tests__/unit/assetDatabase.test.ts` | modified | Updated CHECK constraint assertion for new 'profile' value |
| `__tests__/unit/migrator.test.ts` | modified | Updated "skips applied migrations" to include v2 in mock |
| `CLAUDE.md` | modified | Updated hooks, assets table, service, and added ProfileAvatar docs |
| `.agents/AGENTS-CHANGELOG.md` | modified | Added 2026-03-18_6 entry |
| **Phase 2 additions** | | |
| `app/onboarding.tsx` | modified | Tappable `ProfileAvatar` avatar; camera + gallery source picker via Alert |
| `src/components/EditProfileModal.tsx` | modified | Camera + gallery source picker via Alert (replaced gallery-only) |
| `app/(tabs)/settings.tsx` | modified | Avatar upgraded to `md` size; horizontal profile card layout |
| `src/i18n/en-US.ts` | modified | Added `photoSourceTitle`, `photoSourceCamera`, `photoSourceGallery` |
| `src/i18n/pt-BR.ts` | modified | Added matching Portuguese keys for source picker |
| `__tests__/integration/editProfileModal.test.tsx` | modified | Updated photo picker tests for Alert-gated camera+gallery flow |
| `__tests__/screens/onboarding.test.tsx` | modified | Updated photo picker tests for Alert-gated camera+gallery flow |
| **Phase 3 (UI/UX polish)** | | |
| `src/components/ProfileAvatar.tsx` | modified | Size increase 50% (md=108, lg=144); theme reactivity fix (getThemeForSex from prop); badge scale |
| `app/onboarding.tsx` | modified | Avatar moved to top; bottom photo section removed; allowsEditing restored |
| `app/(tabs)/home.tsx` | modified | emptyHero moved before stats; EditProfileModal replaced with inline photo viewer Modal; launchPicker/handlePickPhoto/handleRemovePhoto added |
| `app/(tabs)/settings.tsx` | modified | Birth date and age split to two separate text lines |
| `src/components/EditProfileModal.tsx` | modified | allowsEditing restored for camera |
| `__tests__/screens/home.test.tsx` | modified | Updated avatar tests for photo viewer flow |
| `__tests__/screens/onboarding.test.tsx` | modified | Updated for top-avatar structure |
| **Phase 4 (polish follow-up — changelog 2026-03-18_9 + _10)** | | |
| `src/i18n/en-US.ts` | modified | Updated `onboarding.welcome` (removed "to Little Words"); added `onboarding.tapToAddPhoto` |
| `src/i18n/pt-BR.ts` | modified | `welcome` → `'Bem-vindo(a)! 💕'` (gender-neutral); added `tapToAddPhoto` in Portuguese |
| `src/components/ProfileAvatar.tsx` | modified | Added `tapHint?: string` prop — renders emoji at 0.65× + 9px hint text constrained to `diameter × 0.78` inside the circle when no photo and size ≠ sm |
| `app/onboarding.tsx` | modified | Passes `tapHint` to avatar; sex buttons changed to row layout (`flexDirection: 'row'`, `gap: 8`, `paddingVertical: 14`, emoji `fontSize: 22`) matching language picker style |
| `src/components/EditProfileModal.tsx` | modified | Same sex button row layout; avatar upgraded to `size="lg"` (≈33% larger); `tapHint` shown when no photo; `tapToChangePhoto` hint conditioned on photo existing |
| `app/(tabs)/home.tsx` | modified | Avatar passes `tapHint` when no photo; fixed photo viewer "Change photo" button from `t('settings.changePhoto')` → `t('onboarding.changePhoto')` |
| `__tests__/screens/home.test.tsx` | modified | Added `jest.mock` for `useAssets` hooks (synchronous) so photo viewer test is deterministic without TanStack Query async timing |
| **Phase 5 (Sonar fixes + refactor — changelog 2026-03-18_11 + _12)** | | |
| `src/components/ProfileAvatar.tsx` | modified | Replaced nested ternaries with explicit `if/else` blocks to satisfy Sonar rule `typescript:S3358` |
| `__tests__/screens/home.test.tsx` | modified | Added branch coverage for source picker cancel, camera/gallery save, permission denied, photo viewer change/remove/close, and `AddWordModal` callback paths |
| `src/hooks/useProfilePhotoPicker.ts` | created | Extracted shared photo picker UX hook: `pickingPhoto` guard, camera/library source Alert, permission requests with denied-alert fallback, remove confirm dialog. Accepts `onPhotoSelected` and optional `onPhotoRemoved` callbacks. |
| `app/(tabs)/home.tsx` | modified | Removed inline `launchPicker`, `handlePickPhoto`, `handleRemovePhoto`, `pickingPhoto`, `useRemoveProfilePhoto`, `ImagePicker`, `Alert`; replaced with `useProfilePhotoPicker` |
| `app/onboarding.tsx` | modified | Removed inline `launchPicker`, `handlePickPhoto`, `pickingPhoto`, `ImagePicker`; replaced with `useProfilePhotoPicker` |
| `src/components/EditProfileModal.tsx` | modified | Removed inline `launchPicker`, `handlePickPhoto`, `handleRemovePhoto`, `pickingPhoto`, `useRemoveProfilePhoto`, `ImagePicker`; replaced with `useProfilePhotoPicker` |
| `__tests__/integration/useProfilePhotoPicker.test.tsx` | created | 13 tests covering `handlePickPhoto` guard, Alert structure, camera/library success/cancel/permission-denied paths, `handleRemovePhoto` confirm/cancel, optional `onPhotoRemoved` callback |
| `CLAUDE.md` | modified | Added `useProfilePhotoPicker` to hooks documentation |
