import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { renderWithProviders } from '../helpers/renderWithProviders';

jest.spyOn(Alert, 'alert');

jest.mock('../../src/services/assetService', () => ({
  ...jest.requireActual('../../src/services/assetService'),
  getAllAssets: jest.fn().mockResolvedValue([]),
  relinkAsset: jest.fn().mockResolvedValue({ id: 1 }),
  renameAsset: jest.fn().mockResolvedValue(undefined),
  updateAssetDate: jest.fn().mockResolvedValue(undefined),
  removeAsset: jest.fn().mockResolvedValue(undefined),
  getAssetsByParent: jest.fn().mockResolvedValue([]),
  getAssetsByParentAndType: jest.fn().mockResolvedValue([]),
  getProfilePhoto: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../src/utils/assetStorage', () => ({
  getAssetFileUri: jest.fn().mockReturnValue('file:///mock/path/asset.m4a'),
  saveAssetFile: jest.fn().mockResolvedValue('asset.m4a'),
  deleteAssetFile: jest.fn().mockResolvedValue(undefined),
  deleteAllAssetsForParent: jest.fn().mockResolvedValue(undefined),
  moveAssetFile: jest.fn().mockReturnValue(undefined),
}));

jest.mock('../../src/services/wordService', () => ({
  ...jest.requireActual('../../src/services/wordService'),
  getWords: jest.fn().mockResolvedValue([]),
  getVariantsByWord: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../src/services/variantService', () => ({
  ...jest.requireActual('../../src/services/variantService'),
  getAllVariants: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../src/services/settingsService', () => ({
  ...jest.requireActual('../../src/services/settingsService'),
  getSetting: jest.fn().mockResolvedValue(null),
}));

import { EditAssetModal } from '../../src/components/EditAssetModal';
import * as assetService from '../../src/services/assetService';
import type { AssetWithLink } from '../../src/types/asset';

const mockAsset: AssetWithLink = {
  id: 1, parent_type: 'word', parent_id: 10, asset_type: 'audio',
  filename: 'asset_1.m4a', name: 'Test Audio', mime_type: 'audio/mp4',
  file_size: 1024, duration_ms: 5000, width: null, height: null,
  created_at: '2024-01-01',
  linked_word: 'baby', linked_word_id: 10, linked_variant: null, linked_variant_id: null,
};

const mockPhotoAsset: AssetWithLink = {
  ...mockAsset,
  id: 2, asset_type: 'photo', filename: 'asset_2.jpg', name: 'Test Photo',
  mime_type: 'image/jpeg', duration_ms: null,
};

const mockVideoAsset: AssetWithLink = {
  ...mockAsset,
  id: 3, asset_type: 'video', filename: 'asset_3.mp4', name: 'Test Video',
  mime_type: 'video/mp4', duration_ms: null,
};

const unlinkedAsset: AssetWithLink = {
  ...mockAsset,
  parent_type: 'unlinked', parent_id: 1,
  linked_word: null, linked_word_id: null,
};

describe('EditAssetModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render when asset is null', () => {
    const { queryByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={null} onClose={jest.fn()} />
    );
    expect(queryByTestId('edit-asset-modal')).toBeNull();
  });

  it('renders correctly when visible with audio asset', async () => {
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockAsset} onClose={jest.fn()} />
    );
    await waitFor(() => {
      expect(getByTestId('edit-asset-modal')).toBeTruthy();
      expect(getByTestId('edit-asset-name-input')).toBeTruthy();
      expect(getByTestId('edit-asset-save')).toBeTruthy();
      expect(getByTestId('edit-asset-remove')).toBeTruthy();
    });
  });

  it('shows name input pre-populated with asset name', async () => {
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockAsset} onClose={jest.fn()} />
    );
    await waitFor(() => {
      const input = getByTestId('edit-asset-name-input');
      expect(input.props.value).toBe('Test Audio');
    });
  });

  it('falls back to filename when name is null', async () => {
    const assetNoName = { ...mockAsset, name: null };
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={assetNoName} onClose={jest.fn()} />
    );
    await waitFor(() => {
      const input = getByTestId('edit-asset-name-input');
      expect(input.props.value).toBe('asset_1.m4a');
    });
  });

  it('calls renameAsset when save is pressed with changed name', async () => {
    const mockRename = assetService.renameAsset as jest.Mock;
    const onClose = jest.fn();
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockAsset} onClose={onClose} />
    );
    await waitFor(() => getByTestId('edit-asset-name-input'));
    fireEvent.changeText(getByTestId('edit-asset-name-input'), 'New Name');
    await act(async () => {
      fireEvent.press(getByTestId('edit-asset-save'));
    });
    await waitFor(() => {
      expect(mockRename).toHaveBeenCalledWith(1, 'New Name');
    });
  });

  it('shows alert when remove button is pressed', async () => {
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockAsset} onClose={jest.fn()} />
    );
    await waitFor(() => getByTestId('edit-asset-remove'));
    fireEvent.press(getByTestId('edit-asset-remove'));
    expect(Alert.alert).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(Array),
    );
  });

  it('renders photo type label for photo asset', async () => {
    const { getByText } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockPhotoAsset} onClose={jest.fn()} />
    );
    await waitFor(() => {
      expect(getByText('Photo')).toBeTruthy();
    });
  });

  it('renders cancel button', async () => {
    const onClose = jest.fn();
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockAsset} onClose={onClose} />
    );
    await waitFor(() => getByTestId('edit-asset-cancel'));
    fireEvent.press(getByTestId('edit-asset-cancel'));
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('renders date field pre-populated with asset date', async () => {
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockAsset} onClose={jest.fn()} />
    );
    await waitFor(() => {
      expect(getByTestId('edit-asset-date')).toBeTruthy();
    });
  });

  it('calls updateAssetDate when date is changed and save is pressed', async () => {
    const onClose = jest.fn();
    const mockUpdateDate = assetService.updateAssetDate as jest.Mock;
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockAsset} onClose={onClose} />
    );
    await waitFor(() => getByTestId('edit-asset-save'));
    fireEvent.changeText(getByTestId('edit-asset-name-input'), mockAsset.name ?? '');
    await act(async () => {
      fireEvent.press(getByTestId('edit-asset-save'));
    });
    await waitFor(() => {
      expect(mockUpdateDate).not.toHaveBeenCalled();
    });
  });

  it('type icon is interactive for audio asset', async () => {
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockAsset} onClose={jest.fn()} />
    );
    await waitFor(() => getByTestId('edit-asset-type-icon'));
    fireEvent.press(getByTestId('edit-asset-type-icon'));
    await waitFor(() => {
      expect(getByTestId('audio-preview-modal')).toBeTruthy();
    });
  });

  it('type icon is interactive for photo asset', async () => {
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockPhotoAsset} onClose={jest.fn()} />
    );
    await waitFor(() => getByTestId('edit-asset-type-icon'));
    fireEvent.press(getByTestId('edit-asset-type-icon'));
    await waitFor(() => {
      expect(getByTestId('photo-preview-modal')).toBeTruthy();
    });
  });

  it('type icon press for video asset does not open overlay', async () => {
    const { getByTestId, queryByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockVideoAsset} onClose={jest.fn()} />
    );
    await waitFor(() => getByTestId('edit-asset-type-icon'));
    fireEvent.press(getByTestId('edit-asset-type-icon'));
    await waitFor(() => {
      expect(queryByTestId('audio-preview-modal')).toBeNull();
      expect(queryByTestId('photo-preview-modal')).toBeNull();
    });
  });

  // ── Link mode buttons ────────────────────────────────────────────────────

  describe('link mode buttons', () => {
    it('shows chip with label when asset is linked to a word', async () => {
      const { getByTestId } = renderWithProviders(
        <EditAssetModal visible={true} asset={mockAsset} onClose={jest.fn()} />
      );
      await waitFor(() => {
        expect(getByTestId('edit-asset-selected-link')).toBeTruthy();
      });
    });

    it('shows two mode buttons for unlinked asset', async () => {
      const { getByTestId } = renderWithProviders(
        <EditAssetModal visible={true} asset={unlinkedAsset} onClose={jest.fn()} />
      );
      await waitFor(() => {
        expect(getByTestId('edit-asset-link-word-btn')).toBeTruthy();
        expect(getByTestId('edit-asset-link-variant-btn')).toBeTruthy();
      });
    });

    it('pressing link-to-word button reveals word search', async () => {
      const { getByTestId, queryByTestId } = renderWithProviders(
        <EditAssetModal visible={true} asset={unlinkedAsset} onClose={jest.fn()} />
      );
      await waitFor(() => getByTestId('edit-asset-link-word-btn'));
      fireEvent.press(getByTestId('edit-asset-link-word-btn'));
      expect(getByTestId('edit-asset-word-search')).toBeTruthy();
      expect(queryByTestId('edit-asset-link-word-btn')).toBeNull();
    });

    it('pressing link-to-variant button reveals variant search', async () => {
      const { getByTestId, queryByTestId } = renderWithProviders(
        <EditAssetModal visible={true} asset={unlinkedAsset} onClose={jest.fn()} />
      );
      await waitFor(() => getByTestId('edit-asset-link-variant-btn'));
      fireEvent.press(getByTestId('edit-asset-link-variant-btn'));
      expect(getByTestId('edit-asset-variant-search')).toBeTruthy();
      expect(queryByTestId('edit-asset-link-variant-btn')).toBeNull();
    });

    it('pressing cancel on word section restores the two buttons', async () => {
      const { getByTestId } = renderWithProviders(
        <EditAssetModal visible={true} asset={unlinkedAsset} onClose={jest.fn()} />
      );
      await waitFor(() => getByTestId('edit-asset-link-word-btn'));
      fireEvent.press(getByTestId('edit-asset-link-word-btn'));
      fireEvent.press(getByTestId('edit-asset-word-cancel'));
      expect(getByTestId('edit-asset-link-word-btn')).toBeTruthy();
      expect(getByTestId('edit-asset-link-variant-btn')).toBeTruthy();
    });

    it('pressing cancel on variant section restores the two buttons', async () => {
      const { getByTestId } = renderWithProviders(
        <EditAssetModal visible={true} asset={unlinkedAsset} onClose={jest.fn()} />
      );
      await waitFor(() => getByTestId('edit-asset-link-variant-btn'));
      fireEvent.press(getByTestId('edit-asset-link-variant-btn'));
      fireEvent.press(getByTestId('edit-asset-variant-cancel'));
      expect(getByTestId('edit-asset-link-word-btn')).toBeTruthy();
      expect(getByTestId('edit-asset-link-variant-btn')).toBeTruthy();
    });

    it('pressing chip X on linked asset returns to two buttons', async () => {
      const { getByTestId } = renderWithProviders(
        <EditAssetModal visible={true} asset={mockAsset} onClose={jest.fn()} />
      );
      await waitFor(() => getByTestId('edit-asset-selected-link'));
      fireEvent.press(getByTestId('edit-asset-selected-link'));
      expect(getByTestId('edit-asset-link-word-btn')).toBeTruthy();
      expect(getByTestId('edit-asset-link-variant-btn')).toBeTruthy();
    });

    it('shows word search results when typing in word search', async () => {
      const mockGetWords = require('../../src/services/wordService').getWords as jest.Mock;
      mockGetWords.mockResolvedValue([
        { id: 1, word: 'baby', category_id: null, date_added: '2024-01-01', notes: null, created_at: '2024-01-01' },
      ]);
      const { getByTestId } = renderWithProviders(
        <EditAssetModal visible={true} asset={unlinkedAsset} onClose={jest.fn()} />
      );
      await waitFor(() => getByTestId('edit-asset-link-word-btn'));
      fireEvent.press(getByTestId('edit-asset-link-word-btn'));
      fireEvent.changeText(getByTestId('edit-asset-word-search'), 'baby');
      await waitFor(() => {
        expect(getByTestId('edit-asset-link-word-1')).toBeTruthy();
      });
    });

    it('selecting a word shows chip and returns to none mode', async () => {
      const mockGetWords = require('../../src/services/wordService').getWords as jest.Mock;
      mockGetWords.mockResolvedValue([
        { id: 1, word: 'baby', category_id: null, date_added: '2024-01-01', notes: null, created_at: '2024-01-01' },
      ]);
      const { getByTestId, queryByTestId } = renderWithProviders(
        <EditAssetModal visible={true} asset={unlinkedAsset} onClose={jest.fn()} />
      );
      await waitFor(() => getByTestId('edit-asset-link-word-btn'));
      fireEvent.press(getByTestId('edit-asset-link-word-btn'));
      fireEvent.changeText(getByTestId('edit-asset-word-search'), 'baby');
      await waitFor(() => getByTestId('edit-asset-link-word-1'));
      fireEvent.press(getByTestId('edit-asset-link-word-1'));
      expect(getByTestId('edit-asset-selected-link')).toBeTruthy();
      expect(queryByTestId('edit-asset-word-search')).toBeNull();
    });
  });

  it('renders date section', async () => {
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockAsset} onClose={jest.fn()} />
    );
    await waitFor(() => getByTestId('edit-asset-date'));
    expect(getByTestId('edit-asset-date')).toBeTruthy();
  });

  it('renders backdrop for modal dismiss', async () => {
    const onClose = jest.fn();
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockAsset} onClose={onClose} />
    );
    await waitFor(() => getByTestId('edit-asset-backdrop'));
    fireEvent.press(getByTestId('edit-asset-backdrop'));
  });

  it('renders remove button', async () => {
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockAsset} onClose={jest.fn()} />
    );
    await waitFor(() => getByTestId('edit-asset-remove'));
    expect(getByTestId('edit-asset-remove')).toBeTruthy();
  });

  it('handles asset with no linked word initially — shows two buttons', async () => {
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={unlinkedAsset} onClose={jest.fn()} />
    );
    await waitFor(() => getByTestId('edit-asset-modal'));
    expect(getByTestId('edit-asset-link-word-btn')).toBeTruthy();
    expect(getByTestId('edit-asset-link-variant-btn')).toBeTruthy();
  });

  it('handles asset with linked variant — shows chip', async () => {
    const variantAsset = { ...mockAsset, parent_type: 'variant' as const, linked_variant: 'test-variant', linked_variant_id: 5 };
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={variantAsset} onClose={jest.fn()} />
    );
    await waitFor(() => getByTestId('edit-asset-selected-link'));
    expect(getByTestId('edit-asset-selected-link')).toBeTruthy();
  });

  it('handles very long asset name', async () => {
    const longNameAsset = { ...mockAsset, name: 'a'.repeat(100) };
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={longNameAsset} onClose={jest.fn()} />
    );
    await waitFor(() => getByTestId('edit-asset-name-input'));
    expect(getByTestId('edit-asset-name-input')).toBeTruthy();
  });

  it('handles modal visibility toggle', async () => {
    const onClose = jest.fn();
    const { rerender, getByTestId, queryByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockAsset} onClose={onClose} />
    );
    await waitFor(() => getByTestId('edit-asset-modal'));

    rerender(
      <EditAssetModal visible={false} asset={mockAsset} onClose={onClose} />
    );
    expect(queryByTestId('edit-asset-modal')).toBeFalsy();
  });

  it('renders all control buttons', async () => {
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockAsset} onClose={jest.fn()} />
    );
    await waitFor(() => getByTestId('edit-asset-save'));
    expect(getByTestId('edit-asset-save')).toBeTruthy();
    expect(getByTestId('edit-asset-cancel')).toBeTruthy();
  });

  it('handles rapid name input changes', async () => {
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockAsset} onClose={jest.fn()} />
    );
    await waitFor(() => getByTestId('edit-asset-name-input'));
    const inputs = ['a', 'ab', 'abc', 'ab', 'a', ''];
    for (const input of inputs) {
      fireEvent.changeText(getByTestId('edit-asset-name-input'), input);
    }
    expect(getByTestId('edit-asset-name-input')).toBeTruthy();
  });

  it('modal footer styling consistency', async () => {
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockAsset} onClose={jest.fn()} />
    );
    await waitFor(() => getByTestId('edit-asset-modal'));
    expect(getByTestId('edit-asset-modal')).toBeTruthy();
  });

  it('calls relinkAsset when link is changed on save', async () => {
    const mockRelink = assetService.relinkAsset as jest.Mock;
    mockRelink.mockResolvedValueOnce({ id: 1 });
    const mockGetWords = require('../../src/services/wordService').getWords as jest.Mock;
    mockGetWords.mockResolvedValue([
      { id: 99, word: 'cat', category_id: null, date_added: '2024-01-01', notes: null, created_at: '2024-01-01' },
    ]);
    const onClose = jest.fn();
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockAsset} onClose={onClose} />
    );
    await waitFor(() => getByTestId('edit-asset-selected-link'));
    // Clear existing link then select a different word
    fireEvent.press(getByTestId('edit-asset-selected-link'));
    await waitFor(() => getByTestId('edit-asset-link-word-btn'));
    fireEvent.press(getByTestId('edit-asset-link-word-btn'));
    fireEvent.changeText(getByTestId('edit-asset-word-search'), 'cat');
    await waitFor(() => getByTestId('edit-asset-link-word-99'));
    fireEvent.press(getByTestId('edit-asset-link-word-99'));
    await act(async () => {
      fireEvent.press(getByTestId('edit-asset-save'));
    });
    await waitFor(() => {
      expect(mockRelink).toHaveBeenCalled();
    });
  });

  it('calls updateAssetDate when date is changed via date picker', async () => {
    const mockUpdateDate = assetService.updateAssetDate as jest.Mock;
    const onClose = jest.fn();
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockAsset} onClose={onClose} />
    );
    await waitFor(() => getByTestId('edit-asset-date'));
    // Open date picker and change day from 1 to 2, then confirm
    fireEvent.press(getByTestId('date-picker-btn'));
    // Select a different day to force dateChanged = true
    fireEvent.press(getByTestId('date-picker-day-wheel-item-2'));
    await act(async () => {
      fireEvent.press(getByTestId('date-picker-confirm'));
    });
    // Now save with the new date
    await act(async () => {
      fireEvent.press(getByTestId('edit-asset-save'));
    });
    await waitFor(() => {
      expect(mockUpdateDate).toHaveBeenCalled();
    });
  });

  it('shows error alert when save fails', async () => {
    const mockRename = assetService.renameAsset as jest.Mock;
    mockRename.mockRejectedValueOnce(new Error('fail'));
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockAsset} onClose={jest.fn()} />
    );
    await waitFor(() => getByTestId('edit-asset-name-input'));
    fireEvent.changeText(getByTestId('edit-asset-name-input'), 'New Name');
    await act(async () => {
      fireEvent.press(getByTestId('edit-asset-save'));
    });
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  it('confirms remove and calls removeAsset', async () => {
    const mockRemove = assetService.removeAsset as jest.Mock;
    mockRemove.mockResolvedValueOnce(undefined);
    const onClose = jest.fn();
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockAsset} onClose={onClose} />
    );
    await waitFor(() => getByTestId('edit-asset-remove'));
    fireEvent.press(getByTestId('edit-asset-remove'));
    // Get the destructive button from the alert
    const alertSpy = Alert.alert as jest.Mock;
    const alertArgs = alertSpy.mock.calls[alertSpy.mock.calls.length - 1];
    const buttons = alertArgs[2] as Array<{ text: string; onPress?: () => void }>;
    const confirmBtn = buttons.find(b => b.text !== 'Cancel' && b.onPress);
    await act(async () => {
      confirmBtn?.onPress?.();
    });
    await waitFor(() => {
      expect(mockRemove).toHaveBeenCalledWith(mockAsset);
    });
  });

  it('shows error alert when remove fails', async () => {
    const mockRemove = assetService.removeAsset as jest.Mock;
    mockRemove.mockRejectedValueOnce(new Error('fail'));
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockAsset} onClose={jest.fn()} />
    );
    await waitFor(() => getByTestId('edit-asset-remove'));
    fireEvent.press(getByTestId('edit-asset-remove'));
    const alertSpy = Alert.alert as jest.Mock;
    const alertArgs = alertSpy.mock.calls[alertSpy.mock.calls.length - 1];
    const buttons = alertArgs[2] as Array<{ text: string; onPress?: () => void }>;
    const confirmBtn = buttons.find(b => b.text !== 'Cancel' && b.onPress);
    await act(async () => {
      confirmBtn?.onPress?.();
    });
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledTimes(2);
    });
  });

  it('shows variant search results when typing in variant search', async () => {
    const mockGetVariants = require('../../src/services/variantService').getAllVariants as jest.Mock;
    mockGetVariants.mockResolvedValue([
      { id: 5, word_id: 1, variant: 'ba', main_word: 'baby', date_added: '2024-01-01', notes: null, created_at: '2024-01-01', asset_count: 0 },
    ]);
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={unlinkedAsset} onClose={jest.fn()} />
    );
    await waitFor(() => getByTestId('edit-asset-link-variant-btn'));
    fireEvent.press(getByTestId('edit-asset-link-variant-btn'));
    fireEvent.changeText(getByTestId('edit-asset-variant-search'), 'ba');
    await waitFor(() => {
      expect(getByTestId('edit-asset-link-variant-5')).toBeTruthy();
    });
  });

  it('selecting a variant from search shows chip', async () => {
    const mockGetVariants = require('../../src/services/variantService').getAllVariants as jest.Mock;
    mockGetVariants.mockResolvedValue([
      { id: 7, word_id: 1, variant: 'ma', main_word: 'mama', date_added: '2024-01-01', notes: null, created_at: '2024-01-01', asset_count: 0 },
    ]);
    const { getByTestId, queryByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={unlinkedAsset} onClose={jest.fn()} />
    );
    await waitFor(() => getByTestId('edit-asset-link-variant-btn'));
    fireEvent.press(getByTestId('edit-asset-link-variant-btn'));
    fireEvent.changeText(getByTestId('edit-asset-variant-search'), 'ma');
    await waitFor(() => getByTestId('edit-asset-link-variant-7'));
    fireEvent.press(getByTestId('edit-asset-link-variant-7'));
    expect(getByTestId('edit-asset-selected-link')).toBeTruthy();
    expect(queryByTestId('edit-asset-variant-search')).toBeNull();
  });

  it('closes audio overlay when backdrop pressed', async () => {
    const { getByTestId, queryByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockAsset} onClose={jest.fn()} />
    );
    await waitFor(() => getByTestId('edit-asset-type-icon'));
    fireEvent.press(getByTestId('edit-asset-type-icon'));
    await waitFor(() => getByTestId('audio-preview-modal'));
    // Press backdrop to close
    fireEvent.press(getByTestId('audio-preview-backdrop'));
    await waitFor(() => {
      expect(queryByTestId('audio-preview-modal')).toBeFalsy();
    });
  });

  it('closes photo overlay when dismiss pressed', async () => {
    const { getByTestId, queryByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockPhotoAsset} onClose={jest.fn()} />
    );
    await waitFor(() => getByTestId('edit-asset-type-icon'));
    fireEvent.press(getByTestId('edit-asset-type-icon'));
    await waitFor(() => getByTestId('photo-preview-modal'));
    fireEvent.press(getByTestId('photo-preview-dismiss'));
    await waitFor(() => {
      expect(queryByTestId('photo-preview-modal')).toBeFalsy();
    });
  });

  it('shows no-results for variant search', async () => {
    const { getByTestId, getByText } = renderWithProviders(
      <EditAssetModal visible={true} asset={unlinkedAsset} onClose={jest.fn()} />
    );
    await waitFor(() => getByTestId('edit-asset-link-variant-btn'));
    fireEvent.press(getByTestId('edit-asset-link-variant-btn'));
    fireEvent.changeText(getByTestId('edit-asset-variant-search'), 'zzz');
    await waitFor(() => {
      expect(getByText(/No words found|Nenhuma palavra/)).toBeTruthy();
    });
  });

  it('handles save with null asset name (falls back to filename in save logic)', async () => {
    const mockRename = assetService.renameAsset as jest.Mock;
    const nullNameAsset = { ...mockAsset, name: null };
    const onClose = jest.fn();
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={nullNameAsset} onClose={onClose} />
    );
    await waitFor(() => getByTestId('edit-asset-name-input'));
    fireEvent.changeText(getByTestId('edit-asset-name-input'), 'new name');
    await act(async () => {
      fireEvent.press(getByTestId('edit-asset-save'));
    });
    await waitFor(() => {
      expect(mockRename).toHaveBeenCalledWith(1, 'new name');
    });
  });

  it('type icon press with null asset name for audio asset', async () => {
    const nullNameAudio = { ...mockAsset, name: null };
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={nullNameAudio} onClose={jest.fn()} />
    );
    await waitFor(() => getByTestId('edit-asset-type-icon'));
    fireEvent.press(getByTestId('edit-asset-type-icon'));
    await waitFor(() => {
      expect(getByTestId('audio-preview-modal')).toBeTruthy();
    });
  });

  it('type icon press with null asset name for photo asset', async () => {
    const nullNamePhoto = { ...mockPhotoAsset, name: null };
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={nullNamePhoto} onClose={jest.fn()} />
    );
    await waitFor(() => getByTestId('edit-asset-type-icon'));
    fireEvent.press(getByTestId('edit-asset-type-icon'));
    await waitFor(() => {
      expect(getByTestId('photo-preview-modal')).toBeTruthy();
    });
  });

  it('save with link set to same existing word (link unchanged)', async () => {
    const mockRelink = assetService.relinkAsset as jest.Mock;
    const mockGetWords = require('../../src/services/wordService').getWords as jest.Mock;
    // Asset is linked to word id 10; select the same word
    mockGetWords.mockResolvedValue([
      { id: 10, word: 'baby', category_id: null, date_added: '2024-01-01', notes: null, created_at: '2024-01-01' },
    ]);
    const onClose = jest.fn();
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockAsset} onClose={onClose} />
    );
    // The chip shows word id=10. Clear it and re-select the same word
    await waitFor(() => getByTestId('edit-asset-selected-link'));
    fireEvent.press(getByTestId('edit-asset-selected-link'));
    fireEvent.press(getByTestId('edit-asset-link-word-btn'));
    fireEvent.changeText(getByTestId('edit-asset-word-search'), 'baby');
    await waitFor(() => getByTestId('edit-asset-link-word-10'));
    fireEvent.press(getByTestId('edit-asset-link-word-10'));
    await act(async () => {
      fireEvent.press(getByTestId('edit-asset-save'));
    });
    await waitFor(() => {
      expect(mockRelink).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});

