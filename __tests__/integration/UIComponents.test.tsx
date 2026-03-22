import React from 'react';
import { render, userEvent } from '@testing-library/react-native';
import { Button, Card, SearchBar, CategoryBadge, EmptyState, StatCard } from '../../src/components/UIComponents';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { getThemeForSex } from '../../src/theme/getThemeForSex';

function flattenStyle(style: unknown): Record<string, unknown> {
  return Array.isArray(style) ? Object.assign({}, ...style) : (style as Record<string, unknown> ?? {});
}

describe('UIComponents', () => {
  beforeEach(() => {
    useSettingsStore.setState({ name: 'Luna', sex: 'girl', birth: '', isOnboardingDone: true, isHydrated: true });
  });

  describe('Button', () => {
    it('renders with title', () => {
      const { getByText } = render(<Button title="Save" onPress={() => {}} />);
      expect(getByText('Save')).toBeTruthy();
    });

    it('calls onPress when pressed', async () => {
      const onPress = jest.fn();
      const { getByTestId } = render(<Button title="Save" onPress={onPress} testID="save-button" />);
      await userEvent.press(getByTestId('save-button'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('shows loading indicator when loading', () => {
      const { queryByText } = render(<Button title="Save" onPress={() => {}} loading />);
      expect(queryByText('Save')).toBeNull();
    });

    it('is disabled when disabled prop is true', async () => {
      const onPress = jest.fn();
      const { getByTestId } = render(<Button title="Save" onPress={onPress} disabled testID="save-button" />);
      await userEvent.press(getByTestId('save-button'));
      expect(onPress).not.toHaveBeenCalled();
    });

    it('renders with outline variant', () => {
      const { getByText } = render(<Button title="Cancel" onPress={() => {}} variant="outline" />);
      expect(getByText('Cancel')).toBeTruthy();
    });

    it('renders with danger variant', () => {
      const { getByText } = render(<Button title="Delete" onPress={() => {}} variant="danger" />);
      expect(getByText('Delete')).toBeTruthy();
    });

    it('renders with secondary variant', () => {
      const { getByText } = render(<Button title="Other" onPress={() => {}} variant="secondary" />);
      expect(getByText('Other')).toBeTruthy();
    });

    it('uses breeze primary colors for boy profile', () => {
      useSettingsStore.setState({ name: 'Leo', sex: 'boy', birth: '', isOnboardingDone: true, isHydrated: true });
      const { getByTestId } = render(<Button title="Save" onPress={() => {}} testID="btn-boy-primary" />);
      const style = flattenStyle(getByTestId('btn-boy-primary').props.style);
      expect(style.backgroundColor).toBe(getThemeForSex('boy').colors.primary);
    });

    it('uses breeze primary border for outline variant in boy profile', () => {
      useSettingsStore.setState({ name: 'Leo', sex: 'boy', birth: '', isOnboardingDone: true, isHydrated: true });
      const { getByTestId } = render(<Button title="Cancel" onPress={() => {}} variant="outline" testID="btn-boy-outline" />);
      const style = flattenStyle(getByTestId('btn-boy-outline').props.style);
      expect(style.borderColor).toBe(getThemeForSex('boy').colors.primary);
    });
  });

  describe('Card', () => {
    it('renders children', () => {
      const { getByText } = render(
        <Card><Button title="Inside" onPress={() => {}} /></Card>
      );
      expect(getByText('Inside')).toBeTruthy();
    });

    it('is pressable when onPress is provided', async () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <Card onPress={onPress} testID="pressable-card"><Button title="Pressable" onPress={() => {}} /></Card>
      );
      await userEvent.press(getByTestId('pressable-card'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('renders as View when no onPress', () => {
      const { getByText } = render(
        <Card><Button title="Static" onPress={() => {}} /></Card>
      );
      expect(getByText('Static')).toBeTruthy();
    });
  });

  describe('SearchBar', () => {
    it('renders with placeholder', () => {
      const { getByPlaceholderText } = render(
        <SearchBar value="" onChangeText={() => {}} placeholder="Search..." />
      );
      expect(getByPlaceholderText('Search...')).toBeTruthy();
    });

    it('calls onChangeText when text changes', async () => {
      const onChangeText = jest.fn();
      function SearchBarHarness() {
        const [value, setValue] = React.useState('');
        return (
          <SearchBar
            value={value}
            onChangeText={(text) => {
              setValue(text);
              onChangeText(text);
            }}
            placeholder="Search..."
          />
        );
      }
      const { getByPlaceholderText } = render(
        <SearchBarHarness />
      );
      await userEvent.type(getByPlaceholderText('Search...'), 'hello');
      expect(onChangeText).toHaveBeenLastCalledWith('hello');
    });

    it('shows clear button when value is not empty', async () => {
      const onChangeText = jest.fn();
      const { getByTestId } = render(
        <SearchBar value="test" onChangeText={onChangeText} testID="search" />
      );
      await userEvent.press(getByTestId('search-clear'));
      expect(onChangeText).toHaveBeenCalledWith('');
    });

    it('hides clear button when value is empty', () => {
      const { queryByTestId } = render(
        <SearchBar value="" onChangeText={() => {}} testID="search" />
      );
      expect(queryByTestId('search-clear')).toBeNull();
    });

    it('uses default placeholder when none provided', () => {
      const { getByPlaceholderText } = render(
        <SearchBar value="" onChangeText={() => {}} />
      );
      expect(getByPlaceholderText('Buscar palavras...')).toBeTruthy();
    });
  });

  describe('CategoryBadge', () => {
    it('renders name and emoji', () => {
      const { getByText } = render(
        <CategoryBadge name="Animals" color="#FF6B9D" emoji="🐾" />
      );
      expect(getByText('Animals')).toBeTruthy();
      expect(getByText('🐾')).toBeTruthy();
    });

    it('renders in small size', () => {
      const { getByText } = render(
        <CategoryBadge name="Food" color="#FF9F43" emoji="🍎" size="small" />
      );
      expect(getByText('Food')).toBeTruthy();
    });
  });

  describe('EmptyState', () => {
    it('renders emoji, title, and subtitle', () => {
      const { getByText } = render(
        <EmptyState emoji="📝" title="No words" subtitle="Add your first word" />
      );
      expect(getByText('📝')).toBeTruthy();
      expect(getByText('No words')).toBeTruthy();
      expect(getByText('Add your first word')).toBeTruthy();
    });

    it('renders without subtitle', () => {
      const { getByText, queryByText } = render(
        <EmptyState emoji="📝" title="No words" />
      );
      expect(getByText('No words')).toBeTruthy();
      expect(queryByText('Add your first word')).toBeNull();
    });

    it('renders action button when provided', async () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <EmptyState emoji="📝" title="No words" action={{ label: 'Add Word', onPress }} />
      );
      expect(getByText('Add Word')).toBeTruthy();
      await userEvent.press(getByText('Add Word'));
      expect(onPress).toHaveBeenCalled();
    });

    it('renders icon node when icon prop is provided', () => {
      const { getByText } = render(
        <EmptyState icon={<React.Fragment><EmptyState emoji="📝" title="icon-inner" /></React.Fragment>} title="Outer title" />
      );
      expect(getByText('Outer title')).toBeTruthy();
    });

    it('does not render emoji Text when icon prop is provided', () => {
      const { queryByText } = render(
        <EmptyState icon={<React.Fragment />} emoji="📝" title="Title" />
      );
      expect(queryByText('📝')).toBeNull();
    });
  });

  describe('StatCard', () => {
    it('renders emoji, value, and label', () => {
      const { getByText } = render(
        <StatCard emoji="📝" value={42} label="Total words" color="#D2694B" />
      );
      expect(getByText('📝')).toBeTruthy();
      expect(getByText('42')).toBeTruthy();
      expect(getByText('Total words')).toBeTruthy();
    });

    it('handles string value', () => {
      const { getByText } = render(
        <StatCard emoji="📊" value="N/A" label="Count" color="#000" />
      );
      expect(getByText('N/A')).toBeTruthy();
    });

    it('forwards testID to value Text', () => {
      const { getByTestId } = render(
        <StatCard emoji="📝" value={7} label="Words" color="#D2694B" testID="stat-total-words" />
      );
      const valueEl = getByTestId('stat-total-words');
      expect(valueEl.props.children).toBe(7);
    });

    it('renders icon prop instead of emoji when provided', () => {
      const { getByText, queryByText } = render(
        <StatCard icon={<React.Fragment />} emoji="📝" value={5} label="Words" color="#D2694B" />
      );
      expect(getByText('5')).toBeTruthy();
      expect(queryByText('📝')).toBeNull();
    });

    it('renders emoji when icon prop is not provided', () => {
      const { getByText } = render(
        <StatCard emoji="🎯" value={3} label="Goals" color="#D2694B" />
      );
      expect(getByText('🎯')).toBeTruthy();
    });

    it('renders label and value in compact horizontal layout', () => {
      const { getByText, getByTestId } = render(
        <StatCard emoji="📝" value={42} label="Total words" color="#D2694B" testID="stat-compact" />
      );
      expect(getByText('Total words')).toBeTruthy();
      expect(getByTestId('stat-compact').props.children).toBe(42);
    });
  });
});
