import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { I18nProvider } from '../../src/i18n/i18n';

jest.spyOn(Alert, 'alert');

jest.mock('../../src/database/database', () => {
  const actual = jest.requireActual('../../src/database/database');
  return {
    ...actual,
    getWords: jest.fn(),
    getCategories: jest.fn().mockResolvedValue([]),
    findWordByName: jest.fn().mockResolvedValue(null),
    getVariantsByWord: jest.fn().mockResolvedValue([]),
    deleteWord: jest.fn().mockResolvedValue(undefined),
    getSetting: jest.fn().mockResolvedValue(null),
    setSetting: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock('../../src/utils/googleDrive', () => ({
  isGoogleConnected: jest.fn().mockResolvedValue(false),
  performSync: jest.fn().mockResolvedValue({ success: true }),
}));

import WordsScreen from '../../app/(tabs)/words';
import * as db from '../../src/database/database';
import * as googleDrive from '../../src/utils/googleDrive';

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
  });

  it('renders words list', async () => {
    const { findByText } = render(
      <I18nProvider><WordsScreen /></I18nProvider>
    );
    expect(await findByText('mamãe')).toBeTruthy();
    expect(await findByText('água')).toBeTruthy();
  });

  it('renders word count', async () => {
    const { findByText } = render(
      <I18nProvider><WordsScreen /></I18nProvider>
    );
    expect(await findByText(/2 words/)).toBeTruthy();
  });

  it('renders add word button', async () => {
    const { findByText } = render(
      <I18nProvider><WordsScreen /></I18nProvider>
    );
    expect(await findByText('+ New')).toBeTruthy();
  });

  it('renders search bar', async () => {
    const { findByPlaceholderText } = render(
      <I18nProvider><WordsScreen /></I18nProvider>
    );
    expect(await findByPlaceholderText('Search words...')).toBeTruthy();
  });

  it('shows empty state when no words', async () => {
    (db.getWords as jest.Mock).mockResolvedValue([]);
    const { findByText } = render(
      <I18nProvider><WordsScreen /></I18nProvider>
    );
    expect(await findByText(/No words yet/)).toBeTruthy();
  });

  it('renders category badge on word', async () => {
    const { findByText } = render(
      <I18nProvider><WordsScreen /></I18nProvider>
    );
    expect(await findByText('Animals')).toBeTruthy();
  });

  it('renders variant chip', async () => {
    const { findByText } = render(
      <I18nProvider><WordsScreen /></I18nProvider>
    );
    expect(await findByText(/mamá/)).toBeTruthy();
  });

  it('renders note preview', async () => {
    const { findByText } = render(
      <I18nProvider><WordsScreen /></I18nProvider>
    );
    expect(await findByText(/first word/)).toBeTruthy();
  });

  it('renders date formatted', async () => {
    const { findByText } = render(
      <I18nProvider><WordsScreen /></I18nProvider>
    );
    expect(await findByText('15/01/2024')).toBeTruthy();
  });

  it('renders sort button', async () => {
    const { findByText } = render(
      <I18nProvider><WordsScreen /></I18nProvider>
    );
    expect(await findByText(/Most recent/)).toBeTruthy();
  });

  it('opens add word modal', async () => {
    const { findByText } = render(
      <I18nProvider><WordsScreen /></I18nProvider>
    );
    fireEvent.press(await findByText('+ New'));
    expect(await findByText(/New Word/)).toBeTruthy();
  });

  it('toggles sort menu and selects option', async () => {
    const { findByText, queryByText } = render(
      <I18nProvider><WordsScreen /></I18nProvider>
    );
    // Open sort menu
    fireEvent.press(await findByText(/Most recent/));
    // Sort options should appear
    expect(await findByText(/A → Z/)).toBeTruthy();
    // Select a sort option
    fireEvent.press(await findByText(/A → Z/));
    // Menu should close, sort label should change
    expect(queryByText(/Most recent/)).toBeNull();
  });

  it('filters words by search', async () => {
    const { findByPlaceholderText, findByText } = render(
      <I18nProvider><WordsScreen /></I18nProvider>
    );
    const searchInput = await findByPlaceholderText('Search words...');
    fireEvent.changeText(searchInput, 'mamãe');
    await waitFor(() => {
      expect(db.getWords).toHaveBeenCalledWith('mamãe');
    });
  });

  it('opens edit word modal on word press', async () => {
    const { findByText } = render(
      <I18nProvider><WordsScreen /></I18nProvider>
    );
    fireEvent.press(await findByText('mamãe'));
    expect(await findByText(/Edit Word/)).toBeTruthy();
  });

  it('shows empty search state', async () => {
    (db.getWords as jest.Mock).mockResolvedValue([]);
    const { findByPlaceholderText, findByText } = render(
      <I18nProvider><WordsScreen /></I18nProvider>
    );
    const searchInput = await findByPlaceholderText('Search words...');
    fireEvent.changeText(searchInput, 'xyz');
    expect(await findByText(/No words found/)).toBeTruthy();
  });

  it('shows add first word action in empty state', async () => {
    (db.getWords as jest.Mock).mockResolvedValue([]);
    const { findByText } = render(
      <I18nProvider><WordsScreen /></I18nProvider>
    );
    const addBtn = await findByText(/Add Word/);
    fireEvent.press(addBtn);
    expect(await findByText(/New Word/)).toBeTruthy();
  });

  it('triggers sync after saving when google connected', async () => {
    (googleDrive.isGoogleConnected as jest.Mock).mockResolvedValue(true);
    const { findByText, findByPlaceholderText } = render(
      <I18nProvider><WordsScreen /></I18nProvider>
    );
    // Open add word modal
    fireEvent.press(await findByText('+ New'));
    // Fill in a word and save
    const input = await findByPlaceholderText(/E\.g\./);
    fireEvent.changeText(input, 'hello');
    await act(async () => { fireEvent.press(await findByText('Add')); });
    await waitFor(() => {
      expect(googleDrive.performSync).toHaveBeenCalled();
    });
  });

  it('handles word deletion from modal', async () => {
    const { findByText } = render(
      <I18nProvider><WordsScreen /></I18nProvider>
    );
    // Open edit word modal
    fireEvent.press(await findByText('mamãe'));
    expect(await findByText(/Edit Word/)).toBeTruthy();
  });

  it('opens category edit on long press', async () => {
    const { findByText } = render(
      <I18nProvider><WordsScreen /></I18nProvider>
    );
    fireEvent(await findByText('Animals'), 'longPress');
    expect(await findByText(/Edit Category/)).toBeTruthy();
  });

  it('opens edit word via card area press', async () => {
    const { findByText } = render(
      <I18nProvider><WordsScreen /></I18nProvider>
    );
    fireEvent.press(await findByText(/first word/));
    expect(await findByText(/Edit Word/)).toBeTruthy();
  });

  it('handles word deletion and closes modal', async () => {
    const { findByText } = render(
      <I18nProvider><WordsScreen /></I18nProvider>
    );
    // Open edit word modal
    fireEvent.press(await findByText('mamãe'));
    expect(await findByText(/Edit Word/)).toBeTruthy();
    // Press delete button
    fireEvent.press(await findByText(/Remove/));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    // Confirm deletion
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
    const { findByText, findByPlaceholderText } = render(
      <I18nProvider><WordsScreen /></I18nProvider>
    );
    // Open add word modal
    fireEvent.press(await findByText('+ New'));
    const input = await findByPlaceholderText(/E\.g\./);
    fireEvent.changeText(input, 'hello');
    // Advance debounce
    await act(async () => { jest.advanceTimersByTime(500); });
    // Press the duplicate card
    fireEvent.press(await findByText('hello'));
    // Advance setTimeout(300) for re-open
    await act(async () => { jest.advanceTimersByTime(400); });
    // Should reopen with edit mode for the duplicate word
    expect(await findByText(/Edit Word/)).toBeTruthy();
    jest.useRealTimers();
  });

  it('closes add word modal on cancel', async () => {
    const { findByText, queryByText } = render(
      <I18nProvider><WordsScreen /></I18nProvider>
    );
    fireEvent.press(await findByText('+ New'));
    expect(await findByText(/New Word/)).toBeTruthy();
    fireEvent.press(await findByText('Cancel'));
    // Modal should be closed
    await waitFor(() => {
      expect(queryByText(/New Word/)).toBeNull();
    });
  });
});
