import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from '../../src/i18n/i18n';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,           // GC immediately when component unmounts — prevents memory leaks across tests
        staleTime: Infinity, // never refetch automatically — tests control all data
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
      mutations: { retry: false },
    },
  });
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { queryClient?: QueryClient }
) {
  const { queryClient: externalClient, ...renderOptions } = options ?? {};
  // Create client once per renderWithProviders call — stable across re-renders
  const queryClient = externalClient ?? createTestQueryClient();
  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <I18nProvider>{children}</I18nProvider>
      </QueryClientProvider>
    ),
    ...renderOptions,
  });
}
