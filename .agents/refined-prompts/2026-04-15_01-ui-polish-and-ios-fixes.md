---
refined: true
refined_at: 2026-04-15 00:00:00 UTC
refined_by: Claude
---

# UI Polish, Feature Additions & iOS Category Bug Fix

## 1. Prompt Analysis

**Intent:** Ship a batch of UI polish (font scale-down, button shrink), two small features (pre-import backup + variant label on memories timeline), and fix a critical iOS bug where the "add category" button inside AddWordModal freezes the words screen.

**Weaknesses or ambiguities:**
- "Fonts to decrease in 15%" — unclear whether this applies to all hardcoded font sizes across the app, only the theme token values, or only specific screens.
- "+ Nova Palavra on home (font and button decrease)" — unclear by how much (15% like fonts, or a different value?).
- "Word/variant on timeline on memories" — ambiguous; the badge already shows the type label. Likely means: show the parent word name more prominently for variant timeline items, or display the word/variant text label above the item text.
- "Backup completo on import data" — likely means: before any import (ZIP restore), automatically generate and save a full backup as a safety net.

**Missing constraints:**
- No clarification on whether font reduction applies to theme tokens only, or all hardcoded `fontSize` values too.
- No target size for the home button (assume 15% as per the general font rule).
- No spec for how the word/variant label appears on the timeline.

## 2. Edge Cases

- Font reduction: values like 10px reduced 15% = 8.5, which must be rounded to integer; all values must stay readable.
- Pre-import backup: if the backup fails, should import be blocked or proceed with a warning?
- Timeline word/variant label: variant items already show "variant of X" — adding more info may crowd the card.
- iOS modal stack: the fix must not break the Android behaviour where the same category modal is rendered separately.

## 3. Suggested Improvements

- Scope font reduction to the theme token file only (`src/theme/tokens/typography.ts`); hardcoded values in StyleSheet.create() that mirror theme tokens should be updated to match.
- Pre-import backup should be non-blocking: show a toast/spinner while backup runs, then proceed with import. If backup fails, warn user and give them a choice to cancel or proceed.
- For the timeline word/variant label, add a visible "Word" / "Variant" text indicator (already exists via `TimelineBadge`) — interpret as: improve or make the parent-word reference more visible for variant cards.
- Home button size: apply the same 15% reduction to `paddingHorizontal`, `paddingVertical`, and font size of the header add-word button.

## 4. Clarifying Questions

*(none blocking — see design doc assumptions)*

## 5. Refined Prompt

### Feature 1 — Global Font Scale -15%
Reduce all font size token values in `src/theme/tokens/typography.ts` by 15%, rounding to the nearest integer. Update any hardcoded `fontSize` values in component StyleSheets that are direct mirrors of removed token values.

Affected tokens (before → after):
- xs: 10 → 9
- sm: 12 → 10
- md: 14 → 12
- lg: 16 → 14
- xl: 18 → 15
- 2xl: 20 → 17
- 3xl: 26 → 22
- 4xl: 30 → 26

### Feature 2 — Pre-Import Full Backup
In `app/(tabs)/settings.tsx`, before triggering `ImportModal` (or inside `ImportModal` before the import runs), automatically call `saveFullBackupToDevice` as a safety backup. Show a brief loading state while backup runs. If backup fails, show an Alert giving the user the choice to cancel or proceed anyway.

### Feature 3 — Home "Nova Palavra" Button — Smaller
In `app/(tabs)/home.tsx`, shrink the `addWordHeaderBtn` style:
- `paddingHorizontal`: 18 → 14
- `paddingVertical`: 10 → 7
- `addWordHeaderBtnText` fontSize: 15 → 13
- Icon size: 16 → 14

### Feature 4 — Word/Variant Type Label on Memories Timeline
In `src/components/TimelineItem.tsx`, the `TimelineBadge` already shows the type. Enhancement: for variant cards, make the parent word reference (`variantOf` line) always visible and styled more prominently (e.g., slightly larger font, not muted colour). Ensure the label "Word" / "Variant" badge is always shown (already the case).

### Bug Fix — AddCategoryModal Freezes iOS When Opened from AddWordModal
Root cause: iOS cannot display two stacked native `Modal` components simultaneously. `AddCategoryModal` uses a native `Modal`; when triggered from within `AddWordModal` (also a native `Modal`), iOS freezes touch on the parent.

Fix: add `renderAsOverlay?: boolean` prop to `AddCategoryModal`. When `true`, render the component as an absolute-positioned overlay `View` (same visual as the Modal but without native modal container) instead of wrapping in `<Modal>`. In `AddWordModal`, render `<AddCategoryModal renderAsOverlay ... />` inside the existing `<Modal>` body. This follows the same pattern as `WheelDatePickerModal`.
