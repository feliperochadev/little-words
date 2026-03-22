# Design: Asset Linking to Variants

**Status:** Ready for Implementation  
**Category:** Feature  
**Branch:** `add-midia-screen`

---

## Problem

`MediaLinkingModal` currently only links captured media to **words**. Users cannot link audio/photo/video directly to a pronunciation **variant**. Additionally, the variants screen shows no per-type asset counts and has no overlay previews or post-navigation highlight.

---

## Goals

1. Allow linking any captured media (audio/photo/video) to a variant via `MediaLinkingModal`
2. Provide inline variant creation when the desired variant doesn't exist yet
3. Make word linking optional — unlinked assets fall back to profile parent
4. Variants screen: show per-type asset icon counts, overlay previews, and highlight-on-navigate

---

## Non-Goals

- Video preview overlay (placeholder only, consistent with existing behavior)
- Relinking across multiple assets in a single session
- Changes to `EditAssetModal` (already supports variant relinking ✅)
- Changes to cascade deletion (already implemented in `deleteVariant` ✅)

---

## Architecture

### Data Flow

```
MediaFAB (capture)
  → MediaCaptureProvider.setCapturedMedia()
  → phase = 'linking'
  → MediaLinkingModal renders

User selects variant "ba / bah" (word: ball, variant: bah)
  → handleSave()
  → linkMediaToVariant(variantId=5, name?, 'bah', 'ball')
  → assetService.saveAsset({ parentType:'variant', parentId:5, ... })
  → router.push('/(tabs)/variants', { highlightId: '5' })
  → variants.tsx scrolls + highlights row 5
```

### Provider Changes (`MediaCaptureProvider.tsx`)

Add two new callbacks to context:

```ts
// Save asset linked to a variant
linkMediaToVariant(
  variantId: number,
  name?: string,
  variantName?: string,
  wordName?: string
): Promise<void>

// Save without linking (falls back to profile parent)
saveWithoutLinking(name?: string): Promise<void>
```

No new `CapturePhase` needed — inline variant creation is handled entirely in `MediaLinkingModal` local state.

### Modal Changes (`MediaLinkingModal.tsx`)

New local state:
```ts
selectedVariant: Variant | null
variantSearch: string
showInlineVariantCreate: boolean
inlineVariantName: string
inlineVariantWordId: number | null
```

Two search sections stacked vertically:
1. **Link to Word** (existing, now optional)
2. **Link to Variant** (new, uses `useAllVariants()`)

Save logic priority:
```
selectedVariant → parent_type='variant' → navigate to variants with highlightId
selectedWord    → parent_type='word'    → navigate to words with highlightId  
neither         → parent_type='profile' → no navigation (stays on current tab)
```

Variant search result format: `"word / variant"` using `item.main_word + ' / ' + item.variant`

Variant-not-found state:
- Info message explaining profile fallback
- "Create Variant" expands inline form (variant name + required word picker)
- "Save Without Linking" calls `saveWithoutLinking()`

### Variant Type Changes

Add to `src/types/domain.ts` → `Variant`:
```ts
audio_count?: number;
photo_count?: number;
video_count?: number;
```

Add to `variantRepository.ts` → `getAllVariants()` SELECT:
```sql
(SELECT COUNT(*) FROM assets a WHERE a.parent_type='variant' AND a.parent_id=v.id AND a.asset_type='audio') as audio_count,
(SELECT COUNT(*) FROM assets a WHERE a.parent_type='variant' AND a.parent_id=v.id AND a.asset_type='photo') as photo_count,
(SELECT COUNT(*) FROM assets a WHERE a.parent_type='variant' AND a.parent_id=v.id AND a.asset_type='video') as video_count,
```

### Variants Screen Changes (`app/(tabs)/variants.tsx`)

**1. Post-link highlight:**
```tsx
const { highlightId } = useLocalSearchParams<{ highlightId?: string }>();
const flatListRef = useRef<FlatList>(null);
const [highlightedId, setHighlightedId] = useState<number | null>(null);

useEffect(() => {
  if (!highlightId || sorted.length === 0) return;
  const id = Number(highlightId);
  const idx = sorted.findIndex(v => v.id === id);
  if (idx >= 0) {
    flatListRef.current?.scrollToIndex({ index: idx, animated: true });
    setHighlightedId(id);
    const t = setTimeout(() => setHighlightedId(null), 2000);
    return () => clearTimeout(t);
  }
}, [highlightId, sorted]);
```

**2. Asset icon chips (replace `assetCountChip`):**
```tsx
{(item.audio_count ?? 0) > 0 && (
  <TouchableOpacity onPress={() => handleOpenAudioOverlay(item)} testID={`variant-audio-chip-${item.id}`}>
    <View style={assetChip}><Ionicons name="musical-notes" size={12}/><Text>{item.audio_count}</Text></View>
  </TouchableOpacity>
)}
{(item.photo_count ?? 0) > 0 && (
  <TouchableOpacity onPress={() => handleOpenPhotoOverlay(item)} testID={`variant-photo-chip-${item.id}`}>
    <View style={assetChip}><Ionicons name="image" size={12}/><Text>{item.photo_count}</Text></View>
  </TouchableOpacity>
)}
```

**3. Overlay state:**
```ts
const [audioOverlay, setAudioOverlay] = useState<AudioOverlayState | null>(null);
const [photoOverlay, setPhotoOverlay] = useState<PhotoOverlayState | null>(null);
```
Tap handlers fetch the first audio/photo asset for the variant and populate overlay state.

---

## i18n Keys

Under `mediaCapture:` in `en-US.ts` / `pt-BR.ts`:

| Key | EN | PT-BR |
|-----|----|-------|
| `linkToWord` | Link to Word | Vincular a Palavra |
| `linkToVariant` | Link to Variant | Vincular a Variante |
| `variantSearchPlaceholder` | Search variants… | Buscar variantes… |
| `variantNotFound` | Variant "{{name}}" doesn't exist. Save to profile now and link later. | A variante "{{name}}" não existe. Salve no perfil agora e vincule depois. |
| `createVariantInline` | Create Variant | Criar Variante |
| `saveWithoutLinking` | Save Without Linking | Salvar Sem Vincular |
| `selectWord` | Select Word (required) | Selecionar Palavra (obrigatório) |
| `noVariantResults` | No variants found | Nenhuma variante encontrada |
| `inlineVariantName` | Variant name | Nome da variante |

---

## Testing Plan

### Integration — `MediaLinkingModal.test.tsx` (new)
- Renders with pending audio; word search section visible
- Selecting word from search populates chip; deselect clears
- Variant section visible; searching variants shows "word / variant" pairs
- No variant results shows info message
- "Create Variant" expands inline form; requires word selection to enable "Create & Link"
- "Save Without Linking" calls `saveWithoutLinking`
- Save with word selected navigates to `/(tabs)/words`
- Save with variant selected navigates to `/(tabs)/variants` with `highlightId`
- Save with neither selected calls `saveWithoutLinking` (default)

### Screen — `variants.test.tsx` (extended)
- `highlightId` param triggers scroll and sets highlighted border
- Audio chip rendered when `audio_count > 0`, not rendered when 0
- Photo chip rendered when `photo_count > 0`, not rendered when 0
- Tapping audio chip opens `AudioPreviewOverlay`
- Tapping photo chip opens `PhotoPreviewOverlay`

---

## Open Questions

All answered in requirements doc (`variant-asset-linking-requirements.md`):
- File storage: Option A (separate variants dir) — already implemented ✅
- Variant create: inline mini-form in modal
- Parent precedence: variant > word > profile
- Asset count display: per-type icon chips

---

## Implementation Checklist

### Phase 1 — Foundation
- [ ] `src/types/domain.ts` — add `audio_count`, `photo_count`, `video_count` to `Variant`
- [ ] `src/repositories/variantRepository.ts` — add per-type count subqueries
- [ ] `src/providers/MediaCaptureProvider.tsx` — add `linkMediaToVariant`, `saveWithoutLinking`
- [ ] `src/i18n/en-US.ts` + `src/i18n/pt-BR.ts` — add new mediaCapture keys

### Phase 2 — Modal
- [ ] `src/components/MediaLinkingModal.tsx` — variant search, inline create, new save logic

### Phase 3 — Variants Screen
- [ ] `app/(tabs)/variants.tsx` — highlightId, asset icon chips, overlays

### Phase 4 — Tests + CI
- [ ] `__tests__/integration/MediaLinkingModal.test.tsx` (new)
- [ ] `__tests__/screens/variants.test.tsx` (extended)
- [ ] `npm run ci` passes
