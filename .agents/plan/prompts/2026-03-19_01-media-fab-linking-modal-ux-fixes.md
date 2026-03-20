# MediaFAB & MediaLinkingModal — UX Fixes

**Branch:** `feature/media-capture-and-linking-to-words`

## 1. Reposition photo icon (MediaFAB)

Move the camera/photo icon to the **left side** of the mic FAB. Size it at **75% of the mic button** (42x42 dp vs 56x56 dp). On press, show the existing expanded options popup (Take Photo + Film/locked with "Soon" label) **above the camera icon**, same design as current.

## 2. Pause/resume recording (MediaFAB)

When recording starts, **hide the camera icon** and replace the mic icon with a **pause button** (Ionicons `pause`). Pressing pause **pauses** the recording (`Recording.pauseAsync()`); the icon changes to **resume** (Ionicons `play`). Pressing resume continues recording. Paused time does **not** count toward the 60-second auto-stop limit. The waveform bars freeze at their last position while paused and resume animating on unpause.

## 3. Discard button during recording (MediaFAB)

While recording (or paused), show a **trash icon** (`trash-outline`, ~32 dp) **inside the waveform pill on its left end** (before the waveform bars). Pressing it stops the recording immediately, discards the file, and resets to idle — same behavior as current swipe-to-discard but via explicit button.

## 4. Dismiss expanded options on outside tap (MediaFAB)

When the photo expanded options popup is visible (not during recording), tapping **anywhere outside** the popup and the FAB buttons should close the popup. Implement via a transparent full-screen `Pressable` backdrop behind the popup.

## 5. Audio playback waveform in linking modal (MediaLinkingModal)

When the user taps play on the audio preview, show a **simulated waveform animation** (reuse the same 20-bar component from `MediaFAB`) that animates based on playback progress. Bars animate with sine-wave variation, progressing from left to right as audio plays. When paused/stopped, bars settle to minimum height.

## 6. Full-screen photo preview in linking modal (MediaLinkingModal)

When the user taps the photo thumbnail (120x120) in the linking modal, open a **full-screen overlay** (`Modal` with transparent background, dark backdrop at 0.9 opacity). Show the photo with `resizeMode="contain"` filling the screen. Dismiss by tapping anywhere or swiping down. No pinch-to-zoom in v1.

---

## Open Questions (answered)

- **Pause on iOS**: `expo-av` `Recording.pauseAsync()` exists — use it. If it fails on iOS, degrade gracefully (hide pause button, keep current stop-only behavior).
- **Playback waveform**: Simulated animation based on playback progress (not real amplitude extraction).
- **Full-screen photo dismiss**: Tap-to-close + swipe-down-to-close. No pinch-to-zoom.
- **Camera icon while paused**: Keep hidden — only re-show after recording is fully stopped or discarded.
