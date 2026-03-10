import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { I18nProvider } from '../../src/i18n/i18n';
import { AddVariantModal } from '../../src/components/AddVariantModal';
import type { Word, Variant } from '../../src/database/database';
import * as database from '../../src/database/database';

jest.spyOn(Alert, 'alert');

jest.mock('../../src/database/database', () => ({
  ...jest.requireActual('../../src/database/database'),
  addVariant: jest.fn().mockResolvedValue(1),
  updateVariant: jest.fn().mockResolvedValue(undefined),
  deleteVariant: jest.fn().mockResolvedValue(undefined),
  getWords: jest.fn().mockResolvedValue([]),
  getSetting: jest.fn().mockResolvedValue(null),
  setSetting: jest.fn().mockResolvedValue(undefined),
}));

const mockWord: Word = {
  id: 1, word: 'mamãe', category_id: 1, date_added: '2024-01-01',
  notes: null, created_at: '2024-01-01',
  category_name: 'animals', category_color: '#FF6B9D', category_emoji: '🐾',
};

const mockVariant: Variant = {
  id: 10, word_id: 1, variant: 'mamá', date_added: '2024-01-01',
  notes: 'test note', created_at: '2024-01-01',
};

function renderModal(props: Partial<React.ComponentProps<typeof AddVariantModal>> = {}) {
  return render(
    <I18nProvider>
      <AddVariantModal visible={true} onClose={jest.fn()} onSave={jest.fn()} word={mockWord} {...props} />
    </I18nProvider>
  );
}

describe('AddVariantModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (database.getWords as jest.Mock).mockResolvedValue([mockWord]);
  });

  it('renders new variant title', async () => {
    const { findByText } = renderModal();
    expect(await findByText(/New Variant/)).toBeTruthy();
  });

  it('renders edit variant title', async () => {
    const { findByText } = renderModal({ editVariant: mockVariant });
    expect(await findByText(/Edit Variant/)).toBeTruthy();
  });

  it('renders correctly after reopening', async () => {
    const onClose = jest.fn();
    const view = render(
      <I18nProvider>
        <AddVariantModal visible={false} onClose={onClose} onSave={jest.fn()} word={mockWord} />
      </I18nProvider>
    );

    view.rerender(
      <I18nProvider>
        <AddVariantModal visible={true} onClose={onClose} onSave={jest.fn()} word={mockWord} />
      </I18nProvider>
    );

    expect(await view.findByText(/New Variant/)).toBeTruthy();
  });

  it('shows delete button in edit mode', async () => {
    const { findByText } = renderModal({ editVariant: mockVariant });
    expect(await findByText(/Remove/)).toBeTruthy();
  });

  it('alerts on empty variant save', async () => {
    const { findByText } = renderModal();
    fireEvent.press(await findByText('Add'));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
  });

  it('saves a new variant', async () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    const { findByText, findByPlaceholderText } = renderModal({ onSave, onClose });
    const input = await findByPlaceholderText(/How the child says/);
    fireEvent.changeText(input, 'mamá');
    fireEvent.press(await findByText('Add'));
    await waitFor(() => {
      expect(database.addVariant).toHaveBeenCalledWith(1, 'mamá', expect.any(String), '');
      expect(onSave).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('updates an existing variant', async () => {
    const onSave = jest.fn();
    const { findByText, findByDisplayValue } = renderModal({ onSave, editVariant: mockVariant });
    await findByDisplayValue('mamá');
    fireEvent.press(await findByText('Save'));
    await waitFor(() => {
      expect(database.updateVariant).toHaveBeenCalledWith(10, 'mamá', '2024-01-01', 'test note');
      expect(onSave).toHaveBeenCalled();
    });
  });

  it('handles delete variant', async () => {
    const onClose = jest.fn();
    const onDeleted = jest.fn();
    const { findByText } = renderModal({ onClose, onDeleted, editVariant: mockVariant });
    fireEvent.press(await findByText(/Remove/));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const destructiveBtn = alertCall[2].find((b: any) => b.style === 'destructive');
    await act(async () => { destructiveBtn.onPress(); });
    await waitFor(() => {
      expect(database.deleteVariant).toHaveBeenCalledWith(10);
      expect(onClose).toHaveBeenCalled();
      expect(onDeleted).toHaveBeenCalled();
    });
  });

  it('shows word search when no word provided', async () => {
    const { findByPlaceholderText, findByText } = renderModal({ word: null });
    expect(await findByPlaceholderText('Search word...')).toBeTruthy();
    // Word list should show mockWord
    expect(await findByText('mamãe')).toBeTruthy();
  });

  it('selects a word from search results', async () => {
    const { findByText, findByPlaceholderText } = renderModal({ word: null });
    await findByPlaceholderText('Search word...');
    // Select the word
    fireEvent.press(await findByText('mamãe'));
    // Should show the chosen chip with change option
    expect(await findByText(/change/)).toBeTruthy();
  });

  it('filters word search results', async () => {
    (database.getWords as jest.Mock).mockResolvedValue([
      mockWord,
      { id: 2, word: 'água', category_id: null, date_added: '2024-01-01', notes: null, created_at: '2024-01-01' },
    ]);
    const { findByPlaceholderText, findByText, queryByText } = renderModal({ word: null });
    const searchInput = await findByPlaceholderText('Search word...');
    fireEvent.changeText(searchInput, 'água');
    expect(await findByText('água')).toBeTruthy();
  });

  it('calls onClose when cancel is pressed', async () => {
    const onClose = jest.fn();
    const { findByText } = renderModal({ onClose });
    fireEvent.press(await findByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});
