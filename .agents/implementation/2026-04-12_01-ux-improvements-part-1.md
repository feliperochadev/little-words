---
name: 2026-04-12_01-ux-improvements-part-1
plan: .agents/plan/ui-changes/2026-04-12_01-ux-improvements-part-1.md
status: done
started: 2026-04-12
agent: claude
worktree: false
---

## Summary

UX release polish: gender checkmark indicators, font size increases (+30%), and variant icon dot-removal across 7 production files.

## Changes

| File | Action | Notes |
|------|--------|-------|
| `app/onboarding.tsx` | modified | Add ✓ sex checkmark, previewDate 13→17px |
| `app/(tabs)/home.tsx` | modified | profileGreeting 13→17px, profileAge 12→16px |
| `src/components/ProfileAvatar.tsx` | modified | tapHintText 9→12px, badge icon chatbubble-ellipses-outline→chatbubble-outline |
| `src/components/EditProfileModal.tsx` | modified | Add ✓ sex checkmark, photoHint 12→16px |
| `app/(tabs)/_layout.tsx` | modified | Variant tab icon chatbubble-ellipses→chatbubble |
| `src/components/EditAssetModal.tsx` | modified | Variant link icon chatbubble-ellipses-outline→chatbubble-outline |
| `src/components/keepsake/KeepsakeCard.tsx` | modified | Decorative icon chatbubble-ellipses-outline→chatbubble-outline |
| `.agents/standards/design-system.md` | modified | Update icon table |
| `__tests__/screens/onboarding.test.tsx` | modified | Add checkmark tests |
| `__tests__/integration/EditProfileModal.test.tsx` | modified | Add checkmark tests |

## Enhancements

### 2026-04-12 — Variants screen title icon: chatbubbles-outline → chatbubble-outline

- **Description:** Changed the variants screen title icon from `chatbubbles-outline` (two bubbles) to `chatbubble-outline` (single bubble), matching the standardized icon used in AddVariantModal, EditAssetModal, and the tab bar. Updated the corresponding assertion in `__tests__/screens/variants.test.tsx`.
- **Files Modified:** `app/(tabs)/variants.tsx`, `__tests__/screens/variants.test.tsx`

### 2026-04-12 — AddVariantModal title icon: emoji → chatbubble-outline

- **Description:** Replaced the `🗣️` emoji Text element in AddVariantModal's title header with `<Ionicons name="chatbubble-outline" size={22} color={colors.secondary} />`, consistent with the standardized icon set applied across the implementation. Removed the now-unused `titleEmoji` style from the StyleSheet.
- **Files Modified:** `src/components/AddVariantModal.tsx`

### 2026-04-12 — Font tuning, outline tab icon, variant emoji icon

- **Description:** Decreased all Part 1 font increases by 10% (round to nearest int); changed variant tab bar icon to `chatbubble-outline` (hollow); extracted 🗣️ from i18n strings into a standalone component element in `AddVariantModal`.
- **Files Modified:** `app/onboarding.tsx`, `app/(tabs)/home.tsx`, `src/components/ProfileAvatar.tsx`, `src/components/EditProfileModal.tsx`, `app/(tabs)/_layout.tsx`, `src/components/AddVariantModal.tsx`, `src/i18n/en-US.ts`, `src/i18n/pt-BR.ts`, `.agents/standards/design-system.md`
- **Design note:** The 🗣️ emoji was already embedded in both i18n translation strings — this enhancement moves it to the component as a proper UI decoration element, keeping translatable text free of visual chrome.

## Design Decisions Made

- Icon: `chatbubble-ellipses` → `chatbubble`, `chatbubble-ellipses-outline` → `chatbubble-outline` (same shape, no dots)
- `chatbubbles-outline` unchanged (already dot-free)
- tapHint font applied globally in ProfileAvatar (not per-caller)
- Sex checkmark uses text `✓` at fontSize 13, fontWeight 900, color matching the active sex color
