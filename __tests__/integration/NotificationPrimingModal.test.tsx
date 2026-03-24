import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NotificationPrimingModal } from '../../src/components/NotificationPrimingModal';
import { useNotificationStore } from '../../src/stores/notificationStore';
import { renderWithProviders } from '../helpers/renderWithProviders';

jest.mock('../../src/repositories/notificationRepository', () => ({
  setNotificationState: jest.fn(() => Promise.resolve()),
  getNotificationState: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('../../src/services/notificationService', () => ({
  requestPermissions: jest.fn(() => Promise.resolve(true)),
}));

const { requestPermissions } = require('../../src/services/notificationService');
const { setNotificationState } = require('../../src/repositories/notificationRepository');

function renderModal() {
  return renderWithProviders(<NotificationPrimingModal />);
}

beforeEach(() => {
  jest.clearAllMocks();
  useNotificationStore.setState({ primingVisible: false });
});

describe('NotificationPrimingModal', () => {
  it('renders nothing when primingVisible is false', () => {
    const { queryByTestId } = renderModal();
    expect(queryByTestId('notification-priming-modal')).toBeNull();
  });

  it('renders modal content when primingVisible is true', () => {
    useNotificationStore.setState({ primingVisible: true });
    const { getByTestId } = renderModal();
    expect(getByTestId('notification-priming-modal')).toBeTruthy();
    expect(getByTestId('priming-title')).toBeTruthy();
    expect(getByTestId('priming-body')).toBeTruthy();
    expect(getByTestId('priming-enable-btn')).toBeTruthy();
    expect(getByTestId('priming-not-now-btn')).toBeTruthy();
  });

  it('calls requestPermissions and closes on Enable tap', async () => {
    useNotificationStore.setState({ primingVisible: true });
    const { getByTestId } = renderModal();

    fireEvent.press(getByTestId('priming-enable-btn'));

    await waitFor(() => {
      expect(requestPermissions).toHaveBeenCalledTimes(1);
      expect(useNotificationStore.getState().primingVisible).toBe(false);
    });
  });

  it('records permission_requested and closes on Not Now tap', async () => {
    useNotificationStore.setState({ primingVisible: true });
    const { getByTestId } = renderModal();

    fireEvent.press(getByTestId('priming-not-now-btn'));

    await waitFor(() => {
      expect(setNotificationState).toHaveBeenCalledWith('permission_requested', '1');
      expect(setNotificationState).toHaveBeenCalledWith('notifications_enabled', '0');
      expect(useNotificationStore.getState().primingVisible).toBe(false);
    });
  });

  it('shows title in English', () => {
    useNotificationStore.setState({ primingVisible: true });
    const { getByTestId } = renderModal();
    expect(getByTestId('priming-title').props.children).toContain('🔔');
  });
});
