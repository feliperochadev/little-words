import React from 'react';
import { Text, StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { theme } from '../theme';

interface LabelProps {
  children: React.ReactNode;
  size?: 'sm' | 'md';
  style?: StyleProp<TextStyle>;
}

export function Label({ children, size = 'md', style }: Readonly<LabelProps>) {
  return (
    <Text style={[styles.base, size === 'sm' ? styles.sm : styles.md, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textSecondary,
    letterSpacing: theme.typography.letterSpacing.wide,
    textTransform: 'uppercase',
    marginBottom: theme.spacing['2'],
  },
  sm: { fontSize: theme.typography.fontSize.xs },
  md: { fontSize: theme.typography.fontSize.sm },
});
