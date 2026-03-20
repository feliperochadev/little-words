import { useContext } from 'react';
import { MediaCaptureContext } from '../providers/MediaCaptureProvider';

export function useMediaCapture() {
  const ctx = useContext(MediaCaptureContext);
  if (!ctx) {
    throw new Error('useMediaCapture must be used within a MediaCaptureProvider');
  }
  return ctx;
}
