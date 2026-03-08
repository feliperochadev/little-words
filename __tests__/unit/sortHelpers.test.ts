import { sortWords, sortVariants } from '../../src/utils/sortHelpers';
import type { Word, Variant } from '../../src/database/database';

const makeWord = (overrides: Partial<Word>): Word => ({
  id: 1,
  word: 'test',
  category_id: null,
  date_added: '2024-01-01',
  notes: null,
  created_at: '2024-01-01',
  ...overrides,
});

const makeVariant = (overrides: Partial<Variant>): Variant => ({
  id: 1,
  word_id: 1,
  variant: 'test',
  date_added: '2024-01-01',
  notes: null,
  created_at: '2024-01-01',
  ...overrides,
});

describe('sortHelpers', () => {
  describe('sortWords', () => {
    const words: Word[] = [
      makeWord({ id: 1, word: 'banana', date_added: '2024-01-15' }),
      makeWord({ id: 2, word: 'apple', date_added: '2024-01-20' }),
      makeWord({ id: 3, word: 'cherry', date_added: '2024-01-10' }),
    ];

    it('sorts by date descending', () => {
      const sorted = sortWords(words, 'date_desc');
      expect(sorted[0].word).toBe('apple');
      expect(sorted[1].word).toBe('banana');
      expect(sorted[2].word).toBe('cherry');
    });

    it('sorts by date ascending', () => {
      const sorted = sortWords(words, 'date_asc');
      expect(sorted[0].word).toBe('cherry');
      expect(sorted[1].word).toBe('banana');
      expect(sorted[2].word).toBe('apple');
    });

    it('sorts alphabetically A-Z', () => {
      const sorted = sortWords(words, 'alpha_asc');
      expect(sorted[0].word).toBe('apple');
      expect(sorted[1].word).toBe('banana');
      expect(sorted[2].word).toBe('cherry');
    });

    it('sorts alphabetically Z-A', () => {
      const sorted = sortWords(words, 'alpha_desc');
      expect(sorted[0].word).toBe('cherry');
      expect(sorted[1].word).toBe('banana');
      expect(sorted[2].word).toBe('apple');
    });

    it('does not mutate the original array', () => {
      const original = [...words];
      sortWords(words, 'alpha_asc');
      expect(words).toEqual(original);
    });

    it('handles empty array', () => {
      expect(sortWords([], 'date_desc')).toEqual([]);
    });

    it('handles single element', () => {
      const single = [makeWord({ word: 'only' })];
      expect(sortWords(single, 'date_desc')).toHaveLength(1);
    });
  });

  describe('sortVariants', () => {
    const variants: Variant[] = [
      makeVariant({ id: 1, variant: 'bah', date_added: '2024-01-15' }),
      makeVariant({ id: 2, variant: 'aah', date_added: '2024-01-20' }),
      makeVariant({ id: 3, variant: 'cah', date_added: '2024-01-10' }),
    ];

    it('sorts by date descending', () => {
      const sorted = sortVariants(variants, 'date_desc');
      expect(sorted[0].variant).toBe('aah');
      expect(sorted[2].variant).toBe('cah');
    });

    it('sorts by date ascending', () => {
      const sorted = sortVariants(variants, 'date_asc');
      expect(sorted[0].variant).toBe('cah');
      expect(sorted[2].variant).toBe('aah');
    });

    it('sorts alphabetically A-Z', () => {
      const sorted = sortVariants(variants, 'alpha_asc');
      expect(sorted[0].variant).toBe('aah');
      expect(sorted[1].variant).toBe('bah');
      expect(sorted[2].variant).toBe('cah');
    });

    it('sorts alphabetically Z-A', () => {
      const sorted = sortVariants(variants, 'alpha_desc');
      expect(sorted[0].variant).toBe('cah');
      expect(sorted[2].variant).toBe('aah');
    });

    it('does not mutate the original array', () => {
      const original = [...variants];
      sortVariants(variants, 'alpha_asc');
      expect(variants).toEqual(original);
    });
  });
});
