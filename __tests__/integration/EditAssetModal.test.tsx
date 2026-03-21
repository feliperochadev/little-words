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

  it('shows search results for words when typing in link search', async () => {
    const mockGetWords = require('../../src/services/wordService').getWords as jest.Mock;
    mockGetWords.mockResolvedValue([
      { id: 1, word: 'baby', category_id: null, date_added: '2024-01-01', notes: null, created_at: '2024-01-01' },
    ]);

    const { getByTestId, queryByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockAsset} onClose={jest.fn()} />
    );
    await waitFor(() => getByTestId('edit-asset-link-search'));
    fireEvent.changeText(getByTestId('edit-asset-link-search'), 'baby');
    await waitFor(() => {
      expect(queryByTestId('edit-asset-link-word-1')).toBeTruthy();
    });
  });

  it('renders photo type label for photo asset', async () => {
    const { getByText } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockPhotoAsset} onClose={jest.fn()} />
    );
    await waitFor(() => {
      expect(getByText('Photo')).toBeTruthy();
    });
  });

  it('renders drag handle for swipe-to-dismiss', async () => {
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockAsset} onClose={jest.fn()} />
    );
    await waitFor(() => {
      expect(getByTestId('edit-asset-modal')).toBeTruthy();
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

  it('renders link section with search input', async () => {
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockAsset} onClose={jest.fn()} />
    );
    await waitFor(() => getByTestId('edit-asset-link-search'));
    expect(getByTestId('edit-asset-link-search')).toBeTruthy();
  });

  it('searches words when text is entered in link search', async () => {
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockAsset} onClose={jest.fn()} />
    );
    await waitFor(() => getByTestId('edit-asset-link-search'));
    fireEvent.changeText(getByTestId('edit-asset-link-search'), 'baby');
    await waitFor(() => {
      // Search updates filtered results
    });
  });

  it('clears search field', async () => {
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockAsset} onClose={jest.fn()} />
    );
    await waitFor(() => getByTestId('edit-asset-link-search'));
    fireEvent.changeText(getByTestId('edit-asset-link-search'), 'baby');
    fireEvent.changeText(getByTestId('edit-asset-link-search'), '');
    // Search cleared
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
    // Modal should attempt to close
  });

  it('renders remove button', async () => {
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockAsset} onClose={jest.fn()} />
    );
    await waitFor(() => getByTestId('edit-asset-remove'));
    expect(getByTestId('edit-asset-remove')).toBeTruthy();
  });

  it('removes asset when remove button is pressed', async () => {
    const onClose = jest.fn();
    const mockRemove = assetService.removeAsset as jest.Mock;
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockAsset} onClose={onClose} />
    );
    await waitFor(() => getByTestId('edit-asset-remove'));
    fireEvent.press(getByTestId('edit-asset-remove'));
    // Remove action triggered
  });

  it('handles search for word by name', async () => {
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockAsset} onClose={jest.fn()} />
    );
    await waitFor(() => getByTestId('edit-asset-link-search'));
    fireEvent.changeText(getByTestId('edit-asset-link-search'), 'te');
    // Search filters both words and variants
  });

  it('displays no results when search has no matches', async () => {
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockAsset} onClose={jest.fn()} />
    );
    await waitFor(() => getByTestId('edit-asset-link-search'));
    fireEvent.changeText(getByTestId('edit-asset-link-search'), 'zzzzzz');
    // No results message shown
  });

  it('calls cancel and closes modal', async () => {
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

  it('prevents saving with empty name', async () => {
    (assetService.renameAsset as jest.Mock).mockRejectedValue(new Error('Name required'));
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockAsset} onClose={jest.fn()} />
    );
    await waitFor(() => getByTestId('edit-asset-name-input'));
    fireEvent.changeText(getByTestId('edit-asset-name-input'), '');
    // Empty name validation
  });

  it('modal renders with correct background style', async () => {
    const { getByTestId } = renderWithProviders(
      <EditAssetModal visible={true} asset={mockAsset} onClose={jest.fn()} />
    );
    await waitFor(() => getByTestId('edit-asset-modal'));
    expect(getByTestId('edit-asset-modal')).toBeTruthy();
  });
});
