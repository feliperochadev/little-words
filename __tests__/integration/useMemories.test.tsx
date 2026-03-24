import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '../helpers/renderWithProviders';
import { useMemories } from '../../src/hooks/useMemories';
import * as memoriesService from '../../src/services/memoriesService';
import type { TimelineItem } from '../../src/types/domain';

jest.mock('../../src/services/memoriesService', () => ({
  getTimelineItems: jest.fn(() => Promise.resolve([])),
}));

const mockedService = memoriesService as jest.Mocked<typeof memoriesService>;

function createWrapper() {
  const queryClient = createTestQueryClient();
  return {
    Wrapper({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    },
  };
}

const SAMPLE: TimelineItem[] = [
  {
    id: 1,
    text: 'mamãe',
    item_type: 'word',
    created_at: '2026-03-01T00:00:00.000Z',
    date_added: '2026-03-01',
    main_word_text: null,
    word_id: null,
    audio_count: 1,
    photo_count: 1,
    first_photo_filename: 'photo.jpg',
    first_photo_mime: 'image/jpeg',
  },
];

describe('useMemories', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns timeline items from service', async () => {
    mockedService.getTimelineItems.mockResolvedValueOnce(SAMPLE);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useMemories(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(SAMPLE);
    expect(mockedService.getTimelineItems).toHaveBeenCalled();
  });

  it('returns stable empty array fallback when service resolves null-ish', async () => {
    mockedService.getTimelineItems.mockResolvedValueOnce(null as unknown as TimelineItem[]);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useMemories(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});
