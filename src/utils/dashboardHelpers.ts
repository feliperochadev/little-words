/**
 * Dashboard helper functions (age calculation, greetings, month formatting).
 */

import { formatAgeText } from './dateHelpers';

export const MONTH_KEYS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const;

type TFunc = (key: string, params?: Record<string, string | number>) => string;

/** Computes completed years of age from a YYYY-MM-DD birth string. */
function computeAgeYears(birth: string): number {
  const [y, m, d] = birth.split('-').map(Number);
  const birthDate = new Date(y, m - 1, d);
  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  const hasHadBirthday =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
  if (!hasHadBirthday) years--;
  return years;
}

/**
 * Returns the age-appropriate child label for the current locale.
 * EN: baby (<1y) / toddler (1–2y) / child (3y+)
 * PT: bebê (<2y) / criança (2y+)
 * Falls back to "baby"/"bebê" when birth is null.
 */
export function getChildLabel(birth: string | null, locale: string, t: TFunc): string {
  if (!birth) {
    return locale === 'pt-BR' ? t('childLabel.bebe') : t('childLabel.baby');
  }
  const years = computeAgeYears(birth);
  if (locale === 'pt-BR') {
    return years < 2 ? t('childLabel.bebe') : t('childLabel.crianca');
  }
  if (years < 1) return t('childLabel.baby');
  if (years < 3) return t('childLabel.toddler');
  return t('childLabel.child');
}

/**
 * Returns a display-ready child label suitable for use in titles and field labels.
 * EN: returns capitalised label ("Baby", "Toddler", "Child").
 * PT: returns the gendered article + label ("do bebê", "da bebê", "da criança").
 * Unknown/unset sex defaults to the female article in PT.
 */
export function getChildLabelWithArticle(
  birth: string | null,
  sex: 'boy' | 'girl' | null,
  locale: string,
  t: TFunc,
): string {
  if (locale !== 'pt-BR') {
    const label = getChildLabel(birth, locale, t);
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  const isBebe = !birth || computeAgeYears(birth) < 2;
  if (isBebe) {
    return sex === 'boy' ? t('childLabel.articleMaleBebe') : t('childLabel.articleFemaleBebe');
  }
  return t('childLabel.articleCrianca');
}

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
