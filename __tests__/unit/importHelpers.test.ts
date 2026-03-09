import { deaccent, parseDateStr, parseTextInput, parseCSV } from '../../src/utils/importHelpers';

describe('importHelpers', () => {
  describe('deaccent', () => {
    it('removes accents and lowercases', () => {
      expect(deaccent('Família')).toBe('familia');
      expect(deaccent('Ações')).toBe('acoes');
      expect(deaccent('Natureza')).toBe('natureza');
    });

    it('lowercases ASCII strings', () => {
      expect(deaccent('Animals')).toBe('animals');
      expect(deaccent('FOOD')).toBe('food');
    });

    it('handles empty string', () => {
      expect(deaccent('')).toBe('');
    });

    it('handles string with no accents', () => {
      expect(deaccent('hello')).toBe('hello');
    });
  });

  describe('parseDateStr', () => {
    it('parses DD/MM/YYYY format', () => {
      expect(parseDateStr('15/03/2025')).toBe('2025-03-15');
    });

    it('parses D/M/YYYY format', () => {
      expect(parseDateStr('5/3/2025')).toBe('2025-03-05');
    });

    it('returns YYYY-MM-DD format as-is', () => {
      expect(parseDateStr('2025-03-15')).toBe('2025-03-15');
    });

    it('returns today for empty string', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(parseDateStr('')).toBe(today);
    });

    it('returns today for invalid format', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(parseDateStr('not-a-date')).toBe(today);
    });
  });

  describe('parseTextInput', () => {
    it('parses simple word list', () => {
      const result = parseTextInput('mamãe\nágua\ncachorro');
      expect(result).toHaveLength(3);
      expect(result[0].word).toBe('mamãe');
      expect(result[1].word).toBe('água');
      expect(result[2].word).toBe('cachorro');
    });

    it('parses word with category', () => {
      const result = parseTextInput('água, Comida');
      expect(result).toHaveLength(1);
      expect(result[0].word).toBe('água');
      expect(result[0].category).toBe('Comida');
    });

    it('parses word with category and date', () => {
      const result = parseTextInput('cachorro, Animais, 15/03/2025');
      expect(result).toHaveLength(1);
      expect(result[0].word).toBe('cachorro');
      expect(result[0].category).toBe('Animais');
      expect(result[0].date).toBe('2025-03-15');
    });

    it('skips empty lines', () => {
      const result = parseTextInput('mamãe\n\n\nágua');
      expect(result).toHaveLength(2);
    });

    it('returns empty for empty input', () => {
      expect(parseTextInput('')).toHaveLength(0);
    });

    it('trims whitespace', () => {
      const result = parseTextInput('  mamãe  \n  água  ');
      expect(result[0].word).toBe('mamãe');
      expect(result[1].word).toBe('água');
    });

    it('strips surrounding quotes from fields when CSV is pasted', () => {
      const result = parseTextInput('"Mama","Family","2025-12-01",""\n"cavalo","Animals","2025-12-05","Cacá"');
      expect(result).toHaveLength(2);
      expect(result[0].word).toBe('Mama');
      expect(result[0].category).toBe('Family');
      expect(result[0].date).toBe('2025-12-01');
      expect(result[0].variant).toBeUndefined();
      expect(result[1].word).toBe('cavalo');
      expect(result[1].category).toBe('Animals');
      expect(result[1].variant).toBe('Cacá');
    });

    it('skips CSV header row (Portuguese)', () => {
      const csv = 'palavra,categoria,data,variante\n"Mama","Family","2025-12-01",""';
      const result = parseTextInput(csv);
      expect(result).toHaveLength(1);
      expect(result[0].word).toBe('Mama');
    });

    it('skips CSV header row (English)', () => {
      const csv = 'word,category,date,variant\n"hello","Food","2025-01-01",""';
      const result = parseTextInput(csv);
      expect(result).toHaveLength(1);
      expect(result[0].word).toBe('hello');
    });

    it('parses variant column', () => {
      const result = parseTextInput('cachorro, Animais, 15/03/2025, Cacó');
      expect(result[0].variant).toBe('Cacó');
    });

    it('empty variant field becomes undefined', () => {
      const result = parseTextInput('"Mama","Family","2025-12-01",""');
      expect(result[0].variant).toBeUndefined();
    });
  });

  describe('parseCSV', () => {
    it('parses CSV with header row', () => {
      const csv = 'palavra,categoria,data,variante\nmamãe,Família,2024-01-15,\ncachorro,Animais,2024-01-20,cacaco';
      const result = parseCSV(csv);
      expect(result).toHaveLength(2);
      expect(result[0].word).toBe('mamãe');
      expect(result[0].category).toBe('Família');
      expect(result[1].word).toBe('cachorro');
      expect(result[1].variant).toBe('cacaco');
    });

    it('parses CSV without header (no recognized column names)', () => {
      const csv = 'mamãe,Família,2024-01-15';
      const result = parseCSV(csv);
      expect(result).toHaveLength(1);
      expect(result[0].word).toBe('mamãe');
    });

    it('handles semicolon delimiter', () => {
      const csv = 'palavra;categoria;data\nmamãe;Família;2024-01-15';
      const result = parseCSV(csv);
      expect(result).toHaveLength(1);
      expect(result[0].word).toBe('mamãe');
      expect(result[0].category).toBe('Família');
    });

    it('handles quoted fields', () => {
      const csv = 'word,category\n"hello world","My Category"';
      const result = parseCSV(csv);
      expect(result).toHaveLength(1);
      expect(result[0].word).toBe('hello world');
      expect(result[0].category).toBe('My Category');
    });

    it('returns empty for empty input', () => {
      expect(parseCSV('')).toHaveLength(0);
    });

    it('detects English header keywords', () => {
      const csv = 'word,category,date,variant\nhello,Food,2024-01-01,helo';
      const result = parseCSV(csv);
      expect(result).toHaveLength(1);
      expect(result[0].word).toBe('hello');
      expect(result[0].category).toBe('Food');
      expect(result[0].variant).toBe('helo');
    });

    it('handles missing optional columns', () => {
      const csv = 'palavra\nmamãe\nágua';
      const result = parseCSV(csv);
      expect(result).toHaveLength(2);
      expect(result[0].word).toBe('mamãe');
      expect(result[0].category).toBeUndefined();
    });
  });
});
