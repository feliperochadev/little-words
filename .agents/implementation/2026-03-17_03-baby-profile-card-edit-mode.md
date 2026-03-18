---
name: 2026-03-17_03-baby-profile-card-edit-mode
plan: .agents/plan/ui-changes/2026-03-17_03-baby-profile-card-edit-mode.md
status: done
started: 2026-03-17
agent: claude
worktree: .worktrees/2026-03-17_03-baby-profile-card-edit-mode
---

## Summary

Baby Profile card now shows sex emoji and birth date; onboarding detects `?edit=true` to enter pre-filled edit mode with Cancel/Save buttons instead of the Continue flow.

## Changes

| File | Action | Notes |
|------|--------|-------|
| `app/(tabs)/settings.tsx` | modified | Sex emoji + birth date in profile card; push to `/onboarding?edit=true` |
| `app/onboarding.tsx` | modified | Edit mode: `useLocalSearchParams`, pre-fill, `handleEditSave`, Cancel/Save UI |
| `jest.setup.js` | modified | Added `useLocalSearchParams` to expo-router mock |
| `__tests__/screens/settings.test.tsx` | modified | Updated emoji assertions to testID-based; added birth date tests; updated push URL |
| `__tests__/screens/onboarding.test.tsx` | modified | Added 10 edit mode tests |
| `.agents/AGENTS-CHANGELOG.md` | modified | Entry 2026-03-17_15 |
