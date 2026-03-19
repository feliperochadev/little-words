# Design: Media Capture & Linking

**Date:** 2026-03-18
**Status:** Draft
**Author:** Claude
**Related ADR:** `2026-03-18_01-waveform-animation-approach.md`

---

## Problem Statement

Users currently add words and variants as text-only entries. There is no way to capture how a child actually pronounces a word (audio) or to attach contextual photos. The existing `assets` table and file storage pipeline support media, but there is no capture UI. Users need a fast, always-available way to record audio or take photos and link them to words/variants.

## Goals

- Provide a global capture entry point (FAB) accessible from every tab screen.
- Support audio recording with press-and-hold and 60-second auto-cutoff.
- Support photo capture (camera or gallery) via the FAB.
- Link captured media to existing or new words/variants through a dedicated modal.
- Show media indicators in word/variant list rows with inline playback.
- Display removable media chips in edit modals.

## Non-Goals

- Video recording (deferred to future premium tier; UI placeholder only).
- Audio editing, trimming, or effects.
- Cloud sync of media files.
- Batch media import.
- Audio waveform visualization during playback (only during recording).

---

## Design

### Overview

A `MediaCaptureProvider` wraps the tab layout and manages global recording state. A `MediaFAB` component floats above the tab bar on all tab screens. Press-and-hold triggers audio recording; the expanded overlay offers photo capture and a locked video placeholder. On release (or 60s auto-stop), the captured media URI is passed to a `MediaLinkingModal` where the user searches for or creates a word/variant to attach it to. The existing `assetService.saveAsset` pipeline handles persistence.

### Component / Module Breakdown

| Component | Responsibility | File(s) |
|-----------|---------------|---------|
| `MediaCaptureProvider` | Global recording state, temp file cleanup, permission orchestration | `src/providers/MediaCaptureProvider.tsx` |
| `MediaFAB` | Floating button, press-and-hold gesture, expanded overlay, swipe-to-discard, waveform bars | `src/components/MediaFAB.tsx` |
| `MediaLinkingModal` | Preview, metadata (name, date), word/variant search, target selection, handoff to AddWordModal | `src/components/MediaLinkingModal.tsx` |
| `MediaChips` | Horizontal list of media assets in edit modals, with remove button | `src/components/MediaChips.tsx` |
| `AudioPlayerInline` | Small inline player for list rows (play/pause icon + progress) | `src/components/AudioPlayerInline.tsx` |
| `useAudioRecording` | `expo-av` recording lifecycle, amplitude polling, 60s cutoff, cleanup | `src/hooks/useAudioRecording.ts` |
| `useAudioPlayer` | `expo-av` playback for inline players, play/pause/stop | `src/hooks/useAudioPlayer.ts` |
| `useMediaCapture` | Convenience hook to access `MediaCaptureProvider` context | `src/hooks/useMediaCapture.ts` |
| Waveform bars | Animated bar components driven by amplitude values | Inside `MediaFAB.tsx` (not a separate file) |

### Data Flow

#### Audio Capture Flow
```
[User long-press FAB]
  → MediaCaptureProvider sets state to 'recording'
  → useAudioRecording starts expo-av Recording
  → Amplitude polled every 150ms → drives waveform bar animation
  → [User releases / 60s auto-stop]
  → Recording stops, URI captured
  → MediaCaptureProvider sets state to 'linking', stores tempUri
  → MediaLinkingModal opens with audio preview
  → User searches word → selects existing or creates new
  → assetService.saveAsset(tempUri, 'word', wordId, 'audio', ...)
  → Temp file cleaned up by assetService (copy + original stays in cache)
  → Cache invalidated, list refreshes with asset_count
```

#### Audio Discard Flow
```
[User swipes left during recording]
  → PanResponder detects leftward gesture (threshold: -80px)
  → Recording stopped and discarded
  → useAudioRecording deletes temp file
  → MediaCaptureProvider resets to 'idle'
  → Trash animation plays on FAB
```

#### Photo Capture Flow
```
[User taps Photo in expanded FAB overlay]
  → If recording, stop + discard recording
  → Show Alert: "Take Photo" / "Choose from Library" / "Cancel"
    (same pattern as useProfilePhotoPicker)
  → Request camera or media library permission
  → Launch expo-image-picker
  → On result: MediaCaptureProvider sets state to 'linking', stores tempUri + photo metadata
  → MediaLinkingModal opens with photo preview (thumbnail)
  → User selects word/variant target
  → assetService.saveAsset(tempUri, 'word', wordId, 'photo', ...)
```

#### Linking to Existing vs New Word
```
[MediaLinkingModal]
  → User types word name in search input
  → Debounced search via wordService.findWordByName()
  → IF match found:
      → Show word preview (name, category, date)
      → User taps "Link" → saveAsset with existing word ID
      → (Optional) Open AddWordModal in edit mode to see attached media
  → IF no match:
      → Show "Create new word" option
      → User taps → AddWordModal opens in create mode
      → pendingMedia stored in MediaCaptureProvider
      → After AddWordModal.onSave returns new wordId
      → saveAsset with new word ID
      → pendingMedia cleared
```

### UI / UX Decisions

#### MediaFAB (Idle State)
- **Position**: Bottom-left, 16dp from left edge, 12dp above tab bar top edge.
- **Size**: 56x56dp round container.
- **Background**: `colors.primary` with 90% opacity.
- **Shadow**: `elevation.md` from theme.
- **Icons**: Single `mic` icon (28dp) centered. The camera/video options only appear in the expanded overlay.
  - **Rationale**: The original spec shows all three icons in the resting state, but testing shows this clutters a small 56dp circle. A single mic icon communicates the primary action (audio recording) clearly. Photo and video actions are revealed on interaction.
- **testID**: `media-fab`

#### MediaFAB (Recording State)
- **FAB**: Pulses with a subtle scale animation (1.0 → 1.05 → 1.0, looping).
- **Waveform**: 8 bars appear to the right of the FAB, extending toward the center of the screen. Each bar is 4dp wide with 3dp gap. Height animates based on amplitude (min 4dp, max 32dp). Colors: `colors.primary` with staggered opacity.
- **Timer**: Small text label below the waveform showing `MM:SS`.
- **Expanded overlay**: Two buttons appear vertically above the FAB:
  1. **Photo** (`camera` icon + label) — tappable
  2. **Video** (`videocam` icon + `lock-closed` badge) — grayed out, non-interactive
- **testIDs**: `media-fab-recording`, `media-waveform`, `media-timer`, `media-photo-btn`, `media-video-btn-locked`

#### MediaFAB (Swipe-to-Discard)
- **Gesture**: `PanResponder` on the FAB during recording state. Horizontal drag only.
- **Threshold**: `dx < -80` triggers discard.
- **Visual**: FAB translates left following finger. At threshold, a trash icon fades in at the original position. On release past threshold: FAB shrinks to 0 with spring animation, trash icon pops, then FAB reappears at original position.
- **Cancel**: If released before threshold, FAB springs back.

#### MediaLinkingModal
- **Presentation**: Bottom sheet (reusing existing `BottomSheet` component pattern or `Modal` with `useModalAnimation`).
- **Layout (top to bottom)**:
  1. Handle bar (drag to dismiss = cancel + cleanup)
  2. Title: "Link Media" / "Vincular Midia"
  3. **Preview section**:
     - Audio: Play/pause button + waveform-style static bars + duration label
     - Photo: 120x120dp rounded thumbnail
  4. **Display Name** input (optional, placeholder: "Name this recording")
  5. **Date** picker (defaults to today, reuses `DatePickerField`)
  6. **Target type** toggle: [Word] [Variant] — pill-style segmented control
  7. **Word search** input with autocomplete dropdown
     - Shows matching words as cards (word, category badge, date)
     - "Create new word" option at bottom of dropdown
  8. **Action buttons**: [Cancel] [Link]
- **testIDs**: `media-linking-modal`, `media-preview`, `media-name-input`, `media-target-toggle`, `media-word-search`, `media-link-btn`, `media-cancel-btn`

#### Inline Media Indicators (Word/Variant List)
- **Position**: In the `wordMeta` row, after category badge and variant chips.
- **Audio indicator**: `volume-high` icon (14dp), `colors.primary`. Tappable — plays audio inline via `AudioPlayerInline`.
- **Photo indicator**: `image` icon (14dp), `colors.primary`. Tappable — opens photo in a lightbox (simple full-screen modal with the image).
- **Condition**: Only render when `item.asset_count > 0`. The specific icon(s) depend on which asset types are present — this requires a lightweight query or extending the word/variant query to include `has_audio`/`has_photo` booleans.
- **testIDs**: `media-indicator-audio-{wordId}`, `media-indicator-photo-{wordId}`

#### Media Chips in Edit Modals
- **Position**: Below the title, above the word input, in AddWordModal and AddVariantModal.
- **Layout**: Horizontal `ScrollView` of chips.
- **Chip design**: Rounded rect (8dp radius), 36dp tall. Contains: type icon (mic or image, 14dp) + filename or "Recording 1" label + (X) remove button.
- **Remove behavior**: `Alert.alert` confirmation, then `assetService.removeAsset`.
- **testIDs**: `media-chip-{assetId}`, `media-chip-remove-{assetId}`

### Error Handling

| Scenario | Handling |
|----------|----------|
| Microphone permission denied | Alert with "Open Settings" option (matching existing camera permission pattern) |
| Camera permission denied | Alert with "Open Settings" option (reuse from `useProfilePhotoPicker`) |
| Recording fails to start | Toast/Alert "Could not start recording. Please try again.", reset to idle |
| 60-second limit reached | Auto-stop recording, proceed to linking modal with message "Maximum duration reached" |
| File copy fails during save | `assetService.saveAsset` already rolls back DB record on file error |
| Word search returns no results | Show "No words found" + "Create new word" option |
| User cancels linking modal | Delete temp file, reset provider to idle |
| App backgrounded during recording | Stop recording, save temp URI, resume linking on foreground |

### Schema Changes

**None required.** The existing `assets` table with `parent_type` / `parent_id` polymorphic keys already supports word and variant audio/photo attachments. The `asset_count` subquery in `getWords()` and `getAllVariants()` already counts assets.

**Optional query enhancement:** Add `has_audio` and `has_photo` boolean flags to the word/variant queries to determine which indicator icons to show without a separate query per row:

```sql
SELECT w.*,
  (SELECT COUNT(*) FROM assets WHERE parent_type='word' AND parent_id=w.id) AS asset_count,
  (SELECT COUNT(*) FROM assets WHERE parent_type='word' AND parent_id=w.id AND asset_type='audio') > 0 AS has_audio,
  (SELECT COUNT(*) FROM assets WHERE parent_type='word' AND parent_id=w.id AND asset_type='photo') > 0 AS has_photo
FROM words w ...
```

### i18n Keys (New)

```
mediaCapture.linkTitle          → "Link Media" / "Vincular Midia"
mediaCapture.nameLabel          → "Name (optional)" / "Nome (opcional)"
mediaCapture.targetWord         → "Word" / "Palavra"
mediaCapture.targetVariant      → "Variant" / "Variante"
mediaCapture.searchPlaceholder  → "Search for a word..." / "Buscar uma palavra..."
mediaCapture.createNew          → "Create new word" / "Criar nova palavra"
mediaCapture.linkButton         → "Link" / "Vincular"
mediaCapture.discarded          → "Recording discarded" / "Gravacao descartada"
mediaCapture.maxDuration        → "Maximum duration reached" / "Duracao maxima atingida"
mediaCapture.micPermDenied      → "Microphone access is needed to record audio." / "..."
mediaCapture.recording          → "Recording..." / "Gravando..."
mediaCapture.photo              → "Photo" / "Foto"
mediaCapture.video              → "Video" / "Video"
mediaCapture.videoLocked        → "Coming soon" / "Em breve"
mediaCapture.noResults          → "No words found" / "Nenhuma palavra encontrada"
mediaCapture.createWordFirst    → "Create the word first to add a variant" / "Crie a palavra primeiro para adicionar variante"
mediaCapture.removeAsset        → "Remove media?" / "Remover midia?"
mediaCapture.removeAssetMsg     → "This cannot be undone." / "Isso nao pode ser desfeito."
```

---

## Alternatives Considered

1. **Bottom-sheet capture instead of FAB**: A "Record" button inside AddWordModal rather than a global FAB. Rejected because it forces the user to first open the modal, then record — the FAB inverts this (capture first, link later), which is faster for spontaneous moments.

2. **Full-screen recording overlay**: A dedicated recording screen instead of an in-place FAB expansion. Rejected because it's heavier and loses the context of which screen the user was on.

3. **Separate media management screen**: A dedicated tab or screen for all media. Rejected because media in this app is always tied to a word/variant — a standalone media gallery adds complexity without clear value.

---

## Open Questions

- [x] Animation library for waveform: **Resolved** — use RN built-in `Animated` (see ADR `2026-03-18_01-waveform-animation-approach.md`).
- [ ] Should the inline audio player show a progress bar or just a play/pause toggle? A progress bar adds complexity (tracking position, seeking) but is more informative. Recommendation: start with play/pause only, add progress bar later if users request it.
- [ ] Should the MediaLinkingModal allow attaching media to a variant directly (selecting both word and variant), or only to words? The spec says both, but the variant flow is significantly more complex (word must exist first). Recommendation: Phase 1 supports words only; Phase 2 adds variant linking.
- [ ] Photo lightbox implementation: use a simple full-screen `Modal` with `Image`, or add a library like `react-native-image-viewing`? Recommendation: simple Modal first; evaluate library need based on UX feedback.
- [ ] FAB visibility: should the FAB hide during keyboard-open states to avoid overlap? Probably yes — detect keyboard via `Keyboard.addListener` and animate FAB out.

---

## Acceptance Criteria

- [ ] FAB is visible and correctly positioned above the tab bar on all tab screens.
- [ ] Press-and-hold on the FAB starts audio recording; release stops and opens the linking modal.
- [ ] Waveform bars animate in response to recording amplitude.
- [ ] Audio recording auto-stops at 60 seconds and proceeds to the linking modal.
- [ ] Swiping left during recording discards the audio (temp file deleted, no DB write).
- [ ] Photo capture (camera or gallery) via the FAB overlay opens the linking modal with a photo preview.
- [ ] Video button shows a lock icon and is non-interactive.
- [ ] Linking modal allows selecting a Word target with search/autocomplete.
- [ ] Linking to an existing word saves the asset via `assetService.saveAsset`.
- [ ] Linking to a new word opens AddWordModal in create mode; asset is saved after word creation.
- [ ] Word/variant list rows show media indicator icons when `asset_count > 0`.
- [ ] Tapping the audio icon in a list row plays the audio inline.
- [ ] Tapping the photo icon in a list row opens a photo viewer.
- [ ] AddWordModal displays media as removable chips when editing a word with assets.
- [ ] Camera and microphone permissions are requested with denied-alert fallback.
- [ ] All new components use sex-adaptive theme colors via `useTheme()`.
- [ ] All new interactive elements have `testID` attributes.
- [ ] Full CI passes with coverage thresholds met.

---

## Recommended Implementation Phases

| Phase | Scope | Est. Files |
|-------|-------|-----------|
| **1 — Audio Recording Infrastructure** | `useAudioRecording` hook, permission handling, temp file management, 60s cutoff. Unit tests. | 3–4 |
| **2 — MediaFAB Component** | FAB layout, press-and-hold gesture, waveform bars, swipe-to-discard, expanded overlay. `MediaCaptureProvider`. Integration with tab layout. | 4–5 |
| **3 — Media Linking Modal** | `MediaLinkingModal`, word search/autocomplete, target selection, handoff to AddWordModal. Audio preview player. | 3–4 |
| **4 — Inline List Integration** | Media indicator icons in word/variant list rows. `AudioPlayerInline`. Photo lightbox. Query enhancement for `has_audio`/`has_photo`. | 4–5 |
| **5 — Edit Modal Integration** | `MediaChips` in AddWordModal and AddVariantModal. Remove asset flow. | 2–3 |

Total: ~15–20 new/modified files across 5 phases.
