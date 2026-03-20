// Modal animation constants
// Shared across all modal components to ensure consistent behavior
export const MODAL_ANIMATION = {
  // Slide out animation (close)
  SLIDE_OUT_DISTANCE: 800,
  SLIDE_OUT_DURATION: 250,
  
  // Fade animations
  FADE_OUT_DURATION: 200,
  FADE_IN_DURATION: 300,
  
  // Slide in animation (open) - spring configuration
  SLIDE_IN_FRICTION: 8,
  SLIDE_IN_TENSION: 65,
  
  // Quick swipe close animation
  QUICK_CLOSE_FRICTION: 7,
  
  // Opacity values
  BACKDROP_VISIBLE: 1,
  BACKDROP_HIDDEN: 0,
} as const;

// Waveform animation constants
// Shared by AudioPreviewOverlay, MediaLinkingModal, and the useWaveformAnimation hook
export const WAVEFORM = {
  BAR_COUNT: 20,
  BAR_WIDTH: 3,
  BAR_GAP: 2,
  PLAYBACK_MAX_HEIGHT: 24,
  RECORDING_MAX_HEIGHT: 28,
  MIN_HEIGHT: 3,
} as const;

// Timing constants for UI interactions
export const TIMING = {
  SCROLL_INITIAL_DELAY: 60,
  DRAG_SNAP_DELAY: 80,
  SCROLL_TRANSITION_DELAY: 300,
  DUPLICATE_CHECK_DEBOUNCE: 400,
} as const;
