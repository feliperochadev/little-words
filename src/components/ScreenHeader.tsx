import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface ScreenHeaderAction {
  label: string;
  onPress: () => void;
  testID?: string;
}

interface ScreenHeaderProps {
  title: string;
  action?: ScreenHeaderAction;
  testID?: string;
}

export function ScreenHeader({ title, action, testID }: Readonly<ScreenHeaderProps>) {
  return (
    <View style={styles.header} testID={testID}>
      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      {action ? (
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={action.onPress}
          testID={action.testID}
          accessibilityRole="button"
          activeOpacity={0.8}
        >
          <Text style={styles.actionText}>{action.label}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing['5'],
    paddingTop: theme.spacing['2'],
    paddingBottom: theme.spacing['2'],
  },
  title: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.black,
    color: theme.colors.text,
  },
  actionBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: theme.shape.xl,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 48,
    justifyContent: 'center',
  },
  actionText: {
    color: theme.colors.textOnPrimary,
    fontWeight: theme.typography.fontWeight.bold,
    fontSize: theme.typography.fontSize.md,
  },
});
