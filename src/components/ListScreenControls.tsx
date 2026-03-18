import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ColorTokens } from '../theme/types';
import { withOpacity } from '../utils/colorHelpers';
import { SearchBar } from './UIComponents';
import type { SortKey } from '../utils/sortHelpers';
import type { SortOption } from '../utils/sortOptions';

interface ListScreenControlsProps {
  colors: ColorTokens;
  title: string;
  titleIconName: React.ComponentProps<typeof Ionicons>['name'];
  titleIconColor: string;
  titleIconTestID: string;
  addButtonLabel: string;
  addButtonIcon?: React.ReactNode;
  addButtonTestID?: string;
  showAddButton?: boolean;
  onPressAdd: () => void;
  searchValue: string;
  onChangeSearch: (value: string) => void;
  searchPlaceholder: string;
  searchTestID: string;
  showSortMenu: boolean;
  onToggleSortMenu: () => void;
  sortButtonTestID: string;
  sortIconTestID: string;
  currentSortLabel: string;
  countLabel: string;
  sortOptions: SortOption[];
  selectedSort: SortKey;
  selectedSortColor: string;
  selectedSortBackgroundColor: string;
  onSelectSort: (sort: SortKey) => void;
}

export function ListScreenControls({
  colors,
  title,
  titleIconName,
  titleIconColor,
  titleIconTestID,
  addButtonLabel,
  addButtonIcon,
  addButtonTestID,
  showAddButton = true,
  onPressAdd,
  searchValue,
  onChangeSearch,
  searchPlaceholder,
  searchTestID,
  showSortMenu,
  onToggleSortMenu,
  sortButtonTestID,
  sortIconTestID,
  currentSortLabel,
  countLabel,
  sortOptions,
  selectedSort,
  selectedSortColor,
  selectedSortBackgroundColor,
  onSelectSort,
}: Readonly<ListScreenControlsProps>) {
  return (
    <>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name={titleIconName} size={22} color={titleIconColor} testID={titleIconTestID} />
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        </View>
        {showAddButton && (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
            onPress={onPressAdd}
            testID={addButtonTestID}
          >
            {addButtonIcon}
            <Text style={[styles.addBtnText, { color: colors.textOnPrimary }]}>{addButtonLabel}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.searchContainer}>
        <SearchBar value={searchValue} onChangeText={onChangeSearch} placeholder={searchPlaceholder} testID={searchTestID} />
      </View>

      <View style={styles.sortBar}>
        <TouchableOpacity
          style={[styles.sortBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={onToggleSortMenu}
          testID={sortButtonTestID}
        >
          <View style={styles.sortBtnContent}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={colors.textSecondary}
              style={styles.sortBtnIcon}
              testID={sortIconTestID}
            />
            <Text style={[styles.sortBtnText, { color: colors.text }]}>{currentSortLabel} ▾</Text>
          </View>
        </TouchableOpacity>
        <Text style={[styles.countText, { color: colors.textSecondary }]}>{countLabel}</Text>
      </View>

      {showSortMenu && (
        <View style={[styles.sortMenu, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.text }]}>
          {sortOptions.map(option => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.sortMenuItem,
                { borderBottomColor: colors.border },
                selectedSort === option.key && { backgroundColor: withOpacity(selectedSortBackgroundColor, '15') },
              ]}
              onPress={() => onSelectSort(option.key)}
              testID={`sort-option-${option.key}`}
            >
              <Text
                style={[
                  styles.sortMenuText,
                  { color: colors.text },
                  selectedSort === option.key && { color: selectedSortColor, fontWeight: '700' },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 26, fontWeight: '900' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addBtnText: { fontWeight: '700', fontSize: 15 },
  searchContainer: { paddingHorizontal: 20 },
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  sortBtn: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sortBtnContent: { flexDirection: 'row', alignItems: 'center' },
  sortBtnIcon: { marginRight: 6 },
  sortBtnText: { fontSize: 13, fontWeight: '600' },
  countText: { fontSize: 12 },
  sortMenu: {
    marginHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 6,
    overflow: 'hidden',
  },
  sortMenuItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  sortMenuText: { fontSize: 14 },
});
