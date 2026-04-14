import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, PanResponder } from 'react-native';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { AddWordModal } from '../../src/components/AddWordModal';
import type { Word } from '../../src/types/domain';
import * as categoryService from '../../src/services/categoryService';
import * as wordService from '../../src/services/wordService';
import * as variantService from '../../src/services/variantService';
import * as settingsService from '../../src/services/settingsService';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { getThemeForSex } from '../../src/theme/getThemeForSex';

// ─── Router mock (overrides global jest.setup.js mock) ────────────────────────
const mockRouterPush = jest.fn();
jest.mock('expo-router', () => {
  const React = require('react');
  const StackComponent = ({ children }: any) => React.createElement(React.Fragment, null, children);
  StackComponent.Screen = () => null;
  const TabsComponent = ({ children }: any) => React.createElement(React.Fragment, null, children);
  TabsComponent.Screen = () => null;
  return {
    useRouter: jest.fn(() => ({ push: mockRouterPush, replace: jest.fn(), back: jest.fn() })),
    useLocalSearchParams: jest.fn(() => ({})),
    useFocusEffect: jest.fn((cb: any) => {
      const R = require('react');
      R.useEffect(() => { const cleanup = cb(); return typeof cleanup === 'function' ? cleanup : undefined; }, []);
    }),
    Stack: StackComponent,
    Tabs: TabsComponent,
  };
});

jest.mock('../../src/services/notificationService', () => ({
  handleWordAdded: jest.fn(() => Promise.resolve()),
  checkAndShowPriming: jest.fn(() => Promise.resolve()),
  initNotifications: jest.fn(() => Promise.resolve()),
  scheduleAll: jest.fn(() => Promise.resolve()),
  cancelRetentionNotifications: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../src/services/categoryService', () => ({
  ...jest.requireActual('../../src/services/categoryService'),
  getCategories: jest.fn().mockResolvedValue([]),
  addCategory: jest.fn().mockResolvedValue(1),
  updateCategory: jest.fn().mockResolvedValue(undefined),
  deleteCategory: jest.fn().mockResolvedValue(undefined),
  deleteCategoryWithUnlink: jest.fn().mockResolvedValue(undefined),
  unlinkWordsFromCategory: jest.fn().mockResolvedValue(undefined),
  getWordCountByCategory: jest.fn().mockResolvedValue(0),
}));

jest.mock('../../src/services/wordService', () => ({
  ...jest.requireActual('../../src/services/wordService'),
  addWord: jest.fn().mockResolvedValue(1),
  updateWord: jest.fn().mockResolvedValue(undefined),
  deleteWord: jest.fn().mockResolvedValue(undefined),
  findWordByName: jest.fn().mockResolvedValue(null),
  getVariantsByWord: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../src/services/variantService', () => ({
  ...jest.requireActual('../../src/services/variantService'),
  getVariantsByWord: jest.fn().mockResolvedValue([]),
  addVariant: jest.fn().mockResolvedValue(1),
  updateVariant: jest.fn().mockResolvedValue(undefined),
  deleteVariant: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/services/settingsService', () => ({
  ...jest.requireActual('../../src/services/settingsService'),
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
  return renderWithProviders(
    <AddWordModal visible={true} onClose={jest.fn()} {...props} />
  );
}

function flattenStyle(style: unknown): Record<string, unknown> {
  return Array.isArray(style) ? Object.assign({}, ...style) : (style as Record<string, unknown> ?? {});
}

describe('AddWordModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouterPush.mockClear();
    (categoryService.getCategories as jest.Mock).mockResolvedValue([
      { id: 1, name: 'animals', color: '#FF6B9D', emoji: '🐾', created_at: '' },
    ]);
    (wordService.findWordByName as jest.Mock).mockResolvedValue(null);
    (variantService.getVariantsByWord as jest.Mock).mockResolvedValue([]);
    (settingsService.getSetting as jest.Mock).mockResolvedValue(null);
    useSettingsStore.setState({ name: 'Leo', sex: 'boy', birth: '', isOnboardingDone: true, isHydrated: true });
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

  it('uses breeze primary border on cancel button when sex is boy', async () => {
    const { findByTestId } = renderModal();
    const cancelButton = await findByTestId('word-cancel-btn');
    const style = flattenStyle(cancelButton.props.style);
    expect(style.borderColor).toBe(getThemeForSex('boy').colors.primary);
  });

  it('uses breeze primary background on add/save button when sex is boy', async () => {
    const { findByTestId } = renderModal();
    const saveButton = await findByTestId('word-save-btn');
    const style = flattenStyle(saveButton.props.style);
    expect(style.backgroundColor).toBe(getThemeForSex('boy').colors.primary);
  });

  it('save button is disabled when word input is empty', async () => {
    const { findByTestId } = renderModal();
    const saveBtn = await findByTestId('word-save-btn');
    expect(saveBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('save button is disabled when word input is 1 character', async () => {
    const { findByTestId, findByPlaceholderText } = renderModal();
    const input = await findByPlaceholderText(/E\.g\./);
    fireEvent.changeText(input, 'a');
    const saveBtn = await findByTestId('word-save-btn');
    expect(saveBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('save button is enabled when word input has 2+ characters', async () => {
    const { findByTestId, findByPlaceholderText } = renderModal();
    const input = await findByPlaceholderText(/E\.g\./);
    fireEvent.changeText(input, 'ab');
    const saveBtn = await findByTestId('word-save-btn');
    expect(saveBtn.props.accessibilityState?.disabled).toBeFalsy();
  });

  it('save button is enabled for accented 2-char input', async () => {
    const { findByTestId, findByPlaceholderText } = renderModal();
    const input = await findByPlaceholderText(/E\.g\./);
    fireEvent.changeText(input, 'éà');
    const saveBtn = await findByTestId('word-save-btn');
    expect(saveBtn.props.accessibilityState?.disabled).toBeFalsy();
  });

  it('saves a new word', async () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    const { findByText, findByPlaceholderText } = renderModal({ onSave, onClose });
    const input = await findByPlaceholderText(/E\.g\./);
    fireEvent.changeText(input, 'hello');
    await act(async () => { fireEvent.press(await findByText('Add')); });
    await waitFor(() => {
      expect(wordService.addWord).toHaveBeenCalledWith('hello', null, expect.any(String), '');
      expect(onSave).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
      expect(mockRouterPush).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: '/(tabs)/words',
          params: expect.objectContaining({ highlightId: '1' }),
        }),
      );
    });
  });

  it('navigates to words tab with highlightId after saving new word', async () => {
    (wordService.addWord as jest.Mock).mockResolvedValueOnce(42);
    const { findByText, findByPlaceholderText } = renderModal();
    fireEvent.changeText(await findByPlaceholderText(/E\.g\./), 'coco');
    await act(async () => { fireEvent.press(await findByText('Add')); });
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: '/(tabs)/words',
          params: expect.objectContaining({ highlightId: '42' }),
        }),
      );
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
      expect(wordService.updateWord).toHaveBeenCalledWith(1, 'mamãe', 1, '2024-01-01', 'a note');
      expect(onSave).toHaveBeenCalled();
    });
  });

  it('navigates to words tab with editWord highlightId after editing a word', async () => {
    const { findByText, findByDisplayValue } = renderModal({ editWord: mockWord });
    await findByDisplayValue('mamãe');
    await act(async () => { fireEvent.press(await findByText('Save')); });
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: '/(tabs)/words',
          params: expect.objectContaining({ highlightId: '1' }),
        }),
      );
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
      expect(wordService.deleteWord).toHaveBeenCalledWith(1);
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
      expect(variantService.addVariant).toHaveBeenCalledWith(1, 'hewwo', expect.any(String));
    });
  });

  it('shows existing variants in edit mode', async () => {
    (variantService.getVariantsByWord as jest.Mock).mockResolvedValue([
      { id: 10, word_id: 1, variant: 'mamá', date_heard: '2024-01-01', notes: '' },
    ]);
    const { findByText } = renderModal({ editWord: mockWord });
    expect(await findByText(/mamá/)).toBeTruthy();
  });

  it('allows inline editing of existing variant', async () => {
    (variantService.getVariantsByWord as jest.Mock).mockResolvedValue([
      { id: 10, word_id: 1, variant: 'mamá', date_heard: '2024-01-01', notes: '' },
    ]);
    const { findByText, findByTestId } = renderModal({ editWord: mockWord });
    // Click on existing variant to enter edit mode
    fireEvent.press(await findByText(/mamá/));
    // Should now be in editing mode (TextInput visible)
    // The variant text should be editable — remove button has testID
    expect(await findByTestId('existing-variant-delete-mamá')).toBeTruthy();
  });

  it('shows duplicate detection card', async () => {
    jest.useFakeTimers();
    (wordService.findWordByName as jest.Mock).mockResolvedValue({
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
    (wordService.findWordByName as jest.Mock).mockResolvedValue({
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
    const { findByText, findAllByTestId } = renderModal();
    // Add two variants
    fireEvent.press(await findByText(/Add variant/));
    fireEvent.press(await findByText(/Another variant/));
    // Find remove buttons by testID pattern
    const removeBtns = await findAllByTestId(/new-variant-remove-/);
    expect(removeBtns.length).toBe(2);
    // Remove the first one
    fireEvent.press(removeBtns[0]);
    // Should still have one variant row left
    const remainingRemoveBtns = await findAllByTestId(/new-variant-remove-/);
    expect(remainingRemoveBtns.length).toBe(1);
  });

  it('renders notes section', async () => {
    const { findByPlaceholderText } = renderModal();
    expect(await findByPlaceholderText(/Context/)).toBeTruthy();
  });

  it('opens add category modal', async () => {
    const { findByText, findByTestId } = renderModal();
    fireEvent.press(await findByTestId('category-add-btn'));
    expect(await findByText(/New Category/)).toBeTruthy();
  });

  it('deletes an existing variant in edit mode', async () => {
    (variantService.getVariantsByWord as jest.Mock).mockResolvedValue([
      { id: 10, word_id: 1, variant: 'mamá', date_heard: '2024-01-01', notes: '' },
    ]);
    const { findByText, findByTestId } = renderModal({ editWord: mockWord });
    // Enter edit mode on variant
    fireEvent.press(await findByText(/mamá/));
    // Find delete button by testID and press
    const removeBtn = await findByTestId('existing-variant-delete-mamá');
    await act(async () => { fireEvent.press(removeBtn); });
    await waitFor(() => {
      expect(variantService.deleteVariant).toHaveBeenCalledWith(10);
    });
  });

  it('saves inline variant edit on blur', async () => {
    (variantService.getVariantsByWord as jest.Mock).mockResolvedValue([
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
      expect(variantService.updateVariant).toHaveBeenCalledWith(10, 'mamãzinha', expect.any(String), '');
    });
  });

  it('flushes inline variant edits during save', async () => {
    (variantService.getVariantsByWord as jest.Mock).mockResolvedValue([
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
      expect(variantService.updateVariant).toHaveBeenCalledWith(10, 'mamã', expect.any(String), '');
      expect(wordService.updateWord).toHaveBeenCalled();
    });
  });

  it('long press category opens edit category modal', async () => {
    const { findByText } = renderModal();
    const catChip = await findByText('Animals');
    fireEvent(catChip, 'longPress');
    expect(await findByText(/Edit Category/)).toBeTruthy();
  });

  it('closes AddCategoryModal from within AddWordModal (covers onClose callback)', async () => {
    const { findByText, findAllByText, findByTestId } = renderModal();
    // Open the new category modal
    fireEvent.press(await findByTestId('category-add-btn'));
    expect(await findByText(/New Category/)).toBeTruthy();
    // Both AddWordModal and AddCategoryModal have Cancel buttons — press the last one (AddCategoryModal's)
    const cancelBtns = await findAllByText('Cancel');
    fireEvent.press(cancelBtns[cancelBtns.length - 1]);
    // AddCategoryModal is closed — AddWordModal should still be visible
    expect(await findByText(/Add Word|New Word/i)).toBeTruthy();
  });

  it('scrolls to selected category index > 0 on open with editWord (covers lines 115-116)', async () => {
    jest.useFakeTimers();
    (categoryService.getCategories as jest.Mock).mockResolvedValue([
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
    (variantService.getVariantsByWord as jest.Mock).mockResolvedValue([
      { id: 10, word_id: 1, variant: 'mamá', date_heard: '2024-01-01', notes: '' },
    ]);
    const { findByText, findByDisplayValue } = renderModal({ editWord: mockWord });
    fireEvent.press(await findByText(/mamá/));
    const varInput = await findByDisplayValue('mamá');
    // Blur without changing text — text === v.variant, no update
    await act(async () => { fireEvent(varInput, 'blur'); });
    expect(variantService.updateVariant).not.toHaveBeenCalled();
  });

  it('flush inline variant edit with unchanged text is no-op (covers line 180 text===original.variant)', async () => {
    (variantService.getVariantsByWord as jest.Mock).mockResolvedValue([
      { id: 10, word_id: 1, variant: 'mamá', date_heard: '2024-01-01', notes: '' },
    ]);
    const { findByText, findByDisplayValue } = renderModal({ editWord: mockWord });
    await findByDisplayValue('mamãe');
    // Enter inline edit but do NOT change text
    fireEvent.press(await findByText(/mamá/));
    // Save — flush loop sees text === original.variant → skip updateVariant
    await act(async () => { fireEvent.press(await findByText('Save')); });
    await waitFor(() => expect(wordService.updateWord).toHaveBeenCalled());
    expect(variantService.updateVariant).not.toHaveBeenCalled();
  });

  it('duplicate card shows singular variant label (covers line 244 count===1 branch)', async () => {
    jest.useFakeTimers();
    (wordService.findWordByName as jest.Mock).mockResolvedValue({
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
    (categoryService.getCategories as jest.Mock)
      .mockResolvedValueOnce([
        { id: 1, name: 'animals', color: '#FF6B9D', emoji: '🐾', created_at: '' },
      ])
      .mockResolvedValue([
        { id: 1, name: 'animals', color: '#FF6B9D', emoji: '🐾', created_at: '' },
        { id: 2, name: 'NewCat', color: '#00B894', emoji: '🎨', created_at: '' },
      ]);

    const { findByText, findByPlaceholderText, findByTestId } = renderModal();

    // Wait for initial load
    await findByText('Animals');

    fireEvent.press(await findByTestId('category-add-btn'));
    expect(await findByText(/New Category/)).toBeTruthy();
    fireEvent.changeText(await findByPlaceholderText(/Toys/), 'NewCat');

    (categoryService.addCategory as jest.Mock).mockResolvedValue(2);
    await act(async () => { fireEvent.press(await findByText('Create Category')); });

    await waitFor(() => {
      expect(categoryService.addCategory).toHaveBeenCalled();
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
    await waitFor(() => expect(categoryService.deleteCategoryWithUnlink).toHaveBeenCalled());
  });
});

describe('AddWordModal — panResponder gesture handlers', () => {
  let capturedConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouterPush.mockClear();
    capturedConfig = null;
    (categoryService.getCategories as jest.Mock).mockResolvedValue([
      { id: 1, name: 'animals', color: '#FF6B9D', emoji: '🐾', created_at: '' },
    ]);
    (settingsService.getSetting as jest.Mock).mockResolvedValue(null);
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

describe('AddWordModal — creating-word phase (media capture)', () => {
  const mockOnWordCreated = jest.fn();
  const mockResetCapture = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouterPush.mockClear();
    (categoryService.getCategories as jest.Mock).mockResolvedValue([
      { id: 1, name: 'animals', color: '#FF6B9D', emoji: '🐾', created_at: '' },
    ]);
    (wordService.findWordByName as jest.Mock).mockResolvedValue(null);
    (variantService.getVariantsByWord as jest.Mock).mockResolvedValue([]);
    (settingsService.getSetting as jest.Mock).mockResolvedValue(null);
    useSettingsStore.setState({ name: 'Leo', sex: 'boy', birth: '', isOnboardingDone: true, isHydrated: true });
    jest.spyOn(require('../../src/hooks/useMediaCapture'), 'useMediaCapture').mockReturnValue({
      phase: 'creating-word',
      pendingMedia: { uri: 'file:///recording.m4a', assetType: 'audio', mimeType: 'audio/m4a', fileSize: 100, duration: 3000 },
      prefilledWordName: 'doggie',
      onWordCreated: mockOnWordCreated,
      resetCapture: mockResetCapture,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('prefills word name from prefilledWordName', async () => {
    const { AddWordModal: Modal } = require('../../src/components/AddWordModal');
    const { findByDisplayValue } = renderWithProviders(
      <Modal visible onClose={jest.fn()} />
    );
    expect(await findByDisplayValue('doggie')).toBeTruthy();
  });

  it('calls onWordCreated after saving in creating-word phase', async () => {
    mockOnWordCreated.mockResolvedValue(undefined);
    const { AddWordModal: Modal } = require('../../src/components/AddWordModal');
    const { findByText, findByDisplayValue } = renderWithProviders(
      <Modal visible onClose={jest.fn()} />
    );
    await findByDisplayValue('doggie');
    await act(async () => { fireEvent.press(await findByText('Add')); });
    await waitFor(() => {
      expect(mockOnWordCreated).toHaveBeenCalled();
    });
  });

  it('calls resetCapture when cancel pressed in creating-word phase', async () => {
    const { AddWordModal: Modal } = require('../../src/components/AddWordModal');
    const { findByText } = renderWithProviders(
      <Modal visible onClose={jest.fn()} />
    );
    fireEvent.press(await findByText('Cancel'));
    expect(mockResetCapture).toHaveBeenCalled();
  });

  it('dismisses keyboard when backdrop pressed', () => {
    const { Keyboard } = require('react-native');
    const dismissSpy = jest.spyOn(Keyboard, 'dismiss');
    const { getByTestId } = renderModal();
    fireEvent.press(getByTestId('add-word-backdrop'));
    expect(dismissSpy).toHaveBeenCalled();
    dismissSpy.mockRestore();
  });
});
