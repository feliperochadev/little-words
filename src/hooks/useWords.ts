import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { QUERY_KEYS, WORD_MUTATION_KEYS } from './queryKeys';
import * as wordService from '../services/wordService';
import { useSyncOnSuccess } from './useSyncOnSuccess';

export function useWords(search?: string) {
  const query = useQuery({
    queryKey: QUERY_KEYS.words(search),
    queryFn: () => wordService.getWords(search),
  });

  // Keep a stable ref to refetch so useFocusEffect deps stay empty
  const refetchRef = useRef(query.refetch);
  refetchRef.current = query.refetch;

  // Refetch when the tab/screen gains focus
  useFocusEffect(
    useCallback(() => {
      refetchRef.current();
    }, [])
  );

  return query;
}

export function useAddWord() {
  const queryClient = useQueryClient();
  const syncOnSuccess = useSyncOnSuccess();
  return useMutation({
    mutationFn: ({
      word,
      categoryId,
      dateAdded,
      notes,
    }: {
      word: string;
      categoryId: number | null;
      dateAdded: string;
      notes?: string;
    }) => wordService.addWord(word, categoryId, dateAdded, notes),
    onSuccess: () => {
      WORD_MUTATION_KEYS.forEach(key =>
        queryClient.invalidateQueries({ queryKey: key })
      );
      syncOnSuccess();
    },
  });
}

export function useUpdateWord() {
  const queryClient = useQueryClient();
  const syncOnSuccess = useSyncOnSuccess();
  return useMutation({
    mutationFn: ({
      id,
      word,
      categoryId,
      dateAdded,
      notes,
    }: {
      id: number;
      word: string;
      categoryId: number | null;
      dateAdded: string;
      notes?: string;
    }) => wordService.updateWord(id, word, categoryId, dateAdded, notes),
    onSuccess: () => {
      WORD_MUTATION_KEYS.forEach(key =>
        queryClient.invalidateQueries({ queryKey: key })
      );
      syncOnSuccess();
    },
  });
}

export function useDeleteWord() {
  const queryClient = useQueryClient();
  const syncOnSuccess = useSyncOnSuccess();
  return useMutation({
    mutationFn: ({ id }: { id: number }) => wordService.deleteWord(id),
    onSuccess: () => {
      WORD_MUTATION_KEYS.forEach(key =>
        queryClient.invalidateQueries({ queryKey: key })
      );
      syncOnSuccess();
    },
  });
}
