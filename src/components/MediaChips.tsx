import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../i18n/i18n';
import { useAssetsByParent, useRemoveAsset } from '../hooks/useAssets';
import { getAssetFileUri } from '../utils/assetStorage';
import { withOpacity } from '../utils/colorHelpers';
import { AudioPreviewOverlay } from './AudioPreviewOverlay';
import { PhotoPreviewOverlay } from './PhotoPreviewOverlay';
import type { Asset, ParentType } from '../types/asset';
import type { PendingMedia } from '../providers/MediaCaptureProvider';

const EMPTY_ASSETS: Asset[] = [];
const MAX_VISIBLE = 4;

type Props = {
  parentType: ParentType;
  parentId: number;
  enabled?: boolean;
  pendingMedia?: PendingMedia | null;
  onRemovePending?: () => void;
  /** When true, renders audio chips on one row and photo thumbnails on a second row */
  separateRows?: boolean;
};

interface AudioOverlayState {
  uri: string;
  name: string;
  createdAt: string;
  durationMs?: number | null;
}

interface PhotoOverlayState {
  uri: string;
  name: string;
  createdAt: string;
}

export function MediaChips({
  parentType, parentId, enabled = true, pendingMedia, onRemovePending, separateRows = false,
}: Readonly<Props>) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const removeAssetMutation = useRemoveAsset();
  const { data: assets = EMPTY_ASSETS } = useAssetsByParent(parentType, parentId, enabled && parentId > 0);

  const [audioOverlay, setAudioOverlay] = useState<AudioOverlayState | null>(null);
  const [photoOverlay, setPhotoOverlay] = useState<PhotoOverlayState | null>(null);

  const audioAssets = assets.filter(a => a.asset_type === 'audio');
  const photoAssets = assets.filter(a => a.asset_type === 'photo');

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

  const handleAudioChipPress = (asset: Asset) => {
    const uri = getAssetFileUri(asset.parent_type, asset.parent_id, 'audio', asset.filename);
    setAudioOverlay({ uri, name: asset.name ?? asset.filename, createdAt: asset.created_at, durationMs: asset.duration_ms });
  };

  const handlePhotoChipPress = (asset: Asset) => {
    const uri = getAssetFileUri(asset.parent_type, asset.parent_id, 'photo', asset.filename);
    setPhotoOverlay({ uri, name: asset.name ?? asset.filename, createdAt: asset.created_at });
  };

  const totalItems = assets.length + (pendingMedia ? 1 : 0);
  if (totalItems === 0) return null;

  if (separateRows) {
    return (
      <>
        {/* ── Audio row ── */}
        {(audioAssets.length > 0 || (pendingMedia?.type === 'audio')) && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.rowScroll}
            testID="media-chips-audio"
          >
            {pendingMedia?.type === 'audio' && (
              <View
                style={[s.chip, s.chipPending, { borderColor: withOpacity(colors.primary, '50') }]}
                testID="media-chip-pending"
              >
                <Ionicons name="mic" size={14} color={colors.primary} />
                <Text style={[s.chipLabel, { color: colors.primary }]} numberOfLines={1}>
                  {t('mediaCapture.recording')}
                </Text>
                {onRemovePending && (
                  <TouchableOpacity onPress={onRemovePending} testID="media-chip-remove-pending" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            )}
            {audioAssets.map(asset => (
              <View
                key={asset.id}
                style={[s.chip, { backgroundColor: withOpacity(colors.primary, '10'), borderColor: withOpacity(colors.primary, '30') }]}
                testID={`media-chip-${asset.id}`}
              >
                <TouchableOpacity onPress={() => handleAudioChipPress(asset)} style={s.chipContent} testID={`media-chip-play-${asset.id}`}>
                  <Ionicons name="mic" size={14} color={colors.primary} />
                  <Text style={[s.chipLabel, { color: colors.text }]} numberOfLines={1}>
                    {asset.name ?? asset.filename}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleRemoveAsset(asset)} testID={`media-chip-remove-${asset.id}`} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        {/* ── Photo row ── */}
        {(photoAssets.length > 0 || (pendingMedia?.type === 'photo')) && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.rowScroll}
            testID="media-chips-photos"
          >
            {pendingMedia?.type === 'photo' && (
              <View
                style={[s.chip, s.chipPending, { borderColor: withOpacity(colors.primary, '50') }]}
                testID="media-chip-pending"
              >
                <Ionicons name="image" size={14} color={colors.primary} />
                <Text style={[s.chipLabel, { color: colors.primary }]} numberOfLines={1}>
                  {t('mediaCapture.photo')}
                </Text>
                {onRemovePending && (
                  <TouchableOpacity onPress={onRemovePending} testID="media-chip-remove-pending" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            )}
            {photoAssets.map(asset => (
              <View
                key={asset.id}
                style={[s.chip, { backgroundColor: withOpacity(colors.primary, '10'), borderColor: withOpacity(colors.primary, '30') }]}
                testID={`media-chip-${asset.id}`}
              >
                <TouchableOpacity onPress={() => handlePhotoChipPress(asset)} style={s.chipContent} testID={`media-chip-play-${asset.id}`}>
                  <Ionicons name="image" size={14} color={colors.primary} />
                  <Text style={[s.chipLabel, { color: colors.text }]} numberOfLines={1}>
                    {asset.name ?? asset.filename}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleRemoveAsset(asset)} testID={`media-chip-remove-${asset.id}`} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        <AudioPreviewOverlay
          visible={!!audioOverlay}
          uri={audioOverlay?.uri ?? ''}
          name={audioOverlay?.name ?? ''}
          createdAt={audioOverlay?.createdAt ?? ''}
          durationMs={audioOverlay?.durationMs}
          onClose={() => setAudioOverlay(null)}
        />
        <PhotoPreviewOverlay
          visible={!!photoOverlay}
          uri={photoOverlay?.uri ?? ''}
          name={photoOverlay?.name ?? ''}
          createdAt={photoOverlay?.createdAt ?? ''}
          onClose={() => setPhotoOverlay(null)}
        />
      </>
    );
  }

  // ── Single-row layout (default) ──────────────────────────────────────────

  const allAssets = assets;
  const visibleAssets = allAssets.slice(0, MAX_VISIBLE);
  const overflow = allAssets.length - MAX_VISIBLE;

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.container} testID="media-chips">
        {/* Pending media chip */}
        {pendingMedia && (
          <View style={[s.chip, s.chipPending, { borderColor: withOpacity(colors.primary, '50') }]} testID="media-chip-pending">
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
        {visibleAssets.map(asset => (
          <View
            key={asset.id}
            style={[s.chip, { backgroundColor: withOpacity(colors.primary, '10'), borderColor: withOpacity(colors.primary, '30') }]}
            testID={`media-chip-${asset.id}`}
          >
            <TouchableOpacity
              onPress={() => {
                if (asset.asset_type === 'audio') {
                  handleAudioChipPress(asset);
                } else if (asset.asset_type === 'photo') {
                  handlePhotoChipPress(asset);
                }
              }}
              style={s.chipContent}
              testID={`media-chip-play-${asset.id}`}
            >
              <Ionicons
                name={asset.asset_type === 'audio' ? 'mic' : 'image'}
                size={14}
                color={colors.primary}
              />
              <Text style={[s.chipLabel, { color: colors.text }]} numberOfLines={1}>
                {asset.name ?? asset.filename}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleRemoveAsset(asset)} testID={`media-chip-remove-${asset.id}`} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        ))}

        {overflow > 0 && (
          <View style={[s.chip, { backgroundColor: withOpacity(colors.primary, '08'), borderColor: withOpacity(colors.primary, '25') }]} testID="media-chips-overflow">
            <Text style={[s.chipLabel, { color: colors.textSecondary }]}>+{overflow}</Text>
          </View>
        )}
      </ScrollView>

      <AudioPreviewOverlay
        visible={!!audioOverlay}
        uri={audioOverlay?.uri ?? ''}
        name={audioOverlay?.name ?? ''}
        createdAt={audioOverlay?.createdAt ?? ''}
        durationMs={audioOverlay?.durationMs}
        onClose={() => setAudioOverlay(null)}
      />
      <PhotoPreviewOverlay
        visible={!!photoOverlay}
        uri={photoOverlay?.uri ?? ''}
        name={photoOverlay?.name ?? ''}
        createdAt={photoOverlay?.createdAt ?? ''}
        onClose={() => setPhotoOverlay(null)}
      />
    </>
  );
}

const s = StyleSheet.create({
  container: { marginBottom: 12, maxHeight: 42 },
  rowScroll: { marginBottom: 8, maxHeight: 42 },
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
  chipPending: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipLabel: { fontSize: 12, fontWeight: '600', maxWidth: 100 },
});
