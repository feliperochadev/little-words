import {
  formatDisplayDate,
  toStorageDate,
  daysInMonth,
  parseDate,
  toStorage,
  toDisplay,
  formatDateDMY,
  computeAge,
  formatAgeText,
} from '../../src/utils/dateHelpers';

describe('dateHelpers', () => {
  describe('formatDisplayDate', () => {
    it('formats a date as DD/MM/YYYY', () => {
      expect(formatDisplayDate(new Date(2024, 0, 15))).toBe('15/01/2024');
    });

    it('pads single-digit days and months', () => {
      expect(formatDisplayDate(new Date(2024, 2, 5))).toBe('05/03/2024');
    });

    it('handles December 31st', () => {
      expect(formatDisplayDate(new Date(2023, 11, 31))).toBe('31/12/2023');
    });
  });

  describe('toStorageDate', () => {
    it('formats a date as YYYY-MM-DD', () => {
      expect(toStorageDate(new Date(2024, 0, 15))).toBe('2024-01-15');
    });

    it('pads single-digit days and months', () => {
      expect(toStorageDate(new Date(2024, 2, 5))).toBe('2024-03-05');
    });
  });

  describe('daysInMonth', () => {
    it('returns 31 for January (month 0)', () => {
      expect(daysInMonth(0, 2024)).toBe(31);
    });

    it('returns 29 for February in leap year', () => {
      expect(daysInMonth(1, 2024)).toBe(29);
    });

    it('returns 28 for February in non-leap year', () => {
      expect(daysInMonth(1, 2023)).toBe(28);
    });

    it('returns 30 for April (month 3)', () => {
      expect(daysInMonth(3, 2024)).toBe(30);
    });

    it('returns 31 for December (month 11)', () => {
      expect(daysInMonth(11, 2024)).toBe(31);
    });
  });

  describe('parseDate', () => {
    it('parses YYYY-MM-DD string', () => {
      const result = parseDate('2024-03-15');
      expect(result).toEqual({ y: 2024, m: 2, d: 15 }); // month is 0-indexed
    });

    it('parses first day of year', () => {
      const result = parseDate('2023-01-01');
      expect(result).toEqual({ y: 2023, m: 0, d: 1 });
    });

    it('handles invalid date parts with defaults', () => {
      const result = parseDate('invalid');
      expect(result.y).toBe(new Date().getFullYear());
    });

    it('handles empty string', () => {
      const result = parseDate('');
      expect(typeof result.y).toBe('number');
      expect(typeof result.m).toBe('number');
      expect(typeof result.d).toBe('number');
    });
  });

  describe('toStorage', () => {
    it('formats day, month (0-indexed), year to YYYY-MM-DD', () => {
      expect(toStorage(15, 2, 2024)).toBe('2024-03-15'); // month 2 → March
    });

    it('pads single digits', () => {
      expect(toStorage(5, 0, 2024)).toBe('2024-01-05');
    });

    it('handles December', () => {
      expect(toStorage(31, 11, 2024)).toBe('2024-12-31');
    });
  });

  describe('toDisplay', () => {
    it('converts YYYY-MM-DD to DD/MM/YYYY', () => {
      expect(toDisplay('2024-03-15')).toBe('15/03/2024');
    });

    it('pads single digit values', () => {
      expect(toDisplay('2024-01-05')).toBe('05/01/2024');
    });
  });

  describe('formatDateDMY', () => {
    it('converts YYYY-MM-DD to DD/MM/YYYY', () => {
      expect(formatDateDMY('2024-03-15')).toBe('15/03/2024');
    });

    it('returns empty string for empty input', () => {
      expect(formatDateDMY('')).toBe('');
    });
  });

  describe('computeAge', () => {
    it('returns 0 years, 0 months, 0 days when born today', () => {
      const now = new Date(2026, 2, 17);
      expect(computeAge(new Date(2026, 2, 17), now)).toEqual({ years: 0, months: 0, days: 0 });
    });

    it('returns days only when less than 1 month old', () => {
      const now = new Date(2026, 2, 17);
      expect(computeAge(new Date(2026, 2, 7), now)).toEqual({ years: 0, months: 0, days: 10 });
    });

    it('returns exactly 1 month when on the same day next month', () => {
      const now = new Date(2026, 2, 17);
      expect(computeAge(new Date(2026, 1, 17), now)).toEqual({ years: 0, months: 1, days: 0 });
    });

    it('returns months only when less than 1 year', () => {
      const now = new Date(2026, 2, 17);
      expect(computeAge(new Date(2025, 8, 17), now)).toEqual({ years: 0, months: 6, days: 0 });
    });

    it('returns years only when on exact year birthday', () => {
      const now = new Date(2026, 2, 17);
      expect(computeAge(new Date(2024, 2, 17), now)).toEqual({ years: 2, months: 0, days: 0 });
    });

    it('returns years and months', () => {
      const now = new Date(2026, 2, 17);
      expect(computeAge(new Date(2023, 11, 17), now)).toEqual({ years: 2, months: 3, days: 0 });
    });

    it('adjusts days correctly when born later in the month (day wrap)', () => {
      // born Feb 20, now March 10: days = 10-20 = -10, months--, days += Feb(28) = 18
      const now = new Date(2026, 2, 10);
      expect(computeAge(new Date(2026, 1, 20), now)).toEqual({ years: 0, months: 0, days: 18 });
    });

    it('handles cross-year month subtraction correctly', () => {
      // born Dec 17, 2025, now Mar 17, 2026: months = -9, years--, months += 12 = 3
      const now = new Date(2026, 2, 17);
      expect(computeAge(new Date(2025, 11, 17), now)).toEqual({ years: 0, months: 3, days: 0 });
    });
  });

  describe('formatAgeText', () => {
    const NOW = new Date(2026, 2, 17); // March 17, 2026 (fixed)
    const mockT = (key: string) => {
      const map: Record<string, string> = {
        'dashboard.age.day': 'day', 'dashboard.age.days': 'days',
        'dashboard.age.month': 'month', 'dashboard.age.months': 'months',
        'dashboard.age.year': 'year', 'dashboard.age.years': 'years',
      };
      return map[key] ?? key;
    };

    it('returns "1 day" when born today (0 days)', () => {
      expect(formatAgeText(new Date(2026, 2, 17), mockT, ' · ', NOW)).toBe('1 day');
    });

    it('returns "10 days" when < 1 month', () => {
      expect(formatAgeText(new Date(2026, 2, 7), mockT, ' · ', NOW)).toBe('10 days');
    });

    it('uses singular "1 day"', () => {
      expect(formatAgeText(new Date(2026, 2, 16), mockT, ' · ', NOW)).toBe('1 day');
    });

    it('returns months only when < 1 year', () => {
      // born Sep 17, 2025 → 6 months
      expect(formatAgeText(new Date(2025, 8, 17), mockT, ' · ', NOW)).toBe('6 months');
    });

    it('uses singular "1 month"', () => {
      // born Feb 17, 2026 → 1 month
      expect(formatAgeText(new Date(2026, 1, 17), mockT, ' · ', NOW)).toBe('1 month');
    });

    it('returns years only when months = 0', () => {
      // born Mar 17, 2024 → exactly 2 years
      expect(formatAgeText(new Date(2024, 2, 17), mockT, ' · ', NOW)).toBe('2 years');
    });

    it('uses singular "1 year" when exactly 1 year', () => {
      // born Mar 17, 2025 → exactly 1 year
      expect(formatAgeText(new Date(2025, 2, 17), mockT, ' · ', NOW)).toBe('1 year');
    });

    it('uses default · separator for years and months', () => {
      // born Jan 17, 2025 → 2 years 2 months... wait: 2026-03-17 - 2025-01-17 = 1y 2m
      expect(formatAgeText(new Date(2025, 0, 17), mockT, undefined, NOW)).toBe('1 year · 2 months');
    });

    it('uses custom separator', () => {
      expect(formatAgeText(new Date(2025, 0, 17), mockT, ' and ', NOW)).toBe('1 year and 2 months');
    });
  });
});
