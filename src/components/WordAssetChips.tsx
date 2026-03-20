import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useAssetsByParent } from '../hooks/useAssets';
import { getAssetFileUri } from '../utils/assetStorage';
import { withOpacity } from '../utils/colorHelpers';
import { AudioPreviewOverlay } from './AudioPreviewOverlay';
import { PhotoPreviewOverlay } from './PhotoPreviewOverlay';
import type { Asset, AudioOverlayState, PhotoOverlayState } from '../types/asset';

const EMPTY_ASSETS: Asset[] = [];
const MAX_VISIBLE = 4;

interface Props {
  wordId: number;
}


export function WordAssetChips({ wordId }: Readonly<Props>) {
  const { colors } = useTheme();
  const { data: assets = EMPTY_ASSETS } = useAssetsByParent('word', wordId);

  const [audioOverlay, setAudioOverlay] = useState<AudioOverlayState | null>(null);
  const [photoOverlay, setPhotoOverlay] = useState<PhotoOverlayState | null>(null);

  if (assets.length === 0) return null;

  const visibleAssets = assets.slice(0, MAX_VISIBLE);
  const overflow = assets.length - MAX_VISIBLE;

  const handleAssetPress = (asset: Asset) => {
    if (asset.asset_type === 'audio') {
      const uri = getAssetFileUri('word', wordId, 'audio', asset.filename);
      setAudioOverlay({ uri, name: asset.name ?? asset.filename, createdAt: asset.created_at, durationMs: asset.duration_ms });
    } else if (asset.asset_type === 'photo') {
      const uri = getAssetFileUri('word', wordId, 'photo', asset.filename);
      setPhotoOverlay({ uri, name: asset.name ?? asset.filename, createdAt: asset.created_at });
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
