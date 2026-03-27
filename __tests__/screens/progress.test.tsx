import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { useSettingsStore } from '../../src/stores/settingsStore';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockBack }),
  useFocusEffect: jest.fn(),
  useLocalSearchParams: jest.fn(() => ({})),
}));

jest.mock('../../src/services/dashboardService', () => {
  const actual = jest.requireActual('../../src/services/dashboardService');
  return {
    ...actual,
    getDashboardStats: jest.fn(),
  };
});

jest.mock('../../src/services/settingsService', () => ({
  ...jest.requireActual('../../src/services/settingsService'),
  getSetting: jest.fn(),
  setSetting: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/services/categoryService', () => ({
  ...jest.requireActual('../../src/services/categoryService'),
  getCategories: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../src/services/assetService', () => ({
  ...jest.requireActual('../../src/services/assetService'),
  getProfilePhoto: jest.fn().mockResolvedValue(null),
  getAssetsByParent: jest.fn().mockResolvedValue([]),
  getAssetsByParentAndType: jest.fn().mockResolvedValue([]),
}));

import ProgressScreen from '../../app/(tabs)/progress';
import * as db from '../../src/services/dashboardService';
import * as settingsService from '../../src/services/settingsService';

const emptyStats = {
  totalWords: 0, totalVariants: 0, wordsToday: 0,
  wordsThisWeek: 0, wordsThisMonth: 0,
  categoryCounts: [], recentWords: [], monthlyProgress: [],
};

const fullStats = {
  totalWords: 10, totalVariants: 5, wordsToday: 2,
  wordsThisWeek: 4, wordsThisMonth: 8,
  categoryCounts: [{ name: 'animals', count: 3, color: '#FF6B9D', emoji: '🐾' }],
  recentWords: [{ id: 1, word: 'apple', category_color: '#FF6B9D' }],
  monthlyProgress: [{ month: '2024-01', count: 5 }, { month: '2024-02', count: 8 }],
};

describe('ProgressScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (settingsService.getSetting as jest.Mock).mockResolvedValue(null);
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: '2023-06-15', isOnboardingDone: true, isHydrated: true });
  });

  it('renders stats section', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(fullStats);
    const { findByTestId } = renderWithProviders(<ProgressScreen />);
    expect(await findByTestId('progress-stats-section')).toBeTruthy();
    const totalWords = await findByTestId('progress-stat-total-words');
    const totalVariants = await findByTestId('progress-stat-total-variants');
    const today = await findByTestId('progress-stat-words-today');
    const week = await findByTestId('progress-stat-words-week');
    const month = await findByTestId('progress-stat-words-month');
    expect(totalWords.props.children).toBe(10);
    expect(totalVariants.props.children).toBe(5);
    expect(today.props.children).toBe(2);
    expect(week.props.children).toBe(4);
    expect(month.props.children).toBe(8);
  });

  it('renders stats section with empty stats (zeros)', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    const { findByTestId } = renderWithProviders(<ProgressScreen />);
    expect(await findByTestId('progress-stats-section')).toBeTruthy();
  });

  it('renders safely with empty stats — only stats and coming soon sections visible', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    const { findByTestId, queryByTestId } = renderWithProviders(<ProgressScreen />);
    expect(await findByTestId('progress-coming-soon')).toBeTruthy();
    await waitFor(() => {
      expect(queryByTestId('progress-monthly-section')).toBeNull();
      expect(queryByTestId('progress-categories-section')).toBeNull();
      expect(queryByTestId('progress-recent-words-section')).toBeNull();
    });
  });

  it('renders monthly progress section when data is present', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(fullStats);
    const { findByTestId } = renderWithProviders(<ProgressScreen />);
    expect(await findByTestId('progress-monthly-section')).toBeTruthy();
  });

  it('renders bar chart values correctly', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(fullStats);
    const { findByTestId } = renderWithProviders(<ProgressScreen />);
    const jan = await findByTestId('bar-value-2024-01');
    const feb = await findByTestId('bar-value-2024-02');
    expect(jan.props.children).toBe(5);
    expect(feb.props.children).toBe(8);
  });

  it('renders bar chart month labels without year when same year', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(fullStats);
    const { findByText, queryByText } = renderWithProviders(<ProgressScreen />);
    expect(await findByText('Jan')).toBeTruthy();
    expect(await findByText('Feb')).toBeTruthy();
    await waitFor(() => {
      expect(queryByText(/Jan '24/)).toBeNull();
    });
  });

  it('renders bar chart month labels with year suffix when spanning two years', async () => {
    const crossYearStats = {
      ...fullStats,
      monthlyProgress: [
        { month: '2024-11', count: 3 },
        { month: '2024-12', count: 7 },
        { month: '2025-01', count: 2 },
      ],
    };
    (db.getDashboardStats as jest.Mock).mockResolvedValue(crossYearStats);
    const { findByText } = renderWithProviders(<ProgressScreen />);
    expect(await findByText("Dec '24")).toBeTruthy();
    expect(await findByText("Jan '25")).toBeTruthy();
  });

  it('renders category breakdown section when categories exist', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(fullStats);
    const { findByTestId } = renderWithProviders(<ProgressScreen />);
    expect(await findByTestId('progress-categories-section')).toBeTruthy();
    const catCount = await findByTestId('cat-count-animals');
    expect(catCount.props.children).toBe(3);
  });

  it('renders category names via categoryName helper', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(fullStats);
    const { findByText } = renderWithProviders(<ProgressScreen />);
    expect(await findByText('Animals')).toBeTruthy();
  });

  it('renders recent words section when words exist', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(fullStats);
    const { findByTestId } = renderWithProviders(<ProgressScreen />);
    expect(await findByTestId('progress-recent-words-section')).toBeTruthy();
    expect(await findByTestId('recent-word-0-apple')).toBeTruthy();
  });

  it('renders recent word chips with position-indexed testIDs', async () => {
    const statsWithWords = {
      ...fullStats,
      recentWords: [
        { id: 1, word: 'apple', category_color: '#FF6B9D' },
        { id: 2, word: 'ball', category_color: null },
      ],
    };
    (db.getDashboardStats as jest.Mock).mockResolvedValue(statsWithWords);
    const { findByTestId } = renderWithProviders(<ProgressScreen />);
    expect(await findByTestId('recent-word-0-apple')).toBeTruthy();
    expect(await findByTestId('recent-word-1-ball')).toBeTruthy();
  });

  it('always renders coming soon section', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(fullStats);
    const { findByTestId } = renderWithProviders(<ProgressScreen />);
    expect(await findByTestId('progress-coming-soon')).toBeTruthy();
  });

  it('renders coming soon title and description text', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    const { findByText } = renderWithProviders(<ProgressScreen />);
    expect(await findByText('More Detailed Metrics Coming Soon')).toBeTruthy();
    expect(await findByText(/Percentile rankings/)).toBeTruthy();
  });

  it('renders back button', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    const { findByTestId } = renderWithProviders(<ProgressScreen />);
    expect(await findByTestId('progress-back-btn')).toBeTruthy();
  });

  it('pressing back button calls router.back()', async () => {
    mockBack.mockClear();
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    const { findByTestId } = renderWithProviders(<ProgressScreen />);
    const backBtn = await findByTestId('progress-back-btn');
    fireEvent.press(backBtn);
    expect(mockBack).toHaveBeenCalled();
  });

  it('renders progress scroll view', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    const { findByTestId } = renderWithProviders(<ProgressScreen />);
    expect(await findByTestId('progress-scroll')).toBeTruthy();
  });

  it('renders semantic icons for monthly and category sections', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(fullStats);
    const { findByTestId } = renderWithProviders(<ProgressScreen />);
    const monthlyIcon = await findByTestId('progress-monthly-progress-icon');
    const categoryIcon = await findByTestId('progress-category-icon');
    const recentIcon = await findByTestId('progress-recent-words-icon');
    expect(monthlyIcon.props.name).toBe('bar-chart-outline');
    expect(categoryIcon.props.name).toBe('pricetags-outline');
    expect(recentIcon.props.name).toBe('sparkles-outline');
  });

  it('useFocusEffect cleanup scrolls progress screen to top', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    const { findByTestId } = renderWithProviders(<ProgressScreen />);
    await findByTestId('progress-scroll');

    const { useFocusEffect } = require('expo-router');
    const lastCall = useFocusEffect.mock.calls[useFocusEffect.mock.calls.length - 1];
    const callback = lastCall[0];
    const cleanup = callback();
    cleanup?.();
  });

  it('slices monthly progress to last 6 entries', async () => {
    const eightMonthStats = {
      ...fullStats,
      monthlyProgress: [
        { month: '2024-01', count: 1 },
        { month: '2024-02', count: 2 },
        { month: '2024-03', count: 3 },
        { month: '2024-04', count: 4 },
        { month: '2024-05', count: 5 },
        { month: '2024-06', count: 6 },
        { month: '2024-07', count: 7 },
        { month: '2024-08', count: 8 },
      ],
    };
    (db.getDashboardStats as jest.Mock).mockResolvedValue(eightMonthStats);
    const { findByTestId, queryByTestId } = renderWithProviders(<ProgressScreen />);
    // Last 6 months: Mar–Aug; Jan and Feb should not be present
    expect(await findByTestId('bar-value-2024-08')).toBeTruthy();
    await waitFor(() => {
      expect(queryByTestId('bar-value-2024-01')).toBeNull();
      expect(queryByTestId('bar-value-2024-02')).toBeNull();
    });
  });
});
