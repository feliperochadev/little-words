import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useMediaCapture } from '../hooks/useMediaCapture';
import type { ParentType } from '../types/asset';

type Props = {
  parentType: ParentType;
  parentId: number;
};

export function AudioPlayerInline({ parentType, parentId }: Readonly<Props>) {
  const { colors } = useTheme();
  const { playAssetByParent } = useMediaCapture();

  // We can't know the exact asset ID without a query, so we toggle by parent.
  // The provider handles fetching the first audio asset on demand.
  const handlePress = () => {
    void playAssetByParent(parentType, parentId);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={s.container}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      testID={`audio-play-${parentType}-${parentId}`}
    >
      <Ionicons name="volume-high" size={14} color={colors.primary} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: {
    padding: 2,
  },
});
