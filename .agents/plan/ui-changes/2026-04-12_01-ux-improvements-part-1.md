# UI Changes: UX Improvements — Part 1 (Release Polish)

**Date:** 2026-04-12
**Status:** Approved
**Author:** Claude
**Branch:** `feature/UX-improvements-for-release-part-1`
**Refined Prompt:** `prompts/2026-04-12_ux-improvements-part-1.md`

---

## Problem Statement

Several UI elements have font sizes that are too small for comfortable reading, the gender selector lacks a clear selection indicator (unlike the language selector which has a ✓), and the variant icon (`chatbubble-ellipses`) is confused with a chat icon. These issues were identified in a UX review meeting ahead of the release.

## Goals

- Add a ✓ checkmark to the selected gender button (onboarding + edit profile modal)
- Increase targeted font sizes by 30% for better readability
- Replace all variant-related chat-bubble icons with a non-chat icon, consistently across the entire app
- Zero regressions — all changes are visual-only with no data/logic impact

## Non-Goals

- Redesigning the onboarding flow or edit profile modal layout
- Changing icon colors, sizes, or animation behaviors
- Touching any other font sizes beyond the ones explicitly listed
- Introducing new shared components (the sex selector is similar in both files but doesn't warrant extraction for a 3-line checkmark addition)

---

## Design

### Overview

Four categories of visual changes: (A) gender checkmark, (B) font size increases, (C) variant icon replacement, (D) documentation/test updates. All changes are CSS/style-level or icon-name swaps — no data flow, state, or navigation changes.

### A. Gender Checkmark Indicator

Add a `✓` text element to the currently selected sex button, matching the existing language selector checkmark pattern.

**Pattern (from `onboarding.tsx` lines 114-117):**
```tsx
{locale === lang.locale && <Text style={[styles.langCheck, { color: accentColor }]}>✓</Text>}
```

**Style (`langCheck` at line 224):** `{ fontSize: 13, fontWeight: '900' }`

**Apply to:**

| File | Location | Active condition |
|------|----------|-----------------|
| `app/onboarding.tsx` | Lines 141-148 (inside each `sexBtn` TouchableOpacity) | `isGirl` / `isBoy` |
| `src/components/EditProfileModal.tsx` | Lines 144-159 (inside each `sexBtn` TouchableOpacity) | `isGirl` / `isBoy` |

**Implementation per button (onboarding example for girl):**
```tsx
<TouchableOpacity style={[styles.sexBtn, isGirl && styles.sexBtnGirl]} onPress={() => setSex('girl')} testID="onboarding-sex-girl-btn">
  <Text style={styles.sexEmoji}>👧</Text>
  <Text style={[styles.sexLabel, isGirl && styles.sexLabelActiveGirl]}>{t('onboarding.girl')}</Text>
  {isGirl && <Text style={[styles.sexCheck, { color: THEME_COLORS.profileGirl }]}>✓</Text>}
</TouchableOpacity>
```

**New style to add in both files:**
```ts
sexCheck: { fontSize: 13, fontWeight: '900' },
```

**Color mapping:**
- Girl selected → `THEME_COLORS.profileGirl` (onboarding) / `THEME_COLORS.profileGirl` (EditProfileModal)
- Boy selected → `THEME_COLORS.profileBoy` (onboarding) / `THEME_COLORS.profileBoy` (EditProfileModal)

**TestIDs for assertions:**
- `onboarding-sex-girl-check` / `onboarding-sex-boy-check`
- `edit-profile-sex-girl-check` / `edit-profile-sex-boy-check`

---

### B. Font Size Increases

All increases are 30%, rounded to the nearest integer.

| Element | File | Style key | Current | Target | Notes |
|---------|------|-----------|---------|--------|-------|
| Preview date (onboarding) | `app/onboarding.tsx` | `previewDate` (L258) | 13 | 17 | `fontSize: 17` |
| Greeting text (home) | `app/(tabs)/home.tsx` | `profileGreeting` (L294) | 13 | 17 | `fontSize: 17` |
| Age text (home) | `app/(tabs)/home.tsx` | `profileAge` (L293) | 12 | 16 | `fontSize: 16`, keep `fontWeight: '600'` |
| tapHint text (ProfileAvatar) | `src/components/ProfileAvatar.tsx` | `tapHintText` (L137) | 9 | 12 | `fontSize: 12` (9 × 1.3 = 11.7 → 12) |
| "Tap to change photo" (edit profile) | `src/components/EditProfileModal.tsx` | `photoHint` (L216) | 12 | 16 | `fontSize: 16` |

**tapHint scope decision:** The `tapHintText` style in `ProfileAvatar.tsx` (line 137) is used by all `ProfileAvatar` instances that pass a `tapHint` prop: onboarding, home, and EditProfileModal. Since all three display the same kind of hint ("tap to add photo"), applying the increase globally (changing the base style from 9 to 12) is the cleanest approach and affects all three consistently. This avoids adding a `tapHintStyle` prop for a single use case.

---

### C. Variant Icon Replacement

**Decision:** Keep the same chat-bubble shape but remove the three dots (ellipsis) inside. Ionicons provides dot-free variants of the same icon: `chatbubble` (filled) and `chatbubble-outline` (outline).

**Current state — two icon families are used for variants:**

| Icon name | Has dots? | Used in |
|-----------|-----------|---------|
| `chatbubble-ellipses` | **Yes** (three dots) | Tab bar (`_layout.tsx:38`) |
| `chatbubble-ellipses-outline` | **Yes** (three dots) | ProfileAvatar badge (`ProfileAvatar.tsx:101`), EditAssetModal link picker (`EditAssetModal.tsx:339`), KeepsakeCard decoration (`KeepsakeCard.tsx:76`) |
| `chatbubbles-outline` | **No** | Variant screen title (`variants.tsx:120`), variant empty state (`variants.tsx:167`), home stat card (`home.tsx:171`), progress stat card (`progress.tsx:58`) |

**Only the `-ellipses` family (4 locations) needs updating.** The `chatbubbles-outline` references are already dot-free and stay unchanged.

**Files to update:**

| # | File | Line(s) | Current icon | New icon |
|---|------|---------|-------------|----------|
| 1 | `app/(tabs)/_layout.tsx` | 38 | `chatbubble-ellipses` | `chatbubble` |
| 2 | `src/components/ProfileAvatar.tsx` | 101 | `chatbubble-ellipses-outline` | `chatbubble-outline` |
| 3 | `src/components/EditAssetModal.tsx` | 339 | `chatbubble-ellipses-outline` | `chatbubble-outline` |
| 4 | `src/components/keepsake/KeepsakeCard.tsx` | 76 | `chatbubble-ellipses-outline` | `chatbubble-outline` |

**No change needed (already dot-free):**

| # | File | Line(s) | Icon (unchanged) |
|---|------|---------|-----------------|
| 5 | `app/(tabs)/variants.tsx` | 120, 167 | `chatbubbles-outline` |
| 6 | `app/(tabs)/home.tsx` | 171 | `chatbubbles-outline` |
| 7 | `app/(tabs)/progress.tsx` | 58 | `chatbubbles-outline` |

**Documentation updates:**
- `.agents/standards/design-system.md` line 188 — update "Variants tab" row from `chatbubble-ellipses` to `chatbubble`

---

### D. Affected Components Summary

| Component | Responsibility | File(s) | Changes |
|-----------|---------------|---------|---------|
| Onboarding screen | First-run profile setup | `app/onboarding.tsx` | Add sex checkmark (A), increase preview date font (B) |
| Home screen | Dashboard | `app/(tabs)/home.tsx` | Increase greeting + age fonts (B) |
| ProfileAvatar | Reusable avatar | `src/components/ProfileAvatar.tsx` | Increase tapHint font (B), remove dots from badge icon (C) |
| EditProfileModal | Edit child profile | `src/components/EditProfileModal.tsx` | Add sex checkmark (A), increase photo hint font (B) |
| Tab layout | Tab navigator | `app/(tabs)/_layout.tsx` | Remove dots from variant tab icon (C) |
| EditAssetModal | Asset rename/relink | `src/components/EditAssetModal.tsx` | Remove dots from variant link icon (C) |
| KeepsakeCard | Keepsake image | `src/components/keepsake/KeepsakeCard.tsx` | Remove dots from decorative icon (C) |

**Total production files:** 7 (down from 9 — `variants.tsx`, `home.tsx` stat icon, and `progress.tsx` already use dot-free `chatbubbles-outline`)
**Total test files requiring updates:** New tests for checkmark rendering (no icon assertion changes needed — `variants.test.tsx` already asserts `chatbubbles-outline` which is unchanged)

---

### Before / After Summary

| Element | Before | After |
|---------|--------|-------|
| Sex selector (onboarding) | Color highlight only | Color highlight + ✓ checkmark |
| Sex selector (edit profile) | Color highlight only | Color highlight + ✓ checkmark |
| Preview date (onboarding) | 13px | 17px |
| Greeting (home) | 13px | 17px |
| Age display (home) | 12px/600 | 16px/600 |
| tapHint (ProfileAvatar) | 9px | 12px |
| "Tap to change photo" (edit profile) | 12px | 16px |
| Variant tab icon | `chatbubble-ellipses` (with dots) | `chatbubble` (no dots) |
| Variant badges/pickers | `chatbubble-ellipses-outline` (with dots) | `chatbubble-outline` (no dots) |

---

### Design Tokens Changed

| Token/Style | File | Property | Old | New |
|-------------|------|----------|-----|-----|
| `previewDate` | `onboarding.tsx` | `fontSize` | 13 | 17 |
| `profileGreeting` | `home.tsx` | `fontSize` | 13 | 17 |
| `profileAge` | `home.tsx` | `fontSize` | 12 | 16 |
| `tapHintText` | `ProfileAvatar.tsx` | `fontSize` | 9 | 12 |
| `photoHint` | `EditProfileModal.tsx` | `fontSize` | 12 | 16 |
| (new) `sexCheck` | `onboarding.tsx` | `fontSize: 13, fontWeight: '900'` | — | added |
| (new) `sexCheck` | `EditProfileModal.tsx` | `fontSize: 13, fontWeight: '900'` | — | added |

---

### Accessibility Considerations

- Font size increases improve readability for all users
- Checkmark provides a non-color-only selection indicator, improving accessibility for color-blind users
- All interactive elements already meet 48dp minimum touch targets — no changes needed
- Icon change has no accessibility impact (all icons have semantic context from labels)

### Platform-Specific Notes

- All changes are style-level and cross-platform compatible
- Android is the primary target — no platform-specific guards needed
- `fontWeight: '900'` renders correctly on both platforms for the checkmark

---

## Alternatives Considered

**Shared sex-selector component:** Both `onboarding.tsx` and `EditProfileModal.tsx` have nearly identical sex buttons. Extracting a `SexSelector` component was considered but rejected — the duplication is only ~8 lines per file and the two contexts differ slightly (onboarding uses module-level `THEME_COLORS`, edit profile uses `THEME_COLORS` from import). The overhead of a new component outweighs the benefit for a 3-line checkmark addition.

**tapHintStyle prop on ProfileAvatar:** Considered adding a `tapHintStyle` prop to scope the font increase to home only. Rejected because all three callers (onboarding, home, edit profile) show the same hint for the same purpose — increasing globally is simpler and consistent.

**Ionicons checkmark (`checkmark` icon) vs text `✓`:** The language selector uses a text character `✓` (not an Ionicons icon). For visual consistency, the sex selector checkmark should use the same text character pattern.

---

## Open Questions

- [x] ~~**Replacement variant icon name**~~ — Resolved: keep the same bubble shape, just drop the dots. `chatbubble-ellipses` → `chatbubble`, `chatbubble-ellipses-outline` → `chatbubble-outline`. The `chatbubbles-outline` references are already dot-free and unchanged.
- [x] ~~tapHint scope~~ — Resolved: apply globally in `ProfileAvatar.tsx` (all callers benefit equally).
- [x] ~~Font rounding~~ — Resolved: round to nearest integer (13→17, 12→16, 9→12).

**All open questions resolved. Plan is ready for implementation.**

---

## Acceptance Criteria

- [ ] Selected sex button shows a `✓` checkmark in `onboarding.tsx`; unselected does not
- [ ] Selected sex button shows a `✓` checkmark in `EditProfileModal.tsx`; unselected does not
- [ ] Onboarding preview date font is 17px
- [ ] Home greeting font is 17px
- [ ] Home age display font is 16px with weight 600
- [ ] ProfileAvatar tapHint font is 12px (all instances)
- [ ] EditProfileModal "Tap to change photo" font is 16px
- [ ] All `chatbubble-ellipses` references replaced with `chatbubble`; all `chatbubble-ellipses-outline` replaced with `chatbubble-outline`
- [ ] `chatbubbles-outline` references remain unchanged (already dot-free)
- [ ] `.agents/standards/design-system.md` icon table updated (`chatbubble-ellipses` → `chatbubble`)
- [ ] New tests verify checkmark rendering (visible on selected, absent on unselected) in both screens
- [ ] `npm run ci` passes (lint + typecheck + tests + semgrep)
- [ ] Coverage ≥99% lines, ≥95% branches/funcs/stmts on changed files
