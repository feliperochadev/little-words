/**
 * Sort helpers for words and variants lists.
 */
import type { Word, Variant } from '../database/database';

export type SortKey = 'date_desc' | 'date_asc' | 'alpha_asc' | 'alpha_desc';

export function sortWords(words: Word[], sort: SortKey): Word[] {
  return [...words].sort((a, b) => {
    switch (sort) {
      case 'date_desc': return b.date_added.localeCompare(a.date_added);
      case 'date_asc':  return a.date_added.localeCompare(b.date_added);
      case 'alpha_asc': return a.word.localeCompare(b.word);
      case 'alpha_desc':return b.word.localeCompare(a.word);
    }
  });
}

export function sortVariants(variants: Variant[], sort: SortKey): Variant[] {
  return [...variants].sort((a, b) => {
    switch (sort) {
      case 'date_desc': return b.date_added.localeCompare(a.date_added);
      case 'date_asc':  return a.date_added.localeCompare(b.date_added);
      case 'alpha_asc': return a.variant.localeCompare(b.variant);
      case 'alpha_desc':return b.variant.localeCompare(a.variant);
    }
  });
}
