import type { ParentType, AssetType } from '../types/asset';

export const QUERY_KEYS = {
  words: (search?: string) => ['words', { search: search ?? '' }] as const,
  variantsByWord: (wordId: number) => ['words', wordId, 'variants'] as const,
  allVariants: () => ['variants'] as const,
  categories: () => ['categories'] as const,
  dashboard: () => ['dashboard'] as const,
  memories: () => ['memories'] as const,
  wordCount: (id: number) => ['wordCounts', id] as const,
  assets: (parentType: ParentType, parentId: number) =>
    ['assets', parentType, parentId] as const,
  assetsByType: (parentType: ParentType, parentId: number, assetType: AssetType) =>
    ['assets', parentType, parentId, assetType] as const,
  allAssets: (search?: string, assetType?: AssetType | null, sortKey?: string) =>
    ['allAssets', { search: search ?? '', assetType: assetType ?? null, sortKey: sortKey ?? 'date_desc' }] as const,
} as const;

// Keys to invalidate after word mutations (word count + variant count affect dashboard)
export const WORD_MUTATION_KEYS = [
  ['words'],
  ['dashboard'],
  ['memories'],
  ['wordCounts'], // per-category word count (used in delete confirmation)
] as const;

// Keys to invalidate after variant mutations
export const VARIANT_MUTATION_KEYS = [
  ['variants'],
  ['words'],
  ['dashboard'],
  ['memories'],
] as const;

// Keys to invalidate after category mutations
export const CATEGORY_MUTATION_KEYS = [
  ['categories'],
  ['words'], // word list shows category name/color
] as const;

// Keys to invalidate after asset mutations
export const ASSET_MUTATION_KEYS = [
  ['assets'],
  ['allAssets'],
  ['words'],
  ['variants'],
  ['dashboard'],
  ['memories'],
] as const;
