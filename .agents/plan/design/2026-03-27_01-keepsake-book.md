# Design: Keepsake Book — Shareable Baby's First Words Card

**Date:** 2026-03-27
**Status:** Draft
**Author:** Claude
**Related ADR:** N/A
**Prompt:** `.agents/plan/prompts/2026-03-27_01-keepsake-book.md`
**Spec:** `keepsake-book.md` (project root)

---

## Problem Statement

Parents want to share their baby's first words as a beautiful, social-media-ready image (9:16 Polaroid-style card). Currently the app has no export-as-image or shareable visual souvenir feature — data can only be exported as CSV/ZIP.

## Goals

- Generate a 1080x1920 (9:16) shareable image showing the baby's first 3 words in a Polaroid-style layout.
- Allow photo swap per Polaroid frame (camera or library).
- Save to device camera roll or share via native share sheet.
- Persist keepsake state so the preview thumbnail appears on subsequent app launches.
- Adaptive layout: 1, 2, or 3 Polaroid frames depending on how many words exist.
- Integrate into Memories screen (above timeline) and Home screen (memories card).

## Non-Goals

- Word selection picker (v1 uses the 3 earliest words — no user choice).
- Editable word labels or dates on the card.
- Dynamic QR code generation (static bundled PNGs).
- Multiple keepsake cards / gallery (v1 = single keepsake).
- Sex-adaptive theme for the card (fixed nursery palette in v1).
- Video export or animation.

---

## Design

### Overview

The feature adds a **Keepsake Card renderer** (off-screen React Native View captured as JPEG via `react-native-view-shot`), a **preview/edit modal**, and a **persistence layer** (SQLite metadata + file on disk). The keepsake section appears at the top of the Memories screen and as a compact card in the Home screen.

### New Dependency

| Package | Purpose | Expo SDK 55 compatibility |
|---------|---------|--------------------------|
| `react-native-view-shot` | Capture off-screen View as JPEG | Yes — widely used with Expo, no native config plugin needed |

### Component / Module Breakdown

| Component | Responsibility | File(s) |
|-----------|---------------|---------|
| `KeepsakeCard` | Off-screen 1080x1920 View rendered for capture (Polaroid frames, decorations, watermark) | `src/components/keepsake/KeepsakeCard.tsx` |
| `KeepsakePreviewModal` | Full-screen modal: shows card preview, photo swap per frame, save/share/close actions | `src/components/keepsake/KeepsakePreviewModal.tsx` |
| `KeepsakeSection` | Inline section for Memories screen: CTA or thumbnail | `src/components/keepsake/KeepsakeSection.tsx` |
| `KeepsakeHomeCard` | Compact card for Home screen: thumbnail or "create" hint | `src/components/keepsake/KeepsakeHomeCard.tsx` |
| `keepsakeRepository` | SQLite CRUD for `keepsake_state` key-value pairs | `src/repositories/keepsakeRepository.ts` |
| `keepsakeService` | Orchestration: word selection, photo resolution, image capture, file save, state persistence | `src/services/keepsakeService.ts` |
| `useKeepsake` | TanStack Query hook: keepsake state, photo overrides, generated image URI | `src/hooks/useKeepsake.ts` |
| `useKeepsakeActions` | Mutation hooks: generate, update photo override, reset | `src/hooks/useKeepsake.ts` |
| Migration 0006 | Creates `keepsake_state` table | `src/db/migrations/0006_add-keepsake-state.ts` |
| Decorative assets | Stars, moon, balloon, bear PNGs | `assets/keepsake/` |
| QR code assets | Static QR PNGs (one per locale) | `assets/keepsake/qr-en.png`, `assets/keepsake/qr-pt.png` |
| i18n keys | All user-visible strings | `src/i18n/en-US.ts`, `src/i18n/pt-BR.ts` |

### Database Schema

**Option: Key-value in `keepsake_state` table** (mirrors `notification_state` pattern)

```sql
CREATE TABLE IF NOT EXISTS keepsake_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

**Keys:**

| Key | Value | Purpose |
|-----|-------|---------|
| `keepsake_generated` | `'true'` / `'false'` | Whether a keepsake image has been generated |
| `keepsake_generated_at` | ISO datetime | When the keepsake was last generated |
| `photo_override_{word_id}` | asset ID (string) | Custom photo chosen by user for a specific word slot |

This is lightweight and follows the existing `notification_state` pattern. No new table columns on `words` or `assets`.

**Migration `0006_add-keepsake-state`:**

```typescript
export const migration = {
  version: 6,
  name: 'add-keepsake-state',
  up(db) {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS keepsake_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  },
  down(db) {
    db.execSync('DROP TABLE IF EXISTS keepsake_state;');
  },
};
```

### File Storage

- Rendered image: `Documents/media/keepsake/keepsake.jpg`
- Uses `expo-file-system` (`File`, `Directory`, `Paths.document`) following the existing `assetStorage.ts` pattern.
- On generate/re-generate, the old file is overwritten.

### Word Selection Logic

```typescript
// keepsakeService.ts
async function getKeepsakeWords(): Promise<KeepsakeWord[]> {
  // Fetch first 3 words by date_added ASC (earliest first)
  const words = await query<WordRow>(
    `SELECT w.id, w.word, w.date_added, c.emoji as category_emoji
     FROM words w
     LEFT JOIN categories c ON c.id = w.category_id
     ORDER BY w.date_added ASC
     LIMIT 3`
  );

  // For each word, resolve photo: check override first, then first linked photo
  return Promise.all(words.map(async (w) => {
    const overrideAssetId = await keepsakeRepository.get(`photo_override_${w.id}`);
    let photoUri: string | null = null;

    if (overrideAssetId) {
      // User chose a custom photo — resolve its URI
      photoUri = resolveAssetUri(overrideAssetId);
    } else {
      // Default: first photo asset linked to this word
      const photos = await assetRepository.getAssetsByParentAndType('word', w.id, 'photo');
      if (photos.length > 0) {
        photoUri = buildAssetUri('word', w.id, 'photo', photos[0].filename);
      }
    }

    return { id: w.id, word: w.word, dateAdded: w.date_added, photoUri, categoryEmoji: w.category_emoji };
  }));
}
```

### Data Flow

**Generate keepsake:**
```
User taps "Create Keepsake" → KeepsakePreviewModal opens
  → keepsakeService.getKeepsakeWords() → fetches 3 earliest words + photos
  → KeepsakeCard renders off-screen at 1080x1920
  → User reviews preview
  → [optional] User taps Polaroid frame → image picker → photo override saved to keepsake_state
  → User taps "Save" or "Share"
    → react-native-view-shot captures KeepsakeCard as JPEG (quality 0.92)
    → File saved to Documents/media/keepsake/keepsake.jpg
    → keepsake_state updated: keepsake_generated=true, keepsake_generated_at=now
    → Query cache invalidated → thumbnail appears in Memories + Home
```

**View/edit existing keepsake:**
```
User taps thumbnail → KeepsakePreviewModal opens with existing data
  → Same flow as above (photo swap, save, share)
```

**Home screen integration:**
```
useKeepsake() returns { isGenerated, imageUri }
  → isGenerated=true: show thumbnail (tappable → router.push('/(tabs)/memories'))
  → isGenerated=false: show hint text ("Create a keepsake in Memories")
```

### KeepsakeCard Layout (Off-Screen Renderer)

```
┌─────────────────────────────────┐  1080 x 1920
│                                 │
│    ★  ☽   Baby's First Words    │  Title (serif, bold)
│                                 │
│  ┌──────────┐   ┌──────────┐   │  2 Polaroid frames (upper)
│  │  Photo 1  │   │  Photo 2  │   │  Slight rotation ±3-5°
│  │           │   │           │   │
│  └──────────┘   └──────────┘   │
│   "mamãe"        "papai"       │  Word labels
│   12 Mar 2026    15 Mar 2026   │  Dates
│                                 │
│       ┌──────────┐             │  1 Polaroid frame (center-bottom)
│       │  Photo 3  │             │
│       │           │             │
│       └──────────┘             │
│        "água"                  │
│        20 Mar 2026             │
│                                 │
│  🎈  🧸                        │  Decorative elements
│                                 │
│              palavrinhas.app   │  Watermark + QR
│              [QR]              │
└─────────────────────────────────┘
```

**Adaptive layouts:**
- **3 words**: 2 top + 1 bottom (as above)
- **2 words**: 2 frames centered, side by side
- **1 word**: 1 large centered frame

Background: `#FDFAF5` (warm cream). All decorative elements are bundled PNG assets in `assets/keepsake/`.

### Polaroid Frame Component

Each frame is a View with:
- White background with subtle shadow (Polaroid look)
- Photo area (square, ~300x300dp scaled to 1080w)
- Word label: bold, dark text, truncated at 14 chars
- Date: lighter text, formatted per locale
- Random rotation: `transform: [{ rotate: '±3-5deg' }]` — seeded per word ID for consistency

If no photo exists for a word, show a placeholder: light gray background + category emoji centered.

### KeepsakePreviewModal

Full-screen modal (not bottom sheet — needs full 9:16 preview space):

```
┌─────────────────────────────────┐
│  ✕ (close)                      │
│                                 │
│  ┌─────────────────────────┐   │
│  │                          │   │
│  │   Scaled-down preview    │   │  Card preview (fit to screen width)
│  │   of KeepsakeCard        │   │
│  │                          │   │
│  │   (each frame tappable   │   │
│  │    for photo swap)       │   │
│  │                          │   │
│  └─────────────────────────┘   │
│                                 │
│  [💾 Save to Device]  [📤 Share]│  Action buttons
│                                 │
└─────────────────────────────────┘
```

- Tapping a Polaroid frame launches image picker (camera/library Alert, same pattern as `useProfilePhotoPicker`).
- After photo swap: override saved to `keepsake_state`, preview re-renders.
- **Save to Device**: uses `expo-media-library` to save JPEG to camera roll. Requests `WRITE_EXTERNAL_STORAGE` / photo library permission if needed.
- **Share**: uses `expo-sharing` to open native share sheet with the JPEG file.
- **Close (✕)**: dismisses modal. If user swapped photos but didn't save/share, overrides are still persisted (they can return later).

### Memories Screen Integration

In `app/(tabs)/memories.tsx`, add `KeepsakeSection` as a `ListHeaderComponent` on the FlatList:

```tsx
// memories.tsx — inside MemoriesScreen
<FlatList
  ListHeaderComponent={<KeepsakeSection />}
  ...
/>
```

**`KeepsakeSection` behavior:**
- If `totalWords === 0`: hidden (no keepsake possible).
- If `totalWords > 0` and no keepsake generated: CTA button ("Create Keepsake Book" / "Criar Livro de Memórias").
- If keepsake generated: thumbnail preview of saved image (tappable → opens `KeepsakePreviewModal`).

### Home Screen Integration

In `app/(tabs)/home.tsx`, add `KeepsakeHomeCard` inside the memories card section:

```tsx
// home.tsx — inside the memories Card, before the mini-timeline
<KeepsakeHomeCard />
```

**`KeepsakeHomeCard` behavior:**
- If no keepsake generated: subtle text hint ("Create a keepsake in Memories" / "Crie uma lembrança em Memórias") — not a full CTA button, just informational.
- If keepsake generated: small thumbnail (tappable → `router.push('/(tabs)/memories')`).

### Hooks API

```typescript
// src/hooks/useKeepsake.ts

// Read state
export function useKeepsake(): {
  isGenerated: boolean;
  imageUri: string | null;
  generatedAt: string | null;
  isLoading: boolean;
}

// Read keepsake words with resolved photos
export function useKeepsakeWords(): {
  words: KeepsakeWord[];
  isLoading: boolean;
}

// Mutations
export function useGenerateKeepsake(): UseMutationResult<string, Error, void>
// Captures the card, saves file, updates keepsake_state. Returns file URI.

export function useUpdateKeepsakePhoto(): UseMutationResult<void, Error, { wordId: number; assetUri: string }>
// Saves a photo override (copies file to keepsake dir, stores override in keepsake_state)

export function useResetKeepsake(): UseMutationResult<void, Error, void>
// Clears all keepsake_state, deletes saved image file
```

### Types

```typescript
// src/types/keepsake.ts

export interface KeepsakeWord {
  id: number;
  word: string;
  dateAdded: string;
  photoUri: string | null;
  categoryEmoji: string | null;
}

export interface KeepsakeState {
  isGenerated: boolean;
  generatedAt: string | null;
  photoOverrides: Record<number, string>; // wordId → asset URI
}
```

### i18n Keys

```typescript
// Under 'keepsake' namespace
keepsake: {
  title: "Baby's First Words",              // "Primeiras Palavras"
  createBtn: "Create Keepsake Book",        // "Criar Livro de Memórias"
  saveToDevice: "Save to Device",           // "Salvar no Dispositivo"
  share: "Share",                           // "Compartilhar"
  close: "Close",                           // "Fechar"
  changePhoto: "Change Photo",             // "Trocar Foto"
  takePhoto: "Take Photo",                 // "Tirar Foto"
  chooseFromLibrary: "Choose from Library", // "Escolher da Galeria"
  cancel: "Cancel",                        // "Cancelar"
  saved: "Keepsake saved!",                // "Lembrança salva!"
  permissionDenied: "Photo access needed",  // "Acesso às fotos necessário"
  permissionDeniedMsg: "...",              // "..."
  openSettings: "Open Settings",            // "Abrir Configurações"
  homeHint: "Create a keepsake in Memories", // "Crie uma lembrança em Memórias"
  noWordsHint: "Add your first words to create a keepsake", // "Adicione suas primeiras palavras..."
  watermarkDomain: "palavrinhas.app",       // "littlewordsapp.com" (swapped per locale)
}
```

### Decorative Assets

Bundle in `assets/keepsake/`:

| File | Description |
|------|-------------|
| `star.png` | Decorative star |
| `moon.png` | Crescent moon |
| `balloon.png` | Hot air balloon |
| `bear.png` | Teddy bear |
| `qr-pt.png` | QR code → palavrinhas.app |
| `qr-en.png` | QR code → littlewordsapp.com |

These are static PNGs designed for the cream nursery palette. The `KeepsakeCard` positions them at fixed coordinates. Future themes can swap the asset set.

### Error Handling

| Scenario | Handling |
|----------|----------|
| Photo permission denied | `Alert.alert` with "Open Settings" button (same pattern as profile photo picker) |
| Camera roll save permission denied | `Alert.alert` with link to Settings |
| `react-native-view-shot` capture fails | Show toast/alert "Could not generate image. Please try again." |
| Fewer than 3 words | Adaptive layout (1 or 2 frames). Never show empty frames. |
| 0 words | CTA button hidden/disabled. Hint text shown instead. |
| Word label > 14 chars | Truncate with ellipsis (`numberOfLines={1}`) |
| Image file missing on disk but state says generated | Re-set `keepsake_generated=false`, show CTA. |

### Permissions

| Permission | When requested | Fallback |
|------------|---------------|----------|
| `expo-image-picker` (camera) | User taps "Take Photo" in frame swap | Alert → Settings |
| `expo-image-picker` (library) | User taps "Choose from Library" in frame swap | Alert → Settings |
| `expo-media-library` (write) | User taps "Save to Device" | Alert → Settings |

`expo-sharing` does not require additional permissions.

---

## Alternatives Considered

### 1. Skia / Canvas rendering instead of `react-native-view-shot`

**Discarded.** `react-native-skia` or canvas-based rendering would give pixel-perfect control but adds a heavy dependency (~2MB). `react-native-view-shot` is simpler, well-tested with Expo, and sufficient for a static card layout.

### 2. Store keepsake in the `settings` table

**Discarded.** The `settings` table is a simple key-value store for app configuration. Keepsake state has multiple keys and will grow (photo overrides per word). A dedicated `keepsake_state` table keeps concerns separated and mirrors the `notification_state` pattern.

### 3. Store the rendered image as a base64 string in SQLite

**Discarded.** A 1080x1920 JPEG at 0.92 quality is ~200-500KB. Storing in SQLite bloats the database. File system storage is appropriate — consistent with how all other media assets are stored.

### 4. Show empty dashed frames for missing words

**Discarded per user feedback.** Instead, the layout adapts: 1 frame for 1 word, 2 frames for 2 words, 3 frames for 3+ words. This produces a better-looking card regardless of word count.

---

## Open Questions

All questions have been resolved. No blockers for implementation.

---

## Acceptance Criteria

- [ ] Tapping "Create Keepsake Book" in Memories screen opens the preview modal with up to 3 Polaroid frames showing the earliest words.
- [ ] Each Polaroid frame displays the word's photo (or placeholder emoji if no photo).
- [ ] Tapping a Polaroid frame opens image picker (camera/library) and swaps the photo.
- [ ] "Save to Device" captures the card as 1080x1920 JPEG and saves to camera roll.
- [ ] "Share" opens the native share sheet with the JPEG file.
- [ ] After save/share, a thumbnail appears in the Memories screen keepsake section and Home screen memories card.
- [ ] Keepsake state persists across app restarts (SQLite + file on disk).
- [ ] Layout adapts correctly for 1 word, 2 words, and 3+ words.
- [ ] 0 words: CTA is hidden, hint text is shown.
- [ ] Word labels truncate at 14 characters with ellipsis.
- [ ] Card uses fixed nursery palette (`#FDFAF5` background) regardless of sex-adaptive theme.
- [ ] Watermark shows locale-appropriate domain + QR code.
- [ ] All strings are i18n'd (en-US + pt-BR).
- [ ] Photo/camera permissions are requested with proper denied-state fallback.
- [ ] Unit tests for word selection logic, keepsake repository, and keepsake service.
- [ ] Integration tests for KeepsakePreviewModal, KeepsakeSection, and KeepsakeHomeCard.
- [ ] `npm run ci` passes.

---

## Files Changed (estimated)

| Action | File |
|--------|------|
| **New** | `src/components/keepsake/KeepsakeCard.tsx` |
| **New** | `src/components/keepsake/KeepsakePreviewModal.tsx` |
| **New** | `src/components/keepsake/KeepsakeSection.tsx` |
| **New** | `src/components/keepsake/KeepsakeHomeCard.tsx` |
| **New** | `src/repositories/keepsakeRepository.ts` |
| **New** | `src/services/keepsakeService.ts` |
| **New** | `src/hooks/useKeepsake.ts` |
| **New** | `src/types/keepsake.ts` |
| **New** | `src/db/migrations/0006_add-keepsake-state.ts` |
| **New** | `assets/keepsake/` (decorative PNGs + QR PNGs) |
| **Modified** | `app/(tabs)/memories.tsx` (add ListHeaderComponent) |
| **Modified** | `app/(tabs)/home.tsx` (add KeepsakeHomeCard) |
| **Modified** | `src/i18n/en-US.ts` (keepsake namespace) |
| **Modified** | `src/i18n/pt-BR.ts` (keepsake namespace) |
| **Modified** | `src/db/migrator.ts` (register migration 0006) |
| **Modified** | `package.json` (add react-native-view-shot) |
| **New** | `__tests__/unit/keepsakeService.test.ts` |
| **New** | `__tests__/unit/keepsakeRepository.test.ts` |
| **New** | `__tests__/integration/KeepsakePreviewModal.test.tsx` |
| **New** | `__tests__/integration/KeepsakeSection.test.tsx` |
| **New** | `__tests__/integration/KeepsakeHomeCard.test.tsx` |

**Estimated: ~16 production files + 5 test files = 21 files touched.**
