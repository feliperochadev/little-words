import {
  formatDisplayDate,
  toStorageDate,
  daysInMonth,
  parseDate,
  toStorage,
  toDisplay,
  formatDateDMY,
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
});
