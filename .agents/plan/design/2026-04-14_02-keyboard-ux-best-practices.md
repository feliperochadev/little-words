# Design: Keyboard UX Best Practices

**Date:** 2026-04-14
**Status:** Implemented
**Author:** Claude
**Related ADR:** N/A

---

## Problem Statement

The keyboard covers TextInputs and action buttons in all 7 bottom-sheet modals and the onboarding screen. Users cannot see what they're typing when focused on inputs near the bottom of a modal (notes, variant inputs, word search). Submit buttons become completely hidden. There is no way to dismiss the keyboard by tapping outside.

## Goals

- All TextInputs remain visible when the keyboard opens
- Action buttons (Save/Cancel) stay above the keyboard
- Users can dismiss the keyboard by tapping empty space
- Platform-appropriate keyboard behavior (resize on Android, padding on iOS)
- Semantic input props guide the OS to show correct keyboard types

## Non-Goals

- Keyboard toolbar with Next/Previous/Done navigation (can be added later)
- iOS-specific edge-to-edge configuration (iOS untested, Android is primary)
- Rewriting the modal animation system (`useModalAnimation` stays)
- Changing the `BottomSheet` component for non-input use cases

## Design

### Overview

Three-layer approach:

1. **Global config** — `app.json` + `styles.xml` + `KeyboardProvider` at app root
2. **Modal-level** — Replace `ScrollView` with `KeyboardAwareScrollView` in every modal containing TextInputs
3. **Input-level** — Semantic props on all TextInputs + dismiss-on-tap wrapper

### Component / Module Breakdown

| Component | Change | File(s) |
|-----------|--------|---------|
| App config | Add `edgeToEdgeEnabled`, `softwareKeyboardLayoutMode` | `app.json` |
| Android styles | Add `windowTranslucentStatus: false` | `android/app/src/main/res/values/styles.xml` |
| Root layout | Wrap with `KeyboardProvider` | `app/_layout.tsx` |
| AddWordModal | `ScrollView` → `KeyboardAwareScrollView` | `src/components/AddWordModal.tsx` |
| AddVariantModal | `ScrollView` → `KeyboardAwareScrollView` | `src/components/AddVariantModal.tsx` |
| AddCategoryModal | `ScrollView` → `KeyboardAwareScrollView` | `src/components/AddCategoryModal.tsx` |
| EditProfileModal | `ScrollView` → `KeyboardAwareScrollView` | `src/components/EditProfileModal.tsx` |
| EditAssetModal | `ScrollView` → `KeyboardAwareScrollView` | `src/components/EditAssetModal.tsx` |
| MediaLinkingModal | `ScrollView` → `KeyboardAwareScrollView` | `src/components/MediaLinkingModal.tsx` |
| ImportModal | `ScrollView` → `KeyboardAwareScrollView` | `src/components/ImportModal.tsx` |
| BottomSheet | Add keyboard-aware option for scrollable mode | `src/components/BottomSheet.tsx` |
| Onboarding | `ScrollView` → `KeyboardAwareScrollView` + dismiss-on-tap | `app/onboarding.tsx` |
| Input component | Add `returnKeyType` support | `src/components/Input.tsx` |
| NotificationPrimingModal | No TextInputs → no change | — |
| WheelDatePickerModal | No TextInputs → no change | — |
| Jest setup | Add `react-native-keyboard-controller` mock | `jest.setup.js` |

### Detailed Changes

#### 1. Global Configuration

**`app.json`** — Add to `expo.android`:
```json
{
  "edgeToEdgeEnabled": true,
  "softwareKeyboardLayoutMode": "resize"
}
```

**`android/app/src/main/res/values/styles.xml`** — Add to AppTheme:
```xml
<item name="android:windowTranslucentStatus">false</item>
```

**`app/_layout.tsx`** — Wrap content with `KeyboardProvider`:
```tsx
import { KeyboardProvider } from 'react-native-keyboard-controller';

// Inside RootLayout return:
<KeyboardProvider>
  <QueryClientProvider client={queryClient}>
    ...
  </QueryClientProvider>
</KeyboardProvider>
```

#### 2. Modal-Level Changes

For each modal with TextInputs, replace:
```tsx
import { ScrollView } from 'react-native';
// ...
<ScrollView keyboardShouldPersistTaps="handled">
```

With:
```tsx
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
// ...
<KeyboardAwareScrollView
  bottomOffset={insets.bottom + 24}
  keyboardShouldPersistTaps="handled"
>
```

**Why `bottomOffset`?** Modals have bottom padding for safe area insets + spacing. The offset tells the scroll view how much extra space exists below the input so it can scroll precisely.

**Affected modals (7):**
1. `AddWordModal` — ScrollView at line 278 → 3 TextInputs (word, variant, notes)
2. `AddVariantModal` — ScrollView at line 142 → 3 TextInputs (word search, variant, notes)
3. `AddCategoryModal` — ScrollView at line 182 → 1 TextInput (name)
4. `EditProfileModal` — ScrollView at line 103 → 1 TextInput (name)
5. `EditAssetModal` — ScrollView at line 206 → 3 TextInputs (name, word search, variant search)
6. `MediaLinkingModal` — ScrollView at line 188 → 2 TextInputs (search, word name)
7. `ImportModal` — ScrollView at line 414 → 1 TextInput (text import)

**BottomSheet.tsx** — When `scrollable` is true and content has inputs, use `KeyboardAwareScrollView`. Add optional `keyboardAware?: boolean` prop:
```tsx
{scrollable ? (
  keyboardAware ? (
    <KeyboardAwareScrollView ...>{children}</KeyboardAwareScrollView>
  ) : (
    <ScrollView ...>{children}</ScrollView>
  )
) : (
  <View ...>{children}</View>
)}
```

#### 3. Onboarding Screen

Replace ScrollView with `KeyboardAwareScrollView`. Add `TouchableWithoutFeedback` wrapper around non-input areas for dismiss-on-tap:
```tsx
import { Keyboard, TouchableWithoutFeedback } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
```

Note: Onboarding uses `SafeAreaView` which is fine since it's a full screen, not a modal. Double-padding risk only applies when `SafeAreaView` + `KeyboardAvoidingView` are combined — `KeyboardAwareScrollView` handles this internally.

#### 4. Dismiss-on-Tap

For modals: the backdrop `TouchableOpacity` already calls `dismissModal` which closes the modal. When keyboard is open, touching the backdrop should dismiss the keyboard first. Add `Keyboard.dismiss()` at the top of dismiss handlers.

For screens with inputs (onboarding), wrap content in `TouchableWithoutFeedback` with `Keyboard.dismiss()`.

#### 5. Semantic Input Props

Add `returnKeyType` to all TextInputs:

| Modal | Input | `returnKeyType` | Notes |
|-------|-------|-----------------|-------|
| AddWordModal | word | `next` | More fields follow |
| AddWordModal | variant | `next` | More fields follow |
| AddWordModal | notes | `done` | Last field |
| AddVariantModal | word search | `search` | Filters list |
| AddVariantModal | variant | `next` | More fields follow |
| AddVariantModal | notes | `done` | Last field |
| AddCategoryModal | name | `done` | Only field |
| EditProfileModal | name | `done` | Only text field |
| EditAssetModal | name | `done` | Only text field |
| EditAssetModal | word search | `search` | Filters list |
| EditAssetModal | variant search | `search` | Filters list |
| MediaLinkingModal | search | `search` | Filters list |
| ImportModal | text input | `default` | Multiline |
| Onboarding | name | `done` | Only text field |
| Input.tsx | — | Accept as prop | Forward to TextInput |

Multiline inputs: `textAlignVertical="top"` already set (confirmed in `AddWordModal`, `AddVariantModal`, `ImportModal`, `Input.tsx`).

### Data Flow

```
User taps TextInput
→ OS keyboard appears
→ KeyboardProvider detects keyboard height + animation
→ KeyboardAwareScrollView auto-scrolls focused input into view
→ Modal content shifts up, action buttons remain visible
→ User taps backdrop or empty area → Keyboard.dismiss()
```

### UI / UX Decisions

- **No visual change** — behavior-only improvement. Modals look identical, just scroll correctly.
- **Consistent bottom offset** — All modals use `insets.bottom + 24` (matching existing `paddingBottom: 24 + insets.bottom` pattern).
- **Backdrop dismiss** — Tapping backdrop dismisses keyboard first; second tap closes modal. This is standard platform behavior.

### Error Handling

- If `react-native-keyboard-controller` fails to initialize, `KeyboardAwareScrollView` falls back to standard `ScrollView` behavior (same as current state — no regression).
- Edge case: very small screens where modal maxHeight (92%) minus keyboard leaves < 100px. `KeyboardAwareScrollView` handles this by allowing natural scrolling.

## Alternatives Considered

1. **Built-in `KeyboardAvoidingView`** — Rejected. Known bugs with edge-to-edge layouts in SDK 55. Requires platform-specific `behavior` prop. Black-space bug on Android. `react-native-keyboard-controller` solves all these.

2. **`react-native-keyboard-aware-scroll-view`** — Rejected. Deprecated/unmaintained. `react-native-keyboard-controller` is the official Expo recommendation.

3. **Manual keyboard height tracking with `Keyboard.addListener`** — Rejected. No animation sync, manual math, platform differences. Over-engineering when a mature library exists.

## Dependency Impact

**New dependency:** `react-native-keyboard-controller`
- Native module — requires rebuild (`npx expo prebuild` or EAS build)
- Well-maintained, recommended by Expo team
- Size impact: minimal (~50KB JS, native code adds keyboard tracking)
- Compatible with Expo SDK 55 and RN 0.83

## Migration Path

1. Install dependency
2. Add `KeyboardProvider` at root
3. Update `app.json` + `styles.xml`
4. Convert modals one-by-one (can be incremental)
5. Add semantic props
6. Add jest mock
7. Run `npm run ci`

Each modal can be converted independently — no cross-modal dependencies.

## Files Changed (Estimated)

| Category | Files | Count |
|----------|-------|-------|
| Config | `app.json`, `styles.xml` | 2 |
| Root | `app/_layout.tsx` | 1 |
| Modals | 7 modal components | 7 |
| Shared | `BottomSheet.tsx`, `Input.tsx` | 2 |
| Screen | `app/onboarding.tsx` | 1 |
| Test infra | `jest.setup.js` | 1 |
| Tests | New/updated tests for keyboard behavior | ~7 |
| **Total** | | **~21** |

## Open Questions

- [ ] Should `BottomSheet.tsx` default to `keyboardAware={true}` when `scrollable` is true, or require explicit opt-in? (Recommendation: explicit opt-in via prop to avoid unexpected behavior for non-input sheets)
- [ ] Should we add `KeyboardToolbar` (Next/Prev/Done) for multi-field modals like `AddWordModal`? (Recommendation: defer to separate enhancement)

## Acceptance Criteria

- [x] `react-native-keyboard-controller` installed and configured
- [x] `app.json` has `edgeToEdgeEnabled: true` + `softwareKeyboardLayoutMode: "resize"` in Android section
- [x] `styles.xml` has `android:windowTranslucentStatus` set to `false`
- [x] `KeyboardProvider` wraps app in `_layout.tsx`
- [x] All 7 modals use `KeyboardAwareScrollView` instead of `ScrollView`
- [x] Onboarding screen uses `KeyboardAwareScrollView`
- [x] `Input.tsx` accepts `returnKeyType` prop
- [x] All TextInputs have appropriate `returnKeyType` set
- [x] Keyboard can be dismissed by tapping outside inputs (`Keyboard.dismiss()` added to all modal backdrops)
- [x] Action buttons (Save/Cancel) remain visible when keyboard is open
- [x] `jest.setup.js` mocks `react-native-keyboard-controller`
- [x] `npm run ci` passes (lint + typecheck + tests + semgrep)
- [x] No visual regressions in modals when keyboard is closed

## Implementation Notes

- `onboarding.tsx`: `scrollRef` type changed from `ScrollView` to `KeyboardAwareScrollViewRef`
- Horizontal `ScrollView`s (category carousel in `AddWordModal`, emoji picker in `AddCategoryModal`) kept as-is — only vertical form scroll replaced
- `BottomSheet` `keyboardAware` prop is opt-in (not default) — no existing callers affected
- `Keyboard.dismiss()` added to all 7 modal backdrop press handlers before the `dismissModal()` call
