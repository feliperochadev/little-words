# Design: UI Polish, Pre-Import Backup & iOS Category Modal Fix

**Date:** 2026-04-15
**Status:** Approved
**Author:** Claude
**Related ADR:** N/A

---

## Problem Statement

Four independent issues:

1. The "Nova Palavra" (New Word) header button on the home screen is visually too large — font and padding need to shrink ~15%.
2. Variant and word entries on the memories timeline need improved font/label styling to be more readable.
3. Importing data can silently overwrite the database with no recovery point — a full backup should run automatically before any import.
4. **Critical iOS bug:** tapping "+ Category" inside AddWordModal renders `AddCategoryModal` as a second stacked native `Modal`, which iOS cannot handle — the category sheet never appears and the entire words screen stops responding to touch.

> **Scope note:** Font reduction is **not global**. It applies only to the two specific UI areas: (1) the Nova Palavra home button and (2) word/variant labels on the memories timeline.

---

## Goals

- Shrink the home screen "Nova Palavra" button font and padding by ~15%.
- Improve the font/style of word and variant text on the memories timeline.
- Auto-save a full backup before any import, giving the user a recovery point.
- Fix iOS stacked-modal freeze by rendering `AddCategoryModal` as an overlay when called from within another modal.

## Non-Goals

- Global font token changes in `src/theme/tokens/typography.ts`.
- Redesigning the memories timeline layout.
- Adding undo/rollback for imports beyond the pre-import backup.
- Changing font sizes anywhere outside the Nova Palavra button and memories timeline.

---

## Design

### Overview

Each of the four items is self-contained. They are grouped in one plan because they all target the same release and share no complex dependencies.

---

### 1. Home "Nova Palavra" Button — Smaller

**File:** `app/(tabs)/home.tsx`

| Style property | Before | After |
|---|---|---|
| `addWordHeaderBtn.paddingHorizontal` | 18 | 14 |
| `addWordHeaderBtn.paddingVertical` | 10 | 7 |
| `addWordHeaderBtnText.fontSize` | 15 | 13 |
| `<Ionicons>` size | 16 | 14 |

No layout changes; same shape and colour, just smaller padding and text.

---

### 2. Memories Timeline — Word/Variant Label Styling

**Files:** `src/components/TimelineItem.tsx`

`TimelineCard` currently renders:
- A `TimelineBadge` with the type label ("Word" / "Variant") — small and compact.
- The item text (`item.text`) at `wordFontSize` (compact: 14, normal: 17).
- For variants only: a `variantOf` context line using `colors.textSecondary` at default font size.

**Changes:**
- Reduce the word/variant card title font sizes by ~15%:
  - `wordFontSize` compact: 14 → 12
  - `wordFontSize` normal: 17 → 15
- For the `variantOf` context line (variants only):
  - Set explicit `fontSize: 13` (was relying on default ~12). No colour or style change.
  - No i18n string change; keep `t('memories.variantOf', { word })`.

---

### 3. Pre-Import Full Backup + Tab Label Font Reduction

**File:** `src/components/ImportModal.tsx`

The backup must run before the file picker opens — covering both ZIP restore (`handlePickZip`) and text/CSV import (`handlePickCSV` and the text tab submit). For the ZIP flow, the logical guard is before `handlePickZip` is called. For CSV/text, it is before `handleImport` / `runTextCsvImport` processes rows.

**Simplest approach:** guard at the point the user taps the action button (file pick OR import submit), not at modal open — avoids running backup when the user just browses without importing.

**Tab label font:** `tabText.fontSize` reduced from 11 → 10 (−10%) so the pt-BR label "📦 Backup Completo" fits on one line on iPhone without wrapping.

**Flow — ZIP tab:**
```
User taps "Pick ZIP file" (import-zip-pick-btn)
  → run saveFullBackupToDevice(t, locale) with backingUp spinner
  → success → open DocumentPicker as normal
  → failure → Alert("Backup failed — proceed anyway?") [Cancel | Proceed]
              Cancel: do nothing; Proceed: open DocumentPicker
```

**Flow — CSV/Text tab:**
```
User taps Import button (import-submit-btn)
  → run saveFullBackupToDevice(t, locale) with backingUp spinner
  → success → run runTextCsvImport as normal
  → failure → Alert("Backup failed — proceed anyway?") [Cancel | Proceed]
              Cancel: do nothing; Proceed: run import
```

**Implementation detail:**
- Add `backingUp: boolean` state to `ImportModal`.
- Extract `withBackup(action: () => void)` helper inside the component: runs backup, shows loading on `backingUp`, then calls `action` on success or after user confirms proceed on failure.
- `locale` comes from `useI18n()` (already imported via `useI18n`). `saveFullBackupToDevice` needs `t` and `locale` — both available in component scope.
- The import button and zip pick button render an `ActivityIndicator` when `backingUp === true` (reuse the existing `loading` spinner pattern or add a second state).

**Why guard at action, not modal open:** avoids unnecessary backup if user opens the modal and cancels without importing.

---

### 4. iOS Fix — AddCategoryModal Stacked Native Modal

**Root cause:** iOS cannot display two native `Modal` components simultaneously. When `AddWordModal` (native Modal) is open and calls `setShowNewCategory(true)`, `AddCategoryModal` tries to mount a second native `Modal` — iOS freezes touch on the first modal entirely.

**Fix pattern:** Same as `WheelDatePickerModal.renderAsOverlay` (documented in CLAUDE.md).

#### Changes to `src/components/AddCategoryModal.tsx`

1. Add `renderAsOverlay?: boolean` to `AddCategoryModalProps`.
2. When `renderAsOverlay === true`:
   - Return `null` when `!visible`.
   - Render as absolute-positioned overlay instead of `<Modal>`:
     ```jsx
     <View style={[StyleSheet.absoluteFill, { zIndex: 999 }]} pointerEvents="box-none">
       <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
         <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={dismissModal} />
       </Animated.View>
       <View style={styles.overlay} pointerEvents="box-none">
         {/* identical inner content */}
       </View>
     </View>
     ```
3. When `renderAsOverlay === false` (default): existing `<Modal>` wrapper unchanged — Android and standalone usage unaffected.

#### Changes to `src/components/AddWordModal.tsx`

1. Move `<AddCategoryModal>` from **outside** the outer `<Modal>` to **inside** it (before the closing `</Modal>` tag).
2. Pass `renderAsOverlay`:
   ```jsx
   <AddCategoryModal
     renderAsOverlay
     visible={showNewCategory || !!editCategory}
     onClose={...}
     onSave={...}
     onDeleted={...}
   />
   ```
3. The outer `<Modal>` has no `pointerEvents` conflict — the overlay sits on top within the same native modal layer.

**Why not `portal`:** No built-in portal in React Native. Overlay approach is sufficient and already proven in this codebase.

---

### Component / Module Breakdown

| Component | Change | File |
|-----------|--------|------|
| Home screen | Shrink Nova Palavra button padding + font | `app/(tabs)/home.tsx` |
| TimelineItem | Reduce word/variant font size; improve variantOf style | `src/components/TimelineItem.tsx` |
| ImportModal | Add pre-import backup guard via `withBackup()` helper; reduce tab label font 11→10 | `src/components/ImportModal.tsx` |
| AddCategoryModal | Add `renderAsOverlay` prop | `src/components/AddCategoryModal.tsx` |
| AddWordModal | Render AddCategoryModal inside Modal with `renderAsOverlay` | `src/components/AddWordModal.tsx` |

---

### Data Flow

**Pre-import backup (ZIP path):**
```
User taps "Pick ZIP file"
  → withBackup(openDocumentPicker)
  → saveFullBackupToDevice() [async, backingUp=true]
    → success: backingUp=false → openDocumentPicker()
    → failure: backingUp=false → Alert [Cancel | Proceed]
                                   Proceed → openDocumentPicker()
```

**iOS category modal:**
```
AddWordModal (native Modal, visible=true)
  → user taps "+ Category"
  → setShowNewCategory(true)
  → AddCategoryModal (renderAsOverlay=true) renders inside the same native modal layer
  → No second native Modal → iOS touch handling unaffected
```

---

### UI / UX Decisions

- **Nova Palavra button:** same shape/colour, smaller padding and icon. No visual redesign.
- **Timeline labels:** `wordFontSize` drops ~15%; `variantOf` line uses `colors.text` to be fully readable.
- **Pre-import backup:** non-blocking — if backup fails the user can still proceed.
- **Category modal overlay:** visually identical — same animation, backdrop, pan gesture dismiss.

### Error Handling

- Pre-import backup failure: Alert with "Cancel" / "Proceed anyway" — user decides.
- `renderAsOverlay` with `visible=false`: returns `null` immediately (no render cost).

---

## Alternatives Considered

- **Global font scale:** User confirmed font reduction is scoped to the two specific UI areas only.
- **Portal for AddCategoryModal:** No built-in portal in React Native; overlay approach is simpler and already proven.
- **Block import on backup failure:** Too aggressive; warning + choice is better UX.
- **Run backup at modal open:** Would run even when user cancels; guarding at action time is more appropriate.

---

## Open Questions

None.

---

## Acceptance Criteria

- [ ] Home header "Nova Palavra" button has padding and font reduced per the table above.
- [ ] Timeline word/variant text font sizes reduced (~15%) per the values above.
- [ ] `variantOf` line on variant timeline cards has `fontSize: 13` (size only, no colour change).
- [ ] ImportModal tab labels ("📦 Backup Completo", "📄 Arquivo CSV", "Texto") use `fontSize: 10` so they fit on one line on iPhone.
- [ ] Tapping "Pick ZIP file" in ImportModal runs a backup before opening the file picker.
- [ ] Tapping the Import button on CSV/Text tabs runs a backup before processing rows.
- [ ] If backup fails, an Alert appears with Cancel/Proceed options; Cancel aborts, Proceed continues.
- [ ] On iOS, tapping "+ Category" inside AddWordModal opens the category sheet without freezing.
- [ ] On Android, category modal behaviour is unchanged (still a full native Modal when opened standalone).
- [ ] `npm run ci` passes after all changes.
