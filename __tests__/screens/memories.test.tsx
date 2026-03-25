import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../helpers/renderWithProviders';

jest.mock('../../src/services/memoriesService', () => ({
  getTimelineItems: jest.fn(),
}));

jest.mock('../../src/services/assetService', () => ({
  ...jest.requireActual('../../src/services/assetService'),
  getAssetsByParentAndType: jest.fn(() => Promise.resolve([])),
}));

jest.mock('../../src/services/settingsService', () => ({
  ...jest.requireActual('../../src/services/settingsService'),
  getSetting: jest.fn().mockResolvedValue(null),
  setSetting: jest.fn().mockResolvedValue(undefined),
}));

import MemoriesScreen from '../../app/(tabs)/memories';
import * as memoriesService from '../../src/services/memoriesService';
import * as assetService from '../../src/services/assetService';

const SAMPLE = [
  {
    id: 1,
    text: 'mama',
    item_type: 'word' as const,
    created_at: '2026-03-03T10:00:00.000Z',
    date_added: '2026-03-03',
    main_word_text: null,
    word_id: null,
    audio_count: 1,
    photo_count: 1,
    first_photo_filename: 'word.jpg',
    first_photo_mime: 'image/jpeg',
  },
  {
    id: 2,
    text: 'mamá',
    item_type: 'variant' as const,
    created_at: '2026-03-02T10:00:00.000Z',
    date_added: '2026-03-02',
    main_word_text: 'mama',
    word_id: 1,
    audio_count: 0,
    photo_count: 0,
    first_photo_filename: null,
    first_photo_mime: null,
  },
];

const AUDIO_ASSET = {
  id: 91,
  parent_type: 'word',
  parent_id: 1,
  asset_type: 'audio',
  filename: 'asset_91.m4a',
  name: null,
  mime_type: 'audio/m4a',
  file_size: 200,
  duration_ms: 1500,
  width: null,
  height: null,
  created_at: '2026-03-03T10:00:00.000Z',
};

describe('MemoriesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (memoriesService.getTimelineItems as jest.Mock).mockResolvedValue(SAMPLE);
    (assetService.getAssetsByParentAndType as jest.Mock).mockResolvedValue([
      {
        id: 90,
        parent_type: 'word',
        parent_id: 1,
        asset_type: 'photo',
        filename: 'word.jpg',
        name: null,
        mime_type: 'image/jpeg',
        file_size: 100,
        duration_ms: null,
        width: 100,
        height: 100,
        created_at: '2026-03-03T10:00:00.000Z',
      },
    ]);
  });

  it('renders title and timeline items', async () => {
    const { findByText, findByTestId } = renderWithProviders(<MemoriesScreen />);

    expect(await findByText('Memories')).toBeTruthy();
    expect(await findByText('mama')).toBeTruthy();
    expect(await findByText('Variant of mama')).toBeTruthy();
    expect(await findByTestId('memories-flatlist')).toBeTruthy();
  });

  it('shows empty state when there are no memories', async () => {
    (memoriesService.getTimelineItems as jest.Mock).mockResolvedValueOnce([]);

    const { findByText } = renderWithProviders(<MemoriesScreen />);

    expect(await findByText('No memories yet')).toBeTruthy();
  });

  it('fetches audio asset and opens audio overlay when audio control is tapped', async () => {
    (assetService.getAssetsByParentAndType as jest.Mock).mockImplementation(
      (_parentType: string, _parentId: number, assetType: string) => {
        if (assetType === 'audio') return Promise.resolve([AUDIO_ASSET]);
        return Promise.resolve([]);
      }
    );

    const { findByTestId } = renderWithProviders(<MemoriesScreen />);

    fireEvent.press(await findByTestId('timeline-audio-word-1'));

    await waitFor(() => {
      expect(assetService.getAssetsByParentAndType).toHaveBeenCalledWith('word', 1, 'audio');
    });
  });

  it('loads photo asset and opens preview when thumbnail is tapped', async () => {
    const { findByTestId } = renderWithProviders(<MemoriesScreen />);

    fireEvent.press(await findByTestId('timeline-photo-word-1'));

    await waitFor(() => {
      expect(assetService.getAssetsByParentAndType).toHaveBeenCalledWith('word', 1, 'photo');
    });
  });

  it('shows error state when query fails', async () => {
    (memoriesService.getTimelineItems as jest.Mock).mockRejectedValueOnce(new Error('boom'));

    const { findByText } = renderWithProviders(<MemoriesScreen />);

    expect(await findByText('Could not load memories')).toBeTruthy();
    expect(await findByText('Retry')).toBeTruthy();
  });
});
