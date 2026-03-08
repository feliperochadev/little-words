import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { I18nProvider } from '../../src/i18n/i18n';

jest.mock('../../src/database/database', () => {
  const actual = jest.requireActual('../../src/database/database');
  return {
    ...actual,
    getWords: jest.fn(),
    getCategories: jest.fn().mockResolvedValue([]),
    findWordByName: jest.fn().mockResolvedValue(null),
    getVariantsByWord: jest.fn().mockResolvedValue([]),
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
});
