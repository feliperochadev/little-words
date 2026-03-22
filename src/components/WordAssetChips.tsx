import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useAssetsByParent } from '../hooks/useAssets';
import { useAssetPreviewOverlays } from '../hooks/useAssetPreviewOverlays';
import { withOpacity } from '../utils/colorHelpers';
import { AssetPreviewOverlays } from './AssetPreviewOverlays';
import type { Asset } from '../types/asset';

const EMPTY_ASSETS: Asset[] = [];
const MAX_VISIBLE = 4;

interface Props {
  parentType?: 'word' | 'variant';
  parentId: number;
}


export function WordAssetChips({ parentType = 'word', parentId }: Readonly<Props>) {
  const { colors } = useTheme();
  const { data: assets = EMPTY_ASSETS } = useAssetsByParent(parentType, parentId);
  const { audioOverlay, photoOverlay, openAudioOverlay, openPhotoOverlay, closeAudioOverlay, closePhotoOverlay } = useAssetPreviewOverlays();

  if (assets.length === 0) return null;

  const visibleAssets = assets.slice(0, MAX_VISIBLE);
  const overflow = assets.length - MAX_VISIBLE;

  const handleAssetPress = (asset: Asset) => {
    if (asset.asset_type === 'audio') {
      openAudioOverlay(asset);
    } else if (asset.asset_type === 'photo') {
      openPhotoOverlay(asset);
    }
  };

  return (
    <>
      {visibleAssets.map(asset => (
        <TouchableOpacity
          key={asset.id}
          style={[s.chip, { backgroundColor: withOpacity(colors.primary, '10'), borderColor: withOpacity(colors.primary, '30') }]}
          onPress={() => handleAssetPress(asset)}
          testID={`word-asset-chip-${asset.id}`}
        >
          <Ionicons
            name={asset.asset_type === 'audio' ? 'mic' : 'image'}
            size={12}
            color={colors.primary}
          />
          <Text style={[s.chipLabel, { color: colors.primary }]} numberOfLines={1}>
            {asset.name ?? asset.filename}
          </Text>
        </TouchableOpacity>
      ))}

      {overflow > 0 && (
        <View style={[s.chip, { backgroundColor: withOpacity(colors.primary, '08'), borderColor: withOpacity(colors.primary, '25') }]} testID="word-asset-chips-overflow">
          <Text style={[s.chipLabel, { color: colors.textSecondary }]}>+{overflow}</Text>
        </View>
      )}

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
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: '700',
    maxWidth: 80,
  },
});
