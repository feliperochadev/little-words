import { useCallback } from 'react';
import { getAssetsByParentAndType } from '../services/assetService';
import { useAssetPreviewOverlays } from './useAssetPreviewOverlays';
import type { TimelineItem as TimelineItemModel } from '../types/domain';

/**
 * Shared handlers for timeline item asset interactions (audio/photo).
 * Used in home dashboard mini-timeline and full memories screen.
 */
export function useTimelineHandlers() {
  const {
    audioOverlay,
    photoOverlay,
    openAudioOverlay,
    openPhotoOverlay,
    closeAudioOverlay,
    closePhotoOverlay,
  } = useAssetPreviewOverlays();

  const handlePlayAudio = useCallback(
    async (item: TimelineItemModel) => {
      const audioAssets = await getAssetsByParentAndType(item.item_type, item.id, 'audio');
      const firstAudio = audioAssets[0];
      if (firstAudio) {
        openAudioOverlay(firstAudio);
      }
    },
    [openAudioOverlay],
  );

  const handleViewPhoto = useCallback(
    async (item: TimelineItemModel) => {
      const photoAssets = await getAssetsByParentAndType(item.item_type, item.id, 'photo');
      const firstPhoto = photoAssets[0];
      if (firstPhoto) {
        openPhotoOverlay(firstPhoto);
      }
    },
    [openPhotoOverlay],
  );

  return {
    handlePlayAudio,
    handleViewPhoto,
    audioOverlay,
    photoOverlay,
    closeAudioOverlay,
    closePhotoOverlay,
  };
}
