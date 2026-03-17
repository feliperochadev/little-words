import React from 'react';
import { TouchableOpacity, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '../theme';
import { withOpacity } from '../utils/colorHelpers';

interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  variant?: 'default' | 'danger' | 'ghost';
  size?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel: string;
  disabled?: boolean;
}

export function IconButton({
  icon, onPress, variant = 'default', size = 48, style, testID, accessibilityLabel, disabled,
}: Readonly<IconButtonProps>) {
  const bgColor = variant === 'danger'
    ? withOpacity(theme.colors.error, '15')
    : variant === 'ghost'
      ? 'transparent'
      : 'transparent';

  return (
    <TouchableOpacity
      style={[
        styles.base,
        { width: Math.max(size, 48), height: Math.max(size, 48), backgroundColor: bgColor },
        disabled && { opacity: 0.5 },
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      {icon}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.shape.full,
  },
});
