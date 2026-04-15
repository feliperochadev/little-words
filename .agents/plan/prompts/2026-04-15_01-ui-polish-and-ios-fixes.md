# Prompt — 2026-04-15_01-ui-polish-and-ios-fixes

## Original Prompt

Fonts to decrease in 15%
- Backup completo on import data
- + Nova Palavra on home (font and button decrease)
- Word/variant on timeline on memories

Bug on iOS
The button for new category inside add/edit word modal is not working on iOS the category modal doesn't show up and the whole words screen stop to respond press action.

## Refined Prompt

See `.agents/refined-prompts/2026-04-15_01-ui-polish-and-ios-fixes.md` for the full refined prompt with all five sections.

### Summary of items:

1. **Font -15%** — reduce all 8 token values in `src/theme/tokens/typography.ts` by 15%, round to integer.
2. **Pre-import backup** — before ZIP import runs, auto-save a full backup; warn if it fails, let user choose to proceed or cancel.
3. **Home button smaller** — reduce `addWordHeaderBtn` padding and font size by ~15%.
4. **Memories timeline word/variant label** — make the parent-word reference for variant cards more prominent.
5. **iOS fix: AddCategoryModal stacked modal freeze** — add `renderAsOverlay` prop to `AddCategoryModal`; render it inside `AddWordModal`'s native Modal as an overlay view, not a second native Modal.
