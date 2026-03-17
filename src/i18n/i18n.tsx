/**
 * i18n.ts — Lightweight internationalization engine for Palavrinhas / Little Words.
 *
 * Usage:
 *   const { t, locale, setLocale } = useI18n();
 *   t('common.cancel')                     → 'Cancel'
 *   t('words.count', { count: 3 })         → '3 words'   (pluralizes via countPlural key)
 *   t('dashboard.greeting.messageMale', { period: 'Good morning', name: 'Miguel' })
 */

import React, {
  createContext, useContext, useState, useEffect, useCallback, useMemo,
  type ReactNode,
} from 'react';
import { getSetting, setSetting } from '../services/settingsService';
import { DEFAULT_CATEGORY_KEY_SET } from '../utils/categoryKeys';
import ptBR from './pt-BR';
import enUS from './en-US';

// ── Types ─────────────────────────────────────────────────────────────────────

export type Locale = 'pt-BR' | 'en-US';

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Returns a string array from the catalogue (e.g. month name lists). */
  ta: (key: string) => string[];
  /** Convenience: plural-aware count string  */
  tc: (key: string, count: number, params?: Record<string, string | number>) => string;
}

// ── Catalogue ─────────────────────────────────────────────────────────────────

const catalogues: Record<Locale, Record<string, unknown>> = {
  'pt-BR': ptBR as unknown as Record<string, unknown>,
  'en-US': enUS as unknown as Record<string, unknown>,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Deep-traverse a nested object with a dot-separated key path. */
export function deepGet(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((cur, k) => {
    if (cur && typeof cur === 'object') return (cur as Record<string, unknown>)[k];
    return undefined;
  }, obj);
}

/** Interpolate {{placeholder}} tokens in a string. */
export function interpolate(str: string, params?: Record<string, string | number>): string {
  if (params) {
    return str.replaceAll(/\{\{(\w+)\}\}/g, (_, k) =>
      params[k] !== undefined ? String(params[k]) : `{{${k}}}`
    );
  }
  return str;
}

/** Resolve a translation key with optional param interpolation. Falls back to key. */
function resolve(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const catalogue = catalogues[locale];
  const value = deepGet(catalogue, key);
  if (typeof value === 'string') return interpolate(value, params);
  // Fallback to en-US if missing in current locale
  if (locale === 'en-US') return key;
  const fallback = deepGet(catalogues['en-US'], key);
  if (typeof fallback === 'string') return interpolate(fallback, params);
  // Last resort: return the key itself
  return key;
}

// ── Context ───────────────────────────────────────────────────────────────────

const I18nContext = createContext<I18nContextValue | null>(null);

export const I18nProvider = ({ children }: Readonly<{ children: ReactNode }>) => {
  const [locale, setLocale] = useState<Locale>('en-US');
  const [ready, setReady] = useState(false);

  // Load persisted locale on mount
  useEffect(() => {
    getSetting('app_locale')
      .then(saved => {
        if (saved === 'pt-BR' || saved === 'en-US') setLocale(saved);
      })
      .catch((error) => {
        // Fallback to default locale on error
        console.error('[I18n] Failed to load saved locale:', error);
      })
      .finally(() => setReady(true));
  }, []);

  const handleSetLocale = useCallback(async (next: Locale) => {
    setLocale(next);
    await setSetting('app_locale', next);
  }, [setLocale]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      resolve(locale, key, params),
    [locale],
  );

  /** Returns a raw string[] from the catalogue. Falls back to en-US, then []. */
  const ta = useCallback(
    (key: string): string[] => {
      const value = deepGet(catalogues[locale], key);
      if (Array.isArray(value)) return value as string[];
      if (locale === 'en-US') return [];
      const fallback = deepGet(catalogues['en-US'], key);
      if (Array.isArray(fallback)) return fallback as string[];
      return [];
    },
    [locale],
  );

  /** Pluralizes: uses key + 'Plural' when count !== 1, then interpolates {{count}}. */
  const tc = useCallback(
    (key: string, count: number, params?: Record<string, string | number>) => {
      const pluralKey = count === 1 ? key : `${key}Plural`;
      return resolve(locale, pluralKey, { ...params, count });
    },
    [locale],
  );

  const contextValue = useMemo(
    () => ({ locale, setLocale: handleSetLocale, t, ta, tc }),
    [locale, handleSetLocale, t, ta, tc],
  );

  if (!ready) return null; // Don't render until locale is loaded

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useI18n = (): I18nContextValue => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
};

// ── Category name resolver ────────────────────────────────────────────────────

/**
 * Resolves a category's display name.
 * - If the name is a built-in key (e.g. 'animals'), returns the translated label.
 * - Otherwise returns the name as-is (user-created categories are literal).
 */
export const useCategoryName = () => {
  const { t } = useI18n();
  return (name: string): string => {
    if (DEFAULT_CATEGORY_KEY_SET.has(name)) {
      return t(`categories.${name}`);
    }
    return name;
  };
};

// ── Language metadata ─────────────────────────────────────────────────────────

export const LANGUAGES: { locale: Locale; label: string; flag: string }[] = [
  { locale: 'en-US', label: 'English',    flag: '🇺🇸' },
  { locale: 'pt-BR', label: 'Português',  flag: '🇧🇷' },
];