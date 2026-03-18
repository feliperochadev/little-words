---
name: 2026-03-17_04-button-accent-age-display
plan: .agents/plan/prompts/refine-onboarding-button-color-and-settings-age.md
status: done
started: 2026-03-17
agent: claude
worktree: false
---

## Summary

Fix Cancel/Save button accent colors in onboarding edit mode to react to live sex selection; add baby age display in settings profile card.

## Changes

| File | Action | Notes |
|------|--------|-------|
| `src/utils/dateHelpers.ts` | modified | Added `computeAge` pure function |
| `src/i18n/en-US.ts` | modified | Added `day`/`days` to `dashboard.age` |
| `src/i18n/pt-BR.ts` | modified | Added `dia`/`dias` to `dashboard.age` |
| `src/utils/dashboardHelpers.ts` | modified | Refactored `getAgeText` to use `computeAge`; handles days for <1 month |
| `app/(tabs)/settings.tsx` | modified | Added `settings-profile-age` element below birth date |
| `app/onboarding.tsx` | modified | Cancel/Save buttons now pass `accentColor` via style/textStyle overrides |
| `__tests__/unit/dateHelpers.test.ts` | modified | Added `computeAge` tests (8 cases) |
| `__tests__/unit/dashboardHelpers.test.ts` | modified | Updated mock with day/days; added days edge case test |
| `__tests__/screens/settings.test.tsx` | modified | Added age display presence tests |
| `__tests__/screens/onboarding.test.tsx` | modified | Added button color tests for sex change |
