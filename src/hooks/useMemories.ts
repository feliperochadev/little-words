import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { QUERY_KEYS } from './queryKeys';
import * as memoriesService from '../services/memoriesService';
import type { TimelineItem } from '../types/domain';

const EMPTY_MEMORIES: TimelineItem[] = [];
const PAGE_SIZE = 10;

export function useMemories() {
  const q = useQuery({
    queryKey: QUERY_KEYS.memories(),
    queryFn: memoriesService.getTimelineItems,
    select: (data) => data ?? EMPTY_MEMORIES,
  });

  const refetchRef = useRef(q.refetch);
  refetchRef.current = q.refetch;

  useFocusEffect(
    useCallback(() => {
      refetchRef.current();
    }, [])
  );

  return q;
}

export function useMemoriesInfinite() {
  const q = useInfiniteQuery({
    queryKey: QUERY_KEYS.memoriesInfinite(),
    queryFn: ({ pageParam }: { pageParam: number }) =>
      memoriesService.getTimelineItemsPaginated(PAGE_SIZE, pageParam),
    initialPageParam: 0 as number,
    getNextPageParam: (lastPage: TimelineItem[], _allPages: TimelineItem[][], lastPageParam: number) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return lastPageParam + PAGE_SIZE;
    },
  });

  const refetchRef = useRef(q.refetch);
  refetchRef.current = q.refetch;

  useFocusEffect(
    useCallback(() => {
      refetchRef.current();
    }, [])
  );

  const items = useMemo(
    () => q.data?.pages.flat() ?? EMPTY_MEMORIES,
    [q.data?.pages]
  );

  return { ...q, items };
}
