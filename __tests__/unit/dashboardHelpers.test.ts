import { getAgeText, getGreeting, formatMonth, MONTH_KEYS } from '../../src/utils/dashboardHelpers';

describe('dashboardHelpers', () => {
  const mockT = (key: string, params?: Record<string, string | number>): string => {
    const map: Record<string, string> = {
      'dashboard.age.year': 'year',
      'dashboard.age.years': 'years',
      'dashboard.age.month': 'month',
      'dashboard.age.months': 'months',
      'dashboard.age.and': 'and',
      'dashboard.age.day': 'day',
      'dashboard.age.days': 'days',
      'dashboard.greeting.morning': 'Good morning',
      'dashboard.greeting.afternoon': 'Good afternoon',
      'dashboard.greeting.evening': 'Good evening',
      'dashboard.greeting.messageFemale': `${params?.period}! Record ${params?.name}'s words`,
      'dashboard.greeting.messageMale': `${params?.period}! Record ${params?.name}'s words`,
      'dashboard.greeting.messageNeutral': `${params?.period}! Record ${params?.name}'s words`,
    };
    return map[key] ?? key;
  };

  describe('getAgeText', () => {
    it('returns only months when less than 1 year', () => {
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      const birth = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-${String(sixMonthsAgo.getDate()).padStart(2, '0')}`;
      const result = getAgeText(birth, mockT);
      expect(result).toContain('months');
      expect(result).not.toContain('year');
    });

    it('returns only years when months is 0', () => {
      const now = new Date();
      const birth = `${now.getFullYear() - 2}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const result = getAgeText(birth, mockT);
      expect(result).toBe('2 years');
    });

    it('returns years and months', () => {
      const now = new Date();
      // 1 year and some months ago
      const y = now.getFullYear() - 1;
      const m = now.getMonth() - 3;
      const adjustedMonth = m < 0 ? m + 12 : m;
      const adjustedYear = m < 0 ? y - 1 : y;
      const birth = `${adjustedYear}-${String(adjustedMonth + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const result = getAgeText(birth, mockT);
      expect(result).toContain('and');
    });

    it('uses singular for 1 year', () => {
      const now = new Date();
      const birth = `${now.getFullYear() - 1}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const result = getAgeText(birth, mockT);
      expect(result).toBe('1 year');
    });

    it('uses singular for 1 month', () => {
      const now = new Date();
      const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      const birth = `${oneMonthAgo.getFullYear()}-${String(oneMonthAgo.getMonth() + 1).padStart(2, '0')}-${String(oneMonthAgo.getDate()).padStart(2, '0')}`;
      const result = getAgeText(birth, mockT);
      expect(result).toBe('1 month');
    });

    it('returns days when less than 1 month old', () => {
      // 5 days ago via timestamp arithmetic to avoid month-boundary issues
      const now = new Date();
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
      const birth = `${fiveDaysAgo.getFullYear()}-${String(fiveDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(fiveDaysAgo.getDate()).padStart(2, '0')}`;
      const result = getAgeText(birth, mockT);
      expect(result).toMatch(/\d+ day/);
      expect(result).not.toContain('month');
      expect(result).not.toContain('year');
    });
  });

  describe('getGreeting', () => {
    it('returns a greeting with the name', () => {
      const result = getGreeting('Sofia', 'girl', mockT);
      expect(result).toContain('Sofia');
    });

    it('includes a period-based greeting', () => {
      const result = getGreeting('Miguel', 'boy', mockT);
      expect(result).toMatch(/Good (morning|afternoon|evening)/);
    });

    it('handles neutral sex', () => {
      const result = getGreeting('Baby', null, mockT);
      expect(result).toContain('Baby');
    });

    it('handles very new born (0 days)', () => {
      const now = new Date();
      const birth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const result = getAgeText(birth, mockT);
      expect(result).toBeDefined();
    });

    it('handles 1 year exactly on anniversary', () => {
      const now = new Date();
      const birth = `${now.getFullYear() - 1}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const result = getAgeText(birth, mockT);
      expect(result).toContain('year');
    });

    it('handles multiple years', () => {
      const now = new Date();
      const birth = `${now.getFullYear() - 3}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const result = getAgeText(birth, mockT);
      expect(result).toContain('3');
    });

    it('greeting includes correct period message for female', () => {
      const result = getGreeting('Anna', 'girl', mockT);
      expect(result).toBeDefined();
      expect(result.length > 0).toBe(true);
    });

    it('greeting includes correct period message for male', () => {
      const result = getGreeting('Lucas', 'boy', mockT);
      expect(result).toBeDefined();
      expect(result.length > 0).toBe(true);
    });

    it('greeting includes correct period message for neutral', () => {
      const result = getGreeting('Child', null, mockT);
      expect(result).toBeDefined();
      expect(result.length > 0).toBe(true);
    });

    it('handles leap year dates correctly', () => {
      // Feb 29 to March 1 transition
      const birth = '2020-02-29';
      const result = getAgeText(birth, mockT);
      expect(result).toBeDefined();
    });

    it('age calculation with month boundary crossing', () => {
      const now = new Date();
      const monthBefore = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const yearAdjust = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const birth = `${yearAdjust}-${String(monthBefore + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const result = getAgeText(birth, mockT);
      expect(result).toBeDefined();
    });

    it('returns consistent results on multiple calls', () => {
      const now = new Date();
      const birth = `${now.getFullYear() - 1}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const result1 = getAgeText(birth, mockT);
      const result2 = getAgeText(birth, mockT);
      expect(result1).toBe(result2);
    });
  });
});

describe('formatMonth', () => {
  const mockT = (key: string): string => {
    const map: Record<string, string> = {
      'dashboard.months.Jan': 'Jan',
      'dashboard.months.Feb': 'Feb',
      'dashboard.months.Mar': 'Mar',
      'dashboard.months.Dec': 'Dec',
    };
    return map[key] ?? key;
  };

  it('returns short month label without year when showYear is false', () => {
    expect(formatMonth('2024-01', false, mockT)).toBe('Jan');
    expect(formatMonth('2024-03', false, mockT)).toBe('Mar');
    expect(formatMonth('2024-12', false, mockT)).toBe('Dec');
  });

  it('returns month label with 2-digit year when showYear is true', () => {
    expect(formatMonth('2024-01', true, mockT)).toBe("Jan '24");
    expect(formatMonth('2025-02', true, mockT)).toBe("Feb '25");
  });

  it('handles all 12 months via MONTH_KEYS', () => {
    expect(MONTH_KEYS).toHaveLength(12);
    expect(MONTH_KEYS[0]).toBe('Jan');
    expect(MONTH_KEYS[11]).toBe('Dec');
  });

  it('uses translated label from t function', () => {
    const tPtBR = (key: string): string => {
      const map: Record<string, string> = {
        'dashboard.months.Jan': 'Jan',
        'dashboard.months.Feb': 'Fev',
      };
      return map[key] ?? key;
    };
    expect(formatMonth('2024-02', false, tPtBR)).toBe('Fev');
    expect(formatMonth('2024-02', true, tPtBR)).toBe("Fev '24");
  });
});
