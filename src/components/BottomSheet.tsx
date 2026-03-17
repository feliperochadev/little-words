import React from 'react';
import {
  Modal, View, TouchableOpacity, StyleSheet, ScrollView,
  type StyleProp, type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  testID?: string;
  contentStyle?: StyleProp<ViewStyle>;
  scrollable?: boolean;
}

export function BottomSheet({
  visible, onClose, children, testID, contentStyle, scrollable,
}: Readonly<BottomSheetProps>) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      testID={testID}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
        testID={testID ? `${testID}-backdrop` : undefined}
      />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + theme.spacing['6'] }]}>
        <View style={styles.handle} />
        {scrollable ? (
          <ScrollView
            contentContainerStyle={[styles.content, contentStyle]}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, contentStyle]}>
            {children}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.colors.backdrop,
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.shape['2xl'],
    borderTopRightRadius: theme.shape['2xl'],
    paddingTop: theme.spacing['2'],
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: theme.shape.full,
    alignSelf: 'center',
    marginBottom: theme.spacing['4'],
  },
  content: {
    paddingHorizontal: theme.spacing['6'],
    paddingTop: theme.spacing['2'],
  },
});
