import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '../helpers/renderWithProviders';
import { useTimelineHandlers } from '../../src/hooks/useTimelineHandlers';
import * as assetService from '../../src/services/assetService';
import type { TimelineItem } from '../../src/types/domain';
import type { Asset } from '../../src/services/assetService';

jest.mock('../../src/services/assetService', () => ({
  getAssetsByParentAndType: jest.fn(),
}));

const mockedService = assetService as jest.Mocked<typeof assetService>;

const MOCK_ITEM: TimelineItem = {
  id: 42,
  text: 'test',
  item_type: 'word',
  created_at: '2024-01-01T00:00:00.000Z',
  date_added: '2024-01-01',
  main_word_text: null,
  word_id: null,
  audio_count: 1,
  photo_count: 1,
  first_photo_filename: 'thumb.jpg',
  first_photo_mime: 'image/jpeg',
};

const MOCK_ASSET: Asset = {
  id: 1,
  parent_type: 'word',
  parent_id: 42,
  asset_type: 'audio',
  filename: 'asset_1.m4a',
  name: 'audio_1',
  mime_type: 'audio/mp4',
  file_size: 1024,
  duration_ms: 3000,
  width: null,
  height: null,
  created_at: '2024-01-01T00:00:00.000Z',
};

function createWrapper() {
  const queryClient = createTestQueryClient();
  return {
    queryClient,
    Wrapper({ children }: { children: React.ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    },
  };
}

describe('useTimelineHandlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handlePlayAudio fetches and opens audio overlay', async () => {
    mockedService.getAssetsByParentAndType.mockResolvedValueOnce([MOCK_ASSET]);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useTimelineHandlers(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.handlePlayAudio(MOCK_ITEM);
    });

    expect(mockedService.getAssetsByParentAndType).toHaveBeenCalledWith('word', 42, 'audio');
    expect(result.current.audioOverlay).not.toBeNull();
    expect(result.current.audioOverlay?.name).toBe('audio_1');
  });

  it('handleViewPhoto fetches and opens photo overlay', async () => {
    const photoAsset = { ...MOCK_ASSET, asset_type: 'photo' as const, filename: 'photo.jpg', name: 'photo_1' };
    mockedService.getAssetsByParentAndType.mockResolvedValueOnce([photoAsset]);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useTimelineHandlers(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.handleViewPhoto(MOCK_ITEM);
    });

    expect(mockedService.getAssetsByParentAndType).toHaveBeenCalledWith('word', 42, 'photo');
    expect(result.current.photoOverlay).not.toBeNull();
    expect(result.current.photoOverlay?.name).toBe('photo_1');
  });

  it('handlePlayAudio does nothing if no audio assets found', async () => {
    mockedService.getAssetsByParentAndType.mockResolvedValueOnce([]);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useTimelineHandlers(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.handlePlayAudio(MOCK_ITEM);
    });

    expect(result.current.audioOverlay).toBeNull();
  });

  it('close handlers work correctly', async () => {
    mockedService.getAssetsByParentAndType.mockResolvedValueOnce([MOCK_ASSET]);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useTimelineHandlers(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.handlePlayAudio(MOCK_ITEM);
    });

    expect(result.current.audioOverlay).not.toBeNull();

    act(() => {
      result.current.closeAudioOverlay();
    });

    expect(result.current.audioOverlay).toBeNull();
  });
});
