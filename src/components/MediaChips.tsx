import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../i18n/i18n';
import { useAssetsByParent, useRemoveAsset } from '../hooks/useAssets';
import { useAssetPreviewOverlays } from '../hooks/useAssetPreviewOverlays';
import { withOpacity } from '../utils/colorHelpers';
import { AssetPreviewOverlays } from './AssetPreviewOverlays';
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

// ── Internal chip row for separateRows layout ────────────────────────────────

interface ChipRowProps {
  assetType: 'audio' | 'photo';
  assets: Asset[];
  pendingMedia?: PendingMedia | null;
  onRemovePending?: () => void;
  onChipPress: (asset: Asset) => void;
  onRemoveAsset: (asset: Asset) => void;
  pendingLabel: string;
  scrollTestID: string;
}

function AssetChipRow({
  assetType, assets, pendingMedia, onRemovePending, onChipPress, onRemoveAsset, pendingLabel, scrollTestID,
}: Readonly<ChipRowProps>) {
  const { colors } = useTheme();
  const isPending = pendingMedia?.type === assetType;
  const icon: 'mic' | 'image' = assetType === 'audio' ? 'mic' : 'image';

  if (assets.length === 0 && !isPending) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.rowScroll} testID={scrollTestID}>
      {isPending && (
        <View style={[s.chip, s.chipPending, { borderColor: withOpacity(colors.primary, '50') }]} testID="media-chip-pending">
          <Ionicons name={icon} size={14} color={colors.primary} />
          <Text style={[s.chipLabel, { color: colors.primary }]} numberOfLines={1}>{pendingLabel}</Text>
          {onRemovePending && (
            <TouchableOpacity onPress={onRemovePending} testID="media-chip-remove-pending" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      )}
      {assets.map(asset => (
        <View
          key={asset.id}
          style={[s.chip, { backgroundColor: withOpacity(colors.primary, '10'), borderColor: withOpacity(colors.primary, '30') }]}
          testID={`media-chip-${asset.id}`}
        >
          <TouchableOpacity onPress={() => onChipPress(asset)} style={s.chipContent} testID={`media-chip-play-${asset.id}`}>
            <Ionicons name={icon} size={14} color={colors.primary} />
            <Text style={[s.chipLabel, { color: colors.text }]} numberOfLines={1}>
              {asset.name ?? asset.filename}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onRemoveAsset(asset)} testID={`media-chip-remove-${asset.id}`} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function MediaChips({
  parentType, parentId, enabled = true, pendingMedia, onRemovePending, separateRows = false,
}: Readonly<Props>) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const removeAssetMutation = useRemoveAsset();
  const { data: assets = EMPTY_ASSETS } = useAssetsByParent(parentType, parentId, enabled && parentId > 0);
  const { audioOverlay, photoOverlay, openAudioOverlay, openPhotoOverlay, closeAudioOverlay, closePhotoOverlay } = useAssetPreviewOverlays();

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

  const totalItems = assets.length + (pendingMedia ? 1 : 0);
  if (totalItems === 0) return null;

  const visibleAssets = assets.slice(0, MAX_VISIBLE);
  const overflow = assets.length - MAX_VISIBLE;

  const mediaRows = separateRows ? (
    <>
      <AssetChipRow
        assetType="audio"
        assets={audioAssets}
        pendingMedia={pendingMedia}
        onRemovePending={onRemovePending}
        onChipPress={openAudioOverlay}
        onRemoveAsset={handleRemoveAsset}
        pendingLabel={t('mediaCapture.recording')}
        scrollTestID="media-chips-audio"
      />
      <AssetChipRow
        assetType="photo"
        assets={photoAssets}
        pendingMedia={pendingMedia}
        onRemovePending={onRemovePending}
        onChipPress={openPhotoOverlay}
        onRemoveAsset={handleRemoveAsset}
        pendingLabel={t('mediaCapture.photo')}
        scrollTestID="media-chips-photos"
      />
    </>
  ) : (
    // ── Single-row layout (default) ────────────────────────────────────────
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
                openAudioOverlay(asset);
              } else if (asset.asset_type === 'photo') {
                openPhotoOverlay(asset);
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
  );

  return (
    <>
      {mediaRows}
      <AssetPreviewOverlays
        audioOverlay={audioOverlay}
        photoOverlay={photoOverlay}
        onCloseAudio={closeAudioOverlay}
        onClosePhoto={closePhotoOverlay}
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
