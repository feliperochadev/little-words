# Design: Media Management Screen & Navigation Restructure

**Date:** 2026-03-21  
**Status:** Design Document (Ready for Implementation)  
**Related Issue:** Media asset browsing and management UI  
**Precedent:** `app/(tabs)/words.tsx` (search, filter, sort, list patterns)

---

## Problem Statement

Users need a centralized way to:
1. **Browse all media assets** (audio, photos, videos) across the app
2. **Filter and sort** by asset type and metadata (date, name)
3. **View linked associations** (which word or variant owns each asset)
4. **Edit asset metadata** and re-link to different words/variants
5. **Play/preview** assets inline or in full-screen
6. **Remove or bulk manage** assets

Currently, media is only visible in word/variant edit contexts. There is no global media dashboard.

---

## Solution Overview

### 1. Bottom Navigation Restructure

**Current Layout:**
```
[Home] [Words] [Variants] [Settings]
```

**New Layout:**
```
[Home] [Words] [Variants] [Media] [≡ Menu]
```

Where `≡` (hamburger) opens a submenu:
- Settings
- About (optional)

**Changes Required:**
- `app/(tabs)/_layout.tsx` — add Media route, restructure tab navigator
- `app/(tabs)/media.tsx` (new) — Media screen component
- Settings screen moves from tab to hamburger submenu route
- Update navigation types for new structure

---

### 2. Media Screen (`app/(tabs)/media.tsx`)

#### 2.1 Header & Controls (use `ListScreenControls` pattern)

```
┌─────────────────────────────────────────┐
│ 🎵 Media                           [↕️] │  ← Sort button
├─────────────────────────────────────────┤
│ [🔍 Search media...]                    │
├─────────────────────────────────────────┤
│ [🎵 Audio 12] [🖼️ Photo 8] [🎬 Video 0] │  ← Filter buttons (toggle, show count)
├─────────────────────────────────────────┤
│ Results: 20 total                       │
└─────────────────────────────────────────┘
```

**Components:**
- **Title Row:** "Media" icon (music note), sort button
- **Search Bar:** Search by filename, linked word name, asset metadata
- **Filter Buttons:** 3 toggle buttons (Audio | Photo | Video) showing active counts
  - Default: all types visible
  - Pressing toggles visibility of that type
  - Multiple types can be active simultaneously
- **Result Count:** Show filtered total

#### 2.2 Asset List (FlatList, Card-based rows)

**Row Layout:**
```
┌──────────────────────────────────────────────────┐
│ [🎵] audio-01.m4a                    [✏️] [🗑️] │
│      Word: baby    (linked badge)                │
│      Date: 21 Mar 2026 | 1.2 MB                  │
└──────────────────────────────────────────────────┘
```

**Row Components:**
- **[Left] Asset Type Icon:** 🎵 (audio), 🖼️ (photo), 🎬 (video)
- **[Center] Primary Content:**
  - **Row 1:** Filename or custom "name" metadata
  - **Row 2:** Large linked badge (if linked) or "Unlinked" text
  - **Row 3:** Date added + file size
- **[Right] Action Buttons:**
  - Edit (pencil icon) — opens edit modal
  - Remove (trash icon) — deletes asset with confirm dialog

**Row Behavior on Press:**
- **Audio:** Play inline — show player overlay at bottom of screen with waveform/play/pause controls
- **Photo:** Open full-screen modal overlay showing image viewer (fit-contain)
- **Video:** TBD (placeholder full-screen modal or player)

#### 2.3 Empty States

- **"No media yet"** — if no assets exist
- **"No audio found"** — if filter returns no results for type
- **"No results for '[search term]'"** — if search returns empty
- Include action button to navigate to words/variants or open media capture

#### 2.4 Sort Menu

**Options (similar to words.tsx):**
- Date (↓ Newest first) — default
- Date (↑ Oldest first)
- Name (A→Z)
- Name (Z→A)

---

### 3. Asset Row Data Display

#### 3.1 Linked Badge (Large, prominent)

**Format:**
```
┌─────────────────────────────┐
│ Word: baby                  │  ← from linked word
└─────────────────────────────┘

OR

┌─────────────────────────────┐
│ Variant: babah              │  ← from linked variant
└─────────────────────────────┘

OR

(no badge if unlinked)
```

**Styling:**
- Use theme color matching the linked entity context
- Large badge (visual prominence)
- Tap-friendly size

#### 3.2 Asset Metadata Display

- **Filename** (primary text) — read-only in list view, editable in edit modal
- **Custom "name"** (optional metadata) — if set, can be used instead of filename for display
- **Date Added** — format as "21 Mar 2026"
- **File Size** — in human-readable format (KB, MB)
- **Parent Type Icon** — shows at a glance what asset type

---

### 4. Edit Asset Modal

**Triggered by:** Edit button on row, or Edit action in photo overlay

**Modal Structure:**

```
┌─────────────────────────────────────────┐
│ Edit Audio Asset              [🗑️ Remove]│  ← Remove top-right
├─────────────────────────────────────────┤
│                                         │
│ [Audio waveform or photo thumbnail]     │  ← Preview
│                                         │
├─────────────────────────────────────────┤
│ Filename: audio-01.m4a                  │  ← Read-only or editable
│                                         │
│ Asset Name:                             │  ← Custom metadata name
│ [_________________________]              │  (optional, defaults to filename)
│                                         │
│ Linked To:                              │  ← Dropdown/search selector
│ [Select word or variant]  [🔍]          │
│   ✓ baby (Word)                         │  ← Current selection
│                                         │
├─────────────────────────────────────────┤
│ [Cancel]              [Save Changes]    │  ← Bottom buttons
└─────────────────────────────────────────┘
```

**Modal Fields:**
1. **Asset Preview**
   - Audio: Waveform visualization or play button
   - Photo: Thumbnail image (100x100 dp)
   - Video: Thumbnail with play icon

2. **Filename** (read-only)
   - Display original filename from file system
   - Immutable (file was stored with this name)

3. **Asset Name** (custom metadata, optional)
   - User-editable label/alias
   - Stored in `assets.name` column (separate from filename)
   - If empty, display falls back to filename

4. **Linked To** (word/variant selector)
   - Dropdown or search box to select linked word or variant
   - Shows current selection: `[Word: baby]` or `[Variant: babah]`
   - Can reassign asset to different word/variant
   - Can unlink by clearing selection (if UX allows)

5. **Remove Button** (top-right, outlined danger style)
   - Opens confirm dialog: "Delete this asset? This cannot be undone."
   - On confirm: deletes asset via `useRemoveAsset()`
   - Closes modal on success

6. **Bottom Action Buttons:**
   - `[Cancel]` — close modal without saving
   - `[Save Changes]` — persist updates via `useSaveAsset()` or asset update mutation

**Save Behavior:**
- Validate that linked word/variant exists (handle deleted references)
- Show loading spinner during mutation
- On success: close modal, refetch asset list, show toast "Asset updated"
- On error: show error toast with reason

**Remove Behavior:**
- Show confirm dialog with warning
- On confirm: delete asset, close modal, refetch list
- Show success toast: "Asset removed"

---

### 5. Photo Overlay (Full-Screen Modal)

**Triggered by:** Pressing a photo asset row

**Layout:**

```
┌─────────────────────────────────────────┐
│ [🔙 Close]           [✏️ Edit] [🗑️ Del]  │  ← Top controls
│                                         │
│                                         │
│          [Photo Image (fit-contain)]    │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│ photo-01.jpg                            │  ← Filename
│ Word: baby                              │  ← Linked badge
│ Date: 21 Mar 2026 | 2.3 MB              │  ← Metadata
└─────────────────────────────────────────┘
```

**Components:**
- **Close Button** (top-left) — Ionicons close icon, press to dismiss overlay
- **Edit Button** (top-right, pencil icon) — opens edit modal (overlay remains open in background)
- **Delete Button** (top-right, trash icon) — opens confirm, deletes asset, closes overlay
- **Image Display** (center) — React Native Image with `resizeMode: 'contain'`, fills available space
- **Metadata Footer:**
  - Filename (read-only)
  - Linked badge (large, same style as list)
  - Date added
  - File size
  - Optional: MD5 hash or "Taken on [device]" metadata

**Dismissal:**
- Press close button
- Press outside image area (dim background, if any)
- Back gesture / hardware back button
- After successful delete

**Behavior:**
- Photo loads with spinner until image is ready
- Error state if image file not found or corrupted
- Double-tap zoom (optional, depends on gesture library availability)

---

### 6. Audio Playback (Inline)

**Triggered by:** Pressing an audio asset row

**Inline Player Overlay:**
```
┌─────────────────────────────────────────┐
│ 🔽 Playing: audio-01.m4a                │  ← Collapse/dismiss button
├─────────────────────────────────────────┤
│ [▶️ Play] [⏸️ Pause] [⏹️ Stop]            │  ← Controls
│ [━━━━━⚪━━━━] 0:23 / 1:45              │  ← Waveform + time slider
│                                         │
│ Word: baby                              │  ← Linked badge
└─────────────────────────────────────────┘
```

**Features:**
- Play/pause controls
- Animated waveform (bars following frequency data)
- Time display (elapsed / total)
- Seek slider
- Linked badge showing parent word/variant
- Optional: playback speed control

**State:**
- Only one audio player active at a time (others stop)
- Player state lives at screen level (`useAudioPlayer()`)
- Dismiss/collapse button or swipe-down to hide player
- Auto-hide on audio end

---

### 7. Data Fetching & State Management

#### 7.1 Hooks Used

```typescript
// Fetch all media assets
const { data: allAssets = [] } = useAssets(); // or useAssetsByParent('word') + useAssetsByParent('variant')

// Audio playback
const audioPlayer = useAudioPlayer();

// Mutations
const { mutate: saveAsset } = useSaveAsset();
const { mutate: removeAsset } = useRemoveAsset();
```

#### 7.2 Local State

```typescript
const [search, setSearch] = useState('');
const [filterTypes, setFilterTypes] = useState<Set<'audio' | 'photo' | 'video'>>(
  new Set(['audio', 'photo', 'video'])
);
const [sort, setSort] = useState<SortKey>('date_desc');
const [playingAssetId, setPlayingAssetId] = useState<number | null>(null);
const [editAssetId, setEditAssetId] = useState<number | null>(null);
const [showEditModal, setShowEditModal] = useState(false);
const [showPhotoOverlay, setShowPhotoOverlay] = useState(false);
const [photoAssetId, setPhotoAssetId] = useState<number | null>(null);
```

#### 7.3 Filtering & Sorting

1. **Filter by type:** `allAssets.filter(a => filterTypes.has(a.type))`
2. **Search:** Filter by filename or asset name matching search term
3. **Sort:** Apply sort order (date asc/desc, name asc/desc)

---

### 8. Integration Points

#### 8.1 MediaCaptureProvider
- Edit modal should have access to media capture context if re-uploading is needed
- Current context tracks `pendingMedia` and `phase` — clarify if edit modal reuses this or opens separate capture flow

#### 8.2 useMediaCapture Hook
- May need new context or hook method to handle asset editing
- TBD: Can user re-upload/re-record an asset or only rename/relink?

#### 8.3 Settings Screen (Now in Hamburger Menu)
- Move `app/(tabs)/settings.tsx` to submenu route (e.g., `app/hamburger/settings.tsx` or modal-based)
- Update navigation stack for hamburger menu

---

## Technical Decisions

### 1. Data Source
- **All assets or filtered?** Fetch all assets at screen level, filter/sort locally for responsiveness
- **Pagination?** Not required for MVP (assume <1000 assets); implement if needed later

### 2. Linked Asset References
- **Deleted word/variant handling:** Display "(Word Deleted)" in badge; allow user to unlink
- **Bidirectional updates:** When editing asset's linked word, update asset record (not word record)

### 3. Memory Management
- **Photo loading:** Use React Native Image's memory cache (built-in)
- **Audio playback:** Unload previous player before creating new one (standard `useAudioPlayer` behavior)
- **FlatList optimization:** Use `removeClippedSubviews={true}`, `maxToRenderPerBatch={10}`

### 4. Edit Modal Reuse
- **Question:** Can we reuse `MediaCaptureProvider` modal or do we need separate `EditAssetModal`?
- **Proposal:** Create `EditAssetModal` that wraps asset fields + uses `useRemoveAsset()` + `useSaveAsset()` mutations
- **Clarification needed:** Can users re-upload during edit, or only rename/relink?

### 5. Photo Overlay Library
- **Use:** React Native's built-in Image + View (no external carousel/gallery needed for MVP)
- **Future:** Consider react-native-image-pan-crop or similar if advanced photo editing needed

---

## Files to Create/Modify

### Create
- `app/(tabs)/media.tsx` — Main media screen
- `src/components/EditAssetModal.tsx` — Asset edit/metadata modal (if not using existing)
- `src/components/PhotoOverlay.tsx` — Full-screen photo viewer modal
- `src/components/AudioPlayerOverlay.tsx` — Inline audio playback UI

### Modify
- `app/(tabs)/_layout.tsx` — Add Media tab, restructure navigation with hamburger menu
- `app/(tabs)/settings.tsx` — Move to hamburger/submenu route (OR create new route structure)
- i18n translations — Add keys for "Media", "No media yet", "Edit asset", etc.

---

## i18n Keys Needed

```typescript
{
  media: {
    title: "Media",
    searchPlaceholder: "Search by name or linked word...",
    filterAudio: "Audio",
    filterPhoto: "Photo",
    filterVideo: "Video",
    emptyTitle: "No media yet",
    emptySubtitle: "Record audio, capture photos, or record videos to get started.",
    noResults: "No results for '{search}'",
    noType: "No {type} found",
    editAsset: "Edit Asset",
    assetName: "Asset Name",
    linkedTo: "Linked To",
    selectWord: "Select word or variant...",
    assetRemoved: "Asset removed",
    assetUpdated: "Asset updated",
    deleteAsset: "Delete this asset?",
    deleteWarning: "This cannot be undone.",
    fileName: "File Name",
    dateAdded: "Date Added",
    fileSize: "Size",
    unlinked: "Unlinked",
    playing: "Playing: {name}",
  }
}
```

---

## Accessibility & Testing

### testID Conventions
```
media-search
media-filter-audio / media-filter-photo / media-filter-video
media-item-{assetId}
media-edit-btn-{assetId}
media-remove-btn-{assetId}
media-play-btn-{assetId}
media-sort-btn
media-sort-option-{key}
edit-asset-modal
edit-asset-remove-btn
edit-asset-save-btn
photo-overlay-{assetId}
audio-player-overlay
```

### Screen Reader Support
- Asset rows should announce: "Audio, [name], linked to [word name], date [date]"
- Buttons labeled clearly: "Edit asset", "Remove asset", "Play audio"
- Filter buttons: "Audio, [count] items, [active/inactive]"

---

## Success Criteria

- [ ] Media tab appears in bottom navigation with correct icon
- [ ] Hamburger menu appears on top-right, opens Settings submenu
- [ ] Search filters assets by filename, asset name, or linked word name (case-insensitive)
- [ ] Filter toggles (audio/photo/video) correctly show/hide asset types
- [ ] Sort options (date asc/desc, name asc/desc) reorder list correctly
- [ ] Edit button opens modal with all fields pre-populated
- [ ] Save button updates asset metadata + linked associations
- [ ] Remove button (edit modal) deletes asset with confirm dialog
- [ ] Remove button (row) deletes asset with confirm dialog
- [ ] Photo overlay opens on photo row press, shows image fit-contain
- [ ] Audio player shows inline on audio row press, plays/pauses correctly
- [ ] Linked badge displays on each row
- [ ] Empty states show appropriate messages
- [ ] All i18n keys rendered correctly
- [ ] testIDs present on all interactive elements
- [ ] CI passes (lint, typecheck, tests)

---

## Next Steps

1. **Clarifications** (from user input):
   - Can users re-upload during edit, or only rename/relink?
   - Should unlinked assets show badge or omit it?
   - Hamburger menu location/styling preferences?

2. **Implementation** (via `/implement 2026-03-21_01-media-management-screen`):
   - Create navigation structure + Media tab + hamburger menu
   - Build media screen with search/filter/sort controls
   - Implement asset row list rendering
   - Build edit asset modal
   - Build photo overlay
   - Build audio player overlay
   - Add tests (unit + integration)
   - Update i18n
   - Run CI, merge to main

3. **Optional Enhancements** (post-MVP):
   - Bulk delete/export
   - Asset metadata viewer (EXIF, codec info)
   - Photo editing (crop, rotate, filter)
   - Video playback (if not already supported)
   - Tagging/favorites system
