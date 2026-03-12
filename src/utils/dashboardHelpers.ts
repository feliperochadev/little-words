/**
 * Dashboard helper functions (age calculation, greetings).
 */

export function getAgeText(
  birth: string,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const now = new Date();
  const [y, m, d] = birth.split('-').map(Number);
  const bDate = new Date(y, m - 1, d);

  let years = now.getFullYear() - bDate.getFullYear();
  let months = now.getMonth() - bDate.getMonth();
  if (now.getDate() < bDate.getDate()) months--;
  if (months < 0) { years--; months += 12; }

  const yearStr = years === 1 ? t('dashboard.age.year') : t('dashboard.age.years');
  const monthStr = months === 1 ? t('dashboard.age.month') : t('dashboard.age.months');
  const andStr = t('dashboard.age.and');

  if (years === 0) return `${months} ${monthStr}`;
  if (months === 0) return `${years} ${yearStr}`;
  return `${years} ${yearStr} ${andStr} ${months} ${monthStr}`;
}

export function getGreeting(
  name: string,
  sex: 'boy' | 'girl' | null,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const hour = new Date().getHours();
  let periodKey: string;
  if (hour < 12) {
    periodKey = 'morning';
  } else if (hour < 18) {
    periodKey = 'afternoon';
  } else {
    periodKey = 'evening';
  }
  const period = t(`dashboard.greeting.${periodKey}`);
  let msgKey: string;
  if (sex === 'girl') {
    msgKey = 'dashboard.greeting.messageFemale';
  } else if (sex === 'boy') {
    msgKey = 'dashboard.greeting.messageMale';
  } else {
    msgKey = 'dashboard.greeting.messageNeutral';
  }
  return t(msgKey, { period, name });
}
