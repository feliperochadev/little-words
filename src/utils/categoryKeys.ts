/**
 * categoryKeys.ts
 *
 * Single source of truth for the built-in category keys.
 * The DB stores these keys in the `name` column for default categories.
 * At render time, useCategoryName() resolves the key to a translated label.
 *
 * User-created categories are stored with their literal name as-is —
 * those are never translated (they're user-defined).
 */

export interface DefaultCategory {
  key: string;   // stored in DB, used as i18n key
  color: string;
  emoji: string;
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { key: 'animals',  color: '#FF6B9D', emoji: '🐾' },
  { key: 'food',     color: '#FF9F43', emoji: '🍎' },
  { key: 'family',   color: '#A29BFE', emoji: '👨‍👩‍👧' },
  { key: 'objects',  color: '#00CEC9', emoji: '🧸' },
  { key: 'actions',  color: '#6C5CE7', emoji: '🏃' },
  { key: 'nature',   color: '#55EFC4', emoji: '🌿' },
  { key: 'body',     color: '#FD79A8', emoji: '👶' },
  { key: 'others',   color: '#B2BEC3', emoji: '✨' },
  { key: 'places',   color: '#74B9FF', emoji: '📍' },
];

/** Set of all built-in keys for quick lookup at render time. */
export const DEFAULT_CATEGORY_KEY_SET = new Set(
  DEFAULT_CATEGORIES.map(c => c.key)
);
