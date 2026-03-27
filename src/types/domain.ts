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
  audio_count?: number;
  photo_count?: number;
  video_count?: number;
}

// ─── Memories Timeline ───────────────────────────────────────────────────────

export interface TimelineItem {
  id: number;
  text: string;
  item_type: 'word' | 'variant';
  created_at: string;
  date_added: string;
  main_word_text: string | null;
  word_id: number | null;
  audio_count: number;
  photo_count: number;
  first_photo_filename: string | null;
  first_photo_mime: string | null;
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
