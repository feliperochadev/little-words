import {
  getTotalWordCount,
  getTotalVariantCount,
  getWordCountForDate,
  getWordCountSinceDate,
  getCategoryCounts,
  getRecentWords,
  getMonthlyProgress,
} from '../repositories/dashboardRepository';
import type { DashboardStats } from '../types/domain';

export type { DashboardStats } from '../types/domain';

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const [
    totalWords,
    totalVariants,
    wordsToday,
    wordsThisWeek,
    wordsThisMonth,
    categoryCounts,
    recentWords,
    monthlyProgress,
  ] = await Promise.all([
    getTotalWordCount(),
    getTotalVariantCount(),
    getWordCountForDate(todayStr),
    getWordCountSinceDate(weekAgo),
    getWordCountSinceDate(monthStart),
    getCategoryCounts(),
    getRecentWords(10),
    getMonthlyProgress(12),
  ]);

  return {
    totalWords,
    totalVariants,
    wordsToday,
    wordsThisWeek,
    wordsThisMonth,
    categoryCounts,
    recentWords,
    monthlyProgress,
  };
};
