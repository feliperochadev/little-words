import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { withOpacity } from '../utils/colorHelpers';

interface SortOption {
  key: string;
  label: string;
}

interface SortBarProps {
  currentLabel: string;
  count: number;
  countLabel: string;
  onToggle: () => void;
  showMenu: boolean;
  options: SortOption[];
  selectedKey: string;
  onSelect: (key: string) => void;
  testID?: string;
}

export function SortBar({
  currentLabel, count, countLabel, onToggle, showMenu, options, selectedKey, onSelect, testID,
}: Readonly<SortBarProps>) {
  return (
    <>
      <View style={styles.bar} testID={testID}>
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={onToggle}
          testID={testID ? `${testID}-btn` : undefined}
          accessibilityRole="button"
          accessibilityLabel={currentLabel}
        >
          <Text style={styles.sortBtnText}>{currentLabel} ▾</Text>
        </TouchableOpacity>
        <Text style={styles.countText}>{count} {countLabel}</Text>
      </View>

      {showMenu ? (
        <View style={styles.sortMenu} testID={testID ? `${testID}-menu` : undefined}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.sortMenuItem, selectedKey === opt.key && styles.sortMenuItemActive]}
              onPress={() => onSelect(opt.key)}
              testID={`sort-option-${opt.key}`}
              accessibilityRole="menuitem"
            >
              <Text style={[styles.sortMenuText, selectedKey === opt.key && styles.sortMenuTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing['5'],
    paddingVertical: theme.spacing['2'],
  },
  sortBtn: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 36,
    justifyContent: 'center',
  },
  sortBtnText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
  },
  countText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  sortMenu: {
    marginHorizontal: theme.spacing['5'],
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: theme.spacing['2'],
    overflow: 'hidden',
  },
  sortMenuItem: {
    paddingHorizontal: theme.spacing['4'],
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sortMenuItemActive: {
    backgroundColor: withOpacity(theme.colors.primary, '10'),
  },
  sortMenuText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text,
  },
  sortMenuTextActive: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.bold,
  },
});
