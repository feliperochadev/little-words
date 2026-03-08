import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { I18nProvider } from '../../src/i18n/i18n';
import { AddWordModal } from '../../src/components/AddWordModal';
import type { Word } from '../../src/database/database';

jest.spyOn(Alert, 'alert');

const mockDb = (global as any).__mockDb;

const mockWord: Word = {
  id: 1, word: 'mamãe', category_id: 1, date_added: '2024-01-01',
  notes: 'a note', created_at: '2024-01-01',
  category_name: 'animals', category_color: '#FF6B9D', category_emoji: '🐾',
};

function renderWithProvider(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('AddWordModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // getCategories returns categories
    mockDb.getAllSync.mockReturnValue([
      { id: 1, name: 'animals', color: '#FF6B9D', emoji: '🐾', created_at: '2024-01-01' },
    ]);
  });

  it('renders new word title', async () => {
    const { findByText } = renderWithProvider(
      <AddWordModal visible={true} onClose={jest.fn()} onSave={jest.fn()} />
    );
    expect(await findByText(/New Word/)).toBeTruthy();
  });

  it('renders edit word title', async () => {
    const { findByText } = renderWithProvider(
      <AddWordModal visible={true} onClose={jest.fn()} onSave={jest.fn()} editWord={mockWord} />
    );
    expect(await findByText(/Edit Word/)).toBeTruthy();
  });

  it('shows delete button in edit mode', async () => {
    const { findByText } = renderWithProvider(
      <AddWordModal visible={true} onClose={jest.fn()} onSave={jest.fn()} editWord={mockWord} />
    );
    expect(await findByText(/Remove/)).toBeTruthy();
  });

  it('alerts on empty word save', async () => {
    const { findByText } = renderWithProvider(
      <AddWordModal visible={true} onClose={jest.fn()} onSave={jest.fn()} />
    );
    fireEvent.press(await findByText('Add'));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  it('calls onClose when cancel is pressed', async () => {
    const onClose = jest.fn();
    const { findByText } = renderWithProvider(
      <AddWordModal visible={true} onClose={onClose} onSave={jest.fn()} />
    );
    fireEvent.press(await findByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders category chips', async () => {
    const { findByText } = renderWithProvider(
      <AddWordModal visible={true} onClose={jest.fn()} onSave={jest.fn()} />
    );
    expect(await findByText('Animals')).toBeTruthy();
  });

  it('renders add variant button', async () => {
    const { findByText } = renderWithProvider(
      <AddWordModal visible={true} onClose={jest.fn()} onSave={jest.fn()} />
    );
    expect(await findByText(/Add variant/i)).toBeTruthy();
  });
});
