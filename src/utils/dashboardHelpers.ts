/**
 * Dashboard helper functions (age calculation, greetings).
 */

import { formatAgeText } from './dateHelpers';

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
