import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { I18nProvider } from '../../src/i18n/i18n';
import { ManageCategoryModal } from '../../src/components/ManageCategoryModal';

jest.spyOn(Alert, 'alert');

const mockDb = (global as any).__mockDb;
const mockCategory = { id: 1, name: 'animals', color: '#FF6B9D', emoji: '🐾' };

function renderWithProvider(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('ManageCategoryModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders nothing when category is null', async () => {
    const { queryByText } = renderWithProvider(
      <ManageCategoryModal visible={true} category={null} onClose={jest.fn()} onEdit={jest.fn()} onDeleted={jest.fn()} />
    );
    await waitFor(() => {
      expect(queryByText('✏️')).toBeNull();
    });
  });

  it('renders category preview', async () => {
    const { findByText } = renderWithProvider(
      <ManageCategoryModal visible={true} category={mockCategory} onClose={jest.fn()} onEdit={jest.fn()} onDeleted={jest.fn()} />
    );
    expect(await findByText('Animals')).toBeTruthy();
    expect(await findByText('🐾')).toBeTruthy();
  });

  it('calls onClose when cancel is pressed', async () => {
    const onClose = jest.fn();
    const { findByText } = renderWithProvider(
      <ManageCategoryModal visible={true} category={mockCategory} onClose={onClose} onEdit={jest.fn()} onDeleted={jest.fn()} />
    );
    fireEvent.press(await findByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows delete confirmation alert', async () => {
    // getWordCountByCategory will call getAllSync which returns [{count: 0}]
    mockDb.getAllSync.mockReturnValueOnce([{ count: 0 }]);
    const { findByText } = renderWithProvider(
      <ManageCategoryModal visible={true} category={mockCategory} onClose={jest.fn()} onEdit={jest.fn()} onDeleted={jest.fn()} />
    );
    fireEvent.press(await findByText('Delete category'));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });
  });
});
