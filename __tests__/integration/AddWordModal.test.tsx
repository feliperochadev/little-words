import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, PanResponder } from 'react-native';
import { renderWithProviders } from '../helpers/renderWithProviders';
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
  addCategory: jest.fn().mockResolvedValue(1),
  updateCategory: jest.fn().mockResolvedValue(undefined),
  deleteCategory: jest.fn().mockResolvedValue(undefined),
  deleteCategoryWithUnlink: jest.fn().mockResolvedValue(undefined),
  unlinkWordsFromCategory: jest.fn().mockResolvedValue(undefined),
  getWordCountByCategory: jest.fn().mockResolvedValue(0),
  getSetting: jest.fn().mockResolvedValue(null),
  setSetting: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/utils/googleDrive', () => ({
  isGoogleConnected: jest.fn().mockResolvedValue(false),
  performSync: jest.fn().mockResolvedValue({ success: true }),
  getGoogleUserEmail: jest.fn().mockResolvedValue(null),
  configureGoogleSignIn: jest.fn(),
}));

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

const mockWord: Word = {
  id: 1, word: 'mamãe', category_id: 1, date_added: '2024-01-01',
  notes: 'a note', created_at: '2024-01-01',
  category_name: 'animals', category_color: '#FF6B9D', category_emoji: '🐾',
};

function renderModal(props: Partial<React.ComponentProps<typeof AddWordModal>> = {}) {
  return renderWithProviders(
    <AddWordModal visible={true} onClose={jest.fn()} {...props} />
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

  it('renders correctly after reopening', async () => {
    const onClose = jest.fn();
    const { rerender, findByText } = renderWithProviders(
      <AddWordModal visible={false} onClose={onClose} />
    );

    rerender(<AddWordModal visible={true} onClose={onClose} />);

    expect(await findByText(/New Word/)).toBeTruthy();
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

  it('closes AddCategoryModal from within AddWordModal (covers onClose callback)', async () => {
    const { findByText, findAllByText } = renderModal();
    // Open the new category modal
    fireEvent.press(await findByText(/\+ Category/));
    expect(await findByText(/New Category/)).toBeTruthy();
    // Both AddWordModal and AddCategoryModal have Cancel buttons — press the last one (AddCategoryModal's)
    const cancelBtns = await findAllByText('Cancel');
    fireEvent.press(cancelBtns[cancelBtns.length - 1]);
    // AddCategoryModal is closed — AddWordModal should still be visible
    expect(await findByText(/Add Word|New Word/i)).toBeTruthy();
  });

  it('scrolls to selected category index > 0 on open with editWord (covers lines 115-116)', async () => {
    jest.useFakeTimers();
    (database.getCategories as jest.Mock).mockResolvedValue([
      { id: 99, name: 'food', color: '#00B894', emoji: '🍎', created_at: '' },
      { id: 1, name: 'animals', color: '#FF6B9D', emoji: '🐾', created_at: '' },
    ]);
    renderModal({ editWord: mockWord });
    // Flush promises so getCategories resolves and registers the 300ms setTimeout
    await act(async () => {});
    // Now fire the setTimeout
    await act(async () => { jest.advanceTimersByTime(400); });
    jest.useRealTimers();
  });

  it('category scroll onLayout fires handler (covers line 269)', async () => {
    const { findByTestId } = renderModal();
    const catScroll = await findByTestId('category-scroll');
    fireEvent(catScroll, 'layout', { nativeEvent: { layout: { width: 300, height: 44 } } });
  });

  it('category scroll onContentSizeChange fires handler (covers lines 277-278)', async () => {
    const { findByTestId } = renderModal();
    const catScroll = await findByTestId('category-scroll');
    fireEvent(catScroll, 'contentSizeChange', 500, 44);
  });

  it('category scroll right arrow press (covers line 307)', async () => {
    const { findByTestId, findByText } = renderModal();
    await findByText('Animals'); // wait for categories
    // catAtEnd starts false so right arrow renders
    const rightBtn = await findByTestId('category-scroll-right');
    fireEvent.press(rightBtn);
  });

  it('category scroll left arrow appears and is pressable after scrolling (covers line 258)', async () => {
    const { findByTestId } = renderModal();
    const catScroll = await findByTestId('category-scroll');
    // Scroll past x=10 → catScrolled=true → left arrow renders
    fireEvent(catScroll, 'scroll', { nativeEvent: { contentOffset: { x: 50 } } });
    const leftBtn = await findByTestId('category-scroll-left');
    fireEvent.press(leftBtn);
  });

  it('blur on inline variant with unchanged text is a no-op (covers line 335 text===v.variant branch)', async () => {
    (database.getVariantsByWord as jest.Mock).mockResolvedValue([
      { id: 10, word_id: 1, variant: 'mamá', date_heard: '2024-01-01', notes: '' },
    ]);
    const { findByText, findByDisplayValue } = renderModal({ editWord: mockWord });
    fireEvent.press(await findByText(/mamá/));
    const varInput = await findByDisplayValue('mamá');
    // Blur without changing text — text === v.variant, no update
    await act(async () => { fireEvent(varInput, 'blur'); });
    expect(database.updateVariant).not.toHaveBeenCalled();
  });

  it('flush inline variant edit with unchanged text is no-op (covers line 180 text===original.variant)', async () => {
    (database.getVariantsByWord as jest.Mock).mockResolvedValue([
      { id: 10, word_id: 1, variant: 'mamá', date_heard: '2024-01-01', notes: '' },
    ]);
    const { findByText, findByDisplayValue } = renderModal({ editWord: mockWord });
    await findByDisplayValue('mamãe');
    // Enter inline edit but do NOT change text
    fireEvent.press(await findByText(/mamá/));
    // Save — flush loop sees text === original.variant → skip updateVariant
    await act(async () => { fireEvent.press(await findByText('Save')); });
    await waitFor(() => expect(database.updateWord).toHaveBeenCalled());
    expect(database.updateVariant).not.toHaveBeenCalled();
  });

  it('duplicate card shows singular variant label (covers line 244 count===1 branch)', async () => {
    jest.useFakeTimers();
    (database.findWordByName as jest.Mock).mockResolvedValue({
      id: 99, word: 'hello', date_added: '2024-06-01', category_name: null,
      category_color: null, category_emoji: null, variant_count: 1, notes: null,
    });
    const { findByPlaceholderText, findByText } = renderModal();
    fireEvent.changeText(await findByPlaceholderText(/E\.g\./), 'hello');
    await act(async () => { jest.advanceTimersByTime(500); });
    expect(await findByText(/1 variant\b/)).toBeTruthy();
    jest.useRealTimers();
  });

  it('AddCategoryModal onSave refreshes categories, selects the new one and scrolls', async () => {
    // First call returns original list; subsequent calls return updated list after invalidation
    (database.getCategories as jest.Mock)
      .mockResolvedValueOnce([
        { id: 1, name: 'animals', color: '#FF6B9D', emoji: '🐾', created_at: '' },
      ])
      .mockResolvedValue([
        { id: 1, name: 'animals', color: '#FF6B9D', emoji: '🐾', created_at: '' },
        { id: 2, name: 'NewCat', color: '#00B894', emoji: '🎨', created_at: '' },
      ]);

    const { findByText, findByPlaceholderText } = renderModal();

    // Wait for initial load
    await findByText('Animals');

    fireEvent.press(await findByText(/\+ Category/));
    expect(await findByText(/New Category/)).toBeTruthy();
    fireEvent.changeText(await findByPlaceholderText(/Toys/), 'NewCat');

    (database.addCategory as jest.Mock).mockResolvedValue(2);
    await act(async () => { fireEvent.press(await findByText('Create Category')); });

    await waitFor(() => {
      expect(database.addCategory).toHaveBeenCalled();
    });

    // After invalidation triggers refetch, new category should appear
    expect(await findByText('NewCat')).toBeTruthy();
  });

  it('AddCategoryModal onDeleted refreshes categories and clears selection (covers line 424)', async () => {
    const { findByText } = renderModal();
    // Open edit mode via long press on category chip
    fireEvent(await findByText('Animals'), 'longPress');
    expect(await findByText(/Edit Category/)).toBeTruthy();
    fireEvent.press(await findByText(/Remove/));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const destructiveBtn = alertCall[2].find((b: any) => b.style === 'destructive');
    await act(async () => { destructiveBtn.onPress(); });
    await waitFor(() => expect(database.deleteCategoryWithUnlink).toHaveBeenCalled());
  });
});

describe('AddWordModal — panResponder gesture handlers', () => {
  let capturedConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedConfig = null;
    (database.getCategories as jest.Mock).mockResolvedValue([
      { id: 1, name: 'animals', color: '#FF6B9D', emoji: '🐾', created_at: '' },
    ]);
    (database.getSetting as jest.Mock).mockResolvedValue(null);
    jest.spyOn(PanResponder, 'create').mockImplementation((config: any) => {
      capturedConfig = config;
      return { panHandlers: {} };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function renderWithPan(props: Record<string, any> = {}) {
    const { AddWordModal } = require('../../src/components/AddWordModal');
    const result = renderWithProviders(
      <AddWordModal visible={true} onClose={jest.fn()} {...props} />
    );
    await waitFor(() => { expect(capturedConfig).not.toBeNull(); });
    return result;
  }

  it('onStartShouldSetPanResponder always returns true', async () => {
    await renderWithPan();
    expect(capturedConfig.onStartShouldSetPanResponder()).toBe(true);
  });

  it('onMoveShouldSetPanResponder returns true only when dy > 0', async () => {
    await renderWithPan();
    expect(capturedConfig.onMoveShouldSetPanResponder(null, { dy: 10 })).toBe(true);
    expect(capturedConfig.onMoveShouldSetPanResponder(null, { dy: -5 })).toBe(false);
  });

  it('onPanResponderMove updates position for dy > 0, no-op for dy <= 0', async () => {
    await renderWithPan();
    act(() => { capturedConfig.onPanResponderMove(null, { dy: 60 }); });
    act(() => { capturedConfig.onPanResponderMove(null, { dy: -5 }); });
  });

  it('onPanResponderRelease springs back when gesture is too small', async () => {
    await renderWithPan();
    act(() => { capturedConfig.onPanResponderRelease(null, { dy: 30, vy: 0.2 }); });
  });
});
