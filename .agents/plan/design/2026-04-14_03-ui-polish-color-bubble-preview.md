# Design — 2026-04-14_03-ui-polish-color-bubble-preview

## Status
Proposed

## Summary
Three isolated StyleSheet fixes for visual clipping defects: color swatch left-edge overflow in AddCategoryModal, curly-quote clipping in variant bubble, and undersized/mispositioned preview in KeepsakePreviewModal.

## Affected Files
| File | Change |
|------|--------|
| `src/components/AddCategoryModal.tsx` | Add `paddingHorizontal: 4` to `colorGrid` |
| `app/(tabs)/variants.tsx` | `variantBubble` padding +10% |
| `src/components/keepsake/KeepsakePreviewModal.tsx` | Scale +20%, move down ~15% |

## Fix Details

### 1. AddCategoryModal — color swatch left-edge clip
**Root cause:** `colorBtnSelected` applies `transform: [{ scale: 1.15 }]`. First swatch in `colorGrid` is flush to container left — scaled overflow clipped by parent.
**Fix:** Add `paddingHorizontal: 4` to `colorGrid` style (currently `gap: 10, marginBottom: 20`).
```
colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20, paddingHorizontal: 4 }
```

### 2. VariantsScreen — `&rdquo;` clipped by bubble
**Root cause:** `paddingHorizontal: 14` insufficient for the curly-quote glyph width at fontSize 18 bold italic.
**Fix:** `paddingHorizontal: 14 → 16`, `paddingVertical: 8 → 9` (~10% increase).
```
variantBubble: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 16 }
```

### 3. KeepsakePreviewModal — preview size + position
**Root cause:** `PREVIEW_SCALE = 340 / 1080` renders the card too small. `paddingTop: 16` in `previewContent` places it too high.
**Fix:**
- `PREVIEW_SCALE = 408 / 1080` (340 × 1.2 = 408)
- `previewWrapper`: `width: 408`, `height: 408 * (1920/1080)`
- `previewContent paddingTop`: increase from `16` to ~`40` to push preview ~15% lower
- `paddingBottom: 16` unchanged
- `getFramePosition` uses `%` strings relative to `previewWrapper` — no change needed

## Open Questions
- [ ] Verify `paddingHorizontal: 4` on `colorGrid` doesn't affect wrap alignment for small screens.
- [ ] Confirm `paddingTop: 40` is enough vertical shift on real devices without cutting off action buttons.

## Non-Goals
- No logic changes.
- No test changes expected (no pixel-dimension assertions in existing tests).
