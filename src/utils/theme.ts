/**
 * Migration bridge — re-exports from src/theme.
 * @deprecated Import from '@/theme' instead.
 * This file will be removed after Phase 4 migration is complete.
 */
import { colors } from '../theme';

/**
 * @deprecated Import colors from '../theme' instead.
 * Legacy aliases (white, cardBackground, textLight) are kept for backward
 * compatibility and will be removed after all screens are migrated.
 */
export const COLORS = {
  ...colors,
  // Legacy aliases removed from the new token system
  white:           colors.surface,
  cardBackground:  colors.surface,
  textLight:       colors.textMuted,
};

export const CATEGORY_COLORS = [
  '#D2694B',
  '#ED9B76',
  '#F4C3B2',
  '#B8502F',
  '#6DBF8A',
  '#F0B96B',
  '#7AB3C8',
  '#A08FB2',
  '#C8A87A',
  '#E87C6A',
  '#8BAD7A',
  '#7A4F3E',
];

export const CATEGORY_EMOJIS = [
  '🐾', '🍎', '👨‍👩‍👧', '🧸', '🏃', '🌿', '👶', '✨',
  '🎨', '🚗', '🎵', '⭐', '🌈', '🏠', '📚', '❤️',
];

export const FONTS = {
  regular: 'System',
  medium:  'System',
  bold:    'System',
};

export const LAYOUT = {
  TEXTAREA_HEIGHT: 80,
  HIGHLIGHT_BORDER_RADIUS: 10,
  STAT_ICON_SIZE: 44,
  STAT_ICON_RADIUS: 22,
  EMPTY_STATE_VERTICAL_PADDING: 60,
} as const;
