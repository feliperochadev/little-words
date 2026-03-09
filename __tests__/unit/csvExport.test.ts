import { buildCategoryResolver } from '../../src/utils/csvExport';

describe('csvExport', () => {
  describe('buildCategoryResolver', () => {
    const mockT = (key: string): string => {
      const map: Record<string, string> = {
        'categories.animals': 'Animals',
        'categories.food': 'Food',
        'categories.family': 'Family',
      };
      return map[key] ?? key;
    };

    it('translates built-in category keys', () => {
      const resolver = buildCategoryResolver(mockT);
      expect(resolver('animals')).toBe('Animals');
      expect(resolver('food')).toBe('Food');
      expect(resolver('family')).toBe('Family');
    });

    it('passes through user-created category names', () => {
      const resolver = buildCategoryResolver(mockT);
      expect(resolver('My Custom Category')).toBe('My Custom Category');
      expect(resolver('Toys')).toBe('Toys');
    });

    it('passes through empty string', () => {
      const resolver = buildCategoryResolver(mockT);
      expect(resolver('')).toBe('');
    });

    it('handles null-ish names gracefully', () => {
      const resolver = buildCategoryResolver(mockT);
      // Name is falsy, the guard `name &&` returns falsy, so it falls through
      expect(resolver('')).toBe('');
    });
  });
});
