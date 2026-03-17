import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { getThemeForSex } from '../../src/theme/getThemeForSex';

jest.spyOn(Alert, 'alert');

jest.mock('../../src/services/wordService', () => ({
  ...jest.requireActual('../../src/services/wordService'),
  getWords: jest.fn(),
  findWordByName: jest.fn().mockResolvedValue(null),
  getVariantsByWord: jest.fn().mockResolvedValue([]),
  addWord: jest.fn().mockResolvedValue(1),
  updateWord: jest.fn().mockResolvedValue(undefined),
  deleteWord: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/services/categoryService', () => ({
  ...jest.requireActual('../../src/services/categoryService'),
  getCategories: jest.fn().mockResolvedValue([]),
  updateCategory: jest.fn().mockResolvedValue(undefined),
  deleteCategory: jest.fn().mockResolvedValue(undefined),
  deleteCategoryWithUnlink: jest.fn().mockResolvedValue(undefined),
  unlinkWordsFromCategory: jest.fn().mockResolvedValue(undefined),
  getWordCountByCategory: jest.fn().mockResolvedValue(0),
}));

jest.mock('../../src/services/variantService', () => ({
  ...jest.requireActual('../../src/services/variantService'),
  addVariant: jest.fn().mockResolvedValue(1),
  updateVariant: jest.fn().mockResolvedValue(undefined),
  deleteVariant: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/services/settingsService', () => ({
  ...jest.requireActual('../../src/services/settingsService'),
  getSetting: jest.fn().mockResolvedValue(null),
  setSetting: jest.fn().mockResolvedValue(undefined),
}));

import WordsScreen from '../../app/(tabs)/words';
import * as db from '../../src/services/wordService';
import * as categoryService from '../../src/services/categoryService';

const mockUpdateCategory = categoryService.updateCategory as jest.Mock;
const mockDeleteCategory = categoryService.deleteCategory as jest.Mock;

function flattenStyle(style: unknown): Record<string, unknown> {
  return Array.isArray(style) ? Object.assign({}, ...style) : (style as Record<string, unknown> ?? {});
}

const sampleWords = [
  {
    id: 1, word: 'mamãe', category_id: 1, date_added: '2024-01-15',
    notes: 'first word', created_at: '2024-01-15',
    category_name: 'animals', category_color: '#FF6B9D', category_emoji: '🐾',
    variant_count: 1, variant_texts: 'mamá',
  },
  {
    id: 2, word: 'água', category_id: null, date_added: '2024-02-01',
    notes: null, created_at: '2024-02-01',
    variant_count: 0, variant_texts: null,
  },
];

describe('WordsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (db.getWords as jest.Mock).mockResolvedValue(sampleWords);
    useSettingsStore.setState({ name: 'Leo', sex: 'boy', birth: '', isOnboardingDone: true, isHydrated: true });
  });

  it('renders words list', async () => {
    const { findByText } = renderWithProviders(<WordsScreen />);
    expect(await findByText('mamãe', {}, { timeout: 5000 })).toBeTruthy();
    expect(await findByText('água', {}, { timeout: 5000 })).toBeTruthy();
  });

  it('renders word count', async () => {
    const { findByText } = renderWithProviders(<WordsScreen />);
    expect(await findByText(/2 words/)).toBeTruthy();
  });

  it('renders add word button', async () => {
    const { findByText } = renderWithProviders(<WordsScreen />);
    expect(await findByText('+ New')).toBeTruthy();
  });

  it('renders semantic title and sort icons', async () => {
    const { findByTestId } = renderWithProviders(<WordsScreen />);
    const titleIcon = await findByTestId('words-title-icon');
    const sortIcon = await findByTestId('words-sort-icon');
    expect(titleIcon.props.name).toBe('book-outline');
    expect(sortIcon.props.name).toBe('calendar-outline');
  });

  it('uses breeze primary on + add word button for boy profile', async () => {
    const { findByTestId } = renderWithProviders(<WordsScreen />);
    const addBtn = await findByTestId('words-add-btn');
    const style = flattenStyle(addBtn.props.style);
    expect(style.backgroundColor).toBe(getThemeForSex('boy').colors.primary);
  });

  it('renders search bar', async () => {
    const { findByPlaceholderText } = renderWithProviders(<WordsScreen />);
    expect(await findByPlaceholderText('Search words...')).toBeTruthy();
  });

  it('shows empty state when no words', async () => {
    (db.getWords as jest.Mock).mockResolvedValue([]);
    const { findByText } = renderWithProviders(<WordsScreen />);
    expect(await findByText(/No words yet/)).toBeTruthy();
  });

  it('renders category badge on word', async () => {
    const { findByText } = renderWithProviders(<WordsScreen />);
    expect(await findByText('Animals')).toBeTruthy();
  });

  it('renders variant chip', async () => {
    const { findByText } = renderWithProviders(<WordsScreen />);
    expect(await findByText(/mamá/)).toBeTruthy();
  });

  it('swaps variant chip colors in boy mode (icon secondary, text primaryDark)', async () => {
    const { findByTestId } = renderWithProviders(<WordsScreen />);
    const icon = await findByTestId('word-variant-icon-mamá');
    const text = await findByTestId('word-variant-text-mamá');
    expect(icon.props.color).toBe(getThemeForSex('boy').colors.secondary);
    expect(flattenStyle(text.props.style).color).toBe(getThemeForSex('boy').colors.primaryDark);
  });

  it('renders note preview', async () => {
    const { findByText } = renderWithProviders(<WordsScreen />);
    expect(await findByText(/first word/)).toBeTruthy();
  });

  it('renders date formatted', async () => {
    const { findByText } = renderWithProviders(<WordsScreen />);
    expect(await findByText('15/01/2024')).toBeTruthy();
  });

  it('renders sort button', async () => {
    const { findByText } = renderWithProviders(<WordsScreen />);
    expect(await findByText(/Most recent/)).toBeTruthy();
  });

  it('opens add word modal', async () => {
    const { findByText } = renderWithProviders(<WordsScreen />);
    fireEvent.press(await findByText('+ New'));
    expect(await findByText(/New Word/)).toBeTruthy();
  });

  it('toggles sort menu and selects option', async () => {
    const { findByText, queryByText } = renderWithProviders(<WordsScreen />);
    fireEvent.press(await findByText(/Most recent/));
    expect(await findByText(/A → Z/)).toBeTruthy();
    fireEvent.press(await findByText(/A → Z/));
    expect(queryByText(/Most recent/)).toBeNull();
  });

  it('filters words by search', async () => {
    const { findByPlaceholderText } = renderWithProviders(<WordsScreen />);
    const searchInput = await findByPlaceholderText('Search words...');
    fireEvent.changeText(searchInput, 'mamãe');
    await waitFor(() => {
      expect(db.getWords).toHaveBeenCalledWith('mamãe');
    });
  });

  it('opens edit word modal on word press', async () => {
    const { findByText } = renderWithProviders(<WordsScreen />);
    fireEvent.press(await findByText('mamãe'));
    expect(await findByText(/Edit Word/)).toBeTruthy();
  });

  it('shows empty search state', async () => {
    (db.getWords as jest.Mock).mockResolvedValue([]);
    const { findByPlaceholderText, findByText } = renderWithProviders(<WordsScreen />);
    const searchInput = await findByPlaceholderText('Search words...');
    fireEvent.changeText(searchInput, 'xyz');
    expect(await findByText(/No words found/)).toBeTruthy();
  });

  it('shows add first word action in empty state', async () => {
    (db.getWords as jest.Mock).mockResolvedValue([]);
    const { findByText } = renderWithProviders(<WordsScreen />);
    const addBtn = await findByText(/Add Word/);
    fireEvent.press(addBtn);
    expect(await findByText(/New Word/)).toBeTruthy();
  });

  it('handles word deletion from modal', async () => {
    const { findByText } = renderWithProviders(<WordsScreen />);
    fireEvent.press(await findByText('mamãe'));
    expect(await findByText(/Edit Word/)).toBeTruthy();
  });

  it('opens category edit on long press', async () => {
    const { findByText } = renderWithProviders(<WordsScreen />);
    fireEvent(await findByText('Animals'), 'longPress');
    expect(await findByText(/Edit Category/)).toBeTruthy();
  });

  it('opens edit word via card area press', async () => {
    const { findByText } = renderWithProviders(<WordsScreen />);
    fireEvent.press(await findByText(/first word/));
    expect(await findByText(/Edit Word/)).toBeTruthy();
  });

  it('handles word deletion and closes modal', async () => {
    const { findByText } = renderWithProviders(<WordsScreen />);
    fireEvent.press(await findByText('mamãe'));
    expect(await findByText(/Edit Word/)).toBeTruthy();
    fireEvent.press(await findByText(/Remove/));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const destructiveBtn = alertCall[2].find((b: any) => b.style === 'destructive');
    await act(async () => { destructiveBtn.onPress(); });
    await waitFor(() => {
      expect(db.deleteWord).toHaveBeenCalledWith(1);
    });
  });

  it('handles duplicate word edit redirect', async () => {
    jest.useFakeTimers();
    (db.findWordByName as jest.Mock).mockResolvedValue({
      id: 99, word: 'hello', date_added: '2024-06-01', category_name: 'food',
      category_color: '#00B894', category_emoji: '🍎', variant_count: 0, notes: '',
    });
    const { findByText, findByPlaceholderText } = renderWithProviders(<WordsScreen />);
    fireEvent.press(await findByText('+ New'));
    const input = await findByPlaceholderText(/E\.g\./);
    fireEvent.changeText(input, 'hello');
    await act(async () => { jest.advanceTimersByTime(500); });
    fireEvent.press(await findByText('hello'));
    await act(async () => { jest.advanceTimersByTime(400); });
    expect(await findByText(/Edit Word/)).toBeTruthy();
    jest.useRealTimers();
  });

  it('closes add word modal on cancel', async () => {
    const { findByText, queryByText } = renderWithProviders(<WordsScreen />);
    fireEvent.press(await findByText('+ New'));
    expect(await findByText(/New Word/)).toBeTruthy();
    fireEvent.press(await findByText('Cancel'));
    await waitFor(() => {
      expect(queryByText(/New Word/)).toBeNull();
    });
  });

  it('closes AddCategoryModal via Cancel', async () => {
    const { findByText, queryByText } = renderWithProviders(<WordsScreen />);
    fireEvent(await findByText('Animals'), 'longPress');
    expect(await findByText(/Edit Category/)).toBeTruthy();
    fireEvent.press(await findByText('Cancel'));
    await waitFor(() => {
      expect(queryByText(/Edit Category/)).toBeNull();
    });
  });

  it('saves category edit from words screen', async () => {
    const { findByText } = renderWithProviders(<WordsScreen />);
    fireEvent(await findByText('Animals'), 'longPress');
    expect(await findByText(/Edit Category/)).toBeTruthy();
    await act(async () => { fireEvent.press(await findByText(/Save/)); });
    await waitFor(() => {
      expect(mockUpdateCategory).toHaveBeenCalled();
    });
  });

  it('deletes category from words screen', async () => {
    const { findByText } = renderWithProviders(<WordsScreen />);
    fireEvent(await findByText('Animals'), 'longPress');
    expect(await findByText(/Edit Category/)).toBeTruthy();
    fireEvent.press(await findByText(/Remove/));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const destructiveBtn = alertCall[2].find((b: any) => b.style === 'destructive');
    await act(async () => { destructiveBtn.onPress(); });
    await waitFor(() => {
      expect(categoryService.deleteCategoryWithUnlink as jest.Mock).toHaveBeenCalled();
    });
  });
});
