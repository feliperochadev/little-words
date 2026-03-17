import { COLORS, CATEGORY_COLORS, CATEGORY_EMOJIS, FONTS } from '../../src/utils/theme';
import { theme } from '../../src/theme';
import { blossomColors } from '../../src/theme/variants/blossom';
import { honeyColors } from '../../src/theme/variants/honey';
import { breezeColors } from '../../src/theme/variants/breeze';
import { buildElevation } from '../../src/theme/tokens/elevation';
import { spacing } from '../../src/theme/tokens/spacing';
import { shape } from '../../src/theme/tokens/shape';
import { typography } from '../../src/theme/tokens/typography';
import { getThemeForSex } from '../../src/theme/getThemeForSex';

describe('theme', () => {
  describe('COLORS bridge (src/utils/theme)', () => {
    it('has all required brand colors', () => {
      expect(COLORS.primary).toBeDefined();
      expect(COLORS.primaryLight).toBeDefined();
      expect(COLORS.primaryDark).toBeDefined();
      expect(COLORS.secondary).toBeDefined();
      expect(COLORS.accent).toBeDefined();
    });

    it('has all semantic colors', () => {
      expect(COLORS.success).toBeDefined();
      expect(COLORS.error).toBeDefined();
      expect(COLORS.warning).toBeDefined();
    });

    it('has legacy alias surface colors', () => {
      expect(COLORS.surface).toBe('#FFFFFF');
      expect(COLORS.cardBackground).toBe('#FFFFFF');
      expect(COLORS.white).toBe('#FFFFFF');
      expect(COLORS.border).toBeDefined();
    });

    it('has all text colors including legacy aliases', () => {
      expect(COLORS.text).toBeDefined();
      expect(COLORS.textSecondary).toBeDefined();
      expect(COLORS.textMuted).toBeDefined();
      expect(COLORS.textLight).toBeDefined();
    });

    it('brand hex colors are valid hex strings', () => {
      const hexRegex = /^#[0-9A-Fa-f]{6}$/;
      const hexOnlyKeys = [
        'primary', 'primaryLight', 'primaryDark', 'secondary', 'accent',
        'success', 'error', 'warning', 'info',
        'background', 'surface', 'border',
        'text', 'textSecondary', 'textMuted',
      ] as const;
      hexOnlyKeys.forEach(key => {
        expect(COLORS[key]).toMatch(hexRegex);
      });
    });
  });

  describe('CATEGORY_COLORS', () => {
    it('has 12 colors', () => {
      expect(CATEGORY_COLORS).toHaveLength(12);
    });

    it('all values are valid hex colors', () => {
      CATEGORY_COLORS.forEach(color => {
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });
  });

  describe('CATEGORY_EMOJIS', () => {
    it('has 16 emojis', () => {
      expect(CATEGORY_EMOJIS).toHaveLength(16);
    });

    it('all values are non-empty strings', () => {
      CATEGORY_EMOJIS.forEach(emoji => {
        expect(typeof emoji).toBe('string');
        expect(emoji.length).toBeGreaterThan(0);
      });
    });
  });

  describe('FONTS', () => {
    it('has regular, medium, and bold', () => {
      expect(FONTS.regular).toBe('System');
      expect(FONTS.medium).toBe('System');
      expect(FONTS.bold).toBe('System');
    });
  });

  describe('design system theme object', () => {
    it('has all required top-level keys', () => {
      expect(theme).toHaveProperty('colors');
      expect(theme).toHaveProperty('typography');
      expect(theme).toHaveProperty('spacing');
      expect(theme).toHaveProperty('shape');
      expect(theme).toHaveProperty('elevation');
      expect(theme).toHaveProperty('motion');
    });

    const COLOR_KEYS = [
      'primary', 'primaryLight', 'primaryDark', 'secondary', 'accent',
      'profileGirl', 'profileGirlBg', 'profileBoy', 'profileBoyBg',
      'success', 'error', 'warning', 'info',
      'background', 'surface', 'surfaceHover', 'border', 'borderFocus', 'backdrop',
      'text', 'textSecondary', 'textMuted', 'textOnPrimary', 'textOnError',
    ];

    it('blossomColors has all required keys', () => {
      for (const key of COLOR_KEYS) {
        expect(blossomColors).toHaveProperty(key);
        expect(typeof blossomColors[key as keyof typeof blossomColors]).toBe('string');
      }
    });

    it('honeyColors has all required keys', () => {
      for (const key of COLOR_KEYS) {
        expect(honeyColors).toHaveProperty(key);
        expect(typeof honeyColors[key as keyof typeof honeyColors]).toBe('string');
      }
    });

    it('breezeColors has all required keys', () => {
      for (const key of COLOR_KEYS) {
        expect(breezeColors).toHaveProperty(key);
        expect(typeof breezeColors[key as keyof typeof breezeColors]).toBe('string');
      }
    });

    it('blossom, honey, and breeze have different primary colors', () => {
      expect(blossomColors.primary).not.toBe(honeyColors.primary);
      expect(blossomColors.primary).not.toBe(breezeColors.primary);
      expect(honeyColors.primary).not.toBe(breezeColors.primary);
    });

    it('spacing values are all numbers', () => {
      for (const value of Object.values(spacing)) {
        expect(typeof value).toBe('number');
      }
    });

    it('shape values are all numbers', () => {
      for (const value of Object.values(shape)) {
        expect(typeof value).toBe('number');
      }
    });

    it('typography fontSize values are numbers in ascending order', () => {
      const sizes = typography.fontSize;
      expect(sizes.xs).toBeLessThan(sizes.sm);
      expect(sizes.sm).toBeLessThan(sizes.md);
      expect(sizes.md).toBeLessThan(sizes.lg);
      expect(sizes.lg).toBeLessThan(sizes.xl);
      expect(sizes.xl).toBeLessThan(sizes['2xl']);
      expect(sizes['2xl']).toBeLessThan(sizes['3xl']);
      expect(sizes['3xl']).toBeLessThan(sizes['4xl']);
    });

    it('buildElevation returns correct structure', () => {
      const elev = buildElevation('#000', '#D2864B');
      expect(elev.none.elevation).toBe(0);
      expect(elev.sm.shadowOpacity).toBe(0.06);
      expect(elev.md.shadowOpacity).toBe(0.08);
      expect(elev.lg.shadowColor).toBe('#D2864B');
      expect(elev.lg.elevation).toBe(6);
    });
  });

  describe('getThemeForSex', () => {
    it('returns blossom variant for girl', () => {
      const t = getThemeForSex('girl');
      expect(t.colors.primary).toBe(blossomColors.primary);
    });

    it('returns breeze variant for boy', () => {
      const t = getThemeForSex('boy');
      expect(t.colors.primary).toBe(breezeColors.primary);
    });

    it('returns blossom variant for null', () => {
      const t = getThemeForSex(null);
      expect(t.colors.primary).toBe(blossomColors.primary);
    });

    it('returns blossom variant for undefined', () => {
      const t = getThemeForSex(undefined);
      expect(t.colors.primary).toBe(blossomColors.primary);
    });

    it('returns a theme with all required keys', () => {
      const t = getThemeForSex('boy');
      expect(t).toHaveProperty('colors');
      expect(t).toHaveProperty('typography');
      expect(t).toHaveProperty('spacing');
      expect(t).toHaveProperty('shape');
      expect(t).toHaveProperty('elevation');
      expect(t).toHaveProperty('motion');
    });
  });
});
