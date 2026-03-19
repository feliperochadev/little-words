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
