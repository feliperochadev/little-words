import { DEFAULT_VARIANT, GIRL_VARIANT, BOY_VARIANT, type ThemeVariant } from './config';
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

function resolveVariant(sex: 'girl' | 'boy' | null | undefined): ThemeVariant {
  if (sex === 'girl') return GIRL_VARIANT;
  if (sex === 'boy') return BOY_VARIANT;
  return DEFAULT_VARIANT;
}

export function getThemeForSex(sex: 'girl' | 'boy' | null | undefined): Theme {
  const variant = resolveVariant(sex);
  const themeColors = colorMap[variant];
  return {
    colors: themeColors,
    typography,
    spacing,
    shape,
    elevation: buildElevation(themeColors.text, themeColors.primary),
    motion,
  };
}
