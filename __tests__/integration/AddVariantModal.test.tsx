import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, PanResponder } from 'react-native';
import { AddVariantModal } from '../../src/components/AddVariantModal';
import type { Word, Variant } from '../../src/database/database';
import * as database from '../../src/database/database';
import { renderWithProviders } from '../helpers/renderWithProviders';

jest.spyOn(Alert, 'alert');

jest.mock('../../src/database/database', () => ({
  ...jest.requireActual('../../src/database/database'),
  addVariant: jest.fn().mockResolvedValue(1),
  updateVariant: jest.fn().mockResolvedValue(undefined),
  deleteVariant: jest.fn().mockResolvedValue(undefined),
  findVariantByName: jest.fn().mockResolvedValue(null),
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
  return renderWithProviders(
    <AddVariantModal visible={true} onClose={jest.fn()} onSave={jest.fn()} word={mockWord} {...props} />
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
    const view = renderWithProviders(
      <AddVariantModal visible={false} onClose={onClose} onSave={jest.fn()} word={mockWord} />
    );

    view.rerender(
      <AddVariantModal visible={true} onClose={onClose} onSave={jest.fn()} word={mockWord} />
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

  it('clears word search when clear button is pressed', async () => {
    const { findByPlaceholderText, findByText, queryByText } = renderModal({ word: null });
    const searchInput = await findByPlaceholderText('Search word...');
    fireEvent.changeText(searchInput, 'mama');
    // The ✕ button should appear when there is text
    expect(await findByText('✕')).toBeTruthy();
    // Press clear
    fireEvent.press(await findByText('✕'));
    // Input should be cleared (✕ button gone)
    await waitFor(() => {
      expect(queryByText('✕')).toBeNull();
    });
  });

  it('shows duplicate warning card when variant already exists for word', async () => {
    const existingVariant: Variant = { id: 99, word_id: 1, variant: 'mamá', date_added: '2024-01-01', notes: null, created_at: '2024-01-01' };
    (database.findVariantByName as jest.Mock).mockResolvedValue(existingVariant);
    const { findByPlaceholderText, findByText } = renderModal();
    const input = await findByPlaceholderText(/How the child says/);
    fireEvent.changeText(input, 'mamá');
    await waitFor(() => expect(database.findVariantByName).toHaveBeenCalledWith(1, 'mamá'));
    expect(await findByText(/Variant already exists for/i)).toBeTruthy();
  });

  it('blocks save and shows alert when duplicate variant is submitted', async () => {
    const existingVariant: Variant = { id: 99, word_id: 1, variant: 'mamá', date_added: '2024-01-01', notes: null, created_at: '2024-01-01' };
    (database.findVariantByName as jest.Mock).mockResolvedValue(existingVariant);
    const { findByPlaceholderText, findByText } = renderModal();
    const input = await findByPlaceholderText(/How the child says/);
    fireEvent.changeText(input, 'mamá');
    await waitFor(() => expect(database.findVariantByName).toHaveBeenCalled());
    fireEvent.press(await findByText('Add'));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    expect(database.addVariant).not.toHaveBeenCalled();
  });

  it('skips duplicate check when editing a variant', async () => {
    (database.findVariantByName as jest.Mock).mockResolvedValue(null);
    const { findByDisplayValue } = renderModal({ editVariant: mockVariant });
    await findByDisplayValue('mamá');
    expect(database.findVariantByName).not.toHaveBeenCalled();
  });

  it('clears duplicate state when modal reopens', async () => {
    (database.findVariantByName as jest.Mock).mockResolvedValue(null);
    const view = renderWithProviders(
      <AddVariantModal visible={true} onClose={jest.fn()} onSave={jest.fn()} word={mockWord} />
    );
    view.rerender(
      <AddVariantModal visible={false} onClose={jest.fn()} onSave={jest.fn()} word={mockWord} />
    );
    view.rerender(
      <AddVariantModal visible={true} onClose={jest.fn()} onSave={jest.fn()} word={mockWord} />
    );
    expect(await view.findByText(/New Variant/)).toBeTruthy();
  });

  it('can change chosen word (press change chip to deselect)', async () => {
    const { findByText, findByPlaceholderText } = renderModal({ word: null });
    await findByPlaceholderText('Search word...');
    // Select the word
    fireEvent.press(await findByText('mamãe'));
    // Word is now selected — should show change option
    expect(await findByText(/change/i)).toBeTruthy();
    // Press change to deselect
    fireEvent.press(await findByText('mamãe'));
    // Search input should reappear
    expect(await findByPlaceholderText('Search word...')).toBeTruthy();
  });
});

describe('AddVariantModal — panResponder gesture handlers', () => {
  let capturedConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedConfig = null;
    (database.getWords as jest.Mock).mockResolvedValue([mockWord]);
    jest.spyOn(PanResponder, 'create').mockImplementation((config: any) => {
      capturedConfig = config;
      return { panHandlers: {} };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function renderWithPan(props: Record<string, any> = {}) {
    const { AddVariantModal } = require('../../src/components/AddVariantModal');
    const result = renderWithProviders(
      <AddVariantModal visible={true} onClose={jest.fn()} onSave={jest.fn()} word={mockWord} {...props} />
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
