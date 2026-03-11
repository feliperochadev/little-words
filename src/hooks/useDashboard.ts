import { useQuery } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { QUERY_KEYS } from './queryKeys';
import * as dashboardService from '../services/dashboardService';

export function useDashboardStats() {
  const query = useQuery({
    queryKey: QUERY_KEYS.dashboard(),
    queryFn: dashboardService.getDashboardStats,
    staleTime: 30_000, // dashboard is read-heavy; 30s before background refetch
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
