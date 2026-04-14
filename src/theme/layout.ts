export const layout = {
  textAreaHeight: 80,
  highlightBorderRadius: 10,
  statIconSize: 44,
  statIconRadius: 22,
  emptyStateVerticalPadding: 60,
} as const;

/**
 * Standard layout constants for list screens (Words, Variants, Media).
 * All list screens with SearchBar + FlatList must use these values for consistency.
 */
export const LIST_SCREEN_LAYOUT = {
  /** Horizontal padding for list content and search bar container */
  paddingHorizontal: 20,
  /** Gap below the search bar before list content */
  searchBarGap: 12,
} as const;
