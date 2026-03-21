import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { createTestQueryClient } from '../helpers/renderWithProviders';
import {
  useAssetsByParent,
  useAssetsByType,
  useSaveAsset,
  useRemoveAsset,
  useProfilePhoto,
  useSaveProfilePhoto,
  useRemoveProfilePhoto,
  useAllAssets,
  useRelinkAsset,
  useRenameAsset,
  useUpdateAssetDate,
} from '../../src/hooks/useAssets';
import * as assetService from '../../src/services/assetService';
import type { Asset, SaveAssetParams } from '../../src/services/assetService';
import type { AssetWithLink } from '../../src/types/asset';

const MOCK_PROFILE_ASSET: Asset = {
  id: 99,
  parent_type: 'profile',
  parent_id: 1,
  asset_type: 'photo',
  filename: 'asset_99.jpg',
  name: 'photo_99',
  mime_type: 'image/jpeg',
  file_size: 2048,
  duration_ms: null,
  width: null,
  height: null,
  created_at: '2024-06-01T00:00:00.000Z',
};

jest.mock('../../src/services/assetService', () => ({
  getAssetsByParent: jest.fn(() => Promise.resolve([])),
  getAssetsByParentAndType: jest.fn(() => Promise.resolve([])),
  saveAsset: jest.fn(() =>
    Promise.resolve({
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
    }),
  ),
  removeAsset: jest.fn(() => Promise.resolve()),
  getProfilePhoto: jest.fn(() => Promise.resolve(null)),
  saveProfilePhoto: jest.fn(() => Promise.resolve({
    id: 99,
    parent_type: 'profile',
    parent_id: 1,
    asset_type: 'photo',
    filename: 'asset_99.jpg',
    name: 'photo_99',
    mime_type: 'image/jpeg',
    file_size: 2048,
    duration_ms: null,
    width: null,
    height: null,
    created_at: '2024-06-01T00:00:00.000Z',
  })),
  deleteProfilePhoto: jest.fn(() => Promise.resolve()),
  getAllAssets: jest.fn(() => Promise.resolve([])),
  relinkAsset: jest.fn(() => Promise.resolve({ id: 1 })),
  renameAsset: jest.fn(() => Promise.resolve()),
  updateAssetDate: jest.fn(() => Promise.resolve()),
}));

const mockedService = assetService as jest.Mocked<typeof assetService>;

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

const MOCK_PHOTO_ASSET: Asset = {
  id: 2,
  parent_type: 'word',
  parent_id: 42,
  asset_type: 'photo',
  filename: 'asset_2.jpg',
  name: 'photo_2',
  mime_type: 'image/jpeg',
  file_size: 5000,
  duration_ms: null,
  width: 1920,
  height: 1080,
  created_at: '2024-01-02T00:00:00.000Z',
};

describe('useAssets hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── useAssetsByParent ──────────────────────────────────────────────────────

  describe('useAssetsByParent', () => {
    it('returns empty array by default', async () => {
      const { Wrapper } = createWrapper();

      const { result } = renderHook(
        () => useAssetsByParent('word', 42),
        { wrapper: Wrapper },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([]);
      expect(mockedService.getAssetsByParent).toHaveBeenCalledWith('word', 42);
    });

    it('returns assets when service returns data', async () => {
      mockedService.getAssetsByParent.mockResolvedValueOnce([
        MOCK_ASSET,
        MOCK_PHOTO_ASSET,
      ]);
      const { Wrapper } = createWrapper();

      const { result } = renderHook(
        () => useAssetsByParent('word', 42),
        { wrapper: Wrapper },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(2);
      expect(result.current.data![0].id).toBe(1);
      expect(result.current.data![1].id).toBe(2);
    });

    it('is disabled when parentId is 0', () => {
      const { Wrapper } = createWrapper();

      const { result } = renderHook(
        () => useAssetsByParent('word', 0),
        { wrapper: Wrapper },
      );

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockedService.getAssetsByParent).not.toHaveBeenCalled();
    });

    it('is disabled when parentId is negative', () => {
      const { Wrapper } = createWrapper();

      const { result } = renderHook(
        () => useAssetsByParent('word', -1),
        { wrapper: Wrapper },
      );

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockedService.getAssetsByParent).not.toHaveBeenCalled();
    });

    it('is disabled when enabled param is false', () => {
      const { Wrapper } = createWrapper();

      const { result } = renderHook(
        () => useAssetsByParent('word', 42, false),
        { wrapper: Wrapper },
      );

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockedService.getAssetsByParent).not.toHaveBeenCalled();
    });

    it('works with variant parentType', async () => {
      mockedService.getAssetsByParent.mockResolvedValueOnce([MOCK_ASSET]);
      const { Wrapper } = createWrapper();

      const { result } = renderHook(
        () => useAssetsByParent('variant', 10),
        { wrapper: Wrapper },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockedService.getAssetsByParent).toHaveBeenCalledWith('variant', 10);
    });

    it('selects empty array when service returns null-ish data', async () => {
      mockedService.getAssetsByParent.mockResolvedValueOnce(
        null as unknown as Asset[],
      );
      const { Wrapper } = createWrapper();

      const { result } = renderHook(
        () => useAssetsByParent('word', 1),
        { wrapper: Wrapper },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([]);
    });
  });

  // ─── useAssetsByType ────────────────────────────────────────────────────────

  describe('useAssetsByType', () => {
    it('returns empty array by default', async () => {
      const { Wrapper } = createWrapper();

      const { result } = renderHook(
        () => useAssetsByType('word', 42, 'audio'),
        { wrapper: Wrapper },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([]);
      expect(mockedService.getAssetsByParentAndType).toHaveBeenCalledWith(
        'word', 42, 'audio',
      );
    });

    it('returns assets filtered by type', async () => {
      mockedService.getAssetsByParentAndType.mockResolvedValueOnce([MOCK_ASSET]);
      const { Wrapper } = createWrapper();

      const { result } = renderHook(
        () => useAssetsByType('word', 42, 'audio'),
        { wrapper: Wrapper },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data![0].asset_type).toBe('audio');
    });

    it('returns photo assets', async () => {
      mockedService.getAssetsByParentAndType.mockResolvedValueOnce([
        MOCK_PHOTO_ASSET,
      ]);
      const { Wrapper } = createWrapper();

      const { result } = renderHook(
        () => useAssetsByType('word', 42, 'photo'),
        { wrapper: Wrapper },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data![0].asset_type).toBe('photo');
    });

    it('is disabled when parentId is 0', () => {
      const { Wrapper } = createWrapper();

      const { result } = renderHook(
        () => useAssetsByType('word', 0, 'audio'),
        { wrapper: Wrapper },
      );

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockedService.getAssetsByParentAndType).not.toHaveBeenCalled();
    });

    it('is disabled when parentId is negative', () => {
      const { Wrapper } = createWrapper();

      const { result } = renderHook(
        () => useAssetsByType('word', -5, 'photo'),
        { wrapper: Wrapper },
      );

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockedService.getAssetsByParentAndType).not.toHaveBeenCalled();
    });

    it('is disabled when enabled param is false', () => {
      const { Wrapper } = createWrapper();

      const { result } = renderHook(
        () => useAssetsByType('word', 42, 'audio', false),
        { wrapper: Wrapper },
      );

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockedService.getAssetsByParentAndType).not.toHaveBeenCalled();
    });

    it('selects empty array when service returns null-ish data', async () => {
      mockedService.getAssetsByParentAndType.mockResolvedValueOnce(
        null as unknown as Asset[],
      );
      const { Wrapper } = createWrapper();

      const { result } = renderHook(
        () => useAssetsByType('word', 1, 'video'),
        { wrapper: Wrapper },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([]);
    });
  });

  // ─── useSaveAsset ──────────────────────────────────────────────────────────

  describe('useSaveAsset', () => {
    const SAVE_PARAMS: SaveAssetParams = {
      sourceUri: 'file:///tmp/recording.m4a',
      parentType: 'word',
      parentId: 42,
      assetType: 'audio',
      mimeType: 'audio/mp4',
      fileSize: 1024,
      durationMs: 3000,
    };

    it('calls saveAsset service with params', async () => {
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useSaveAsset(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        result.current.mutate(SAVE_PARAMS);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockedService.saveAsset).toHaveBeenCalledWith(SAVE_PARAMS);
    });

    it('returns saved asset data on success', async () => {
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useSaveAsset(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        result.current.mutate(SAVE_PARAMS);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.id).toBe(1);
      expect(result.current.data?.filename).toBe('asset_1.m4a');
    });

    it('invalidates asset query keys on success', async () => {
      const { Wrapper, queryClient } = createWrapper();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useSaveAsset(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        result.current.mutate(SAVE_PARAMS);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['assets'] }),
      );
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['words'] }),
      );
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['variants'] }),
      );
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['dashboard'] }),
      );
    });

    it('reports error when service rejects', async () => {
      mockedService.saveAsset.mockRejectedValueOnce(new Error('Save failed'));
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useSaveAsset(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        result.current.mutate(SAVE_PARAMS);
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe('Save failed');
    });
  });

  // ─── useRemoveAsset ────────────────────────────────────────────────────────

  describe('useRemoveAsset', () => {
    it('calls removeAsset service with the asset', async () => {
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useRemoveAsset(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        result.current.mutate(MOCK_ASSET);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockedService.removeAsset).toHaveBeenCalledWith(MOCK_ASSET);
    });

    it('invalidates asset query keys on success', async () => {
      const { Wrapper, queryClient } = createWrapper();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useRemoveAsset(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        result.current.mutate(MOCK_ASSET);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['assets'] }),
      );
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['words'] }),
      );
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['variants'] }),
      );
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['dashboard'] }),
      );
    });

    it('reports error when service rejects', async () => {
      mockedService.removeAsset.mockRejectedValueOnce(
        new Error('Remove failed'),
      );
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useRemoveAsset(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        result.current.mutate(MOCK_ASSET);
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe('Remove failed');
    });

    it('does not invalidate queries on failure', async () => {
      mockedService.removeAsset.mockRejectedValueOnce(new Error('fail'));
      const { Wrapper, queryClient } = createWrapper();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useRemoveAsset(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        result.current.mutate(MOCK_ASSET);
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });

  // ─── useProfilePhoto ────────────────────────────────────────────────────────

  describe('useProfilePhoto', () => {
    it('returns null when no profile photo exists', async () => {
      mockedService.getProfilePhoto.mockResolvedValueOnce(null);
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useProfilePhoto(), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBeNull();
    });

    it('returns ProfilePhotoAsset with uri when photo exists', async () => {
      mockedService.getProfilePhoto.mockResolvedValueOnce(MOCK_PROFILE_ASSET);
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useProfilePhoto(), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).not.toBeNull();
      expect(result.current.data?.id).toBe(99);
      expect(typeof result.current.data?.uri).toBe('string');
    });

    it('calls getProfilePhoto service', async () => {
      const { Wrapper } = createWrapper();
      renderHook(() => useProfilePhoto(), { wrapper: Wrapper });
      await waitFor(() => expect(mockedService.getProfilePhoto).toHaveBeenCalled());
    });
  });

  // ─── useSaveProfilePhoto ────────────────────────────────────────────────────

  describe('useSaveProfilePhoto', () => {
    it('calls saveProfilePhoto service with params', async () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useSaveProfilePhoto(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ sourceUri: 'file:///tmp/photo.jpg', mimeType: 'image/jpeg', fileSize: 2048 });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockedService.saveProfilePhoto).toHaveBeenCalledWith(
        'file:///tmp/photo.jpg', 'image/jpeg', 2048, undefined, undefined,
      );
    });

    it('invalidates asset query keys on success', async () => {
      const { Wrapper, queryClient } = createWrapper();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useSaveProfilePhoto(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ sourceUri: 'file:///tmp/photo.jpg', mimeType: 'image/jpeg' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['assets'] }),
      );
    });

    it('reports error when service rejects', async () => {
      mockedService.saveProfilePhoto.mockRejectedValueOnce(new Error('Save failed'));
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useSaveProfilePhoto(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ sourceUri: 'file:///tmp/photo.jpg', mimeType: 'image/jpeg' });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe('Save failed');
    });
  });

  // ─── useRemoveProfilePhoto ──────────────────────────────────────────────────

  describe('useRemoveProfilePhoto', () => {
    it('calls deleteProfilePhoto service', async () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useRemoveProfilePhoto(), { wrapper: Wrapper });

      await act(async () => { result.current.mutate(); });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockedService.deleteProfilePhoto).toHaveBeenCalled();
    });

    it('invalidates asset query keys on success', async () => {
      const { Wrapper, queryClient } = createWrapper();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useRemoveProfilePhoto(), { wrapper: Wrapper });

      await act(async () => { result.current.mutate(); });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['assets'] }),
      );
    });

    it('reports error when service rejects', async () => {
      mockedService.deleteProfilePhoto.mockRejectedValueOnce(new Error('Delete failed'));
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useRemoveProfilePhoto(), { wrapper: Wrapper });

      await act(async () => { result.current.mutate(); });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe('Delete failed');
    });
  });

  describe('useAllAssets', () => {
    const mockLinkedAsset: AssetWithLink = {
      id: 1, parent_type: 'word', parent_id: 10, asset_type: 'audio',
      filename: 'asset_1.m4a', name: 'test', mime_type: 'audio/mp4',
      file_size: 1024, duration_ms: 3000, width: null, height: null,
      created_at: '2024-01-01',
      linked_word: 'baby', linked_word_id: 10, linked_variant: null, linked_variant_id: null,
    };

    it('returns empty array when no assets', async () => {
      mockedService.getAllAssets.mockResolvedValueOnce([]);
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useAllAssets(), { wrapper: Wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([]);
    });

    it('returns assets when available', async () => {
      mockedService.getAllAssets.mockResolvedValueOnce([mockLinkedAsset]);
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useAllAssets(), { wrapper: Wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([mockLinkedAsset]);
    });

    it('calls service with search, type, and sort params', async () => {
      mockedService.getAllAssets.mockResolvedValueOnce([]);
      const { Wrapper } = createWrapper();
      renderHook(() => useAllAssets('baby', 'audio', 'name_asc'), { wrapper: Wrapper });
      await waitFor(() => expect(mockedService.getAllAssets).toHaveBeenCalledWith('baby', 'audio', 'name_asc'));
    });
  });

  describe('useRelinkAsset', () => {
    const mockAsset: Asset = {
      id: 1, parent_type: 'word', parent_id: 10, asset_type: 'audio',
      filename: 'asset_1.m4a', name: 'test', mime_type: 'audio/mp4',
      file_size: 1024, duration_ms: 3000, width: null, height: null,
      created_at: '2024-01-01',
    };

    it('calls relinkAsset service with correct params', async () => {
      mockedService.relinkAsset.mockResolvedValueOnce({ ...mockAsset, parent_type: 'variant', parent_id: 5 });
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useRelinkAsset(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ asset: mockAsset, newParentType: 'variant', newParentId: 5 });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockedService.relinkAsset).toHaveBeenCalledWith(mockAsset, 'variant', 5);
    });

    it('invalidates allAssets query on success', async () => {
      const { Wrapper, queryClient } = createWrapper();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useRelinkAsset(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ asset: mockAsset, newParentType: 'variant', newParentId: 5 });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['allAssets'] }),
      );
    });
  });

  describe('useRenameAsset', () => {
    it('calls renameAsset service with correct params', async () => {
      mockedService.renameAsset.mockResolvedValueOnce(undefined);
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useRenameAsset(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ id: 1, name: 'New Name' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockedService.renameAsset).toHaveBeenCalledWith(1, 'New Name');
    });

    it('invalidates allAssets query on success', async () => {
      const { Wrapper, queryClient } = createWrapper();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useRenameAsset(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ id: 1, name: 'New Name' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['allAssets'] }),
      );
    });
  });

  describe('useUpdateAssetDate', () => {
    it('calls updateAssetDate service with correct params', async () => {
      mockedService.updateAssetDate.mockResolvedValueOnce(undefined);
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useUpdateAssetDate(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ id: 1, date: '2025-06-01' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockedService.updateAssetDate).toHaveBeenCalledWith(1, '2025-06-01');
    });

    it('invalidates allAssets query on success', async () => {
      const { Wrapper, queryClient } = createWrapper();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useUpdateAssetDate(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ id: 1, date: '2025-06-01' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['allAssets'] }),
      );
    });
  });
});
