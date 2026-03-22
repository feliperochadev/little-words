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
  { key: 'places',   color: '#74B9FF', emoji: '📍' },
  { key: 'colors',   color: '#E17055', emoji: '🎨' },
  { key: 'toys',     color: '#FDCB6E', emoji: '🎠' },
  { key: 'others',   color: '#B2BEC3', emoji: '✨' },
];

/** Set of all built-in keys for quick lookup at render time. */
export const DEFAULT_CATEGORY_KEY_SET = new Set(
  DEFAULT_CATEGORIES.map(c => c.key)
);

const deaccentLower = (s: string): string =>
  s.normalize('NFD').replaceAll(/[\u0300-\u036f]/g, '').toLowerCase().trim(); // NOSONAR - bounded normalization regex

const EN_CATEGORY_LABELS: Record<string, string> = {
  animals: 'Animals',
  food: 'Food',
  family: 'Family',
  objects: 'Objects',
  actions: 'Actions',
  nature: 'Nature',
  body: 'Body',
  places: 'Places',
  colors: 'Colors',
  toys: 'Toys',
  others: 'Others',
};

const PT_CATEGORY_LABELS: Record<string, string> = {
  animals: 'Animais',
  food: 'Comida',
  family: 'Família',
  objects: 'Objetos',
  actions: 'Ações',
  nature: 'Natureza',
  body: 'Corpo',
  places: 'Lugares',
  colors: 'Cores',
  toys: 'Brinquedos',
  others: 'Outros',
};

const defaultLabelToKey = new Map<string, string>();
for (const { key } of DEFAULT_CATEGORIES) {
  defaultLabelToKey.set(deaccentLower(key), key);
  defaultLabelToKey.set(deaccentLower(EN_CATEGORY_LABELS[key] ?? key), key);
  defaultLabelToKey.set(deaccentLower(PT_CATEGORY_LABELS[key] ?? key), key);
}

/**
 * Converts default category labels from any supported locale to their canonical
 * English key used in the database. Custom names are returned unchanged.
 */
export const canonicalizeCategoryName = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  return defaultLabelToKey.get(deaccentLower(trimmed)) ?? trimmed;
};

/**
 * Comparison key for category lookups: canonical default key + accent/case
 * normalization.
 */
export const categoryLookupKey = (name: string): string =>
  deaccentLower(canonicalizeCategoryName(name));
