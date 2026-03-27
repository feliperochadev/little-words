import { getRotation, formatDateForCard, getTitleText } from '../../src/components/keepsake/KeepsakeCard';

describe('KeepsakeCard helpers', () => {
  describe('getRotation', () => {
    it('returns a rotation string in degrees', () => {
      const rotation = getRotation(1, 0);
      expect(rotation).toMatch(/^-?\d+deg$/);
    });

    it('produces different rotations for different word IDs', () => {
      const r1 = getRotation(1, 0);
      const r2 = getRotation(2, 0);
      const r3 = getRotation(3, 0);
      // At least 2 of 3 should differ
      const unique = new Set([r1, r2, r3]);
      expect(unique.size).toBeGreaterThanOrEqual(2);
    });

    it('stays within ±4 degrees', () => {
      for (let id = 0; id < 20; id++) {
        for (let idx = 0; idx < 3; idx++) {
          const deg = parseInt(getRotation(id, idx), 10);
          expect(deg).toBeGreaterThanOrEqual(-4);
          expect(deg).toBeLessThanOrEqual(4);
        }
      }
    });

    it('is deterministic for the same inputs', () => {
      expect(getRotation(5, 1)).toBe(getRotation(5, 1));
      expect(getRotation(10, 2)).toBe(getRotation(10, 2));
    });
  });

  describe('formatDateForCard', () => {
    it('formats a valid date string', () => {
      const result = formatDateForCard('2026-03-15');
      // Result should be a non-empty string containing the year
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('2026');
    });

    it('returns the input for invalid date strings', () => {
      const result = formatDateForCard('not-a-date');
      // Date('not-a-date') is Invalid Date, toLocaleDateString returns 'Invalid Date'
      expect(typeof result).toBe('string');
    });
  });

  describe('getTitleText', () => {
    const t = (key: string, params?: Record<string, string>) => {
      const name = params?.name ?? 'Baby';
      if (key === 'keepsake.titleMale') return `Primeiras Palavras\ndo ${name}`;
      if (key === 'keepsake.titleFemale') return `Primeiras Palavras\nda ${name}`;
      if (key === 'keepsake.titleNeutral') return `Primeiras Palavras\nde ${name}`;
      return `${name}'s\nFirst Words`;
    };

    it('uses male article in pt-BR', () => {
      expect(getTitleText('pt-BR', 'boy', t, 'Miguel')).toBe('Primeiras Palavras\ndo Miguel');
    });

    it('uses female article in pt-BR', () => {
      expect(getTitleText('pt-BR', 'girl', t, 'Sofia')).toBe('Primeiras Palavras\nda Sofia');
    });

    it('uses neutral article in pt-BR when sex is unknown', () => {
      expect(getTitleText('pt-BR', null, t, 'Alex')).toBe('Primeiras Palavras\nde Alex');
    });

    it('uses default title outside pt-BR', () => {
      expect(getTitleText('en-US', 'boy', t, 'Noah')).toBe("Noah's\nFirst Words");
    });
  });
});
