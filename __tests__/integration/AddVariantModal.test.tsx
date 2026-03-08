import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { I18nProvider } from '../../src/i18n/i18n';
import { AddVariantModal } from '../../src/components/AddVariantModal';
import type { Word, Variant } from '../../src/database/database';

jest.spyOn(Alert, 'alert');

const mockDb = (global as any).__mockDb;

const mockWord: Word = {
  id: 1, word: 'mamãe', category_id: 1, date_added: '2024-01-01',
  notes: null, created_at: '2024-01-01',
};

const mockVariant: Variant = {
  id: 10, word_id: 1, variant: 'mamá', date_added: '2024-01-01',
  notes: 'test note', created_at: '2024-01-01',
};

function renderWithProvider(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('AddVariantModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders new variant title', async () => {
    const { findByText } = renderWithProvider(
      <AddVariantModal visible={true} onClose={jest.fn()} onSave={jest.fn()} word={mockWord} />
    );
    expect(await findByText(/New Variant/)).toBeTruthy();
  });

  it('renders edit variant title', async () => {
    const { findByText } = renderWithProvider(
      <AddVariantModal visible={true} onClose={jest.fn()} onSave={jest.fn()} word={mockWord} editVariant={mockVariant} />
    );
    expect(await findByText(/Edit Variant/)).toBeTruthy();
  });

  it('shows delete button in edit mode', async () => {
    const { findByText } = renderWithProvider(
      <AddVariantModal visible={true} onClose={jest.fn()} onSave={jest.fn()} word={mockWord} editVariant={mockVariant} />
    );
    expect(await findByText(/Remove/)).toBeTruthy();
  });

  it('alerts on empty variant save', async () => {
    const { findByText } = renderWithProvider(
      <AddVariantModal visible={true} onClose={jest.fn()} onSave={jest.fn()} word={mockWord} />
    );
    fireEvent.press(await findByText('Add'));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  it('shows word search when no word and no editVariant', async () => {
    // getWords returns words via getAllSync
    mockDb.getAllSync.mockReturnValue([mockWord]);
    const { findByPlaceholderText } = renderWithProvider(
      <AddVariantModal visible={true} onClose={jest.fn()} onSave={jest.fn()} word={null} />
    );
    expect(await findByPlaceholderText('Search word...')).toBeTruthy();
    mockDb.getAllSync.mockReturnValue([]);
  });

  it('calls onSave after successful add', async () => {
    mockDb.runSync.mockReturnValue({ lastInsertRowId: 1, changes: 1 });
    const onSave = jest.fn();
    const onClose = jest.fn();
    const { findByText, findByPlaceholderText } = renderWithProvider(
      <AddVariantModal visible={true} onClose={onClose} onSave={onSave} word={mockWord} />
    );
    const input = await findByPlaceholderText(/How the child says/);
    fireEvent.changeText(input, 'mamá');
    fireEvent.press(await findByText('Add'));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
    });
  });
});
