import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button, Card, SearchBar, CategoryBadge, EmptyState, StatCard } from '../../src/components/UIComponents';

describe('UIComponents', () => {
  describe('Button', () => {
    it('renders with title', () => {
      const { getByText } = render(<Button title="Save" onPress={() => {}} />);
      expect(getByText('Save')).toBeTruthy();
    });

    it('calls onPress when pressed', () => {
      const onPress = jest.fn();
      const { getByText } = render(<Button title="Save" onPress={onPress} />);
      fireEvent.press(getByText('Save'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('shows loading indicator when loading', () => {
      const { queryByText } = render(<Button title="Save" onPress={() => {}} loading />);
      expect(queryByText('Save')).toBeNull();
    });

    it('is disabled when disabled prop is true', () => {
      const onPress = jest.fn();
      const { getByText } = render(<Button title="Save" onPress={onPress} disabled />);
      fireEvent.press(getByText('Save'));
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
  });

  describe('Card', () => {
    it('renders children', () => {
      const { getByText } = render(
        <Card><Button title="Inside" onPress={() => {}} /></Card>
      );
      expect(getByText('Inside')).toBeTruthy();
    });

    it('is pressable when onPress is provided', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <Card onPress={onPress}><Button title="Pressable" onPress={() => {}} /></Card>
      );
      expect(getByText('Pressable')).toBeTruthy();
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

    it('calls onChangeText when text changes', () => {
      const onChangeText = jest.fn();
      const { getByPlaceholderText } = render(
        <SearchBar value="" onChangeText={onChangeText} placeholder="Search..." />
      );
      fireEvent.changeText(getByPlaceholderText('Search...'), 'hello');
      expect(onChangeText).toHaveBeenCalledWith('hello');
    });

    it('shows clear button when value is not empty', () => {
      const onChangeText = jest.fn();
      const { getByText } = render(
        <SearchBar value="test" onChangeText={onChangeText} />
      );
      fireEvent.press(getByText('✕'));
      expect(onChangeText).toHaveBeenCalledWith('');
    });

    it('hides clear button when value is empty', () => {
      const { queryByText } = render(
        <SearchBar value="" onChangeText={() => {}} />
      );
      expect(queryByText('✕')).toBeNull();
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

    it('renders action button when provided', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <EmptyState emoji="📝" title="No words" action={{ label: 'Add Word', onPress }} />
      );
      expect(getByText('Add Word')).toBeTruthy();
      fireEvent.press(getByText('Add Word'));
      expect(onPress).toHaveBeenCalled();
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
  });
});
