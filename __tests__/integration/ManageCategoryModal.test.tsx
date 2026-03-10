import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { I18nProvider } from '../../src/i18n/i18n';
import { ManageCategoryModal } from '../../src/components/ManageCategoryModal';
import * as database from '../../src/database/database';

jest.spyOn(Alert, 'alert');

jest.mock('../../src/database/database', () => ({
  ...jest.requireActual('../../src/database/database'),
  getWordCountByCategory: jest.fn().mockResolvedValue(0),
  unlinkWordsFromCategory: jest.fn().mockResolvedValue(undefined),
  deleteCategory: jest.fn().mockResolvedValue(undefined),
  getSetting: jest.fn().mockResolvedValue(null),
  setSetting: jest.fn().mockResolvedValue(undefined),
}));

const mockCategory = { id: 1, name: 'animals', color: '#FF6B9D', emoji: '🐾' };

function renderModal(props: Partial<React.ComponentProps<typeof ManageCategoryModal>> = {}) {
  return render(
    <I18nProvider>
      <ManageCategoryModal
        visible={true}
        category={mockCategory}
        onClose={jest.fn()}
        onEdit={jest.fn()}
        onDeleted={jest.fn()}
        {...props}
      />
    </I18nProvider>
  );
}

describe('ManageCategoryModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders nothing when category is null', async () => {
    const { queryByText } = renderModal({ category: null });
    await waitFor(() => {
      expect(queryByText('✏️')).toBeNull();
    });
  });

  it('renders category preview', async () => {
    const { findByText } = renderModal();
    expect(await findByText('Animals')).toBeTruthy();
    expect(await findByText('🐾')).toBeTruthy();
  });

  it('renders correctly after reopening', async () => {
    const onClose = jest.fn();
    const onEdit = jest.fn();
    const onDeleted = jest.fn();
    const view = render(
      <I18nProvider>
        <ManageCategoryModal
          visible={false}
          category={mockCategory}
          onClose={onClose}
          onEdit={onEdit}
          onDeleted={onDeleted}
        />
      </I18nProvider>
    );

    view.rerender(
      <I18nProvider>
        <ManageCategoryModal
          visible={true}
          category={mockCategory}
          onClose={onClose}
          onEdit={onEdit}
          onDeleted={onDeleted}
        />
      </I18nProvider>
    );

    expect(await view.findByText('Animals')).toBeTruthy();
  });

  it('calls onClose when cancel is pressed', async () => {
    const onClose = jest.fn();
    const { findByText } = renderModal({ onClose });
    fireEvent.press(await findByText('Cancel'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('shows delete confirmation alert', async () => {
    const { findByText } = renderModal();
    fireEvent.press(await findByText(/Delete category/));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  it('deletes category when confirmed', async () => {
    const onClose = jest.fn();
    const onDeleted = jest.fn();
    const { findByText } = renderModal({ onClose, onDeleted });
    fireEvent.press(await findByText(/Delete category/));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const destructiveBtn = alertCall[2].find((b: any) => b.style === 'destructive');
    await act(async () => { destructiveBtn.onPress(); });
    await waitFor(() => {
      expect(database.unlinkWordsFromCategory).toHaveBeenCalledWith(1);
      expect(database.deleteCategory).toHaveBeenCalledWith(1);
      expect(onClose).toHaveBeenCalled();
      expect(onDeleted).toHaveBeenCalled();
    });
  });

  it('calls onEdit when edit is pressed', async () => {
    const onClose = jest.fn();
    const onEdit = jest.fn();
    jest.useFakeTimers();
    const { findByText } = renderModal({ onClose, onEdit });
    fireEvent.press(await findByText('✏️'));
    // dismissModal runs a 250ms animation before calling onClose, then onEdit fires after a 300ms setTimeout
    act(() => { jest.advanceTimersByTime(600); });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onEdit).toHaveBeenCalledWith(mockCategory);
    jest.useRealTimers();
  });

  it('shows word count in delete message when words exist', async () => {
    (database.getWordCountByCategory as jest.Mock).mockResolvedValue(3);
    const { findByText } = renderModal();
    fireEvent.press(await findByText(/Delete category/));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
      const msg = (Alert.alert as jest.Mock).mock.calls[0][1];
      expect(msg).toMatch(/3/);
    });
  });
});
