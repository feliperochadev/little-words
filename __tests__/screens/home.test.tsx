import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { useSettingsStore } from '../../src/stores/settingsStore';

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

jest.mock('../../src/services/wordService', () => ({
  ...jest.requireActual('../../src/services/wordService'),
  addWord: jest.fn().mockResolvedValue(1),
  updateWord: jest.fn().mockResolvedValue(undefined),
  deleteWord: jest.fn().mockResolvedValue(undefined),
  findWordByName: jest.fn().mockResolvedValue(null),
  getWords: jest.fn().mockResolvedValue([]),
}));

import DashboardScreen from '../../app/(tabs)/home';
import * as db from '../../src/services/dashboardService';
import * as settingsService from '../../src/services/settingsService';
import { getThemeForSex } from '../../src/theme/getThemeForSex';

function flattenStyle(style: unknown): Record<string, unknown> {
  return Array.isArray(style) ? Object.assign({}, ...style) : (style as Record<string, unknown> ?? {});
}

const emptyStats = {
  totalWords: 0, totalVariants: 0, wordsToday: 0,
  wordsThisWeek: 0, wordsThisMonth: 0,
  categoryCounts: [], recentWords: [], monthlyProgress: [],
};

const fullStats = {
  totalWords: 10, totalVariants: 5, wordsToday: 2,
  wordsThisWeek: 4, wordsThisMonth: 8,
  categoryCounts: [{ name: 'animals', count: 3, color: '#FF6B9D', emoji: '🐾' }],
  recentWords: [{ id: 1, word: 'mamãe', category_color: '#FF6B9D' }],
  monthlyProgress: [{ month: '2024-01', count: 5 }, { month: '2024-02', count: 8 }],
};

describe('DashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (settingsService.getSetting as jest.Mock).mockResolvedValue(null);
    // Reset store to no-profile state
    useSettingsStore.setState({ name: '', sex: null, birth: '', isOnboardingDone: false, isHydrated: true });
  });

  it('renders empty dashboard', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    const { getByText } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => {
      expect(getByText(/Start recording/)).toBeTruthy();
    });
  });

  it('renders stats with profile', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(fullStats);
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: '2023-06-15', isOnboardingDone: true, isHydrated: true });
    const { findByText } = renderWithProviders(<DashboardScreen />);
    expect(await findByText('Luna')).toBeTruthy();
    expect(await findByText('10')).toBeTruthy();
    expect(await findByText('Animals')).toBeTruthy();
    expect(await findByText('mamãe')).toBeTruthy();
  });

  it('renders semantic section icons for monthly/category/recent blocks', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(fullStats);
    const { findByTestId } = renderWithProviders(<DashboardScreen />);
    const monthlyIcon = await findByTestId('home-monthly-progress-icon');
    const categoryIcon = await findByTestId('home-category-icon');
    const recentIcon = await findByTestId('home-recent-words-icon');
    expect(monthlyIcon.props.name).toBe('bar-chart-outline');
    expect(categoryIcon.props.name).toBe('pricetags-outline');
    expect(recentIcon.props.name).toBe('sparkles-outline');
  });

  it('renders boy profile', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    useSettingsStore.setState({ name: 'Miguel', sex: 'boy', birth: '2024-01-01', isOnboardingDone: true, isHydrated: true });
    const { getByText } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => {
      expect(getByText('Miguel')).toBeTruthy();
      expect(getByText('👦')).toBeTruthy();
    });
  });

  it('uses breeze background on home container for boy profile', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    useSettingsStore.setState({ name: 'Miguel', sex: 'boy', birth: '2024-01-01', isOnboardingDone: true, isHydrated: true });
    const { findByTestId } = renderWithProviders(<DashboardScreen />);
    const scroll = await findByTestId('home-scroll');
    const breezeBg = getThemeForSex('boy').colors.background;
    expect(flattenStyle(scroll.props.style).backgroundColor).toBe(breezeBg);
  });

  it('renders without profile', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    const { getByText } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => {
      expect(getByText(/Start recording/)).toBeTruthy();
    });
  });

  it('renders monthly progress chart without year when all months are in same year', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(fullStats);
    const { getByText, queryByText } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => {
      expect(getByText('Jan')).toBeTruthy();
      expect(getByText('Feb')).toBeTruthy();
      // Year suffix should NOT appear when all months are in the same year
      expect(queryByText(/Jan '24/)).toBeNull();
      expect(queryByText(/Feb '24/)).toBeNull();
    });
  });

  it('renders monthly progress chart with year suffix when months span two years', async () => {
    const crossYearStats = {
      ...fullStats,
      monthlyProgress: [
        { month: '2024-10', count: 3 },
        { month: '2024-11', count: 5 },
        { month: '2024-12', count: 7 },
        { month: '2025-01', count: 2 },
        { month: '2025-02', count: 4 },
        { month: '2025-03', count: 6 },
      ],
    };
    (db.getDashboardStats as jest.Mock).mockResolvedValue(crossYearStats);
    const { getByText } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => {
      // When years differ, labels should include the 2-digit year
      expect(getByText("Dec '24")).toBeTruthy();
      expect(getByText("Jan '25")).toBeTruthy();
      expect(getByText("Mar '25")).toBeTruthy();
    });
  });

  it('renders stat cards with testIDs', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(fullStats);
    const { getByTestId } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => {
      expect(getByTestId('stat-total-words').props.children).toBe(10);
      expect(getByTestId('stat-total-variants').props.children).toBe(5);
      expect(getByTestId('stat-words-today').props.children).toBe(2);
      expect(getByTestId('stat-words-week').props.children).toBe(4);
      expect(getByTestId('stat-words-month').props.children).toBe(8);
    });
  });

  it('renders bar chart with testIDs for month values', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(fullStats);
    const { getByTestId } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => {
      expect(getByTestId('bar-value-2024-01').props.children).toBe(5);
      expect(getByTestId('bar-value-2024-02').props.children).toBe(8);
    });
  });

  it('renders category count with testID using category name key', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(fullStats);
    const { getByTestId } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => {
      expect(getByTestId('cat-count-animals').props.children).toBe(3);
    });
  });

  it('renders recent word chips with position-indexed testIDs', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue({
      ...fullStats,
      recentWords: [
        { id: 1, word: 'apple', category_color: '#FF6B9D' },
        { id: 2, word: 'ball', category_color: null },
      ],
    });
    const { getByTestId } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => {
      expect(getByTestId('recent-words-section')).toBeTruthy();
      expect(getByTestId('recent-word-0-apple')).toBeTruthy();
      expect(getByTestId('recent-word-1-ball')).toBeTruthy();
    });
  });


  it('does not show add-word button when totalWords is 0', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    const { queryByTestId } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => {
      expect(queryByTestId('home-add-word-btn')).toBeNull();
    });
  });

  it('shows add-word button when totalWords > 0', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(fullStats);
    const { findByTestId } = renderWithProviders(<DashboardScreen />);
    expect(await findByTestId('home-add-word-btn')).toBeTruthy();
  });

  it('shows add-first-word button in empty state and pressing it opens AddWordModal', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    const { findByTestId } = renderWithProviders(<DashboardScreen />);
    const btn = await findByTestId('home-add-first-word-btn');
    expect(btn).toBeTruthy();
    fireEvent.press(btn);
    expect(await findByTestId('modal-title-new-word')).toBeTruthy();
  });

  it('does not show year suffix for single-year 6-month window', async () => {
    const singleYearStats = {
      ...fullStats,
      monthlyProgress: [
        { month: '2025-01', count: 1 },
        { month: '2025-02', count: 2 },
        { month: '2025-03', count: 3 },
        { month: '2025-04', count: 4 },
        { month: '2025-05', count: 5 },
        { month: '2025-06', count: 6 },
      ],
    };
    (db.getDashboardStats as jest.Mock).mockResolvedValue(singleYearStats);
    const { getByText, queryByText } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => {
      expect(getByText('Jan')).toBeTruthy();
      expect(getByText('Jun')).toBeTruthy();
      expect(queryByText(/'25/)).toBeNull();
    });
  });

  it('renders ProfileAvatar with testID when name is set', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: '2023-06-15', isOnboardingDone: true, isHydrated: true });
    const { findByTestId } = renderWithProviders(<DashboardScreen />);
    expect(await findByTestId('home-profile-avatar')).toBeTruthy();
  });

  it('tapping profile avatar opens EditProfileModal', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: '2023-06-15', isOnboardingDone: true, isHydrated: true });
    const { findByTestId } = renderWithProviders(<DashboardScreen />);
    fireEvent.press(await findByTestId('home-profile-avatar'));
    expect(await findByTestId('edit-profile-title')).toBeTruthy();
  });
});
