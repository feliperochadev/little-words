import { DEFAULT_VARIANT, type ThemeVariant } from './config';
import { blossomColors } from './variants/blossom';
import { honeyColors } from './variants/honey';
import { breezeColors } from './variants/breeze';
import { typography } from './tokens/typography';
import { spacing } from './tokens/spacing';
import { shape } from './tokens/shape';
import { buildElevation } from './tokens/elevation';
import { motion } from './tokens/motion';
import type { Theme, ColorTokens } from './types';

const colorMap: Record<ThemeVariant, ColorTokens> = {
  blossom: blossomColors,
  honey: honeyColors,
  breeze: breezeColors,
};

const activeVariant = DEFAULT_VARIANT;
const activeColors = colorMap[activeVariant];

export const theme: Theme = {
  colors: activeColors,
  typography,
  spacing,
  shape,
  elevation: buildElevation(activeColors.text, activeColors.primary),
  motion,
};

export const colors = theme.colors;
export const { fontSize, fontWeight, lineHeight, letterSpacing } = theme.typography;
export const space = theme.spacing;
export const radii = theme.shape;
export const shadow = theme.elevation;

export type { Theme, ColorTokens } from './types';
export type { ThemeVariant } from './config';
