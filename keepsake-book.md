---
refined: true
refined_at: 2026-03-27 03:20:00 UTC
refined_by: Claude
---

# Feature: Keepsake Book — Shareable Baby's First Words Card

**Context:** Palavrinhas is a React Native/Expo app (SDK 55, expo-router, TypeScript) for recording a baby's first words. See `CLAUDE.md` for full stack details.

---

## Feature Summary

Add a **Keepsake Book** feature that generates a shareable 9:16 image (Instagram Stories/Reels, TikTok ratio) displaying a baby's first 3 words in a Polaroid-style card layout. The card can be previewed and edited before saving or sharing.

---

## Screen Placement

**Memories Screen** (`app/(tabs)/progress.tsx` — renamed/expanded from "coming soon"):
- Add a visible screen title (e.g. "Memories" / "Memórias") above the timeline.
- **Before the timeline**, insert a Keepsake Book section:
  - If no keepsake exists: show a CTA button ("Create Keepsake Book" / "Criar Livro de Memórias").
  - If a keepsake exists: show a thumbnail preview of the saved keepsake image (tappable → opens edit/preview modal).

**Home Screen** (`app/(tabs)/home.tsx`) — Memories Card section:
- Same logic: CTA button if no keepsake, thumbnail preview if one exists.

---

## Keepsake Card Layout (reference: attached image)

- **Dimensions**: 1080 × 1920 px (9:16), rendered via `react-native-view-shot` off-screen.
- **Background**: Soft cream/warm white (`#FDFAF5` or similar), fixed nursery palette — independent of sex-adaptive theme.
- **Decorative elements**: Stars, moon, hot air balloon, bear — matching the reference image visual style; can be bundled SVG/PNG assets.
- **Title**: "Baby's First Words" (en-US) / "Primeiras Palavras" (pt-BR) — bold serif-style font at top center.
- **Content**: 3 Polaroid-style photo frames, each with:
  - A photo (or placeholder if none).
  - Word label below the Polaroid frame.
  - Date(s) from the word record.
  - Slight random rotation per frame (±3–5°) for a natural look.
- **Layout**: Asymmetric arrangement matching the reference (2 frames upper-left/upper-right, 1 center-bottom), or equivalent 3-frame composition.

**Watermark (bottom-right corner):**
- App logo icon (left) + domain text (right):
  - pt-BR: `palavrinhas.app`
  - en-US: `littlewordsapp.com`
- Below the text: small QR code image (static bundled asset, pre-generated for respective URL).

---

## Word Selection

- Default: the **3 earliest words by `words.date` ASC** (when the child first said them).
- If a word has one or more photo assets (`asset_type = 'photo'`), use the first photo.
- If a word has no photo, show a placeholder frame (dashed border + child silhouette or emoji).

---

## Edit/Preview Flow

1. User taps "Create Keepsake Book" (or taps the existing preview thumbnail).
2. A full-screen **preview modal** opens showing the 9:16 card.
3. Each Polaroid frame is tappable → launches image picker (camera or library) to swap that slot's photo.
4. v1 editing scope: **photo swap only**. Word labels and dates are not editable in v1.
5. Action buttons at bottom of modal:
   - **Save to Device** — saves image to camera roll (requests permissions if needed).
   - **Share** — opens native share sheet (WhatsApp, Instagram, etc.).
   - **Close** — dismisses without saving.
6. After save or share, the keepsake state is persisted so the preview thumbnail appears in home and memories screens.

---

## Persistence Model

- Store keepsake metadata in SQLite: a `keepsake_state` table (or a `keepsake` key-value pair in the existing `settings` table) tracking:
  - Whether a keepsake has been generated.
  - Any photo overrides (word_id → custom asset_id mappings).
- The rendered image file is saved to `Documents/media/keepsake/keepsake.jpg` via expo-file-system.
- On app launch, if the keepsake file exists, show the thumbnail in home + memories screens.

---

## Empty / Edge States

- **Fewer than 3 words**: remaining Polaroid slots show a placeholder (dashed frame + "+" icon).
- **Word has no photo**: placeholder frame — do not use audio assets.
- **Word label overflow**: truncate at 14 chars with ellipsis.
- **0 words**: Keepsake CTA button is disabled or hidden; show a hint ("Add your first words to create a keepsake").
- **Photo permission denied**: show an Alert with a link to Settings.

---

## Constraints

- Image generation: `react-native-view-shot` (renders an off-screen `View` at 1080×1920 and captures as JPEG, quality 0.92).
- QR codes: static pre-generated PNG assets bundled in `assets/images/` (one per locale). No dynamic QR library needed for v1.
- Decorative assets: bundled as PNG/SVG in `assets/images/keepsake/`.
- No new tab is added; the feature lives within the existing Memories (progress) screen and Home screen.
- All user-visible strings go through the i18n catalogue (`en-US.ts` / `pt-BR.ts`).
- Tests required: unit tests for word selection logic and persistence helpers; integration tests for the preview modal and keepsake generation flow.

---

## Open Questions (to resolve before `/plan`)

1. **Memories screen identity**: Is `progress.tsx` being renamed to "Memories", or does a separate Memories screen replace/augment it? Does the existing analytics content (monthly chart, category breakdown) stay?
2. **Word selection**: Confirm ordering is `words.date ASC` (child said it earliest), not `words.id ASC` (entered earliest into the app).
3. **Editing scope**: Confirm v1 is photo-swap only. Should the user also be able to change *which 3 words* appear (i.e. pick from all words, not just the first 3)?
4. **Persistence**: Confirm keepsake state survives app restarts (SQLite + file on disk), not just in-memory.
5. **QR code**: Confirm static bundled PNG asset is acceptable for v1.
6. **Decorative theme**: Confirm fixed nursery palette (cream + stars/moon/bear) independent of sex-adaptive theme.
7. **Empty slots**: Confirm placeholder is dashed frame + "+" icon (not a silhouette or emoji).
8. **Home screen memories card**: Share current layout or mockup for the home screen memories card so integration point is clear.
