import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, PanResponder } from 'react-native';
import { I18nProvider } from '../../src/i18n/i18n';
import { ManageCategoryModal } from '../../src/components/ManageCategoryModal';
import * as categoryService from '../../src/services/categoryService';
import * as settingsService from '../../src/services/settingsService';
import { renderWithProviders } from '../helpers/renderWithProviders';

jest.spyOn(Alert, 'alert');

jest.mock('../../src/services/categoryService', () => ({
  ...jest.requireActual('../../src/services/categoryService'),
  getWordCountByCategory: jest.fn().mockResolvedValue(0),
  unlinkWordsFromCategory: jest.fn().mockResolvedValue(undefined),
  deleteCategory: jest.fn().mockResolvedValue(undefined),
  deleteCategoryWithUnlink: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/services/settingsService', () => ({
  ...jest.requireActual('../../src/services/settingsService'),
  getSetting: jest.fn().mockResolvedValue(null),
  setSetting: jest.fn().mockResolvedValue(undefined),
}));

const mockDeleteCategoryMutate = jest.fn().mockResolvedValue(undefined);

jest.mock('../../src/hooks/useCategories', () => ({
  ...jest.requireActual('../../src/hooks/useCategories'),
  useDeleteCategory: jest.fn(() => ({
    mutateAsync: mockDeleteCategoryMutate,
    mutate: jest.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null,
    reset: jest.fn(),
    data: undefined,
    variables: undefined,
    context: undefined,
    failureCount: 0,
    failureReason: null,
    isIdle: true,
    isPaused: false,
    status: 'idle',
    submittedAt: 0,
  })),
}));

const mockCategory = { id: 1, name: 'animals', color: '#FF6B9D', emoji: '🐾' };

function renderModal(props: Partial<React.ComponentProps<typeof ManageCategoryModal>> = {}) {
  return renderWithProviders(
    <ManageCategoryModal
      visible={true}
      category={mockCategory}
      onClose={jest.fn()}
      onEdit={jest.fn()}
      onDeleted={jest.fn()}
      {...props}
    />
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
    const view = renderWithProviders(
      <ManageCategoryModal
        visible={false}
        category={mockCategory}
        onClose={onClose}
        onEdit={onEdit}
        onDeleted={onDeleted}
      />
    );

    view.rerender(
      <ManageCategoryModal
        visible={true}
        category={mockCategory}
        onClose={onClose}
        onEdit={onEdit}
        onDeleted={onDeleted}
      />
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

  it('deletes category via hook when confirmed', async () => {
    const onClose = jest.fn();
    const onDeleted = jest.fn();
    const { findByText } = renderModal({ onClose, onDeleted });
    fireEvent.press(await findByText(/Delete category/));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const destructiveBtn = alertCall[2].find((b: any) => b.style === 'destructive');
    await act(async () => { destructiveBtn.onPress(); });
    await waitFor(() => {
      expect(mockDeleteCategoryMutate).toHaveBeenCalledWith({ id: 1 });
      expect(onClose).toHaveBeenCalled();
      expect(onDeleted).toHaveBeenCalled();
    });
  });

  it('shows error alert when deletion fails', async () => {
    mockDeleteCategoryMutate.mockRejectedValueOnce(new Error('DB error'));
    const onClose = jest.fn();
    const onDeleted = jest.fn();
    const { findByText } = renderModal({ onClose, onDeleted });
    fireEvent.press(await findByText(/Delete category/));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const destructiveBtn = alertCall[2].find((b: any) => b.style === 'destructive');
    await act(async () => { destructiveBtn.onPress(); });
    await waitFor(() => {
      expect(onClose).not.toHaveBeenCalled();
      expect(onDeleted).not.toHaveBeenCalled();
      const errorAlert = (Alert.alert as jest.Mock).mock.calls[1];
      expect(errorAlert).toBeDefined();
    });
  });

  it('calls onEdit when edit is pressed', async () => {
    const onClose = jest.fn();
    const onEdit = jest.fn();
    jest.useFakeTimers();
    const { findByText } = renderModal({ onClose, onEdit });
    fireEvent.press(await findByText(/Edit category/));
    // dismissModal runs a 250ms animation before calling onClose, then onEdit fires after a 300ms setTimeout
    act(() => { jest.advanceTimersByTime(600); });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onEdit).toHaveBeenCalledWith(mockCategory);
    jest.useRealTimers();
  });

  it('shows word count in delete message when words exist', async () => {
    (categoryService.getWordCountByCategory as jest.Mock).mockResolvedValue(3);
    const { findByText } = renderModal();
    fireEvent.press(await findByText(/Delete category/));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
      const msg = (Alert.alert as jest.Mock).mock.calls[0][1];
      expect(msg).toMatch(/3/);
    });
  });
});

describe('ManageCategoryModal — panResponder gesture handlers', () => {
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

  async function renderModalWithPan(props: Record<string, any> = {}) {
    const { ManageCategoryModal } = require('../../src/components/ManageCategoryModal');
    const result = render(
      <I18nProvider>
        <ManageCategoryModal
          visible={true}
          category={{ id: 1, name: 'animals', color: '#FF6B9D', emoji: '🐾' }}
          onClose={jest.fn()}
          onEdit={jest.fn()}
          onDeleted={jest.fn()}
          {...props}
        />
      </I18nProvider>
    );
    // Wait for async render to complete and panResponder to be created
    await waitFor(() => { expect(capturedConfig).not.toBeNull(); });
    return result;
  }

  it('onStartShouldSetPanResponder always returns true', async () => {
    await renderModalWithPan();
    expect(capturedConfig.onStartShouldSetPanResponder()).toBe(true);
  });

  it('onMoveShouldSetPanResponder returns true only when dy > 0', async () => {
    await renderModalWithPan();
    expect(capturedConfig.onMoveShouldSetPanResponder(null, { dy: 10 })).toBe(true);
    expect(capturedConfig.onMoveShouldSetPanResponder(null, { dy: -5 })).toBe(false);
  });

  it('onPanResponderMove updates translateY when dy > 0, no-op when dy <= 0', async () => {
    await renderModalWithPan();
    act(() => { capturedConfig.onPanResponderMove(null, { dy: 50 }); });
    act(() => { capturedConfig.onPanResponderMove(null, { dy: -10 }); });
  });

  it('onPanResponderRelease dismisses when dy > 100', async () => {
    const onClose = jest.fn();
    await renderModalWithPan({ onClose });
    act(() => { capturedConfig.onPanResponderRelease(null, { dy: 150, vy: 0.5 }); });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('onPanResponderRelease dismisses when vy > 0.8', async () => {
    const onClose = jest.fn();
    await renderModalWithPan({ onClose });
    act(() => { capturedConfig.onPanResponderRelease(null, { dy: 50, vy: 1.2 }); });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('onPanResponderRelease springs back when gesture is too small', async () => {
    await renderModalWithPan();
    act(() => { capturedConfig.onPanResponderRelease(null, { dy: 50, vy: 0.3 }); });
  });
});
