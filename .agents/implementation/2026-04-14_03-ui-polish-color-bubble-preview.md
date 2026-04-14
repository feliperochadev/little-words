---
name: 2026-04-14_03-ui-polish-color-bubble-preview
plan: .agents/plan/design/2026-04-14_03-ui-polish-color-bubble-preview.md
status: done
started: 2026-04-14
agent: claude
worktree: false
---

## Summary

Three StyleSheet-only UI polish fixes: color swatch left-edge clipping in AddCategoryModal, curly-quote overflow in variant bubble, and undersized/mispositioned keepsake preview.

## Changes

| File | Action | Notes |
|------|--------|-------|
| `src/components/AddCategoryModal.tsx` | modified | `colorGrid` += `paddingHorizontal: 4` |
| `app/(tabs)/variants.tsx` | modified | `variantBubble` padding 10% increase |
| `src/components/keepsake/KeepsakePreviewModal.tsx` | modified | Scale +20%, preview shifted down |

## Design Decisions Made

- `colorGrid` uses `paddingHorizontal: 4` (not `paddingLeft` only) to keep symmetric wrap alignment.
- `variantBubble` rounded to nearest integer: `paddingHorizontal: 16`, `paddingVertical: 9`.
- `PREVIEW_SCALE` constant updated; `previewWrapper` dimensions derived from new scale width (408).
- `previewContent paddingTop` increased to 40 to achieve ~15% downward shift.
- `getFramePosition` touch targets unchanged — use `%` strings relative to wrapper.

## Enhancements

### 2026-04-14 — Bubble right-quote clip + keepsake scale/position refinement

- **Description:** Italic bold `"` glyph still clipped → asymmetric padding (`paddingRight: 22`). Preview scale reduced 20%→15% (too big). Preview paddingTop reduced 40→20 (too far down, now scrolls).
- **Files Modified:** `app/(tabs)/variants.tsx`, `src/components/keepsake/KeepsakePreviewModal.tsx`
