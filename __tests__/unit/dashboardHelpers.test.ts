import { getAgeText, getGreeting } from '../../src/utils/dashboardHelpers';

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
  });
});
