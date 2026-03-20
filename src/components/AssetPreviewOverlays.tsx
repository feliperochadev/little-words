import React from 'react';
import { AudioPreviewOverlay } from './AudioPreviewOverlay';
import { PhotoPreviewOverlay } from './PhotoPreviewOverlay';
import type { AudioOverlayState, PhotoOverlayState } from '../types/asset';

interface Props {
  audioOverlay: AudioOverlayState | null;
  photoOverlay: PhotoOverlayState | null;
  onCloseAudio: () => void;
  onClosePhoto: () => void;
}

/**
 * Renders AudioPreviewOverlay and PhotoPreviewOverlay from overlay state
 * produced by useAssetPreviewOverlays(). Eliminates the repeated overlay
 * JSX pair that was duplicated across MediaChips and WordAssetChips.
 */
export function AssetPreviewOverlays({ audioOverlay, photoOverlay, onCloseAudio, onClosePhoto }: Readonly<Props>) {
  return (
    <>
      <AudioPreviewOverlay
        visible={!!audioOverlay}
        uri={audioOverlay?.uri ?? ''}
        name={audioOverlay?.name ?? ''}
        createdAt={audioOverlay?.createdAt ?? ''}
        durationMs={audioOverlay?.durationMs}
        onClose={onCloseAudio}
      />
      <PhotoPreviewOverlay
        visible={!!photoOverlay}
        uri={photoOverlay?.uri ?? ''}
        name={photoOverlay?.name ?? ''}
        createdAt={photoOverlay?.createdAt ?? ''}
        onClose={onClosePhoto}
      />
    </>
  );
}
