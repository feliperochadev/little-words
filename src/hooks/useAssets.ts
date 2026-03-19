import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS, ASSET_MUTATION_KEYS } from './queryKeys';
import * as assetService from '../services/assetService';
import { getAssetFileUri } from '../utils/assetStorage';
import type { ParentType, AssetType, Asset } from '../types/asset';

const EMPTY_ASSETS: Asset[] = [];

export function useAssetsByParent(
  parentType: ParentType,
  parentId: number,
  enabled = true,
) {
  return useQuery({
    queryKey: QUERY_KEYS.assets(parentType, parentId),
    queryFn: () => assetService.getAssetsByParent(parentType, parentId),
    enabled: enabled && parentId > 0,
    select: (data) => data ?? EMPTY_ASSETS,
  });
}

export function useAssetsByType(
  parentType: ParentType,
  parentId: number,
  assetType: AssetType,
  enabled = true,
) {
  return useQuery({
    queryKey: QUERY_KEYS.assetsByType(parentType, parentId, assetType),
    queryFn: () => assetService.getAssetsByParentAndType(parentType, parentId, assetType),
    enabled: enabled && parentId > 0,
    select: (data) => data ?? EMPTY_ASSETS,
  });
}

export function useSaveAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: assetService.SaveAssetParams) =>
      assetService.saveAsset(params),
    onSuccess: () => {
      ASSET_MUTATION_KEYS.forEach(key =>
        queryClient.invalidateQueries({ queryKey: key })
      );
    },
  });
}

export function useRemoveAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (asset: Asset) => assetService.removeAsset(asset),
    onSuccess: () => {
      ASSET_MUTATION_KEYS.forEach(key =>
        queryClient.invalidateQueries({ queryKey: key })
      );
    },
  });
}

export type ProfilePhotoAsset = Asset & { uri: string };

export function useProfilePhoto() {
  return useQuery({
    queryKey: QUERY_KEYS.assetsByType('profile', 1, 'photo'),
    queryFn: () => assetService.getProfilePhoto(),
    select: (asset): ProfilePhotoAsset | null =>
      asset
        ? { ...asset, uri: getAssetFileUri('profile', 1, 'photo', asset.filename) }
        : null,
  });
}

export function useSaveProfilePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      sourceUri: string;
      mimeType: string;
      fileSize?: number;
      width?: number | null;
      height?: number | null;
    }) =>
      assetService.saveProfilePhoto(
        params.sourceUri,
        params.mimeType,
        params.fileSize,
        params.width,
        params.height,
      ),
    onSuccess: () => {
      ASSET_MUTATION_KEYS.forEach(key =>
        queryClient.invalidateQueries({ queryKey: key })
      );
    },
  });
}

export function useRemoveProfilePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => assetService.deleteProfilePhoto(),
    onSuccess: () => {
      ASSET_MUTATION_KEYS.forEach(key =>
        queryClient.invalidateQueries({ queryKey: key })
      );
    },
  });
}
