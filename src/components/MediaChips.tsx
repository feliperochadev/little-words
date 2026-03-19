import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Alert, Modal, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../i18n/i18n';
import { useAssetsByParent, useRemoveAsset } from '../hooks/useAssets';
import { useMediaCapture } from '../hooks/useMediaCapture';
import { getAssetFileUri } from '../utils/assetStorage';
import { withOpacity } from '../utils/colorHelpers';
import type { Asset, ParentType } from '../types/asset';
import type { PendingMedia } from '../providers/MediaCaptureProvider';

const EMPTY_ASSETS: Asset[] = [];

type Props = {
  parentType: ParentType;
  parentId: number;
  enabled?: boolean;
  pendingMedia?: PendingMedia | null;
  onRemovePending?: () => void;
};

export function MediaChips({ parentType, parentId, enabled = true, pendingMedia, onRemovePending }: Readonly<Props>) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { playAssetByParent, playingAssetId, stopPlayback } = useMediaCapture();
  const removeAssetMutation = useRemoveAsset();
  const { data: assets = EMPTY_ASSETS } = useAssetsByParent(parentType, parentId, enabled && parentId > 0);

  const [viewerUri, setViewerUri] = useState<string | null>(null);

  const handleRemoveAsset = (asset: Asset) => {
    Alert.alert(
      t('mediaCapture.removeAsset'),
      t('mediaCapture.removeAssetMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: () => { void removeAssetMutation.mutateAsync(asset); },
        },
      ],
    );
  };

  const handleChipPress = (asset: Asset) => {
    if (asset.asset_type === 'audio') {
      void playAssetByParent(parentType, parentId);
    } else if (asset.asset_type === 'photo') {
      const uri = getAssetFileUri(parentType, parentId, 'photo', asset.filename);
      setViewerUri(uri);
    }
  };

  const totalItems = assets.length + (pendingMedia ? 1 : 0);
  if (totalItems === 0) return null;

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.container} testID="media-chips">
        {/* Pending media chip (not yet saved) */}
        {pendingMedia && (
          <View style={[s.chip, { backgroundColor: withOpacity(colors.primary, '15'), borderColor: withOpacity(colors.primary, '40') }]} testID="media-chip-pending">
            <Ionicons
              name={pendingMedia.type === 'audio' ? 'mic' : 'image'}
              size={14}
              color={colors.primary}
            />
            <Text style={[s.chipLabel, { color: colors.primary }]} numberOfLines={1}>
              {pendingMedia.type === 'audio' ? t('mediaCapture.recording') : t('mediaCapture.photo')}
            </Text>
            {onRemovePending && (
              <TouchableOpacity onPress={onRemovePending} testID="media-chip-remove-pending" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Saved asset chips */}
        {assets.map(asset => {
          const isAudioPlaying = asset.asset_type === 'audio' && playingAssetId === asset.id;
          return (
            <View
              key={asset.id}
              style={[s.chip, { backgroundColor: withOpacity(colors.primary, '10'), borderColor: withOpacity(colors.primary, '30') }]}
              testID={`media-chip-${asset.id}`}
            >
              <TouchableOpacity onPress={() => handleChipPress(asset)} style={s.chipContent} testID={`media-chip-play-${asset.id}`}>
                <Ionicons
                  name={asset.asset_type === 'audio' ? (isAudioPlaying ? 'stop-circle' : 'volume-high') : 'image'}
                  size={14}
                  color={colors.primary}
                />
                <Text style={[s.chipLabel, { color: colors.text }]} numberOfLines={1}>
                  {asset.asset_type === 'audio' ? t('mediaCapture.recording') : t('mediaCapture.photo')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleRemoveAsset(asset)} testID={`media-chip-remove-${asset.id}`} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      {/* Full-screen photo viewer */}
      <Modal
        visible={!!viewerUri}
        transparent
        animationType="fade"
        onRequestClose={() => { void stopPlayback(); setViewerUri(null); }}
        testID="media-photo-viewer"
      >
        <View style={s.viewerBackdrop}>
          <TouchableOpacity
            style={s.viewerClose}
            onPress={() => setViewerUri(null)}
            testID="media-photo-viewer-close"
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {viewerUri && (
            <Image source={{ uri: viewerUri }} style={s.viewerImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  container: { marginBottom: 12, maxHeight: 42 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    marginRight: 8,
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipLabel: { fontSize: 12, fontWeight: '600', maxWidth: 100 },
  viewerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  viewerClose: { position: 'absolute', top: 56, right: 20, padding: 8, zIndex: 10 },
  viewerImage: { width: '90%', height: '60%' },
});
