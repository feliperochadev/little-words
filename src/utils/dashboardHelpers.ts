/**
 * Dashboard helper functions (age calculation, greetings, month formatting).
 */

import { formatAgeText } from './dateHelpers';

export const MONTH_KEYS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const;

export function formatMonth(
  monthStr: string,
  showYear: boolean,
  t: (key: string) => string,
): string {
  const [year, month] = monthStr.split('-');
  const key = MONTH_KEYS[Number.parseInt(month, 10) - 1];
  const label = t(`dashboard.months.${key}`);
  return showYear ? `${label} '${year.slice(2)}` : label;
}

export function getAgeText(
  birth: string,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const [y, m, d] = birth.split('-').map(Number);
  return formatAgeText(new Date(y, m - 1, d), t, ` ${t('dashboard.age.and')} `);
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
