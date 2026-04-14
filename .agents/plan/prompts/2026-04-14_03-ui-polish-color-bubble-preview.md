# Prompt — 2026-04-14_03-ui-polish-color-bubble-preview

## Original Prompt
Small adjustments:
- Category modal for new/edit category, the color selection when you select a color in the left edge the border is being overlapped by the background color in the left edge, fix that moving the selection a bit to the right
- On @app/(tabs)/variants.tsx probably on line 92 to 94 the right double quote, the end of it's being overlapped by the background color, increase the view bubble size in 10% in order to remove the double quote not be overlapped by the background and show all quote size
- On @src/components/keepsake/KeepsakePreviewModal.tsx the image preview is too small, let's increase the size in 20% (and move the elements inside accordently to keep in the same position relative to the current position), and move the preview image to bottom a bit, around 15% down.

## Refined Prompt

### Problem
Three independent visual clipping/sizing defects across three components.

### Fix 1 — AddCategoryModal: color swatch left-edge clipping
`colorBtnSelected` applies `transform: [{ scale: 1.15 }]`. The first swatch in the row is flush against the container left edge — the scale transform overflows and is clipped by the parent `colorGrid` View. Fix: add `paddingLeft: 4` (or `paddingHorizontal: 4`) to `colorGrid` so the scaled swatch has room to breathe.

### Fix 2 — VariantsScreen: right curly-quote clipped by bubble
`variantBubble` has `paddingHorizontal: 14, paddingVertical: 8`. The closing `&rdquo;` glyph overflows the right side of the bubble. Increase horizontal padding by ~10%: `paddingHorizontal: 14 → 16`, `paddingVertical: 8 → 9`.

### Fix 3 — KeepsakePreviewModal: preview too small, needs repositioning
Current `PREVIEW_SCALE = 340 / 1080`. Increase display width 20%: `340 → 408`. `previewWrapper` dimensions scale proportionally (`408 × (408 * 1920/1080)`). Move preview down ~15%: increase `paddingTop` in `previewContent` from `16` to `~40` (16 + 15% of container height approximation). Touch-target overlays (`getFramePosition`) use percentage strings — they remain valid relative to the wrapper and need no change.

### Files touched
- `src/components/AddCategoryModal.tsx` — `colorGrid` style
- `app/(tabs)/variants.tsx` — `variantBubble` style
- `src/components/keepsake/KeepsakePreviewModal.tsx` — `PREVIEW_SCALE`, `previewWrapper`, `previewContent`

### Constraints
- No logic changes, only StyleSheet values.
- Tests: unit/integration tests for these components likely don't assert pixel dimensions, so no test changes expected. Confirm after CI.
- Touch targets in `getFramePosition` use percentage strings relative to `previewWrapper` — they auto-scale correctly.
