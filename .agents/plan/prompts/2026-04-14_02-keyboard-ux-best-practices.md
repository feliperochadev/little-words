# Prompt — 2026-04-14_02-keyboard-ux-best-practices

## Original Prompt
Implement keyboard UX best practices for React Native 0.83 / Expo 55 to prevent the keyboard from covering text fields in modals and other screens. Key practices include:

1. **Global Platform Config:** Set `softwareKeyboardLayoutMode: "resize"` and `edgeToEdgeEnabled: true` in `app.json` Android section. Set `android:windowTranslucentStatus` to `false` in native styles.
2. **react-native-keyboard-controller:** Install and use `KeyboardProvider`, `KeyboardAwareScrollView`, and `KeyboardToolbar` for frame-perfect keyboard animations.
3. **Safe Area fix:** Replace `SafeAreaView` with `useSafeAreaInsets` hook in input-bearing layouts to prevent double-padding when keyboard opens.
4. **Dismiss-on-tap:** Wrap screens in `TouchableWithoutFeedback` calling `Keyboard.dismiss()`.
5. **Interactive scroll:** `keyboardDismissMode="interactive"` on iOS.
6. **Semantic inputs:** Set `returnKeyType`, `keyboardType`, `textContentType` correctly on all TextInputs.
7. **Multiline alignment:** `textAlignVertical="top"` on Android multiline inputs.

## Refined Prompt

### 1 — What (Objective)
Add professional-grade keyboard handling across the entire app so that:
- TextInputs in modals and screens are never obscured by the keyboard
- Submit buttons remain visible while typing
- Keyboard dismissal follows platform conventions (tap-away, interactive scroll)
- Input props guide the OS to show correct keyboard type

### 2 — Why (Context & Constraints)
- Currently **zero keyboard avoidance** in any modal or screen — keyboard covers bottom inputs and action buttons
- Expo SDK 55 / RN 0.83 with edge-to-edge display means Android needs explicit `softwareKeyboardLayoutMode: "resize"`
- 7 bottom-sheet modals and 1 full-screen form (onboarding) are affected
- Primary target is Android (APK distribution)

### 3 — How (Approach & Boundaries)
- Install `react-native-keyboard-controller` as the primary solution
- Wrap app root in `KeyboardProvider`
- Replace `ScrollView` inside modals with `KeyboardAwareScrollView`
- Configure `app.json` and `styles.xml` for edge-to-edge + resize mode
- Add dismiss-on-tap and platform-specific dismiss modes
- Add semantic TextInput props throughout
- Address SafeAreaView double-padding risk in input layouts

### 4 — Done (Acceptance Criteria)
- All modal TextInputs remain visible when keyboard opens
- Action buttons (Save/Cancel) visible above keyboard in all modals
- Keyboard dismisses on tap outside input
- `app.json` has `softwareKeyboardLayoutMode: "resize"` + `edgeToEdgeEnabled: true`
- `styles.xml` has `android:windowTranslucentStatus` set to `false`
- All TextInputs have appropriate `returnKeyType`
- Tests pass (`npm run ci`)

### 5 — Not (Out of Scope)
- Keyboard toolbar with Next/Previous navigation (nice-to-have, not required in v1)
- iOS-specific optimizations beyond basic `behavior="padding"`
- Rewriting modal animation system (keep existing `useModalAnimation`)
