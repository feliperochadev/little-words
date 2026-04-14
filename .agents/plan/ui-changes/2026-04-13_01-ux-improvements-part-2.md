# UI Changes: UX Improvements — Part 2

**Date:** 2026-04-13
**Status:** Proposed
**Author:** Claude
**Branch:** `feature/UX-improvements-for-release-part-2`
**Refined Prompt:** `prompts/2026-04-13_ux-improvements-part-2.md`

---

## Problem Statement

Several UX issues identified in pre-release review: the variant screen is accessible even when no words exist (confusing), the new word modal allows saving single-character entries, word/variant cards have no visible edit affordance (users don't know to tap the whole card), the memories timeline shows duplicate dates for same-day entries, and the media screen search bar is visually inconsistent with the words/variants screens.

## Goals

- Gate the variant screen behind having ≥1 word; provide a clear first-variant CTA when words exist but no variants do
- Remove the variant hint banner (tooltip)
- Require ≥2 characters to save a new word
- Replace invisible card-tap-to-edit with an explicit edit button (icon + label)
- Deduplicate consecutive same-date headers in the memories timeline
- Standardize search bar container spacing across all list screens and codify it in the design system

## Non-Goals

- Redesigning the variant screen layout beyond the empty/CTA states
- Changing card visual design (colors, shadows, border radius)
- Modifying the memories timeline layout (alternating sides, dot column, animations)
- Adding new screens or navigation routes
- Changing search bar component internals (height, border, icon)

---

## Design

### Overview

Five categories of changes: (A) variant screen gating + CTA, (B) new word modal save gate, (C) explicit edit button on word/variant cards, (D) memories date deduplication, (E) search bar spacing standardization + design system rule.

---

### A. Variant Screen — Empty State Gating & First-Variant CTA

**Current behavior:**
- Variant screen always renders the full FlatList with `EmptyState` when `variants.length === 0`
- A hint banner (`t('variants.hint')`, `bulb-outline` icon) shows in `ListHeaderComponent` (lines 160-163)
- Add button is in `ListScreenControls` header (lines 123-130)

**New behavior — three states:**

| State | Condition | UI |
|-------|-----------|-----|
| No words | `words.length === 0` | `EmptyState` with message "Add some words first before creating variants" (i18n key: `variants.emptyNoWords` / `variants.emptyNoWordsSubtitle`). Hide add button. Disable search. |
| Words exist, no variants | `words.length >= 1 && variants.length === 0` | `EmptyState` with icon + title (`variants.emptyTitle`) + subtitle. Below it: a primary `Button` centered, labeled `t('variants.addFirst')` (e.g. "Add First Variant"), which opens `AddVariantModal` with `word: null`. |
| Variants exist | `variants.length >= 1` | Current list view, unchanged |

**Hint removal:**
- Delete the `ListHeaderComponent` hint banner (lines 159-163 in `variants.tsx`)
- Delete `styles.hint`, `styles.hintIcon`, `styles.hintText` from the stylesheet
- Remove `t('variants.hint')` from both i18n catalogues

**TestIDs:**
- `variants-empty-no-words` — empty state when no words
- `variants-add-first-btn` — CTA button for first variant

**Files affected:** `app/(tabs)/variants.tsx`, `src/i18n/en-US.ts`, `src/i18n/pt-BR.ts`

---

### B. New Word Modal — Save Button 2-Character Gate

**Current behavior:**
- Save button disabled only when `!!duplicate` (opacity 0.5)
- No minimum character requirement

**New behavior:**
- Save button disabled when `word.trim().length < 2` OR `!!duplicate`
- Visual: same `opacity: 0.5` + `disabled` prop on TouchableOpacity
- Applies only to the word field, not date/category/notes

**Implementation in `AddWordModal.tsx`:**
```tsx
const canSave = word.trim().length >= 2 && !duplicate;

// In render:
<Button
  title={editWord ? t('words.update') : t('words.save')}
  onPress={handleSave}
  disabled={!canSave}
  loading={loading}
  style={[s.actionBtn, !canSave && s.btnDisabled]}
  testID="add-word-save-btn"
/>
```

**Edge cases:**
- Accented characters (é, ç, ñ) count as 1 character each — `trim().length` handles this correctly
- Whitespace-only input: `trim()` collapses to `""`, length 0 → disabled
- Edit mode: pre-populated word will already be ≥2 chars, so Save is enabled immediately

**Files affected:** `src/components/AddWordModal.tsx`

---

### C. Explicit Edit Button on Word/Variant Cards

**Current behavior:**
- `words.tsx` line 81: entire card content wrapped in `<TouchableOpacity onPress={() => { setEditWord(item); setShowAddWord(true); }}>` — no visual edit affordance
- `variants.tsx` line 89: same pattern with `<TouchableOpacity onPress={() => handleEditVariant(item)}>` inside `<Card>`

**New behavior:**
- Remove the `TouchableOpacity` wrapper around card content
- Add an edit button row at the **top-right** of the card
- Button structure: `<TouchableOpacity>` with `pencil-outline` icon (size 14) + "Edit" label text
- Style: row layout, subtle text color (`colors.textMuted`), small touch target

**Edit button component pattern (inline, not extracted):**
```tsx
<View style={styles.cardHeader}>
  {/* Card content starts here */}
  <View style={{ flex: 1 }}>
    {/* word/variant info */}
  </View>
  <TouchableOpacity
    onPress={() => handleEdit(item)}
    style={styles.editBtn}
    testID={`word-edit-btn-${item.word}`}
  >
    <Ionicons name="pencil-outline" size={14} color={colors.textMuted} />
    <Text style={[styles.editBtnText, { color: colors.textMuted }]}>
      {t('common.edit')}
    </Text>
  </TouchableOpacity>
</View>
```

**Styles:**
```ts
cardHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
},
editBtn: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
  paddingVertical: 2,
  paddingHorizontal: 6,
},
editBtnText: {
  fontSize: 12,
  fontWeight: '600',
},
```

**Icon choice:** `pencil-outline` — matches the media screen edit button (`media.tsx` line 147, `pencil-outline` size 18). Using size 14 here for the smaller card context.

**i18n keys:** `common.edit` (add to both catalogues: `"Edit"` / `"Editar"`)

**TestIDs:**
- `word-edit-btn-${item.word}` — word card edit button
- `variant-edit-btn-${item.variant}` — variant card edit button

**Files affected:** `app/(tabs)/words.tsx`, `app/(tabs)/variants.tsx`, `src/i18n/en-US.ts`, `src/i18n/pt-BR.ts`

---

### D. Memories Timeline — Date Deduplication

**Current behavior:**
- Each `TimelineItem` independently renders `formatTimelineDate(item.date_added, locale)` as a separate `<Text>` node in the date pane
- Multiple items on the same day each display the date → visual duplication

**New behavior:**
- Pass a `showDate` boolean prop to `TimelineItem`
- In the parent `memories.tsx`, compute which items are the first of their date group:

```tsx
const shouldShowDate = (index: number) => {
  if (index === 0) return true;
  const prev = timelineData[index - 1];
  const curr = timelineData[index];
  return prev.date_added !== curr.date_added;
};
```

- In `TimelineItem`, when `showDate === false`, render an empty `<View>` in the date pane instead of the date text (preserves the alternating layout structure)

**Assumption:** Timeline data is sorted by `date_added` DESC (most recent first) — confirmed by the query ordering. Consecutive items with same date will be adjacent.

**TestIDs:** No new testIDs needed — existing `timeline-item-*` IDs cover assertions.

**Files affected:** `app/(tabs)/memories.tsx`, `src/components/TimelineItem.tsx`

---

### E. Search Bar Spacing Standardization

**Current state across screens:**

| Screen | Container `paddingHorizontal` | SearchBar `marginBottom` | Gap above SearchBar |
|--------|------------------------------|--------------------------|---------------------|
| Words | 20px (`spacing['5']`) | 12px (`spacing['3']`) — from SearchBar style | — |
| Variants | 20px (`spacing['5']`) | 12px (`spacing['3']`) — from SearchBar style | — |
| Media | 16px (hardcoded) | 12px (`spacing['3']`) — from SearchBar style | 12px (`paddingVertical: 12` on title row) |

**Issue:** Media screen uses `paddingHorizontal: 16` on its content containers while words/variants use `paddingHorizontal: 20` (`spacing['5']`). The SearchBar component itself is consistent (same component), but the surrounding container padding differs.

**Fix:**
1. Update media screen container padding to use `spacing['5']` (20px) to match words/variants
2. Define a design system constant for list screen layout:

**New constant in `src/theme/layout.ts`:**
```ts
export const LIST_SCREEN_LAYOUT = {
  paddingHorizontal: 20,  // spacing['5']
  searchBarGap: 12,       // spacing['3'] — already in SearchBar marginBottom
} as const;
```

3. Update words, variants, and media screens to import from `LIST_SCREEN_LAYOUT` instead of hardcoding values

**Design system documentation update** (`.agents/standards/design-system.md`):
Add a "List Screen Layout" section documenting the standard spacing for screens with SearchBar + FlatList.

**Files affected:** `app/(tabs)/media.tsx`, `src/theme/layout.ts`, `.agents/standards/design-system.md`

---

## Affected Components Summary

| Component | File(s) | Changes |
|-----------|---------|---------|
| Variant screen | `app/(tabs)/variants.tsx` | A: empty state gating, hint removal |
| AddWordModal | `src/components/AddWordModal.tsx` | B: 2-char save gate |
| Word cards | `app/(tabs)/words.tsx` | C: explicit edit button, remove card tap |
| Variant cards | `app/(tabs)/variants.tsx` | C: explicit edit button, remove card tap |
| TimelineItem | `src/components/TimelineItem.tsx` | D: conditional date rendering |
| Memories screen | `app/(tabs)/memories.tsx` | D: compute showDate per item |
| Media screen | `app/(tabs)/media.tsx` | E: padding standardization |
| Layout constants | `src/theme/layout.ts` | E: add LIST_SCREEN_LAYOUT |
| i18n catalogues | `src/i18n/en-US.ts`, `src/i18n/pt-BR.ts` | A+C: new keys |
| Design system docs | `.agents/standards/design-system.md` | E: list screen layout rule |

**Total production files:** 8
**Total test files requiring updates:** Tests for variant screen states, AddWordModal save gate, edit button rendering, timeline date dedup, media layout

---

## Before / After Summary

| Element | Before | After |
|---------|--------|-------|
| Variant screen (no words) | Shows empty list with generic message | Disabled empty state: "Add words first" |
| Variant screen (words, no variants) | Generic empty message + add button in header | Centered CTA button "Add First Variant" |
| Variant hint banner | Visible (bulb icon + text) | Removed |
| New word Save button | Disabled only on duplicate | Disabled until ≥2 chars AND no duplicate |
| Word card interaction | Tap entire card → edit | Explicit "Edit" button (pencil + label) at top-right |
| Variant card interaction | Tap entire card → edit | Explicit "Edit" button (pencil + label) at top-right |
| Memories dates | Every item shows its date | First item of each date group shows date; others blank |
| Media search bar padding | 16px horizontal | 20px horizontal (matches words/variants) |

---

## Design Tokens Changed

| Token/Constant | File | Property | Old | New |
|----------------|------|----------|-----|-----|
| (new) `LIST_SCREEN_LAYOUT.paddingHorizontal` | `layout.ts` | `paddingHorizontal` | — | `20` |
| (new) `LIST_SCREEN_LAYOUT.searchBarGap` | `layout.ts` | `searchBarGap` | — | `12` |
| Media container padding | `media.tsx` | `paddingHorizontal` | 16 | 20 (via `LIST_SCREEN_LAYOUT`) |

---

## Accessibility Considerations

- Explicit edit button improves discoverability — no hidden tap targets
- "Add First Variant" CTA provides clear affordance for next action
- 2-char minimum prevents accidental saves; disabled state uses opacity (standard pattern)
- Date deduplication reduces visual noise without removing information

## Platform-Specific Notes

- All changes are style-level and cross-platform compatible
- Android is the primary target — no platform-specific guards needed

---

## Alternatives Considered

**Edit button position — top-left vs top-right:** User initially said "top left" but this conflicts with the natural reading direction where the word/variant name is the primary content at top-left. Top-right is more conventional for secondary actions (matches media screen pattern, iOS/Android edit conventions). Using top-right.

**Shared `EditableCard` component:** Considered extracting the edit button pattern into a reusable wrapper. Rejected — only 2 use sites (words, variants), and the card content structure differs enough that a wrapper would need too many render props. Inline pattern is cleaner.

**Date grouping with section headers:** Considered using `SectionList` with date group headers instead of the showDate boolean. Rejected — the alternating left/right timeline layout doesn't work with SectionList headers, and the current FlatList approach is simpler.

---

## Open Questions

- [x] ~~Edit button position~~ — Resolved: top-right (conventional, matches reading direction)
- [ ] **i18n key for "Add First Variant"** — Proposed: `variants.addFirst`. Confirm wording in both locales:
  - en-US: `"Add First Variant"`
  - pt-BR: `"Adicionar Primeira Variante"`
- [ ] **i18n key for empty-no-words state** — Proposed: `variants.emptyNoWords` / `variants.emptyNoWordsSubtitle`:
  - en-US: `"No Words Yet"` / `"Add some words first before creating pronunciation variants."`
  - pt-BR: `"Nenhuma Palavra Ainda"` / `"Adicione algumas palavras antes de criar variantes de pronúncia."`

**Note:** i18n wording is non-blocking — implementation can use draft strings and refine later.

---

## Acceptance Criteria

- [ ] Variant screen shows "no words" empty state when `words.length === 0`
- [ ] Variant screen shows centered "Add First Variant" button when words exist but no variants
- [ ] Variant hint banner is removed (no bulb icon + text)
- [ ] New word modal Save button disabled until word has ≥2 characters
- [ ] Word cards have explicit edit button (pencil-outline + "Edit") at top-right
- [ ] Variant cards have explicit edit button (pencil-outline + "Edit") at top-right
- [ ] Word/variant cards are NOT clickable (no whole-card tap)
- [ ] Tapping edit button opens the same edit modal as before
- [ ] Memories timeline shows date only on first item of each date group
- [ ] Media screen search bar padding matches words/variants screens (20px horizontal)
- [ ] `LIST_SCREEN_LAYOUT` constant defined in `src/theme/layout.ts`
- [ ] Design system docs updated with list screen layout rule
- [ ] New i18n keys added to both catalogues
- [ ] Tests cover all new states and interactions
- [ ] `npm run ci` passes
- [ ] Coverage ≥99% lines, ≥95% branches/funcs/stmts on changed files
