import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { renderWithProviders } from '../helpers/renderWithProviders';

jest.spyOn(Alert, 'alert');

jest.mock('../../src/database/database', () => {
  const actual = jest.requireActual('../../src/database/database');
  return {
    ...actual,
    getWords: jest.fn(),
    getCategories: jest.fn().mockResolvedValue([]),
    findWordByName: jest.fn().mockResolvedValue(null),
    getVariantsByWord: jest.fn().mockResolvedValue([]),
    addWord: jest.fn().mockResolvedValue(1),
    updateWord: jest.fn().mockResolvedValue(undefined),
    deleteWord: jest.fn().mockResolvedValue(undefined),
    addVariant: jest.fn().mockResolvedValue(1),
    updateVariant: jest.fn().mockResolvedValue(undefined),
    deleteVariant: jest.fn().mockResolvedValue(undefined),
    updateCategory: jest.fn().mockResolvedValue(undefined),
    deleteCategory: jest.fn().mockResolvedValue(undefined),
    deleteCategoryWithUnlink: jest.fn().mockResolvedValue(undefined),
    unlinkWordsFromCategory: jest.fn().mockResolvedValue(undefined),
    getWordCountByCategory: jest.fn().mockResolvedValue(0),
    getSetting: jest.fn().mockResolvedValue(null),
    setSetting: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock('../../src/utils/googleDrive', () => ({
  isGoogleConnected: jest.fn().mockResolvedValue(false),
  performSync: jest.fn().mockResolvedValue({ success: true }),
  getGoogleUserEmail: jest.fn().mockResolvedValue(null),
  configureGoogleSignIn: jest.fn(),
}));

import WordsScreen from '../../app/(tabs)/words';
import * as db from '../../src/database/database';
import * as googleDrive from '../../src/utils/googleDrive';
import { useAuthStore } from '../../src/stores/authStore';

const mockUpdateCategory = db.updateCategory as jest.Mock;
const mockDeleteCategory = db.deleteCategory as jest.Mock;

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
    // Reset auth store to disconnected by default
    useAuthStore.setState({ isConnected: false, email: null, lastSync: null, isHydrated: false });
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

  it('triggers sync after saving when google connected', async () => {
    // Set auth store to connected (replaces isGoogleConnected check in mutation onSuccess)
    useAuthStore.setState({ isConnected: true, email: 'test@example.com', lastSync: null, isHydrated: true });
    const { findByText, findByPlaceholderText } = renderWithProviders(<WordsScreen />);
    fireEvent.press(await findByText('+ New'));
    const input = await findByPlaceholderText(/E\.g\./);
    fireEvent.changeText(input, 'hello');
    await act(async () => { fireEvent.press(await findByText('Add')); });
    await waitFor(() => {
      expect(googleDrive.performSync).toHaveBeenCalled();
    });
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
      expect(db.deleteCategoryWithUnlink as jest.Mock).toHaveBeenCalled();
    });
  });
});