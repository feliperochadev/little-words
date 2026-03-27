/**
 * Shared date helper functions used across the app.
 */

export function formatDisplayDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export function toStorageDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${y}-${m}-${d}`;
}

export function daysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function parseDate(s: string): { d: number; m: number; y: number } {
  const [y, m, d] = s.split('-').map(Number);
  return {
    y: (typeof y !== 'number' || Number.isNaN(y)) ? new Date().getFullYear() : y,
    m: (typeof m !== 'number' || Number.isNaN(m)) ? new Date().getMonth() : m - 1,
    d: (typeof d !== 'number' || Number.isNaN(d)) ? new Date().getDate() : d,
  };
}

export function toStorage(d: number, m: number, y: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function toDisplay(s: string): string {
  const { d, m, y } = parseDate(s);
  return `${String(d).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}/${y}`;
}

export function formatDateDMY(date: string): string {
  if (!date) return '';
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

export function computeAge(
  birthDate: Date,
  now: Date = new Date(),
): { years: number; months: number; days: number } {
  let years = now.getFullYear() - birthDate.getFullYear();
  let months = now.getMonth() - birthDate.getMonth();
  let days = now.getDate() - birthDate.getDate();

  if (days < 0) {
    months--;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  return { years, months, days };
}

export function formatAgeText(
  birthDate: Date,
  t: (key: string) => string,
  separator: string = ' · ',
  now?: Date,
): string {
  const { years, months, days } = computeAge(birthDate, now);
  const yearStr = years === 1 ? t('dashboard.age.year') : t('dashboard.age.years');
  const monthStr = months === 1 ? t('dashboard.age.month') : t('dashboard.age.months');
  if (years === 0 && months === 0) {
    const displayDays = Math.max(days, 1);
    const displayDayStr = displayDays === 1 ? t('dashboard.age.day') : t('dashboard.age.days');
    return `${displayDays} ${displayDayStr}`;
  }
  if (years === 0) return `${months} ${monthStr}`;
  if (months === 0) return `${years} ${yearStr}`;
  return `${years} ${yearStr}${separator}${months} ${monthStr}`;
}

function getOrdinalSuffix(day: number): string {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return 'th';
  const mod10 = day % 10;
  if (mod10 === 1) return 'st';
  if (mod10 === 2) return 'nd';
  if (mod10 === 3) return 'rd';
  return 'th';
}

const EN_SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const PT_SHORT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'] as const;

export function formatTimelineDate(dateStr: string, locale: 'pt-BR' | 'en-US'): string {
  if (!dateStr) return '';

  const baseDate = dateStr.includes('T') ? dateStr.slice(0, 10) : dateStr;
  const [yearRaw, monthRaw, dayRaw] = baseDate.split('-').map(Number);

  if (
    Number.isNaN(yearRaw) ||
    Number.isNaN(monthRaw) ||
    Number.isNaN(dayRaw) ||
    monthRaw < 1 ||
    monthRaw > 12 ||
    dayRaw < 1 ||
    dayRaw > 31
  ) {
    return dateStr;
  }

  const monthIndex = monthRaw - 1;
  if (locale === 'pt-BR') {
    return `${dayRaw} de ${PT_SHORT_MONTHS[monthIndex]}, ${yearRaw}`;
  }

  return `${dayRaw}${getOrdinalSuffix(dayRaw)} ${EN_SHORT_MONTHS[monthIndex]}, ${yearRaw}`;
}
