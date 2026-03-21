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
});
