import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { QUERY_KEYS, VARIANT_MUTATION_KEYS } from './queryKeys';
import * as variantService from '../services/variantService';
import { useAuthStore } from '../stores/authStore';
import { useI18n } from '../i18n/i18n';
import { performSync } from '../utils/googleDrive';

function useSyncOnSuccess() {
  const { t } = useI18n();
  return () => {
    if (useAuthStore.getState().isConnected) {
      performSync(t);
    }
  };
}

export function useAllVariants() {
  const query = useQuery({
    queryKey: QUERY_KEYS.allVariants(),
    queryFn: variantService.getAllVariants,
  });

  const refetchRef = useRef(query.refetch);
  refetchRef.current = query.refetch;

  useFocusEffect(
    useCallback(() => {
      refetchRef.current();
    }, [])
  );

  return query;
}

export function useVariantsByWord(wordId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.variantsByWord(wordId ?? 0),
    queryFn: () => variantService.getVariantsByWord(wordId!),
    enabled: enabled && !!wordId,
  });
}

export function useAddVariant() {
  const queryClient = useQueryClient();
  const syncOnSuccess = useSyncOnSuccess();
  return useMutation({
    mutationFn: ({
      wordId,
      variant,
      dateAdded,
      notes,
    }: {
      wordId: number;
      variant: string;
      dateAdded: string;
      notes?: string;
    }) => variantService.addVariant(wordId, variant, dateAdded, notes),
    onSuccess: () => {
      VARIANT_MUTATION_KEYS.forEach(key =>
        queryClient.invalidateQueries({ queryKey: key })
      );
      syncOnSuccess();
    },
  });
}

export function useUpdateVariant() {
  const queryClient = useQueryClient();
  const syncOnSuccess = useSyncOnSuccess();
  return useMutation({
    mutationFn: ({
      id,
      variant,
      dateAdded,
      notes,
    }: {
      id: number;
      variant: string;
      dateAdded: string;
      notes?: string;
    }) => variantService.updateVariant(id, variant, dateAdded, notes),
    onSuccess: () => {
      VARIANT_MUTATION_KEYS.forEach(key =>
        queryClient.invalidateQueries({ queryKey: key })
      );
      syncOnSuccess();
    },
  });
}

export function useDeleteVariant() {
  const queryClient = useQueryClient();
  const syncOnSuccess = useSyncOnSuccess();
  return useMutation({
    mutationFn: ({ id }: { id: number }) => variantService.deleteVariant(id),
    onSuccess: () => {
      VARIANT_MUTATION_KEYS.forEach(key =>
        queryClient.invalidateQueries({ queryKey: key })
      );
      syncOnSuccess();
    },
  });
}
