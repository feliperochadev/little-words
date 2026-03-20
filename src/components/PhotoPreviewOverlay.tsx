import React from 'react';
import {
  View, Text, TouchableOpacity, Modal, Image, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDateDMY } from '../utils/dateHelpers';

interface Props {
  visible: boolean;
  uri: string;
  name: string;
  createdAt: string;
  onClose: () => void;
}

export function PhotoPreviewOverlay({ visible, uri, name, createdAt, onClose }: Readonly<Props>) {
  const insets = useSafeAreaInsets();
  const dateStr = formatDateDMY(createdAt.split(/[T ]/)[0]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID="photo-preview-modal"
    >
      {/* Full-screen dismiss target (lowest layer) */}
      <TouchableOpacity
        style={s.backdrop}
        activeOpacity={1}
        onPress={onClose}
        testID="photo-preview-dismiss"
      />

      {/* Image fills screen; pointerEvents="none" lets taps reach the dismiss behind it */}
      <View style={s.imageLayer} pointerEvents="none">
        <Image
          source={{ uri }}
          style={s.imageFill}
          resizeMode="contain"
          testID="photo-preview-image"
        />
      </View>

      {/* Top-left info bar — name + date — outside image area */}
      <View
        style={[s.infoBar, { paddingTop: insets.top + 16 }]}
        pointerEvents="none"
        testID="photo-preview-info"
      >
        <Text style={s.infoName} numberOfLines={2}>{name}</Text>
        <Text style={s.infoDate}>{dateStr}</Text>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.92)',
    zIndex: 0,
  },
  imageLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  imageFill: {
    width: '100%',
    height: '100%',
  },
  infoBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    paddingHorizontal: 20,
    paddingBottom: 16,
    zIndex: 2,
  },
  infoName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  infoDate: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
