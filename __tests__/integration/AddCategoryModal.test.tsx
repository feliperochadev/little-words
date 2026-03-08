import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { I18nProvider } from '../../src/i18n/i18n';
import { AddCategoryModal } from '../../src/components/AddCategoryModal';

jest.spyOn(Alert, 'alert');

const mockDb = (global as any).__mockDb;

function renderWithProvider(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('AddCategoryModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders create mode title', async () => {
    const { findByText } = renderWithProvider(
      <AddCategoryModal visible={true} onClose={jest.fn()} onSave={jest.fn()} />
    );
    expect(await findByText(/New Category/)).toBeTruthy();
  });

  it('renders edit mode title when editCategory provided', async () => {
    const cat = { id: 1, name: 'Test', color: '#FF6B9D', emoji: '🐾' };
    const { findByText } = renderWithProvider(
      <AddCategoryModal visible={true} onClose={jest.fn()} onSave={jest.fn()} editCategory={cat} />
    );
    expect(await findByText(/Edit Category/)).toBeTruthy();
  });

  it('shows delete button in edit mode', async () => {
    const cat = { id: 1, name: 'Test', color: '#FF6B9D', emoji: '🐾' };
    const { findByText } = renderWithProvider(
      <AddCategoryModal visible={true} onClose={jest.fn()} onSave={jest.fn()} editCategory={cat} onDeleted={jest.fn()} />
    );
    expect(await findByText(/Remove/)).toBeTruthy();
  });

  it('alerts on empty name save', async () => {
    const { findByText } = renderWithProvider(
      <AddCategoryModal visible={true} onClose={jest.fn()} onSave={jest.fn()} />
    );
    fireEvent.press(await findByText('Create Category'));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  it('calls onSave after successful create', async () => {
    mockDb.runSync.mockReturnValue({ lastInsertRowId: 5, changes: 1 });
    const onSave = jest.fn();
    const onClose = jest.fn();
    const { findByText, findByPlaceholderText } = renderWithProvider(
      <AddCategoryModal visible={true} onClose={onClose} onSave={onSave} />
    );
    const input = await findByPlaceholderText(/Toys/);
    fireEvent.changeText(input, 'NewCat');
    fireEvent.press(await findByText('Create Category'));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
    });
  });

  it('calls onClose when cancel is pressed', async () => {
    const onClose = jest.fn();
    const { findByText } = renderWithProvider(
      <AddCategoryModal visible={true} onClose={onClose} onSave={jest.fn()} />
    );
    fireEvent.press(await findByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});
