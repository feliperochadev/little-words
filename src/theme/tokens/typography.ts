import type { TypographyTokens } from '../types';

export const typography: TypographyTokens = {
  fontSize: {
    xs:    10,
    sm:    12,
    md:    14,
    lg:    16,
    xl:    18,
    '2xl': 20,
    '3xl': 26,
    '4xl': 30,
  },
  fontWeight: {
    regular:  '400',
    medium:   '500',
    semibold: '600',
    bold:     '700',
    heavy:    '800',
    black:    '900',
  },
  lineHeight: {
    tight:   1.2,
    normal:  1.5,
    relaxed: 1.7,
  },
  letterSpacing: {
    tight:  -0.2,
    normal:  0,
    wide:    0.5,
    wider:   1,
  },
};
