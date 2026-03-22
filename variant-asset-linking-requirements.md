# Asset Linking to Variants — Complete Requirements

**Refined Prompt for Implementation**

Allow users to link media assets (audio/photo/video) to word variants in addition to words. The updated MediaLinkingModal should support variant linking with optional word selection, variant creation workflows, and mirror word-linking behavior on the variants screen.

---

## 1. Optional Word Linking

- **Word linking is optional**. If no word is selected, the asset defaults to profile parent (`parent_type='profile'`, `parent_id=1`)
- Alternatively, if user wants to link only to a variant without a word, the asset can be saved to profile and re-linked later
- User can select word, variant, both, or neither before saving

---

## 2. Word vs. Variant Selection

### UI Interaction
- Provide **two separate action buttons** in the MediaLinkingModal:
  - **"Link to Word"** button
  - **"Link to Variant"** button
- Each button opens a search/selection interface:

### Link to Word
- Existing behavior: search existing words by name
- Autocomplete / typeahead list of available words
- Tap to select (shows checkmark or highlight)

### Link to Variant
- Search variants by name
- Display results as **"WordName / VariantName"** pairs for clarity when multiple variants have similar names
- Example: If word "ba" has variant "ba" and word "ball" has variant "ba", show:
  - `ba / ba`
  - `ball / ba`
- Tap to select (shows checkmark or highlight)

---

## 3. Variant-Doesn't-Exist Handling

### Flow
1. User searches for a variant that doesn't exist (e.g., types "bah" but no variant with that name exists)
2. Show **informational message**:
   ```
   "Variant 'bah' doesn't exist. You can save this asset to your profile now 
   and link it to a new variant after creating it."
   ```
3. Provide a **"Create Variant" action** with two options:
   - **Option A (Inline)**: Open quick variant creation form within LinkModal (name field only)
   - **Option B (Full Flow)**: Cancel LinkModal and navigate to full variant creation screen, then return to re-link
4. Allow user to **"Save Without Linking"** (asset defaults to profile parent)
5. User can edit the asset later via EditAssetModal to link it to a variant

---

## 4. Post-Link Navigation

### After Successfully Linking to a Variant
- Navigate the user to the **variants screen** (`/(tabs)/variants`)
- Use `router.push` with params object to highlight/focus the linked variant
- Example implementation:
  ```typescript
  router.push({
    pathname: '/(tabs)/variants',
    params: { highlightId: String(variantId) }
  })
  ```
- Behavior **mirrors word linking**: auto-scroll variants list to the linked variant and apply visual highlight

---

## 5. Variant Screen Display (Mirrors Word Behavior)

### Update `app/(tabs)/variants.tsx`

#### Asset Display in Variant Rows
- Show **asset type icons** in each variant row (similar to word rows):
  - 🎵 Audio icon (Ionicons: `"musical-notes"`)
  - 🖼️ Photo icon (Ionicons: `"image"`)
  - 🎥 Video icon (Ionicons: `"videocam"`)
- Display **asset count badge** (e.g., "3 audio", "1 photo")
- Example row layout:
  ```
  Variant Name     [🎵 2] [🖼️ 1]  [Edit]
  ```

#### Asset Interactions
- **Tap asset icon**: opens preview overlay
  - Audio: `AudioPreviewOverlay` (waveform + play button)
  - Photo: `PhotoPreviewOverlay` (full-screen image with close button)
  - Video: placeholder or video player (if available)
- **Tap "Edit" button**: opens `EditAssetModal` for:
  - Renaming asset
  - Relinking to different word/variant
  - Changing asset date
  - Deleting asset

#### Implementation Pattern
- Reuse the **asset chip row UI pattern** already implemented in `src/components/WordAssetChips.tsx`
- Create similar component `VariantAssetChips.tsx` or extend existing component to support both words and variants

---

## 6. Data Model Updates

### File Storage Strategy
**Decision needed**: Choose one approach:

#### Option A: Separate Variant Directory
- Variant assets stored in: `Documents/media/variants/{variantId}/{audio|photos|videos}/`
- Word assets stored in: `Documents/media/words/{wordId}/{audio|photos|videos}/`
- Requires `moveAssetFile()` logic when relinking between word and variant

#### Option B: Unified Path
- All word-related assets in: `Documents/media/words/{wordId}/...`
- Variant assets also in word directory (since variants belong to words)
- Simpler file organization, no path changes on relink

**Recommendation**: Option B (unified path) — keeps file structure simpler and variants always associated with parent word.

### Cascade Deletion
- Deleting a variant **cascades delete** its linked assets (remove DB records + delete files)
- Implement in `variantRepository.ts` using `withTransaction` or `deleteVariant` method

---

## 7. Database & Repository Updates

### New/Updated Functions

#### `src/repositories/assetRepository.ts`
```typescript
// Fetch assets by parent type and ID (works for words and variants)
getAssetsByParent(parentType: 'word' | 'variant', parentId: number)

// Already exists but confirm it supports variant queries
```

#### `src/repositories/variantRepository.ts`
```typescript
// Update deleteVariant to cascade-delete assets
deleteVariant(variantId: number)  // Now calls removeAllAssetsForParent('variant', variantId)
```

### New Hooks

#### `src/hooks/useAssets.ts`
```typescript
// Fetch assets linked to a specific variant
useAssetsByVariant(variantId: number, enabled?: boolean)

// Existing hooks already support relinking via relinkAsset()
```

### Updated Components

#### `src/components/EditAssetModal.tsx`
- Add variant selection option (in addition to word selection)
- Support relinking asset from word to variant or vice versa
- Display current parent info: "Linked to Word 'ba' / Variant 'ba'"

---

## 8. Edge Cases & Handling

### Word Selected but No Variants Exist
- **Current behavior**: Link asset directly to word (via `updateAssetParent('word', wordId)`)
- No variant-specific handling needed; user must create variant first if they want variant-level linking

### User Selects Variant, Then Variant Deleted (by another tab)
- On save, query for variant existence
- If deleted, show error: "Variant no longer exists. Asset will be saved to your profile."
- Proceed with profile linking

### Variant with Same Name Under Different Words
- Search results must show **"WordName / VariantName"** pair to differentiate
- Example: User searches "ba":
  ```
  ba / ba       (word: ba, variant: ba)
  ball / ba     (word: ball, variant: ba)
  ```

### Asset Linked to Variant, Then Variant Deleted
- **Cascade delete**: variant deletion triggers `removeAllAssetsForParent('variant', variantId)`
- Asset DB record deleted, files removed from disk

### User Cancels After Partially Filling Variant Form
- If inline variant creation opened: discard incomplete form (don't save)
- If navigated to full variant creation: user handles cancellation on that screen independently

### Multiple Assets Queued for Linking
- Variant selection **resets for each asset** (don't persist across multiple linking operations)
- Each asset gets its own selection flow

### Asset Linked to Both Word and Variant
- If user selects "Link to Word: ba" AND "Link to Variant: ba / bah"
- **Database storage**: `parent_type='variant'`, `parent_id={variantId}` (variant takes precedence)
- Variant always implies its parent word, so storing variant is sufficient
- File path: `Documents/media/words/{wordId}/` (based on word relationship)

---

## 9. Implementation Checklist

### Phase 1: Database & Core Hooks
- [ ] Confirm asset cascade deletion for variants
- [ ] Add `useAssetsByVariant` hook in `src/hooks/useAssets.ts`
- [ ] Update `variantRepository.ts` deleteVariant to cascade assets
- [ ] Update `EditAssetModal` to support variant selection

### Phase 2: MediaLinkingModal Updates
- [ ] Add "Link to Variant" button alongside "Link to Word"
- [ ] Implement variant search interface (typeahead / autocomplete)
- [ ] Add variant-doesn't-exist message + options (inline create vs. full create)
- [ ] Update asset linking logic to support variant parent

### Phase 3: Navigation & Screen Updates
- [ ] Implement router navigation to variants screen with `highlightId` param
- [ ] Update `app/(tabs)/variants.tsx` to display linked assets
- [ ] Create `VariantAssetChips.tsx` (or extend existing component)
- [ ] Add preview overlays + edit button interactions

### Phase 4: Testing
- [ ] Unit tests: asset repository variant queries
- [ ] Integration tests: MediaLinkingModal variant selection
- [ ] Screen tests: variants screen asset display
- [ ] E2E tests: full linking workflow (word → variant → navigate → preview → edit)

---

## 10. UI/UX Notes

### MediaLinkingModal Layout
```
┌─────────────────────────────────────────┐
│ Link Media                              │
├─────────────────────────────────────────┤
│                                         │
│ [Link to Word ▼]   [Link to Variant ▼] │
│                                         │
│ Selected: ba / bah                      │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Audio Preview                       │ │
│ │ [⏵] ▪▪▪▪▪▪▪▪▪▪▪▪▪ 0:05 / 0:30     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│                    [Save]  [Cancel]     │
└─────────────────────────────────────────┘
```

### Variants Screen with Assets
```
┌──────────────────────────────────────────┐
│ ba / ba         [🎵 2] [🖼️ 1]  [✏️]      │
├──────────────────────────────────────────┤
│ ba / bah        [🎵 1]         [✏️]      │
├──────────────────────────────────────────┤
│ ba / baba       [ ]             [✏️]     │
└──────────────────────────────────────────┘
```

---

## 11. Success Criteria

✅ User can link audio/photo/video to a variant via MediaLinkingModal  
✅ Word linking is optional; unlinked assets default to profile  
✅ Variant search supports autocomplete with "Word / Variant" display  
✅ If variant doesn't exist, user can create it or save without linking  
✅ After linking to variant, user navigates to variants screen with selection highlighted  
✅ Variants screen displays asset icons, counts, and preview/edit interactions  
✅ All asset operations (preview, edit, delete) work on variant-linked assets  
✅ Cascade deletion: deleting variant removes all linked assets  
✅ All tests pass (unit, integration, screen, E2E)  
✅ Lint + typecheck + semgrep clean

---

## Questions for Clarification

1. **File storage**: Use separate `Documents/media/variants/` path, or keep all assets in word directories?
2. **Variant creation in LinkModal**: Inline quick form, or navigate to full creation screen?
3. **Multiple asset parent support**: Should an asset be linkable to BOTH a word AND a variant, or just one?
4. **Asset count display**: Show all asset types (e.g., "2 audio, 1 photo"), or just first icon with "+N" badge?

---

**Document Created**: 2026-03-22  
**Status**: Ready for implementation planning
