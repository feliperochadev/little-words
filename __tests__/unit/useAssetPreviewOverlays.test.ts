import { renderHook, act } from '@testing-library/react-native';
import { useAssetPreviewOverlays } from '../../src/hooks/useAssetPreviewOverlays';
import type { Asset } from '../../src/types/asset';

// ── Mocks ────────────────────────────────────────────────────────────

jest.mock('../../src/utils/assetStorage', () => ({
  getAssetFileUri: (parentType: string, parentId: number, assetType: string, filename: string) =>
    `file:///media/${parentType}/${parentId}/${assetType}/${filename}`,
}));

// ── Helpers ──────────────────────────────────────────────────────────

function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 1,
    parent_type: 'word',
    parent_id: 10,
    asset_type: 'audio',
    filename: 'recording.m4a',
    name: 'My Recording',
    mime_type: 'audio/mp4',
    file_size: 1024,
    duration_ms: 3000,
    width: null,
    height: null,
    created_at: '2026-01-15T00:00:00Z',
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe('useAssetPreviewOverlays', () => {
  describe('initial state', () => {
    it('audioOverlay starts as null', () => {
      const { result } = renderHook(() => useAssetPreviewOverlays());
      expect(result.current.audioOverlay).toBeNull();
    });

    it('photoOverlay starts as null', () => {
      const { result } = renderHook(() => useAssetPreviewOverlays());
      expect(result.current.photoOverlay).toBeNull();
    });

    it('exposes openAudioOverlay, openPhotoOverlay, closeAudioOverlay, closePhotoOverlay functions', () => {
      const { result } = renderHook(() => useAssetPreviewOverlays());
      expect(typeof result.current.openAudioOverlay).toBe('function');
      expect(typeof result.current.openPhotoOverlay).toBe('function');
      expect(typeof result.current.closeAudioOverlay).toBe('function');
      expect(typeof result.current.closePhotoOverlay).toBe('function');
    });
  });

  describe('openAudioOverlay', () => {
    it('sets audioOverlay with correct uri using parent info', () => {
      const { result } = renderHook(() => useAssetPreviewOverlays());
      const asset = makeAsset({ parent_type: 'word', parent_id: 10, filename: 'rec.m4a' });
      act(() => { result.current.openAudioOverlay(asset); });
      expect(result.current.audioOverlay?.uri).toBe('file:///media/word/10/audio/rec.m4a');
    });

    it('sets audioOverlay with asset name when name is present', () => {
      const { result } = renderHook(() => useAssetPreviewOverlays());
      act(() => { result.current.openAudioOverlay(makeAsset({ name: 'Cool Recording' })); });
      expect(result.current.audioOverlay?.name).toBe('Cool Recording');
    });

    it('falls back to filename when name is null', () => {
      const { result } = renderHook(() => useAssetPreviewOverlays());
      act(() => { result.current.openAudioOverlay(makeAsset({ name: null, filename: 'fallback.m4a' })); });
      expect(result.current.audioOverlay?.name).toBe('fallback.m4a');
    });

    it('sets audioOverlay with durationMs from asset', () => {
      const { result } = renderHook(() => useAssetPreviewOverlays());
      act(() => { result.current.openAudioOverlay(makeAsset({ duration_ms: 5000 })); });
      expect(result.current.audioOverlay?.durationMs).toBe(5000);
    });

    it('sets audioOverlay with createdAt from asset', () => {
      const { result } = renderHook(() => useAssetPreviewOverlays());
      act(() => { result.current.openAudioOverlay(makeAsset({ created_at: '2026-02-20T10:00:00Z' })); });
      expect(result.current.audioOverlay?.createdAt).toBe('2026-02-20T10:00:00Z');
    });

    it('does not change photoOverlay', () => {
      const { result } = renderHook(() => useAssetPreviewOverlays());
      act(() => { result.current.openAudioOverlay(makeAsset()); });
      expect(result.current.photoOverlay).toBeNull();
    });

    it('uses variant parent_type when asset is a variant', () => {
      const { result } = renderHook(() => useAssetPreviewOverlays());
      const asset = makeAsset({ parent_type: 'variant', parent_id: 5, filename: 'var.m4a' });
      act(() => { result.current.openAudioOverlay(asset); });
      expect(result.current.audioOverlay?.uri).toBe('file:///media/variant/5/audio/var.m4a');
    });
  });

  describe('openPhotoOverlay', () => {
    it('sets photoOverlay with correct uri using parent info', () => {
      const { result } = renderHook(() => useAssetPreviewOverlays());
      const asset = makeAsset({ asset_type: 'photo', parent_type: 'word', parent_id: 10, filename: 'photo.jpg', mime_type: 'image/jpeg' });
      act(() => { result.current.openPhotoOverlay(asset); });
      expect(result.current.photoOverlay?.uri).toBe('file:///media/word/10/photo/photo.jpg');
    });

    it('sets photoOverlay with asset name when name is present', () => {
      const { result } = renderHook(() => useAssetPreviewOverlays());
      const asset = makeAsset({ asset_type: 'photo', name: 'Sunset', filename: 'sunset.jpg' });
      act(() => { result.current.openPhotoOverlay(asset); });
      expect(result.current.photoOverlay?.name).toBe('Sunset');
    });

    it('falls back to filename when name is null', () => {
      const { result } = renderHook(() => useAssetPreviewOverlays());
      const asset = makeAsset({ asset_type: 'photo', name: null, filename: 'photo.jpg' });
      act(() => { result.current.openPhotoOverlay(asset); });
      expect(result.current.photoOverlay?.name).toBe('photo.jpg');
    });

    it('sets photoOverlay with createdAt from asset', () => {
      const { result } = renderHook(() => useAssetPreviewOverlays());
      const asset = makeAsset({ asset_type: 'photo', filename: 'p.jpg', created_at: '2026-03-01T09:00:00Z' });
      act(() => { result.current.openPhotoOverlay(asset); });
      expect(result.current.photoOverlay?.createdAt).toBe('2026-03-01T09:00:00Z');
    });

    it('does not change audioOverlay', () => {
      const { result } = renderHook(() => useAssetPreviewOverlays());
      const asset = makeAsset({ asset_type: 'photo', filename: 'p.jpg' });
      act(() => { result.current.openPhotoOverlay(asset); });
      expect(result.current.audioOverlay).toBeNull();
    });
  });

  describe('closeAudioOverlay', () => {
    it('clears audioOverlay to null', () => {
      const { result } = renderHook(() => useAssetPreviewOverlays());
      act(() => { result.current.openAudioOverlay(makeAsset()); });
      act(() => { result.current.closeAudioOverlay(); });
      expect(result.current.audioOverlay).toBeNull();
    });

    it('does not affect photoOverlay', () => {
      const { result } = renderHook(() => useAssetPreviewOverlays());
      act(() => {
        result.current.openPhotoOverlay(makeAsset({ asset_type: 'photo', filename: 'p.jpg' }));
        result.current.closeAudioOverlay();
      });
      expect(result.current.photoOverlay).not.toBeNull();
    });
  });

  describe('closePhotoOverlay', () => {
    it('clears photoOverlay to null', () => {
      const { result } = renderHook(() => useAssetPreviewOverlays());
      act(() => { result.current.openPhotoOverlay(makeAsset({ asset_type: 'photo', filename: 'p.jpg' })); });
      act(() => { result.current.closePhotoOverlay(); });
      expect(result.current.photoOverlay).toBeNull();
    });

    it('does not affect audioOverlay', () => {
      const { result } = renderHook(() => useAssetPreviewOverlays());
      act(() => {
        result.current.openAudioOverlay(makeAsset());
        result.current.closePhotoOverlay();
      });
      expect(result.current.audioOverlay).not.toBeNull();
    });
  });

  describe('overlay replacement', () => {
    it('opening a new audio overlay replaces the previous one', () => {
      const { result } = renderHook(() => useAssetPreviewOverlays());
      act(() => { result.current.openAudioOverlay(makeAsset({ id: 1, name: 'First' })); });
      act(() => { result.current.openAudioOverlay(makeAsset({ id: 2, name: 'Second', filename: 'b.m4a' })); });
      expect(result.current.audioOverlay?.name).toBe('Second');
    });

    it('opening a new photo overlay replaces the previous one', () => {
      const { result } = renderHook(() => useAssetPreviewOverlays());
      act(() => { result.current.openPhotoOverlay(makeAsset({ id: 1, asset_type: 'photo', name: 'First', filename: 'a.jpg' })); });
      act(() => { result.current.openPhotoOverlay(makeAsset({ id: 2, asset_type: 'photo', name: 'Second', filename: 'b.jpg' })); });
      expect(result.current.photoOverlay?.name).toBe('Second');
    });

    it('audio and photo overlays are independent', () => {
      const { result } = renderHook(() => useAssetPreviewOverlays());
      act(() => {
        result.current.openAudioOverlay(makeAsset({ name: 'Audio' }));
        result.current.openPhotoOverlay(makeAsset({ asset_type: 'photo', name: 'Photo', filename: 'p.jpg' }));
      });
      expect(result.current.audioOverlay?.name).toBe('Audio');
      expect(result.current.photoOverlay?.name).toBe('Photo');
    });
  });
});
