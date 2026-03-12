import React from 'react';
import { waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { useSettingsStore } from '../../src/stores/settingsStore';

jest.mock('../../src/database/database', () => {
  const actual = jest.requireActual('../../src/database/database');
  return {
    ...actual,
    getDashboardStats: jest.fn(),
    getSetting: jest.fn(),
  };
});

import DashboardScreen from '../../app/(tabs)/home';
import * as db from '../../src/database/database';

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
    (db.getSetting as jest.Mock).mockResolvedValue(null);
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

  it('renders boy profile', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    useSettingsStore.setState({ name: 'Miguel', sex: 'boy', birth: '2024-01-01', isOnboardingDone: true, isHydrated: true });
    const { getByText } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => {
      expect(getByText('Miguel')).toBeTruthy();
      expect(getByText('👦')).toBeTruthy();
    });
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
});
