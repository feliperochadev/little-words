import {
  DEFAULT_CATEGORIES,
  DEFAULT_CATEGORY_KEY_SET,
  canonicalizeCategoryName,
  categoryLookupKey,
} from '../../src/utils/categoryKeys';

describe('categoryKeys', () => {
  describe('DEFAULT_CATEGORIES', () => {
    it('has 9 default categories', () => {
      expect(DEFAULT_CATEGORIES).toHaveLength(9);
    });

    it('each category has key, color, and emoji', () => {
      DEFAULT_CATEGORIES.forEach(cat => {
        expect(typeof cat.key).toBe('string');
        expect(cat.key.length).toBeGreaterThan(0);
        expect(cat.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(typeof cat.emoji).toBe('string');
        expect(cat.emoji.length).toBeGreaterThan(0);
      });
    });

    it('contains expected category keys', () => {
      const keys = DEFAULT_CATEGORIES.map(c => c.key);
      expect(keys).toContain('animals');
      expect(keys).toContain('food');
      expect(keys).toContain('family');
      expect(keys).toContain('objects');
      expect(keys).toContain('actions');
      expect(keys).toContain('nature');
      expect(keys).toContain('body');
      expect(keys).toContain('others');
      expect(keys).toContain('places');
    });

    it('has unique keys', () => {
      const keys = DEFAULT_CATEGORIES.map(c => c.key);
      expect(new Set(keys).size).toBe(keys.length);
    });
  });

  describe('DEFAULT_CATEGORY_KEY_SET', () => {
    it('is a Set with the same size as DEFAULT_CATEGORIES', () => {
      expect(DEFAULT_CATEGORY_KEY_SET).toBeInstanceOf(Set);
      expect(DEFAULT_CATEGORY_KEY_SET.size).toBe(DEFAULT_CATEGORIES.length);
    });

    it('contains all default keys', () => {
      DEFAULT_CATEGORIES.forEach(cat => {
        expect(DEFAULT_CATEGORY_KEY_SET.has(cat.key)).toBe(true);
      });
    });

    it('does not contain arbitrary strings', () => {
      expect(DEFAULT_CATEGORY_KEY_SET.has('nonexistent')).toBe(false);
      expect(DEFAULT_CATEGORY_KEY_SET.has('')).toBe(false);
    });
  });

  describe('canonicalizeCategoryName', () => {
    it('maps portuguese default labels to canonical english keys', () => {
      expect(canonicalizeCategoryName('Animais')).toBe('animals');
      expect(canonicalizeCategoryName('Família')).toBe('family');
      expect(canonicalizeCategoryName('Ações')).toBe('actions');
    });

    it('maps english labels and keys to canonical english keys', () => {
      expect(canonicalizeCategoryName('Animals')).toBe('animals');
      expect(canonicalizeCategoryName('animals')).toBe('animals');
    });

    it('keeps custom categories unchanged', () => {
      expect(canonicalizeCategoryName('My Custom Category')).toBe('My Custom Category');
    });
  });

  describe('categoryLookupKey', () => {
    it('normalizes locale variants of default categories to the same key', () => {
      expect(categoryLookupKey('Animais')).toBe('animals');
      expect(categoryLookupKey('Animals')).toBe('animals');
      expect(categoryLookupKey('animals')).toBe('animals');
    });

    it('normalizes custom categories by accent/case', () => {
      expect(categoryLookupKey('  Coração  ')).toBe('coracao');
    });
  });
});
