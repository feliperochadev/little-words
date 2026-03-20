# Prompt — 2026-03-18_02-media-capture-and-linking

## Original Prompt

# Design Document: Media Capture & Linking

**Date:** 2026-03-18
**Status:** Draft
**Category:** [feature] [ui] [ux] [data-layer]

## 1. Overview
Introduce a global media capture interface (Floating Action Button) that allows users to record audio or take photos instantly from any screen and link them to words or variants.

## 2. UI/UX Specification

### 2.1 Global Floating Action Button (FAB)
- **Position:** Bottom-left, fixed above the Tab Bar.
- **Visuals:**
  - Round container following sex-adaptive theme colors.
  - Icons (Ionicons):
    - Top row: `camera` (Photo) and a smaller `videocam` (Video).
    - Bottom row: `mic` (Audio), sized 2x compared to the others.
- **Interactions:**
  - **Press & Hold (Mic):** Starts recording audio immediately.
  - **Visual Feedback:** A waveform animation expands across the bottom line while recording.
  - **Overlay Options:** While recording, two labels/buttons appear vertically above the FAB:
    - **Photo:** Clicking this stops/discards the current audio and opens the Camera/Gallery.
    - **Video:** Locked (shows a `lock-closed` icon; for future premium tier).
  - **Discard (Swipe Left):** Swiping left on the button during recording discards the audio with a "trash" animation (WhatsApp style).
  - **Release:** Stops recording and proceeds to the "Linking" screen.

### 2.2 Media Linking Flow
After capture (Audio/Photo), the user is presented with an intermediate modal:
- **Preview:** Small player (for audio) or thumbnail (for photo).
- **Metadata Inputs:**
  - **Display Name:** Optional name for the asset.
  - **Date:** Default to current date (DatePicker).
- **Target Selection:**
  - Toggle between **Word** or **Variant**.
  - **Search/Input:** Type the word name.
  - **Logic:**
    - If the word exists: Load existing category/details and show the media preview at the top of the `AddWordModal`.
    - If the word does not exist: Proceed with a fresh `AddWordModal` prepopulated with the media.
    - If adding a **Variant**: If the parent word doesn't exist, the user must first create the word before the variant can be linked.

### 2.3 Inline Integration
- **Word/Variant List:**
  - Add a small `volume-high` or `image` icon to the row if media is present.
  - Tapping the icon plays audio immediately (inline) or opens a photo lightbox.
- **Edit Modals:**
  - Assets appear as a list of "Media Chips" at the top.
  - Each chip has a "remove" (X) button for deletion.

## 3. Technical Implementation

### 3.1 Media Handling
- **Audio Limit:** Enforced 60-second cutoff in the capture service.
- **Storage:** Utilize `src/utils/assetStorage.ts` for path management:
  - `Documents/media/{words|variants}/{id}/{type}/`.
- **Database:** Atomic insertion into the `assets` table via `assetService`.

### 3.2 State & Components
- **Global FAB:** Wrap the root `_layout.tsx` (above the `Slot`) in a `MediaCaptureProvider` to handle the recording state globally.
- **Waveform:** Use `react-native-reanimated` for the recording amplitude visualization.
- **Navigation:** Deep-link or state-pass captured media URI to the `AddWordModal`.

## 4. Acceptance Criteria
- [ ] FAB is visible and correctly positioned on all Tab screens.
- [ ] Audio recording stops and discards when swiping left.
- [ ] Audio recording is limited to 60 seconds.
- [ ] Capture proceeds to the correct Linking Modal.
- [ ] Media icons appear in the word list and are interactive.
- [ ] Assets can be deleted from the Edit Word modal.

## Refined Prompt

### 1. Desired Outcome
Build a global media capture system with a Floating Action Button (FAB) that allows users to record audio (press-and-hold) or take photos from any tab screen, then link the captured media to existing or new words/variants through a linking modal. The word/variant list screens should display media indicators with inline playback, and edit modals should show removable media chips.

### 2. Constraints & Edge Cases
- **60-second audio limit**: Recording must auto-stop at 60 seconds and proceed to linking.
- **Swipe-to-discard**: Swiping left during recording discards without saving — needs a gesture threshold to avoid accidental triggers.
- **Video locked**: The video option must be visible but non-functional (lock icon, no recording), reserved for a future premium tier.
- **Variant without parent word**: If a user tries to link media to a variant whose parent word doesn't exist, they must create the word first. The flow should guide them through this rather than silently failing.
- **Concurrent recording guard**: Only one recording session at a time. The FAB must be disabled/hidden while a linking modal is active.
- **Permission handling**: Camera and microphone permissions must be requested gracefully, with fallback alerts when denied (matching the existing `useProfilePhotoPicker` pattern).
- **File cleanup on discard**: Temporary recording files from `expo-av` must be deleted when the user discards or cancels.
- **Empty state**: If a word has 0 assets, no media icon should appear in the list row (rely on existing `asset_count` field).
- **New dependency risk**: The spec calls for `react-native-reanimated` for the waveform. This library is NOT currently installed. An ADR should evaluate whether to add it or use RN's built-in `Animated` API.
- **Android-primary**: All gesture and recording behavior must be validated on Android. iOS is untested.

### 3. Quality Bar
- Tests must cover ≥99% lines / ≥95% functions/branches/statements of all new code.
- Full CI pass (`npm run ci`) required before any implementation is considered done.
- All new interactive/assertable elements must have `testID` attributes.
- The FAB, linking modal, media chips, and inline playback must all respect the sex-adaptive theme.
- Accessibility: the FAB long-press interaction should have adequate affordance (visual cues before interaction, not just on press).

### 4. Implementation Phasing (Recommended)
Given the scope (~15–20 new/modified files, 4+ changelog categories), this should be implemented in phases:
- **Phase 1**: Audio recording infrastructure — `useAudioRecording` hook, recording service, temporary file management.
- **Phase 2**: FAB component — positioned in tab layout, press-and-hold recording, swipe-to-discard, visual waveform feedback.
- **Phase 3**: Media Linking Modal — preview, metadata inputs, word/variant search + creation flow.
- **Phase 4**: Inline integration — media icons in list rows, inline audio playback, photo lightbox.
- **Phase 5**: Edit modal integration — media chips in AddWordModal/AddVariantModal.

### 5. Acceptance Criteria (Refined)
- [ ] FAB is visible and correctly positioned above the tab bar on all tab screens.
- [ ] Press-and-hold on the FAB starts audio recording; release stops and opens the linking modal.
- [ ] Audio recording auto-stops at 60 seconds and proceeds to the linking modal.
- [ ] Swiping left during recording discards the audio (temp file deleted, no DB write).
- [ ] Photo capture (camera or gallery) via the FAB overlay opens the linking modal with a photo preview.
- [ ] Video button shows a lock icon and is non-interactive.
- [ ] Linking modal allows selecting Word or Variant target, with search/autocomplete.
- [ ] Linking to an existing word opens AddWordModal in edit mode with the media pre-attached.
- [ ] Linking to a new word opens AddWordModal in create mode with the media pre-attached.
- [ ] Linking to a variant whose parent word doesn't exist prompts word creation first.
- [ ] Word/variant list rows show media indicator icons when `asset_count > 0`.
- [ ] Tapping the audio icon in a list row plays the audio inline.
- [ ] Tapping the photo icon in a list row opens a photo viewer/lightbox.
- [ ] Edit modals (AddWordModal, AddVariantModal) display media as removable chips.
- [ ] All media operations use the existing asset service/repository/storage pipeline.
- [ ] Camera and microphone permissions are requested with denied-alert fallback.
- [ ] Full CI passes with coverage thresholds met.
