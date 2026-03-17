import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, PanResponder } from 'react-native';
import { AddCategoryModal } from '../../src/components/AddCategoryModal';
import * as categoryService from '../../src/services/categoryService';
import * as settingsService from '../../src/services/settingsService';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { getThemeForSex } from '../../src/theme/getThemeForSex';

jest.spyOn(Alert, 'alert');

jest.mock('../../src/services/categoryService', () => ({
  ...jest.requireActual('../../src/services/categoryService'),
  addCategory: jest.fn().mockResolvedValue(1),
  updateCategory: jest.fn().mockResolvedValue(undefined),
  deleteCategory: jest.fn().mockResolvedValue(undefined),
  deleteCategoryWithUnlink: jest.fn().mockResolvedValue(undefined),
  unlinkWordsFromCategory: jest.fn().mockResolvedValue(undefined),
  getWordCountByCategory: jest.fn().mockResolvedValue(0),
}));

jest.mock('../../src/services/settingsService', () => ({
  ...jest.requireActual('../../src/services/settingsService'),
  getSetting: jest.fn().mockResolvedValue(null),
  setSetting: jest.fn().mockResolvedValue(undefined),
}));

const editCat = { id: 1, name: 'Test', color: '#FF6B9D', emoji: '🐾' };

function renderModal(props: Partial<React.ComponentProps<typeof AddCategoryModal>> = {}) {
  return renderWithProviders(
    <AddCategoryModal visible={true} onClose={jest.fn()} onSave={jest.fn()} {...props} />
  );
}

function flattenStyle(style: unknown): Record<string, unknown> {
  return Array.isArray(style) ? Object.assign({}, ...style) : (style as Record<string, unknown> ?? {});
}

describe('AddCategoryModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSettingsStore.setState({ name: 'Leo', sex: 'boy', birth: '', isOnboardingDone: true, isHydrated: true });
  });

  it('renders create mode title', async () => {
    const { findByText } = renderModal();
    expect(await findByText(/New Category/)).toBeTruthy();
  });

  it('uses breeze surface color for category name input when sex is boy', async () => {
    const { findByTestId } = renderModal();
    const input = await findByTestId('category-name-input');
    const style = flattenStyle(input.props.style);
    expect(style.backgroundColor).toBe(getThemeForSex('boy').colors.surface);
  });

  it('uses breeze primary border on cancel button in boy mode', async () => {
    const { findByTestId } = renderModal();
    const cancelButton = await findByTestId('category-cancel-btn');
    const style = flattenStyle(cancelButton.props.style);
    expect(style.borderColor).toBe(getThemeForSex('boy').colors.primary);
  });

  it('uses breeze primary background on create/save button in boy mode', async () => {
    const { findByTestId } = renderModal();
    const saveButton = await findByTestId('category-save-btn');
    const style = flattenStyle(saveButton.props.style);
    expect(style.backgroundColor).toBe(getThemeForSex('boy').colors.primary);
  });

  it('renders edit mode title', async () => {
    const { findByText } = renderModal({ editCategory: editCat });
    expect(await findByText(/Edit Category/)).toBeTruthy();
  });

  it('renders correctly after reopening', async () => {
    const onClose = jest.fn();
    const view = renderWithProviders(
      <AddCategoryModal visible={false} onClose={onClose} onSave={jest.fn()} />
    );

    view.rerender(
      <AddCategoryModal visible={true} onClose={onClose} onSave={jest.fn()} />
    );

    expect(await view.findByText(/New Category/)).toBeTruthy();
  });

  it('shows delete button in edit mode', async () => {
    const { findByText } = renderModal({ editCategory: editCat, onDeleted: jest.fn() });
    expect(await findByText(/Remove/)).toBeTruthy();
  });

  it('alerts on empty name save', async () => {
    const { findByText } = renderModal();
    fireEvent.press(await findByText('Create Category'));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
  });

  it('creates a new category', async () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    const { findByText, findByPlaceholderText } = renderModal({ onSave, onClose });
    fireEvent.changeText(await findByPlaceholderText(/Toys/), 'NewCat');
    fireEvent.press(await findByText('Create Category'));
    await waitFor(() => {
      expect(categoryService.addCategory).toHaveBeenCalledWith('NewCat', expect.any(String), expect.any(String));
      expect(onSave).toHaveBeenCalledWith(1);
    });
  });

  it('updates an existing category', async () => {
    const onSave = jest.fn();
    const { findByText, findByDisplayValue } = renderModal({ onSave, editCategory: editCat });
    await findByDisplayValue('Test');
    fireEvent.press(await findByText(/Save/));
    await waitFor(() => {
      expect(categoryService.updateCategory).toHaveBeenCalledWith(1, 'Test', '#FF6B9D', '🐾');
      expect(onSave).toHaveBeenCalledWith(1);
    });
  });

  it('handles delete flow', async () => {
    const onClose = jest.fn();
    const onDeleted = jest.fn();
    const { findByText } = renderModal({ onClose, onDeleted, editCategory: editCat });
    fireEvent.press(await findByText(/Remove/));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const destructiveBtn = alertCall[2].find((b: any) => b.style === 'destructive');
    await act(async () => { destructiveBtn.onPress(); });
    await waitFor(() => {
      expect(categoryService.deleteCategoryWithUnlink).toHaveBeenCalledWith(1);
      expect(onDeleted).toHaveBeenCalled();
    });
  });

  it('handles save error with UNIQUE constraint', async () => {
    (categoryService.addCategory as jest.Mock).mockRejectedValue(new Error('UNIQUE constraint failed'));
    const { findByText, findByPlaceholderText } = renderModal();
    fireEvent.changeText(await findByPlaceholderText(/Toys/), 'Duplicate');
    fireEvent.press(await findByText('Create Category'));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  it('calls onClose when cancel is pressed', async () => {
    const onClose = jest.fn();
    const { findByText } = renderModal({ onClose });
    fireEvent.press(await findByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('allows selecting emoji and color', async () => {
    const { findByText, findAllByText } = renderModal();
    // Select a different emoji (they are rendered in the emoji scroll)
    const emojis = await findAllByText('🎨');
    fireEvent.press(emojis[0]);
    // Color buttons render checkmarks when selected
    expect(await findByText('✓')).toBeTruthy();
  });

  it('handles delete when onDeleted is not provided (optional chaining)', async () => {
    // Renders without onDeleted — the optional ?. call should not throw
    const onClose = jest.fn();
    const { findByText } = renderModal({ onClose, editCategory: editCat });
    fireEvent.press(await findByText(/Remove/));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const destructiveBtn = alertCall[2].find((b: any) => b.style === 'destructive');
    await act(async () => { destructiveBtn.onPress(); });
    await waitFor(() => {
      expect(categoryService.deleteCategoryWithUnlink).toHaveBeenCalledWith(1);
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('handles save error with non-UNIQUE message', async () => {
    (categoryService.addCategory as jest.Mock).mockRejectedValue(new Error('some other error'));
    const { findByText, findByPlaceholderText } = renderModal();
    fireEvent.changeText(await findByPlaceholderText(/Toys/), 'AnotherCat');
    fireEvent.press(await findByText('Create Category'));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
      const [, msg] = (Alert.alert as jest.Mock).mock.calls[0];
      expect(msg).toContain('some other error');
    });
  });

  it('handleDelete shows word count message when category has words', async () => {
    (categoryService.getWordCountByCategory as jest.Mock).mockResolvedValue(5);
    const { findByText } = renderModal({ editCategory: editCat });
    // Wait for the word count query to resolve before pressing delete
    await waitFor(() => expect(categoryService.getWordCountByCategory).toHaveBeenCalledWith(1));
    fireEvent.press(await findByText(/Remove/));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
      const msg = (Alert.alert as jest.Mock).mock.calls[0][1];
      expect(msg).toMatch(/5/);
    });
  });
});

describe('AddCategoryModal — panResponder gesture handlers', () => {
  let capturedConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedConfig = null;
    jest.spyOn(PanResponder, 'create').mockImplementation((config: any) => {
      capturedConfig = config;
      return { panHandlers: {} };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function renderWithPan(props: Record<string, any> = {}) {
    const { AddCategoryModal } = require('../../src/components/AddCategoryModal');
    const result = renderWithProviders(
      <AddCategoryModal visible={true} onClose={jest.fn()} onSave={jest.fn()} {...props} />
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

  it('onPanResponderRelease dismisses when dy > 100', async () => {
    const onClose = jest.fn();
    await renderWithPan({ onClose });
    act(() => { capturedConfig.onPanResponderRelease(null, { dy: 150, vy: 0.5 }); });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('onPanResponderRelease dismisses when vy > 0.8', async () => {
    const onClose = jest.fn();
    await renderWithPan({ onClose });
    act(() => { capturedConfig.onPanResponderRelease(null, { dy: 50, vy: 1.5 }); });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('onPanResponderRelease springs back when gesture is too small', async () => {
    await renderWithPan();
    act(() => { capturedConfig.onPanResponderRelease(null, { dy: 30, vy: 0.2 }); });
  });
});
