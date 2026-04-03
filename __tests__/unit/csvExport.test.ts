import { buildCategoryResolver, buildCSVHeader, buildFilename } from '../../src/utils/csvExport';

describe('csvExport', () => {
  describe('buildCSVHeader', () => {
    it('returns English headers for en-US locale', () => {
      const t = (key: string) => ({ 'csv.columnWord': 'word', 'csv.columnCategory': 'category', 'csv.columnDate': 'date', 'csv.columnVariant': 'variant' }[key] ?? key);
      expect(buildCSVHeader(t)).toBe('word,category,date,variant');
    });

    it('returns Portuguese headers for pt-BR locale', () => {
      const t = (key: string) => ({ 'csv.columnWord': 'palavra', 'csv.columnCategory': 'categoria', 'csv.columnDate': 'data', 'csv.columnVariant': 'variante' }[key] ?? key);
      expect(buildCSVHeader(t)).toBe('palavra,categoria,data,variante');
    });

    it('uses comma as delimiter', () => {
      const t = (key: string) => key.split('.').pop() ?? key;
      expect(buildCSVHeader(t)).toContain(',');
      expect(buildCSVHeader(t).split(',').length).toBe(4);
    });
  });

  describe('buildFilename', () => {
    it('uses locale-aware prefix and YYYY-MM-DD-HH-mm format', () => {
      const t = (key: string) => ({ 'csv.filenamePrefix': 'little-words' }[key] ?? key);
      const filename = buildFilename(t);
      expect(filename).toMatch(/^little-words_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.csv$/);
    });

    it('uses pt-BR prefix when locale is pt-BR', () => {
      const t = (key: string) => ({ 'csv.filenamePrefix': 'palavrinhas' }[key] ?? key);
      const filename = buildFilename(t);
      expect(filename).toMatch(/^palavrinhas_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.csv$/);
    });
  });

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

describe('getAllDataForCSV — resolveCategoryName applied to each row', () => {
  const mockDb = (globalThis as any).__mockDb;

  beforeEach(() => jest.clearAllMocks());

  it('applies resolveCategoryName to categoria field', async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([
      { word: 'cat', categoria: 'animals', data: '2024-01-01', variante: '' },
    ]);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getAllDataForCSV } = require('../../src/utils/csvExport') as typeof import('../../src/utils/csvExport');
    const resolver = (name: string) => name === 'animals' ? 'Animals' : name;
    const csv = await getAllDataForCSV(resolver, 'header');
    expect(csv).toContain('"Animals"');
  });
});
