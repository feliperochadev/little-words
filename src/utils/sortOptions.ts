import type { SortKey } from './sortHelpers';

type Translator = (key: string) => string;

export interface SortOption {
  key: SortKey;
  label: string;
}

export function buildDefaultSortOptions(t: Translator): SortOption[] {
  return [
    { key: 'date_desc', label: t('words.sortRecent') },
    { key: 'date_asc', label: t('words.sortOldest') },
    { key: 'alpha_asc', label: t('words.sortAZ') },
    { key: 'alpha_desc', label: t('words.sortZA') },
  ];
}
