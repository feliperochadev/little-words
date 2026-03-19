---
name: 2026-03-19_01-media-fab-linking-modal-ux-fixes
plan: .agents/plan/prompts/2026-03-19_01-media-fab-linking-modal-ux-fixes.md
status: done
started: 2026-03-19
agent: claude
worktree: false
---

## Summary

Delivered 6 UX fixes to MediaFAB and MediaLinkingModal: camera button repositioned left of mic, pause/resume recording via FAB icon cycle, trash+stop controls in waveform pill, backdrop dismiss for expanded overlay, animated waveform in audio preview, and full-screen photo tap-to-expand.

## Changes

| File | Action | Notes |
|------|--------|-------|
| `src/hooks/useAudioRecording.ts` | modified | Added `'paused'` state, `pauseRecording()`, `resumeRecording()`, paused-time exclusion from duration |
| `src/components/MediaFAB.tsx` | modified | Camera button (42dp) left of mic, pause/play FAB icons, waveform pill with trash+stop, backdrop dismiss, fragment return |
| `src/components/MediaLinkingModal.tsx` | modified | Animated waveform during audio playback, full-screen photo modal with swipe-down dismiss, animation cleanup on unmount |
| `jest.setup.js` | modified | Added `pauseAsync` mock to `mockRecording`; set TQ `notifyManager` to synchronous scheduler to prevent post-teardown timer leaks |
| `jest.config.js` | modified | Reduced `maxWorkers` from 2 to 1 to prevent OOM worker crashes |
| `__tests__/unit/useAudioRecording.test.ts` | modified | Tests for `pauseRecording`, `resumeRecording`, paused-time exclusion |
| `__tests__/integration/MediaFAB.test.tsx` | modified | Updated for new layout (camera btn, backdrop, waveform-bars testID, pause/resume flows) |
| `__tests__/integration/MediaLinkingModal.test.tsx` | modified | Tests for waveform in audio preview, full-screen photo expand/dismiss |
