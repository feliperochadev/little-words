import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS, KEEPSAKE_MUTATION_KEYS } from './queryKeys';
import {
  loadKeepsakeState,
  getKeepsakeWords as fetchKeepsakeWords,
  captureKeepsake,
  setPhotoOverride,
  saveKeepsakeToLibrary,
  shareKeepsake,
  getKeepsakeFileUri,
} from '../services/keepsakeService';
import type { KeepsakeState, KeepsakeWord } from '../types/keepsake';
import type { RefObject } from 'react';
import type { View } from 'react-native';

const EMPTY_WORDS: KeepsakeWord[] = [];

export function useKeepsakeState() {
  return useQuery<KeepsakeState>({
    queryKey: QUERY_KEYS.keepsakeState(),
    queryFn: loadKeepsakeState,
  });
}

export function useKeepsakeWords() {
  return useQuery<KeepsakeWord[]>({
    queryKey: QUERY_KEYS.keepsakeWords(),
    queryFn: fetchKeepsakeWords,
    select: (data) => data ?? EMPTY_WORDS,
  });
}

export function useCaptureKeepsake() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (viewRef: RefObject<View | null>) => captureKeepsake(viewRef),
    onSuccess: () => {
      KEEPSAKE_MUTATION_KEYS.forEach(key =>
        queryClient.invalidateQueries({ queryKey: key }),
      );
    },
  });
}

export function useSetPhotoOverride() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ wordId, photoUri }: { wordId: number; photoUri: string }) =>
      setPhotoOverride(wordId, photoUri),
    onSuccess: () => {
      KEEPSAKE_MUTATION_KEYS.forEach(key =>
        queryClient.invalidateQueries({ queryKey: key }),
      );
    },
  });
}

export function useSaveKeepsakeToLibrary() {
  return useMutation({
    mutationFn: () => saveKeepsakeToLibrary(getKeepsakeFileUri()),
  });
}

export function useShareKeepsake() {
  return useMutation({
    mutationFn: () => shareKeepsake(getKeepsakeFileUri()),
  });
}
