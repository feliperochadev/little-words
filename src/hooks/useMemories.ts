import { useQuery } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { QUERY_KEYS } from './queryKeys';
import * as memoriesService from '../services/memoriesService';
import type { TimelineItem } from '../types/domain';

const EMPTY_MEMORIES: TimelineItem[] = [];

export function useMemories() {
  const query = useQuery({
    queryKey: QUERY_KEYS.memories(),
    queryFn: memoriesService.getTimelineItems,
    select: (data) => data ?? EMPTY_MEMORIES,
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
