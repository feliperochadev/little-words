import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { I18nProvider } from '../../src/i18n/i18n';

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
  });

  it('renders empty dashboard', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    const { getByText } = render(
      <I18nProvider><DashboardScreen /></I18nProvider>
    );
    await waitFor(() => {
      expect(getByText(/Start recording/)).toBeTruthy();
    });
  });

  it('renders stats with profile', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(fullStats);
    (db.getSetting as jest.Mock).mockImplementation((key: string) => {
      if (key === 'child_name') return Promise.resolve('Luna');
      if (key === 'child_sex') return Promise.resolve('girl');
      if (key === 'child_birth') return Promise.resolve('2023-06-15');
      return Promise.resolve(null);
    });
    const { findByText } = render(
      <I18nProvider><DashboardScreen /></I18nProvider>
    );
    expect(await findByText('Luna')).toBeTruthy();
    expect(await findByText('10')).toBeTruthy();
    expect(await findByText('Animals')).toBeTruthy();
    expect(await findByText('mamãe')).toBeTruthy();
  });

  it('renders boy profile', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    (db.getSetting as jest.Mock).mockImplementation((key: string) => {
      if (key === 'child_name') return Promise.resolve('Miguel');
      if (key === 'child_sex') return Promise.resolve('boy');
      if (key === 'child_birth') return Promise.resolve('2024-01-01');
      return Promise.resolve(null);
    });
    const { getByText } = render(
      <I18nProvider><DashboardScreen /></I18nProvider>
    );
    await waitFor(() => {
      expect(getByText('Miguel')).toBeTruthy();
      expect(getByText('👦')).toBeTruthy();
    });
  });

  it('renders without profile', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(emptyStats);
    const { getByText } = render(
      <I18nProvider><DashboardScreen /></I18nProvider>
    );
    await waitFor(() => {
      expect(getByText(/Start recording/)).toBeTruthy();
    });
  });

  it('renders monthly progress chart', async () => {
    (db.getDashboardStats as jest.Mock).mockResolvedValue(fullStats);
    const { getByText } = render(
      <I18nProvider><DashboardScreen /></I18nProvider>
    );
    await waitFor(() => {
      expect(getByText('Jan')).toBeTruthy();
      expect(getByText('Feb')).toBeTruthy();
    });
  });
});
