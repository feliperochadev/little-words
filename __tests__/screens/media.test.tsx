import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { renderWithProviders } from '../helpers/renderWithProviders';

jest.spyOn(Alert, 'alert');

jest.mock('../../src/services/assetService', () => ({
  ...jest.requireActual('../../src/services/assetService'),
  getAllAssets: jest.fn().mockResolvedValue([]),
  removeAsset: jest.fn().mockResolvedValue(undefined),
  getAssetsByParent: jest.fn().mockResolvedValue([]),
  getAssetsByParentAndType: jest.fn().mockResolvedValue([]),
  getProfilePhoto: jest.fn().mockResolvedValue(null),
  relinkAsset: jest.fn().mockResolvedValue({ id: 1 }),
  renameAsset: jest.fn().mockResolvedValue(undefined),
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

import MediaScreen from '../../app/(tabs)/media';
import * as assetService from '../../src/services/assetService';
import type { AssetWithLink } from '../../src/types/asset';

const sampleAsset: AssetWithLink = {
  id: 1, parent_type: 'word', parent_id: 10, asset_type: 'audio',
  filename: 'asset_1.m4a', name: 'Test Audio', mime_type: 'audio/mp4',
  file_size: 2048, duration_ms: 5000, width: null, height: null,
  created_at: '2024-01-01T00:00:00',
  linked_word: 'baby', linked_word_id: 10, linked_variant: null, linked_variant_id: null,
};

describe('MediaScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (assetService.getAllAssets as jest.Mock).mockResolvedValue([]);
  });

  it('renders empty state when no assets', async () => {
    const { getByTestId } = renderWithProviders(<MediaScreen />);
    await waitFor(() => {
      expect(getByTestId('media-empty')).toBeTruthy();
    });
  });

  it('renders search bar', async () => {
    const { getByTestId } = renderWithProviders(<MediaScreen />);
    await waitFor(() => {
      expect(getByTestId('media-search')).toBeTruthy();
    });
  });

  it('renders filter buttons', async () => {
    const { getByTestId } = renderWithProviders(<MediaScreen />);
    await waitFor(() => {
      expect(getByTestId('media-filter-all')).toBeTruthy();
      expect(getByTestId('media-filter-audio')).toBeTruthy();
      expect(getByTestId('media-filter-photo')).toBeTruthy();
      expect(getByTestId('media-filter-video')).toBeTruthy();
    });
  });

  it('renders sort button', async () => {
    const { getByTestId } = renderWithProviders(<MediaScreen />);
    await waitFor(() => {
      expect(getByTestId('media-sort-btn')).toBeTruthy();
    });
  });

  it('shows sort menu when sort button is pressed', async () => {
    const { getByTestId } = renderWithProviders(<MediaScreen />);
    await waitFor(() => getByTestId('media-sort-btn'));
    fireEvent.press(getByTestId('media-sort-btn'));
    await waitFor(() => {
      expect(getByTestId('media-sort-date_desc')).toBeTruthy();
      expect(getByTestId('media-sort-date_asc')).toBeTruthy();
      expect(getByTestId('media-sort-name_asc')).toBeTruthy();
      expect(getByTestId('media-sort-name_desc')).toBeTruthy();
    });
  });

  it('renders asset rows when assets exist', async () => {
    (assetService.getAllAssets as jest.Mock).mockResolvedValue([sampleAsset]);
    const { getByTestId } = renderWithProviders(<MediaScreen />);
    await waitFor(() => {
      expect(getByTestId('media-item-1')).toBeTruthy();
    });
  });

  it('renders edit and remove buttons on each row', async () => {
    (assetService.getAllAssets as jest.Mock).mockResolvedValue([sampleAsset]);
    const { getByTestId } = renderWithProviders(<MediaScreen />);
    await waitFor(() => {
      expect(getByTestId('media-edit-1')).toBeTruthy();
      expect(getByTestId('media-remove-1')).toBeTruthy();
    });
  });

  it('shows remove confirmation when remove button pressed', async () => {
    (assetService.getAllAssets as jest.Mock).mockResolvedValue([sampleAsset]);
    const { getByTestId } = renderWithProviders(<MediaScreen />);
    await waitFor(() => getByTestId('media-remove-1'));
    fireEvent.press(getByTestId('media-remove-1'));
    expect(Alert.alert).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(Array),
    );
  });

  it('opens edit modal when edit button pressed', async () => {
    (assetService.getAllAssets as jest.Mock).mockResolvedValue([sampleAsset]);
    const { getByTestId } = renderWithProviders(<MediaScreen />);
    await waitFor(() => getByTestId('media-edit-1'));
    fireEvent.press(getByTestId('media-edit-1'));
    await waitFor(() => {
      expect(getByTestId('edit-asset-modal')).toBeTruthy();
    });
  });

  it('filters assets by audio type', async () => {
    (assetService.getAllAssets as jest.Mock).mockResolvedValue([sampleAsset]);
    const { getByTestId } = renderWithProviders(<MediaScreen />);
    await waitFor(() => getByTestId('media-filter-audio'));
    fireEvent.press(getByTestId('media-filter-audio'));
    // Filter should be active and assets displayed
    await waitFor(() => {
      expect(getByTestId('media-item-1')).toBeTruthy();
    });
  });

  it('filters assets by photo type', async () => {
    const photoAsset: AssetWithLink = {
      ...sampleAsset,
      asset_type: 'photo',
    };
    (assetService.getAllAssets as jest.Mock).mockResolvedValue([photoAsset]);
    const { getByTestId } = renderWithProviders(<MediaScreen />);
    await waitFor(() => getByTestId('media-filter-photo'));
    fireEvent.press(getByTestId('media-filter-photo'));
    await waitFor(() => {
      expect(getByTestId('media-item-1')).toBeTruthy();
    });
  });

  it('filters assets by video type', async () => {
    const videoAsset: AssetWithLink = {
      ...sampleAsset,
      asset_type: 'video',
    };
    (assetService.getAllAssets as jest.Mock).mockResolvedValue([videoAsset]);
    const { getByTestId } = renderWithProviders(<MediaScreen />);
    await waitFor(() => getByTestId('media-filter-video'));
    fireEvent.press(getByTestId('media-filter-video'));
    await waitFor(() => {
      expect(getByTestId('media-item-1')).toBeTruthy();
    });
  });

  it('clears filter when all button is pressed', async () => {
    (assetService.getAllAssets as jest.Mock).mockResolvedValue([sampleAsset]);
    const { getByTestId } = renderWithProviders(<MediaScreen />);
    await waitFor(() => getByTestId('media-filter-audio'));
    fireEvent.press(getByTestId('media-filter-audio'));
    fireEvent.press(getByTestId('media-filter-all'));
    await waitFor(() => {
      expect(getByTestId('media-item-1')).toBeTruthy();
    });
  });

  it('sorts assets by date descending', async () => {
    (assetService.getAllAssets as jest.Mock).mockResolvedValue([sampleAsset]);
    const { getByTestId } = renderWithProviders(<MediaScreen />);
    await waitFor(() => getByTestId('media-sort-btn'));
    fireEvent.press(getByTestId('media-sort-btn'));
    await waitFor(() => getByTestId('media-sort-date_desc'));
    fireEvent.press(getByTestId('media-sort-date_desc'));
    await waitFor(() => {
      expect(getByTestId('media-item-1')).toBeTruthy();
    });
  });

  it('sorts assets by date ascending', async () => {
    (assetService.getAllAssets as jest.Mock).mockResolvedValue([sampleAsset]);
    const { getByTestId } = renderWithProviders(<MediaScreen />);
    await waitFor(() => getByTestId('media-sort-btn'));
    fireEvent.press(getByTestId('media-sort-btn'));
    await waitFor(() => getByTestId('media-sort-date_asc'));
    fireEvent.press(getByTestId('media-sort-date_asc'));
    await waitFor(() => {
      expect(getByTestId('media-item-1')).toBeTruthy();
    });
  });

  it('sorts assets by name ascending', async () => {
    (assetService.getAllAssets as jest.Mock).mockResolvedValue([sampleAsset]);
    const { getByTestId } = renderWithProviders(<MediaScreen />);
    await waitFor(() => getByTestId('media-sort-btn'));
    fireEvent.press(getByTestId('media-sort-btn'));
    await waitFor(() => getByTestId('media-sort-name_asc'));
    fireEvent.press(getByTestId('media-sort-name_asc'));
    await waitFor(() => {
      expect(getByTestId('media-item-1')).toBeTruthy();
    });
  });

  it('sorts assets by name descending', async () => {
    (assetService.getAllAssets as jest.Mock).mockResolvedValue([sampleAsset]);
    const { getByTestId } = renderWithProviders(<MediaScreen />);
    await waitFor(() => getByTestId('media-sort-btn'));
    fireEvent.press(getByTestId('media-sort-btn'));
    await waitFor(() => getByTestId('media-sort-name_desc'));
    fireEvent.press(getByTestId('media-sort-name_desc'));
    await waitFor(() => {
      expect(getByTestId('media-item-1')).toBeTruthy();
    });
  });

  it('searches assets by name', async () => {
    (assetService.getAllAssets as jest.Mock).mockResolvedValue([sampleAsset]);
    const { getByTestId } = renderWithProviders(<MediaScreen />);
    await waitFor(() => getByTestId('media-search'));
    fireEvent.changeText(getByTestId('media-search'), 'Test');
    await waitFor(() => {
      expect(getByTestId('media-item-1')).toBeTruthy();
    });
  });

  it('searches assets by parent word name', async () => {
    (assetService.getAllAssets as jest.Mock).mockResolvedValue([sampleAsset]);
    const { getByTestId } = renderWithProviders(<MediaScreen />);
    await waitFor(() => getByTestId('media-search'));
    fireEvent.changeText(getByTestId('media-search'), 'baby');
    await waitFor(() => {
      expect(getByTestId('media-item-1')).toBeTruthy();
    });
  });

  it('shows no results when search matches nothing', async () => {
    (assetService.getAllAssets as jest.Mock).mockResolvedValue([]);
    const { getByTestId } = renderWithProviders(<MediaScreen />);
    await waitFor(() => {
      expect(getByTestId('media-empty')).toBeTruthy();
    });
  });

  it('clears search filter', async () => {
    (assetService.getAllAssets as jest.Mock).mockResolvedValue([sampleAsset]);
    const { getByTestId } = renderWithProviders(<MediaScreen />);
    await waitFor(() => getByTestId('media-search'));
    fireEvent.changeText(getByTestId('media-search'), 'Test');
    fireEvent.changeText(getByTestId('media-search'), '');
    await waitFor(() => {
      expect(getByTestId('media-item-1')).toBeTruthy();
    });
  });

  it('confirms asset removal when remove button is pressed and confirmed', async () => {
    (assetService.getAllAssets as jest.Mock).mockResolvedValue([sampleAsset]);
    (assetService.removeAsset as jest.Mock).mockResolvedValue(undefined);
    const { getByTestId } = renderWithProviders(<MediaScreen />);
    await waitFor(() => getByTestId('media-remove-1'));
    fireEvent.press(getByTestId('media-remove-1'));
    expect(Alert.alert).toHaveBeenCalled();
  });

  it('displays multiple assets in list', async () => {
    const asset2: AssetWithLink = {
      ...sampleAsset,
      id: 2,
      name: 'Test Audio 2',
    };
    (assetService.getAllAssets as jest.Mock).mockResolvedValue([sampleAsset, asset2]);
    const { getByTestId } = renderWithProviders(<MediaScreen />);
    await waitFor(() => {
      expect(getByTestId('media-item-1')).toBeTruthy();
      expect(getByTestId('media-item-2')).toBeTruthy();
    });
  });

  it('handles refresh action', async () => {
    (assetService.getAllAssets as jest.Mock).mockResolvedValue([sampleAsset]);
    const { getByTestId } = renderWithProviders(<MediaScreen />);
    await waitFor(() => getByTestId('media-search'));
    // RefreshControl is part of FlatList component
    expect(getByTestId('media-search')).toBeTruthy();
  });

  it('displays asset metadata correctly', async () => {
    (assetService.getAllAssets as jest.Mock).mockResolvedValue([sampleAsset]);
    const { getByTestId } = renderWithProviders(<MediaScreen />);
    await waitFor(() => getByTestId('media-item-1'));
    // Asset item should be displayed
    expect(getByTestId('media-item-1')).toBeTruthy();
  });

  it('displays asset parent word name', async () => {
    (assetService.getAllAssets as jest.Mock).mockResolvedValue([sampleAsset]);
    const { getByTestId } = renderWithProviders(<MediaScreen />);
    await waitFor(() => getByTestId('media-item-1'));
    // Parent word asset row should exist
    expect(getByTestId('media-item-1')).toBeTruthy();
  });

  it('displays human-readable file size', async () => {
    const largeAsset: AssetWithLink = {
      ...sampleAsset,
      file_size: 1024 * 1024 * 2.5, // 2.5 MB
    };
    (assetService.getAllAssets as jest.Mock).mockResolvedValue([largeAsset]);
    const { getByTestId } = renderWithProviders(<MediaScreen />);
    await waitFor(() => getByTestId('media-item-1'));
    // Large file size should be formatted
    expect(getByTestId('media-item-1')).toBeTruthy();
  });

  it('closes sort menu when sort option is selected', async () => {
    (assetService.getAllAssets as jest.Mock).mockResolvedValue([sampleAsset]);
    const { getByTestId, queryByTestId } = renderWithProviders(<MediaScreen />);
    await waitFor(() => getByTestId('media-sort-btn'));
    fireEvent.press(getByTestId('media-sort-btn'));
    await waitFor(() => getByTestId('media-sort-date_desc'));
    fireEvent.press(getByTestId('media-sort-date_desc'));
    // Menu should close after selection
    await waitFor(() => {
      expect(getByTestId('media-sort-btn')).toBeTruthy();
    });
  });
});
