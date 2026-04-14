---
name: 2026-04-13_01-ux-improvements-part-2
plan: .agents/plan/ui-changes/2026-04-13_01-ux-improvements-part-2.md
status: done
started: 2026-04-13
agent: claude
worktree: false
---

## Summary

Five UX improvements: variant screen gating by word count, 2-char save gate on AddWordModal, explicit edit buttons on word/variant cards (above title row), memories date deduplication, and media screen search bar alignment with design system token.

## Changes

| File | Action | Notes |
|------|--------|-------|
| `app/(tabs)/variants.tsx` | modified | Gating, hint removal, edit button restructure |
| `app/(tabs)/words.tsx` | modified | Edit button above title row |
| `app/(tabs)/memories.tsx` | modified | Date deduplication via `showDate` prop |
| `app/(tabs)/media.tsx` | modified | `LIST_SCREEN_LAYOUT` alignment |
| `src/components/AddWordModal.tsx` | modified | 2-char save gate |
| `src/components/TimelineItem.tsx` | modified | `showDate` prop |
| `src/components/UIComponents.tsx` | modified | `testID` + `action.testID` on EmptyState |
| `src/theme/layout.ts` | modified | Add `LIST_SCREEN_LAYOUT` token |
| `src/i18n/en-US.ts` | modified | New variant i18n keys |
| `src/i18n/pt-BR.ts` | modified | New variant i18n keys |
| `.agents/standards/design-system.md` | modified | Document `LIST_SCREEN_LAYOUT` rule |
| `__tests__/screens/variants.test.tsx` | modified | Updated tests |
| `__tests__/screens/words.test.tsx` | modified | Updated tests |
| `__tests__/integration/AddWordModal.test.tsx` | modified | 2-char gate tests |
| `__tests__/integration/TimelineItem.test.tsx` | modified | `showDate` prop tests |
| `__tests__/screens/memories.test.tsx` | modified | Date dedup test |

## Enhancements

### 2026-04-13 — Variants add button gating

`showAddButton`: `!noWords` → `variants.length > 0 || search.length > 0`. Top-right "New" hides until first variant added; EmptyState CTA handles initial add. Tests updated (+1).

### 2026-04-13 — Variants hint restored + theme consistency fixes

**Changes:**
- `app/(tabs)/variants.tsx`: restore hint banner, visible only when `variants.length === 0 && !search`
- `src/i18n/en-US.ts`, `src/i18n/pt-BR.ts`: re-add `variants.hint` key
- `src/components/UIComponents.tsx` — `SearchBar`: `useTheme()` + inline dynamic colors (was stuck on blossom)
- `app/(tabs)/media.tsx`: all `theme.colors.*` → `colors.*` from `useTheme()` (background + all inline colors)
- `__tests__/screens/variants.test.tsx`: 3 new hint banner tests

### 2026-04-13 — Darker modal backdrops + labeled media action buttons

**Changes:**
- 7 modal files: backdrop `rgba(0,0,0,0.5)` → `rgba(0,0,0,0.65)` (+30%): `AddWordModal`, `AddVariantModal`, `AddCategoryModal`, `EditProfileModal`, `ImportModal`, `EditAssetModal`, `MediaLinkingModal`
- `app/(tabs)/media.tsx`: replace icon-only action buttons with labeled stacked buttons; edit=textMuted border+bg; remove=error color border+bg+text+icon; `rowActions` → `flexDirection: column`

### 2026-04-13 — Edit button border + background + gap increase

**Change:** Style edit button on word/variant cards with visible border and background; increase gap to date below by 15%.

**Files changed:**
- `app/(tabs)/words.tsx` — `editBtn` style: add `borderWidth: 1`, `borderRadius: 8`, increase padding; inline `borderColor: withOpacity(colors.textMuted, '40')`, `backgroundColor: withOpacity(colors.textMuted, '10')`; `marginBottom: 4 → 5`
- `app/(tabs)/variants.tsx` — same changes
- `__tests__/integration/tabLayout.integration.test.tsx` — add `useWords` mock to fix 17 failing tests (regression from `_layout.tsx` calling `useWords` without `QueryClientProvider` in test)

## Design Decisions Made

- Edit button position: top-right via `alignSelf: 'flex-end'` — placed as first child in Card so it appears above title row; date stays in title row below it
- `canSave` guard: `word.trim().length >= 2` only — `!!duplicate` removed to preserve existing Alert-on-duplicate flow
- TimelineItem `showDate` prop: `false` renders empty `View` (preserves layout, default `true` for backward compat)
- `LIST_SCREEN_LAYOUT` constant in `src/theme/layout.ts` — wrapping media SearchBar in a `View` with `paddingHorizontal` matches `ListScreenControls.searchContainer` pattern without modifying `SearchBar`
