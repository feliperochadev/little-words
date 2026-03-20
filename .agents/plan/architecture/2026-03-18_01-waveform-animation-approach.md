# ADR: Waveform Animation Approach for Audio Recording

**Date:** 2026-03-18
**Status:** Proposed
**Deciders:** team

---

## Context

The media capture feature requires a waveform visualization during audio recording — animated bars that respond to microphone amplitude in real-time. The original spec calls for `react-native-reanimated` to drive this animation.

However, `react-native-reanimated` is **not currently installed** in the project. The codebase uses React Native's built-in `Animated` API for all existing animations (modal slide/fade in `useModalAnimation`, etc.). Adding reanimated introduces a new native dependency with its own Babel plugin, build-time cost, and a distinct animation paradigm.

## Decision Drivers

- **Performance**: Waveform bars update every ~100–200ms during recording. Smooth animation matters but this is not 60fps continuous motion.
- **Dependency footprint**: Expo SDK 55 includes reanimated compatibility, but the project hasn't needed it so far. Adding it for a single animation surface is a cost.
- **Consistency**: All existing animations use RN `Animated`. Mixing two animation systems increases cognitive overhead.
- **Future use**: The swipe-to-discard gesture on the FAB could also benefit from reanimated's gesture integration, and future features (e.g., playback scrubber) might leverage it.
- **Build complexity**: Reanimated requires a Babel plugin (`react-native-reanimated/plugin`) that must be last in the Babel config. EAS builds must be updated.

## Considered Options

1. **Option A** — Use RN built-in `Animated` API for the waveform
2. **Option B** — Add `react-native-reanimated` for the waveform and FAB gestures
3. **Option C** — Use a simple non-animated approach (discrete height changes with `setState`)

## Decision

**Chosen option: Option A — RN built-in `Animated` API**, because:

- The waveform updates at ~5–10 Hz (amplitude polling interval), not 60fps continuous animation. `Animated.timing` or `Animated.spring` with `useNativeDriver: true` on `transform: [{ scaleY }]` is sufficient for smooth bar height changes.
- Adding reanimated solely for this use case introduces disproportionate complexity (Babel plugin, native rebuild, learning curve for a second animation API).
- The swipe-to-discard gesture can use RN's `PanResponder` (already used in `useModalAnimation` for modal dismiss), keeping gesture handling consistent.
- If a future feature (e.g., audio scrubber, complex FAB spring physics) genuinely needs reanimated, it can be introduced at that time with a clear justification.

### Pros
- Zero new dependencies.
- Consistent with existing animation patterns in the codebase.
- No Babel plugin changes or native rebuild required.
- Simpler mental model for contributors.

### Cons
- `useNativeDriver` cannot animate `height` or `width` directly — must use `scaleY` transforms on pre-sized bars, which adds a minor layout constraint.
- If future features accumulate enough reasons for reanimated, a migration from `Animated` may be needed.

## Consequences

### Positive
- No new build-time or runtime dependency.
- Waveform component can be implemented immediately without native rebuild.
- Animation code follows the same patterns as the rest of the codebase.

### Negative / Risks
- If the waveform feels janky on low-end Android devices due to JS-thread animation, we may need to revisit this decision. Mitigation: use `useNativeDriver: true` with `scaleY` transforms and keep the bar count reasonable (8–12 bars).

## Links

- Related design: `.agents/plan/design/2026-03-18_02-media-capture-and-linking.md`
- Existing animation hook: `src/hooks/useModalAnimation.ts`
- expo-av recording docs: https://docs.expo.dev/versions/latest/sdk/av/
