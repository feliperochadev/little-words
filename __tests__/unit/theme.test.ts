import { theme } from '../../src/theme';
import { colors } from '../../src/theme';
import { CATEGORY_COLORS, CATEGORY_EMOJIS } from '../../src/theme/category';
import { layout } from '../../src/theme/layout';
import { blossomColors } from '../../src/theme/variants/blossom';
import { honeyColors } from '../../src/theme/variants/honey';
import { breezeColors } from '../../src/theme/variants/breeze';
import { buildElevation } from '../../src/theme/tokens/elevation';
import { spacing } from '../../src/theme/tokens/spacing';
import { shape } from '../../src/theme/tokens/shape';
import { typography } from '../../src/theme/tokens/typography';
import { getThemeForSex } from '../../src/theme/getThemeForSex';

describe('theme', () => {
  describe('colors tokens', () => {
    it('has all required brand colors', () => {
      expect(colors.primary).toBeDefined();
      expect(colors.primaryLight).toBeDefined();
      expect(colors.primaryDark).toBeDefined();
      expect(colors.secondary).toBeDefined();
      expect(colors.accent).toBeDefined();
    });

    it('has all semantic colors', () => {
      expect(colors.success).toBeDefined();
      expect(colors.error).toBeDefined();
      expect(colors.warning).toBeDefined();
    });

    it('has surface colors', () => {
      expect(colors.surface).toBe('#FFFFFF');
      expect(colors.border).toBeDefined();
    });

    it('has all text colors', () => {
      expect(colors.text).toBeDefined();
      expect(colors.textSecondary).toBeDefined();
      expect(colors.textMuted).toBeDefined();
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
        expect(colors[key]).toMatch(hexRegex);
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

  describe('layout constants', () => {
    it('exposes shared layout constants', () => {
      expect(layout.textAreaHeight).toBe(80);
      expect(layout.highlightBorderRadius).toBe(10);
      expect(layout.statIconSize).toBe(44);
      expect(layout.statIconRadius).toBe(22);
      expect(layout.emptyStateVerticalPadding).toBe(60);
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
