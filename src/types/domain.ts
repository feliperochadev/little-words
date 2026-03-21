// Re-export asset types for convenience
export type { Asset, NewAsset, ParentType, AssetType, AssetWithLink } from './asset';

// ─── Category ─────────────────────────────────────────────────────────────────

export interface Category {
  id: number;
  name: string;
  color: string;
  emoji: string;
  created_at: string;
}

// ─── Word ─────────────────────────────────────────────────────────────────────

export interface Word {
  id: number;
  word: string;
  category_id: number | null;
  category_name?: string;
  category_color?: string;
  category_emoji?: string;
  date_added: string;
  notes: string | null;
  created_at: string;
  variant_count?: number;
  variant_texts?: string;
  asset_count?: number;
}

// ─── Variant ──────────────────────────────────────────────────────────────────

export interface Variant {
  id: number;
  word_id: number;
  variant: string;
  date_added: string;
  notes: string | null;
  created_at: string;
  main_word?: string;
  asset_count?: number;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalWords: number;
  totalVariants: number;
  wordsThisMonth: number;
  wordsThisWeek: number;
  wordsToday: number;
  categoryCounts: { name: string; count: number; color: string; emoji: string }[];
  recentWords: Word[];
  monthlyProgress: { month: string; count: number }[];
}

// ─── Helper row types ─────────────────────────────────────────────────────────

export interface CountRow {
  count: number;
}

export interface CategoryCountRow {
  name: string;
  count: number;
  color: string;
  emoji: string;
}

export interface MonthProgressRow {
  month: string;
  count: number;
}

export interface SettingRow {
  value: string;
}

export interface CsvRow {
  word: string | null;
  categoria: string | null;
  data: string | null;
  variante: string | null;
}
