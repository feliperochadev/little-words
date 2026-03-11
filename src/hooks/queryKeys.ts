export const QUERY_KEYS = {
  words: (search?: string) => ['words', { search: search ?? '' }] as const,
  variantsByWord: (wordId: number) => ['words', wordId, 'variants'] as const,
  allVariants: () => ['variants'] as const,
  categories: () => ['categories'] as const,
  dashboard: () => ['dashboard'] as const,
  wordCount: (id: number) => ['wordCounts', id] as const,
} as const;

// Keys to invalidate after word mutations (word count + variant count affect dashboard)
export const WORD_MUTATION_KEYS = [
  ['words'],
  ['dashboard'],
  ['wordCounts'], // per-category word count (used in delete confirmation)
] as const;

// Keys to invalidate after variant mutations
export const VARIANT_MUTATION_KEYS = [
  ['variants'],
  ['words'],
  ['dashboard'],
] as const;

// Keys to invalidate after category mutations
export const CATEGORY_MUTATION_KEYS = [
  ['categories'],
  ['words'], // word list shows category name/color
] as const;
