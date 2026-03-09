import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { I18nProvider } from '../../src/i18n/i18n';
import { AddWordModal } from '../../src/components/AddWordModal';
import type { Word } from '../../src/database/database';
import * as database from '../../src/database/database';

jest.mock('../../src/database/database', () => ({
  ...jest.requireActual('../../src/database/database'),
  getCategories: jest.fn().mockResolvedValue([]),
  addWord: jest.fn().mockResolvedValue(1),
  updateWord: jest.fn().mockResolvedValue(undefined),
  deleteWord: jest.fn().mockResolvedValue(undefined),
  addVariant: jest.fn().mockResolvedValue(1),
  updateVariant: jest.fn().mockResolvedValue(undefined),
  deleteVariant: jest.fn().mockResolvedValue(undefined),
  getVariantsByWord: jest.fn().mockResolvedValue([]),
  findWordByName: jest.fn().mockResolvedValue(null),
  getSetting: jest.fn().mockResolvedValue(null),
  setSetting: jest.fn().mockResolvedValue(undefined),
}));

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

const mockWord: Word = {
  id: 1, word: 'mamãe', category_id: 1, date_added: '2024-01-01',
  notes: 'a note', created_at: '2024-01-01',
  category_name: 'animals', category_color: '#FF6B9D', category_emoji: '🐾',
};

function renderModal(props: Partial<React.ComponentProps<typeof AddWordModal>> = {}) {
  return render(
    <I18nProvider>
      <AddWordModal visible={true} onClose={jest.fn()} onSave={jest.fn()} {...props} />
    </I18nProvider>
  );
}

describe('AddWordModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (database.getCategories as jest.Mock).mockResolvedValue([
      { id: 1, name: 'animals', color: '#FF6B9D', emoji: '🐾', created_at: '' },
    ]);
    (database.findWordByName as jest.Mock).mockResolvedValue(null);
    (database.getVariantsByWord as jest.Mock).mockResolvedValue([]);
    (database.getSetting as jest.Mock).mockResolvedValue(null);
  });

  it('renders new word title', async () => {
    const { findByText } = renderModal();
    expect(await findByText(/New Word/)).toBeTruthy();
  });

  it('renders edit word title with delete button', async () => {
    const { findByText } = renderModal({ editWord: mockWord });
    expect(await findByText(/Edit Word/)).toBeTruthy();
    expect(await findByText(/Remove/)).toBeTruthy();
  });

  it('calls onClose on cancel', async () => {
    const onClose = jest.fn();
    const { findByText } = renderModal({ onClose });
    fireEvent.press(await findByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('alerts on empty word save', async () => {
    const { findByText } = renderModal();
    fireEvent.press(await findByText('Add'));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
  });

  it('saves a new word', async () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    const { findByText, findByPlaceholderText } = renderModal({ onSave, onClose });
    const input = await findByPlaceholderText(/E\.g\./);
    fireEvent.changeText(input, 'hello');
    await act(async () => { fireEvent.press(await findByText('Add')); });
    await waitFor(() => {
      expect(database.addWord).toHaveBeenCalledWith('hello', null, expect.any(String), '');
      expect(onSave).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('updates an existing word', async () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    const { findByText, findByDisplayValue } = renderModal({ onSave, onClose, editWord: mockWord });
    // Wait for the word to be loaded into state
    await findByDisplayValue('mamãe');
    await act(async () => { fireEvent.press(await findByText('Save')); });
    await waitFor(() => {
      expect(database.updateWord).toHaveBeenCalledWith(1, 'mamãe', 1, '2024-01-01', 'a note');
      expect(onSave).toHaveBeenCalled();
    });
  });

  it('handles delete word', async () => {
    const onClose = jest.fn();
    const onDeleted = jest.fn();
    const { findByText } = renderModal({ onClose, onDeleted, editWord: mockWord });
    fireEvent.press(await findByText(/Remove/));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    // Simulate pressing destructive button
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const destructiveBtn = alertCall[2].find((b: any) => b.style === 'destructive');
    await act(async () => { destructiveBtn.onPress(); });
    await waitFor(() => {
      expect(database.deleteWord).toHaveBeenCalledWith(1);
      expect(onClose).toHaveBeenCalled();
      expect(onDeleted).toHaveBeenCalled();
    });
  });

  it('selects and deselects a category', async () => {
    const { findByText } = renderModal();
    const catChip = await findByText('Animals');
    fireEvent.press(catChip); // select
    fireEvent.press(catChip); // deselect
    expect(catChip).toBeTruthy();
  });

  it('adds variant rows and shows "add another"', async () => {
    const { findByText } = renderModal();
    fireEvent.press(await findByText(/Add variant/));
    expect(await findByText(/Another variant/)).toBeTruthy();
  });

  it('saves with variant text', async () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    const { findByText, findByPlaceholderText, findAllByPlaceholderText } = renderModal({ onSave, onClose });

    const wordInput = await findByPlaceholderText(/E\.g\./);
    fireEvent.changeText(wordInput, 'hello');

    fireEvent.press(await findByText(/Add variant/i));
    // Find the variant input by its placeholder
    const varInputs = await findAllByPlaceholderText(/hello/i);
    fireEvent.changeText(varInputs[0], 'hewwo');

    await act(async () => { fireEvent.press(await findByText('Add')); });
    await waitFor(() => {
      expect(database.addVariant).toHaveBeenCalledWith(1, 'hewwo', expect.any(String));
    });
  });

  it('shows existing variants in edit mode', async () => {
    (database.getVariantsByWord as jest.Mock).mockResolvedValue([
      { id: 10, word_id: 1, variant: 'mamá', date_heard: '2024-01-01', notes: '' },
    ]);
    const { findByText } = renderModal({ editWord: mockWord });
    expect(await findByText(/mamá/)).toBeTruthy();
  });

  it('allows inline editing of existing variant', async () => {
    (database.getVariantsByWord as jest.Mock).mockResolvedValue([
      { id: 10, word_id: 1, variant: 'mamá', date_heard: '2024-01-01', notes: '' },
    ]);
    const { findByText } = renderModal({ editWord: mockWord });
    // Click on existing variant to enter edit mode
    fireEvent.press(await findByText(/mamá/));
    // Should now be in editing mode (TextInput visible)
    // The variant text should be editable
    expect(await findByText('✕')).toBeTruthy();
  });

  it('shows duplicate detection card', async () => {
    jest.useFakeTimers();
    (database.findWordByName as jest.Mock).mockResolvedValue({
      id: 99, word: 'hello', date_added: '2024-06-01', category_name: 'food',
      category_color: '#00B894', category_emoji: '🍎', variant_count: 2, notes: 'test note',
    });
    const onEditDuplicate = jest.fn();
    const { findByPlaceholderText, findByText } = renderModal({ onEditDuplicate });
    const input = await findByPlaceholderText(/E\.g\./);
    fireEvent.changeText(input, 'hello');
    // Advance the 400ms debounce timer
    await act(async () => { jest.advanceTimersByTime(500); });
    expect(await findByText(/already exists/i)).toBeTruthy();
    expect(await findByText('hello')).toBeTruthy();
    expect(await findByText(/test note/)).toBeTruthy();
    // Press the duplicate card to trigger onEditDuplicate
    fireEvent.press(await findByText('hello'));
    expect(onEditDuplicate).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('alerts when trying to save a duplicate word', async () => {
    jest.useFakeTimers();
    (database.findWordByName as jest.Mock).mockResolvedValue({
      id: 99, word: 'hello', date_added: '2024-06-01',
    });
    const { findByPlaceholderText, findByText } = renderModal();
    const input = await findByPlaceholderText(/E\.g\./);
    fireEvent.changeText(input, 'hello');
    await act(async () => { jest.advanceTimersByTime(500); });
    fireEvent.press(await findByText('Add'));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    jest.useRealTimers();
  });

  it('renders variant input with word-specific placeholder', async () => {
    const { findByText, findByPlaceholderText, findAllByPlaceholderText } = renderModal();
    const wordInput = await findByPlaceholderText(/E\.g\./);
    fireEvent.changeText(wordInput, 'dog');
    fireEvent.press(await findByText(/Add variant/));
    // The variant placeholder should contain the word
    const varInputs = await findAllByPlaceholderText(/dog/i);
    expect(varInputs.length).toBeGreaterThan(0);
  });

  it('removes a new variant row', async () => {
    const { findByText, findAllByText } = renderModal();
    // Add two variants
    fireEvent.press(await findByText(/Add variant/));
    fireEvent.press(await findByText(/Another variant/));
    // Find remove buttons
    const removeBtns = await findAllByText('✕');
    // Remove the first one
    fireEvent.press(removeBtns[0]);
    // Should still have one variant row left
    const remainingRemoveBtns = await findAllByText('✕');
    expect(remainingRemoveBtns.length).toBe(1);
  });

  it('renders notes section', async () => {
    const { findByPlaceholderText } = renderModal();
    expect(await findByPlaceholderText(/Context/)).toBeTruthy();
  });

  it('opens add category modal', async () => {
    const { findByText } = renderModal();
    fireEvent.press(await findByText(/\+ Category/));
    expect(await findByText(/New Category/)).toBeTruthy();
  });

  it('deletes an existing variant in edit mode', async () => {
    (database.getVariantsByWord as jest.Mock).mockResolvedValue([
      { id: 10, word_id: 1, variant: 'mamá', date_heard: '2024-01-01', notes: '' },
    ]);
    const { findByText, findAllByText } = renderModal({ editWord: mockWord });
    // Enter edit mode on variant
    fireEvent.press(await findByText(/mamá/));
    // Find ✕ button and press to delete
    const removeBtns = await findAllByText('✕');
    await act(async () => { fireEvent.press(removeBtns[0]); });
    await waitFor(() => {
      expect(database.deleteVariant).toHaveBeenCalledWith(10);
    });
  });

  it('saves inline variant edit on blur', async () => {
    (database.getVariantsByWord as jest.Mock).mockResolvedValue([
      { id: 10, word_id: 1, variant: 'mamá', date_heard: '2024-01-01', notes: '' },
    ]);
    const { findByText, findByDisplayValue } = renderModal({ editWord: mockWord });
    // Enter edit mode
    fireEvent.press(await findByText(/mamá/));
    // Change the text
    const varInput = await findByDisplayValue('mamá');
    fireEvent.changeText(varInput, 'mamãzinha');
    // Blur to trigger save
    await act(async () => { fireEvent(varInput, 'blur'); });
    await waitFor(() => {
      expect(database.updateVariant).toHaveBeenCalledWith(10, 'mamãzinha', expect.any(String), '');
    });
  });

  it('flushes inline variant edits during save', async () => {
    (database.getVariantsByWord as jest.Mock).mockResolvedValue([
      { id: 10, word_id: 1, variant: 'mamá', date_heard: '2024-01-01', notes: '' },
    ]);
    const onSave = jest.fn();
    const { findByText, findByDisplayValue } = renderModal({ editWord: mockWord, onSave });
    await findByDisplayValue('mamãe');
    // Enter inline edit mode for the variant
    fireEvent.press(await findByText(/mamá/));
    const varInput = await findByDisplayValue('mamá');
    fireEvent.changeText(varInput, 'mamã');
    // Save without blurring - should flush
    await act(async () => { fireEvent.press(await findByText('Save')); });
    await waitFor(() => {
      expect(database.updateVariant).toHaveBeenCalledWith(10, 'mamã', expect.any(String), '');
      expect(database.updateWord).toHaveBeenCalled();
    });
  });

  it('long press category opens edit category modal', async () => {
    const { findByText } = renderModal();
    const catChip = await findByText('Animals');
    fireEvent(catChip, 'longPress');
    expect(await findByText(/Edit Category/)).toBeTruthy();
  });
});
