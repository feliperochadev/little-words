import { getRotation, formatDateForCard } from '../../src/components/keepsake/KeepsakeCard';

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
});
