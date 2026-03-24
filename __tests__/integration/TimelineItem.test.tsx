import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { TimelineItem } from '../../src/components/TimelineItem';
import type { TimelineItem as TimelineItemModel } from '../../src/types/domain';

jest.mock('../../src/services/settingsService', () => ({
  ...jest.requireActual('../../src/services/settingsService'),
  getSetting: jest.fn().mockResolvedValue(null),
  setSetting: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/utils/assetStorage', () => ({
  getAssetFileUri: (parentType: string, parentId: number, assetType: string, filename: string) =>
    `file:///media/${parentType}/${parentId}/${assetType}/${filename}`,
}));

const WORD_ITEM: TimelineItemModel = {
  id: 10,
  text: 'mama',
  item_type: 'word',
  created_at: '2025-03-03T10:00:00.000Z',
  date_added: '2025-03-03',
  main_word_text: null,
  word_id: null,
  audio_count: 1,
  photo_count: 1,
  first_photo_filename: 'word.jpg',
  first_photo_mime: 'image/jpeg',
};

const VARIANT_ITEM: TimelineItemModel = {
  id: 11,
  text: 'mamá',
  item_type: 'variant',
  created_at: '2025-03-02T10:00:00.000Z',
  date_added: '2025-03-02',
  main_word_text: 'mama',
  word_id: 10,
  audio_count: 0,
  photo_count: 0,
  first_photo_filename: null,
  first_photo_mime: null,
};

describe('TimelineItem', () => {
  it('renders word card content and timeline date', async () => {
    const { findByText } = renderWithProviders(
      <TimelineItem
        item={WORD_ITEM}
        index={0}
        onPlayAudio={() => {}}
        onViewPhoto={() => {}}
      />
    );

    expect(await findByText('mama')).toBeTruthy();
    expect(await findByText('Word')).toBeTruthy();
    expect(await findByText('3rd Mar, 2025')).toBeTruthy();
  });

  it('renders variant context line', async () => {
    const { findByText } = renderWithProviders(
      <TimelineItem
        item={VARIANT_ITEM}
        index={1}
        onPlayAudio={() => {}}
        onViewPhoto={() => {}}
      />
    );

    expect(await findByText('Variant')).toBeTruthy();
    expect(await findByText('Variant of mama')).toBeTruthy();
  });

  it('calls handlers when audio/photo controls are pressed', async () => {
    const onPlayAudio = jest.fn();
    const onViewPhoto = jest.fn();
    const { findByTestId } = renderWithProviders(
      <TimelineItem
        item={WORD_ITEM}
        index={0}
        onPlayAudio={onPlayAudio}
        onViewPhoto={onViewPhoto}
      />
    );

    fireEvent.press(await findByTestId('timeline-audio-word-10'));
    fireEvent.press(await findByTestId('timeline-photo-word-10'));

    expect(onPlayAudio).toHaveBeenCalledWith(WORD_ITEM);
    expect(onViewPhoto).toHaveBeenCalledWith(WORD_ITEM);
  });
});
