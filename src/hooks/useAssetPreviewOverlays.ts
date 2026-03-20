import { useState } from 'react';
import { getAssetFileUri } from '../utils/assetStorage';
import type { Asset, AudioOverlayState, PhotoOverlayState } from '../types/asset';

/**
 * Manages the open/close state for AudioPreviewOverlay and PhotoPreviewOverlay.
 * Extracts the URI from the asset's parent info and populates overlay metadata.
 * Use with <AssetPreviewOverlays> to render the overlays.
 */
export function useAssetPreviewOverlays() {
  const [audioOverlay, setAudioOverlay] = useState<AudioOverlayState | null>(null);
  const [photoOverlay, setPhotoOverlay] = useState<PhotoOverlayState | null>(null);

  const openAudioOverlay = (asset: Asset) => {
    const uri = getAssetFileUri(asset.parent_type, asset.parent_id, 'audio', asset.filename);
    setAudioOverlay({ uri, name: asset.name ?? asset.filename, createdAt: asset.created_at, durationMs: asset.duration_ms });
  };

  const openPhotoOverlay = (asset: Asset) => {
    const uri = getAssetFileUri(asset.parent_type, asset.parent_id, 'photo', asset.filename);
    setPhotoOverlay({ uri, name: asset.name ?? asset.filename, createdAt: asset.created_at });
  };

  const closeAudioOverlay = () => setAudioOverlay(null);
  const closePhotoOverlay = () => setPhotoOverlay(null);

  return { audioOverlay, photoOverlay, openAudioOverlay, openPhotoOverlay, closeAudioOverlay, closePhotoOverlay };
}
