import { COLORS, CATEGORY_COLORS, CATEGORY_EMOJIS, FONTS } from '../../src/utils/theme';

describe('theme', () => {
  describe('COLORS', () => {
    it('has all required brand colors', () => {
      expect(COLORS.primary).toBe('#D2694B');
      expect(COLORS.primaryLight).toBe('#ED9B76');
      expect(COLORS.primaryDark).toBe('#B8502F');
      expect(COLORS.secondary).toBe('#F4C3B2');
      expect(COLORS.accent).toBe('#ED9B76');
    });

    it('has all semantic colors', () => {
      expect(COLORS.success).toBeDefined();
      expect(COLORS.error).toBeDefined();
      expect(COLORS.warning).toBeDefined();
    });

    it('has all surface colors', () => {
      expect(COLORS.background).toBe('#FAF4EC');
      expect(COLORS.cardBackground).toBe('#FFFFFF');
      expect(COLORS.border).toBeDefined();
      expect(COLORS.white).toBe('#FFFFFF');
    });

    it('has all text colors', () => {
      expect(COLORS.text).toBeDefined();
      expect(COLORS.textSecondary).toBeDefined();
      expect(COLORS.textLight).toBeDefined();
    });

    it('all color values are valid hex strings', () => {
      const hexRegex = /^#[0-9A-Fa-f]{6}$/;
      Object.values(COLORS).forEach(color => {
        expect(color).toMatch(hexRegex);
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
});
