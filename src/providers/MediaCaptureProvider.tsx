import React, { createContext, useState, useRef, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { createAudioPlayer, AudioModule } from 'expo-audio';
import type { AudioPlayer as ExpoAudioPlayer } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';
import { ASSET_MUTATION_KEYS } from '../hooks/queryKeys';
import * as assetService from '../services/assetService';
import { getAssetsByParentAndType } from '../repositories/assetRepository';
import { getAssetFileUri } from '../utils/assetStorage';
import { useI18n } from '../i18n/i18n';
import type { ParentType, AssetType } from '../types/asset';

export type CapturePhase = 'idle' | 'recording' | 'captured' | 'linking' | 'creating-word';

export interface PendingMedia {
  uri: string;
  type: AssetType;
  mimeType: string;
  fileSize: number;
  durationMs?: number;
  width?: number;
  height?: number;
}

export interface MediaCaptureContextValue {
  phase: CapturePhase;
  pendingMedia: PendingMedia | null;
  prefilledWordName: string;
  prefilledMediaName: string;
  playingAssetId: number | null;

  setPhase: (phase: CapturePhase) => void;
  setCapturedMedia: (media: PendingMedia) => void;
  resetCapture: () => void;

  // Linking actions
  linkMediaToWord: (wordId: number, name?: string, parentName?: string) => Promise<void>;
  startCreateWord: (wordName: string, mediaName?: string) => void;
  onWordCreated: (wordId: number) => Promise<void>;

  // Photo capture
  launchPhotoPicker: () => void;

  // Inline audio playback
  playAssetByParent: (parentType: ParentType, parentId: number) => Promise<void>;
  stopPlayback: () => Promise<void>;
}

export const MediaCaptureContext = createContext<MediaCaptureContextValue | null>(null);

type Props = { children: React.ReactNode };

export function MediaCaptureProvider({ children }: Readonly<Props>) {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const [phase, setPhase] = useState<CapturePhase>('idle');
  const [pendingMedia, setPendingMedia] = useState<PendingMedia | null>(null);
  const [prefilledWordName, setPrefilledWordName] = useState('');
  const [prefilledMediaName, setPrefilledMediaName] = useState('');
  const [playingAssetId, setPlayingAssetId] = useState<number | null>(null);

  const playerRef = useRef<ExpoAudioPlayer | null>(null);

  const invalidateAssetCaches = useCallback(() => {
    ASSET_MUTATION_KEYS.forEach(key =>
      queryClient.invalidateQueries({ queryKey: key })
    );
  }, [queryClient]);

  const resetCapture = useCallback(() => {
    setPhase('idle');
    setPendingMedia(null);
    setPrefilledWordName('');
    setPrefilledMediaName('');
  }, []);

  const setCapturedMedia = useCallback((media: PendingMedia) => {
    setPendingMedia(media);
    setPhase('linking');
  }, []);

  const linkMediaToWord = useCallback(async (wordId: number, name?: string, parentName?: string) => {
    if (!pendingMedia) return;
    try {
      await assetService.saveAsset({
        sourceUri: pendingMedia.uri,
        parentType: 'word',
        parentId: wordId,
        assetType: pendingMedia.type,
        mimeType: pendingMedia.mimeType,
        fileSize: pendingMedia.fileSize,
        name,
        parentName,
        durationMs: pendingMedia.durationMs,
        width: pendingMedia.width,
        height: pendingMedia.height,
      });
      invalidateAssetCaches();
    } catch {
      Alert.alert(t('common.error'), t('mediaCapture.linkFailed'));
    }
    resetCapture();
  }, [pendingMedia, invalidateAssetCaches, resetCapture, t]);

  const startCreateWord = useCallback((wordName: string, mediaName?: string) => {
    setPrefilledWordName(wordName);
    setPrefilledMediaName(mediaName ?? '');
    setPhase('creating-word');
  }, []);

  const onWordCreated = useCallback(async (wordId: number) => {
    if (!pendingMedia) {
      resetCapture();
      return;
    }
    try {
      await assetService.saveAsset({
        sourceUri: pendingMedia.uri,
        parentType: 'word',
        parentId: wordId,
        assetType: pendingMedia.type,
        mimeType: pendingMedia.mimeType,
        fileSize: pendingMedia.fileSize,
        name: prefilledMediaName || undefined,
        parentName: prefilledWordName || undefined,
        durationMs: pendingMedia.durationMs,
        width: pendingMedia.width,
        height: pendingMedia.height,
      });
      invalidateAssetCaches();
    } catch {
      // Asset save failed but word was created — don't block
    }
    resetCapture();
  }, [pendingMedia, prefilledMediaName, prefilledWordName, invalidateAssetCaches, resetCapture]);

  const launchPhotoPicker = useCallback(() => {
    Alert.alert(
      t('settings.photoSourceTitle'),
      undefined,
      [
        {
          text: t('settings.photoSourceCamera'),
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert(t('common.error'), t('settings.photoPermissionDenied'));
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: false,
              quality: 0.8,
            });
            if (!result.canceled && result.assets.length > 0) {
              const asset = result.assets[0];
              setCapturedMedia({
                uri: asset.uri,
                type: 'photo',
                mimeType: asset.mimeType ?? 'image/jpeg',
                fileSize: Math.max(asset.fileSize ?? 1, 1),
                width: asset.width,
                height: asset.height,
              });
            }
          },
        },
        {
          text: t('settings.photoSourceGallery'),
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert(t('common.error'), t('settings.photoPermissionDenied'));
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: false,
              quality: 0.8,
            });
            if (!result.canceled && result.assets.length > 0) {
              const asset = result.assets[0];
              setCapturedMedia({
                uri: asset.uri,
                type: 'photo',
                mimeType: asset.mimeType ?? 'image/jpeg',
                fileSize: Math.max(asset.fileSize ?? 1, 1),
                width: asset.width,
                height: asset.height,
              });
            }
          },
        },
        { text: t('common.cancel'), style: 'cancel' },
      ],
    );
  }, [t, setCapturedMedia]);

  // ── Inline audio playback (single-sound manager) ───────────────────────────

  const stopPlayback = useCallback(async () => {
    if (playerRef.current) {
      try {
        playerRef.current.remove();
      } catch {
        // Already removed
      }
      playerRef.current = null;
    }
    setPlayingAssetId(null);
  }, []);

  const playAssetByParent = useCallback(async (parentType: ParentType, parentId: number) => {
    // If already playing something for this parent, toggle off
    const assets = await getAssetsByParentAndType(parentType, parentId, 'audio');
    if (assets.length === 0) return;

    const asset = assets[0];

    // Toggle off if same asset
    if (playingAssetId === asset.id) {
      await stopPlayback();
      return;
    }

    // Stop any currently playing sound
    await stopPlayback();

    try {
      await AudioModule.setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });

      const uri = getAssetFileUri(parentType, parentId, 'audio', asset.filename);
      const player = createAudioPlayer({ uri });

      playerRef.current = player;
      setPlayingAssetId(asset.id);

      player.play();
      player.addListener('playbackStatusUpdate', (status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingAssetId(null);
          player.remove();
          if (playerRef.current === player) playerRef.current = null;
        }
      });
    } catch {
      setPlayingAssetId(null);
    }
  }, [playingAssetId, stopPlayback]);

  const contextValue = useMemo<MediaCaptureContextValue>(() => ({
    phase,
    pendingMedia,
    prefilledWordName,
    prefilledMediaName,
    playingAssetId,
    setPhase,
    setCapturedMedia,
    resetCapture,
    linkMediaToWord,
    startCreateWord,
    onWordCreated,
    launchPhotoPicker,
    playAssetByParent,
    stopPlayback,
  }), [
    phase, pendingMedia, prefilledWordName, prefilledMediaName, playingAssetId,
    setPhase, setCapturedMedia, resetCapture, linkMediaToWord, startCreateWord,
    onWordCreated, launchPhotoPicker, playAssetByParent, stopPlayback,
  ]);

  return (
    <MediaCaptureContext.Provider value={contextValue}>
      {children}
    </MediaCaptureContext.Provider>
  );
}
