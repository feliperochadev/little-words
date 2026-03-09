import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { I18nProvider } from '../../src/i18n/i18n';
import { AddCategoryModal } from '../../src/components/AddCategoryModal';
import * as database from '../../src/database/database';

jest.spyOn(Alert, 'alert');

jest.mock('../../src/database/database', () => ({
  ...jest.requireActual('../../src/database/database'),
  addCategory: jest.fn().mockResolvedValue(1),
  updateCategory: jest.fn().mockResolvedValue(undefined),
  deleteCategory: jest.fn().mockResolvedValue(undefined),
  unlinkWordsFromCategory: jest.fn().mockResolvedValue(undefined),
  getWordCountByCategory: jest.fn().mockResolvedValue(0),
  getSetting: jest.fn().mockResolvedValue(null),
  setSetting: jest.fn().mockResolvedValue(undefined),
}));

const editCat = { id: 1, name: 'Test', color: '#FF6B9D', emoji: '🐾' };

function renderModal(props: Partial<React.ComponentProps<typeof AddCategoryModal>> = {}) {
  return render(
    <I18nProvider>
      <AddCategoryModal visible={true} onClose={jest.fn()} onSave={jest.fn()} {...props} />
    </I18nProvider>
  );
}

describe('AddCategoryModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders create mode title', async () => {
    const { findByText } = renderModal();
    expect(await findByText(/New Category/)).toBeTruthy();
  });

  it('renders edit mode title', async () => {
    const { findByText } = renderModal({ editCategory: editCat });
    expect(await findByText(/Edit Category/)).toBeTruthy();
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
      expect(database.addCategory).toHaveBeenCalledWith('NewCat', expect.any(String), expect.any(String));
      expect(onSave).toHaveBeenCalled();
    });
  });

  it('updates an existing category', async () => {
    const onSave = jest.fn();
    const { findByText, findByDisplayValue } = renderModal({ onSave, editCategory: editCat });
    await findByDisplayValue('Test');
    fireEvent.press(await findByText(/Save/));
    await waitFor(() => {
      expect(database.updateCategory).toHaveBeenCalledWith(1, 'Test', '#FF6B9D', '🐾');
      expect(onSave).toHaveBeenCalled();
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
      expect(database.unlinkWordsFromCategory).toHaveBeenCalledWith(1);
      expect(database.deleteCategory).toHaveBeenCalledWith(1);
      expect(onDeleted).toHaveBeenCalled();
    });
  });

  it('handles save error with UNIQUE constraint', async () => {
    (database.addCategory as jest.Mock).mockRejectedValue(new Error('UNIQUE constraint failed'));
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
});
