---
name: 2026-04-14_02-keyboard-ux-best-practices
plan: .agents/plan/design/2026-04-14_02-keyboard-ux-best-practices.md
status: done
started: 2026-04-14
agent: claude
worktree: false
---

## Summary

Implements professional-grade keyboard handling via react-native-keyboard-controller so TextInputs and action buttons in all 7 modals and onboarding screen remain visible when keyboard opens.

## Design Decisions Made

- BottomSheet: explicit `keyboardAware` prop opt-in (not default) to avoid breaking non-input sheets
- KeyboardToolbar (Next/Prev/Done): deferred per plan
- Dismiss-on-tap in modals: add `Keyboard.dismiss()` to existing backdrop handlers (no new wrappers needed)

## Changes

| File | Action | Notes |
|------|--------|-------|
| `app.json` | modified | Added edgeToEdgeEnabled + softwareKeyboardLayoutMode |
| `android/app/src/main/res/values/styles.xml` | modified | Added windowTranslucentStatus false |
| `app/_layout.tsx` | modified | Added KeyboardProvider wrapper |
| `src/components/AddWordModal.tsx` | modified | ScrollView → KeyboardAwareScrollView |
| `src/components/AddVariantModal.tsx` | modified | ScrollView → KeyboardAwareScrollView |
| `src/components/AddCategoryModal.tsx` | modified | ScrollView → KeyboardAwareScrollView |
| `src/components/EditProfileModal.tsx` | modified | ScrollView → KeyboardAwareScrollView |
| `src/components/EditAssetModal.tsx` | modified | ScrollView → KeyboardAwareScrollView |
| `src/components/MediaLinkingModal.tsx` | modified | ScrollView → KeyboardAwareScrollView |
| `src/components/ImportModal.tsx` | modified | ScrollView → KeyboardAwareScrollView |
| `src/components/BottomSheet.tsx` | modified | Added keyboardAware prop |
| `src/components/Input.tsx` | modified | Added returnKeyType prop |
| `app/onboarding.tsx` | modified | ScrollView → KeyboardAwareScrollView |
| `jest.setup.js` | modified | Added react-native-keyboard-controller mock |
