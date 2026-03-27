import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { KeepsakePreviewModal } from '../../src/components/keepsake/KeepsakePreviewModal';
import type { KeepsakeWord } from '../../src/types/keepsake';

let mockWords: KeepsakeWord[] = [
  { id: 1, word: 'mama', dateAdded: '2026-01-01', photoUri: null, categoryEmoji: '👨‍👩‍👧' },
  { id: 2, word: 'papa', dateAdded: '2026-01-02', photoUri: null, categoryEmoji: '👨‍👩‍👧' },
];

jest.mock('../../src/services/keepsakeService', () => ({
  getKeepsakeWords: jest.fn(() => Promise.resolve(mockWords)),
  loadKeepsakeState: jest.fn(() => Promise.resolve({
    isGenerated: false,
    generatedAt: null,
    photoOverrides: {},
  })),
  captureKeepsake: jest.fn(() => Promise.resolve('file:///mock/capture.jpg')),
  setPhotoOverride: jest.fn(() => Promise.resolve()),
  saveKeepsakeToLibrary: jest.fn(() => Promise.resolve()),
  shareKeepsake: jest.fn(() => Promise.resolve()),
  getKeepsakeFileUri: jest.fn(() => 'file:///mock/keepsake.jpg'),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockWords = [
    { id: 1, word: 'mama', dateAdded: '2026-01-01', photoUri: null, categoryEmoji: '👨‍👩‍👧' },
    { id: 2, word: 'papa', dateAdded: '2026-01-02', photoUri: null, categoryEmoji: '👨‍👩‍👧' },
  ];
});

describe('KeepsakePreviewModal', () => {
  it('allows saving twice in sequence', async () => {
    const onClose = jest.fn();
    const keepsakeService = require('../../src/services/keepsakeService');
    const { findByTestId } = renderWithProviders(
      <KeepsakePreviewModal visible={true} onClose={onClose} />,
    );

    const saveBtn = await findByTestId('keepsake-save-btn');

    fireEvent.press(saveBtn);
    await waitFor(() => {
      expect(keepsakeService.captureKeepsake).toHaveBeenCalledTimes(1);
      expect(keepsakeService.saveKeepsakeToLibrary).toHaveBeenCalledTimes(1);
    });

    fireEvent.press(saveBtn);
    await waitFor(() => {
      expect(keepsakeService.captureKeepsake).toHaveBeenCalledTimes(2);
      expect(keepsakeService.saveKeepsakeToLibrary).toHaveBeenCalledTimes(2);
    });
  });

  it('allows sharing twice in sequence', async () => {
    const onClose = jest.fn();
    const keepsakeService = require('../../src/services/keepsakeService');
    const { findByTestId } = renderWithProviders(
      <KeepsakePreviewModal visible={true} onClose={onClose} />,
    );

    const shareBtn = await findByTestId('keepsake-share-btn');

    fireEvent.press(shareBtn);
    await waitFor(() => {
      expect(keepsakeService.captureKeepsake).toHaveBeenCalledTimes(1);
      expect(keepsakeService.shareKeepsake).toHaveBeenCalledTimes(1);
    });

    fireEvent.press(shareBtn);
    await waitFor(() => {
      expect(keepsakeService.captureKeepsake).toHaveBeenCalledTimes(2);
      expect(keepsakeService.shareKeepsake).toHaveBeenCalledTimes(2);
    });
  });

  it('renders modal when visible', async () => {
    const onClose = jest.fn();
    const { findByTestId } = renderWithProviders(
      <KeepsakePreviewModal visible={true} onClose={onClose} />,
    );

    const modal = await findByTestId('keepsake-preview-modal');
    expect(modal).toBeTruthy();
  });

  it('calls onClose when close button is pressed', async () => {
    const onClose = jest.fn();
    const { findByTestId } = renderWithProviders(
      <KeepsakePreviewModal visible={true} onClose={onClose} />,
    );

    const closeBtn = await findByTestId('keepsake-close-btn');
    fireEvent.press(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders save and share buttons when words are loaded', async () => {
    const onClose = jest.fn();
    const { findByTestId } = renderWithProviders(
      <KeepsakePreviewModal visible={true} onClose={onClose} />,
    );

    const saveBtn = await findByTestId('keepsake-save-btn');
    const shareBtn = await findByTestId('keepsake-share-btn');
    expect(saveBtn).toBeTruthy();
    expect(shareBtn).toBeTruthy();
  });

  it('renders photo swap touch targets for each word', async () => {
    const onClose = jest.fn();
    const { findByTestId } = renderWithProviders(
      <KeepsakePreviewModal visible={true} onClose={onClose} />,
    );

    const swap0 = await findByTestId('keepsake-swap-0');
    const swap1 = await findByTestId('keepsake-swap-1');
    expect(swap0).toBeTruthy();
    expect(swap1).toBeTruthy();
  });

  it('hides camera badge when photo already exists', async () => {
    mockWords = [
      { id: 1, word: 'mama', dateAdded: '2026-01-01', photoUri: 'file:///photo-1.jpg', categoryEmoji: '👨‍👩‍👧' },
      { id: 2, word: 'papa', dateAdded: '2026-01-02', photoUri: null, categoryEmoji: '👨‍👩‍👧' },
    ];
    const onClose = jest.fn();
    const { findByTestId, queryByTestId } = renderWithProviders(
      <KeepsakePreviewModal visible={true} onClose={onClose} />,
    );

    await findByTestId('keepsake-swap-0');
    await findByTestId('keepsake-swap-1');
    expect(queryByTestId('keepsake-swap-badge-0')).toBeNull();
    expect(queryByTestId('keepsake-swap-badge-1')).toBeTruthy();
  });

  it('opens Alert when photo swap target is pressed', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const onClose = jest.fn();
    const { findByTestId } = renderWithProviders(
      <KeepsakePreviewModal visible={true} onClose={onClose} />,
    );

    const swap0 = await findByTestId('keepsake-swap-0');
    fireEvent.press(swap0);

    expect(alertSpy).toHaveBeenCalledWith(
      expect.any(String),
      undefined,
      expect.arrayContaining([
        expect.objectContaining({ text: expect.any(String) }),
      ]),
    );
  });

  it('does not render content when modal is not visible', () => {
    const onClose = jest.fn();
    const { queryByTestId } = renderWithProviders(
      <KeepsakePreviewModal visible={false} onClose={onClose} />,
    );
    // RN Modal with visible=false doesn't render children in test env
    expect(queryByTestId('keepsake-close-btn')).toBeNull();
  });
});
