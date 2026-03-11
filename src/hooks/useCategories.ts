import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS, CATEGORY_MUTATION_KEYS, WORD_MUTATION_KEYS } from './queryKeys';
import * as categoryService from '../services/categoryService';

export function useCategories() {
  return useQuery({
    queryKey: QUERY_KEYS.categories(),
    queryFn: categoryService.getCategories,
  });
}

export function useAddCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, color, emoji }: { name: string; color: string; emoji: string }) =>
      categoryService.addCategory(name, color, emoji),
    onSuccess: () => {
      CATEGORY_MUTATION_KEYS.forEach(key =>
        queryClient.invalidateQueries({ queryKey: key })
      );
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name, color, emoji }: { id: number; name: string; color: string; emoji: string }) =>
      categoryService.updateCategory(id, name, color, emoji),
    onSuccess: () => {
      CATEGORY_MUTATION_KEYS.forEach(key =>
        queryClient.invalidateQueries({ queryKey: key })
      );
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      await categoryService.deleteCategoryWithUnlink(id);
    },
    onSuccess: () => {
      [...CATEGORY_MUTATION_KEYS, ...WORD_MUTATION_KEYS].forEach(key =>
        queryClient.invalidateQueries({ queryKey: key })
      );
    },
  });
}

export function useWordCountByCategory(id: number) {
  return useQuery({
    queryKey: ['wordCounts', id],
    queryFn: () => categoryService.getWordCountByCategory(id),
    enabled: id > 0,
  });
}
