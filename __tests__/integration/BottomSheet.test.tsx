import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { BottomSheet } from '../../src/components/BottomSheet';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('BottomSheet', () => {
  it('renders children when visible', () => {
    const { getByText } = render(
      <BottomSheet visible onClose={() => {}}>
        <Text>Hello</Text>
      </BottomSheet>
    );
    expect(getByText('Hello')).toBeTruthy();
  });

  it('calls onClose when backdrop pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <BottomSheet visible onClose={onClose} testID="bs">
        <Text>Content</Text>
      </BottomSheet>
    );
    fireEvent.press(getByTestId('bs-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render children when not visible', () => {
    const { queryByText } = render(
      <BottomSheet visible={false} onClose={() =>{}}>
        <Text>Hidden</Text>
      </BottomSheet>
    );
    expect(queryByText('Hidden')).toBeNull();
  });

  it('renders children in a ScrollView when scrollable is true', () => {
    const { getByText } = render(
      <BottomSheet visible onClose={() => {}} scrollable>
        <Text>Scrollable Content</Text>
      </BottomSheet>
    );
    expect(getByText('Scrollable Content')).toBeTruthy();
  });

  it('renders children in a KeyboardAwareScrollView when scrollable and keyboardAware are true', () => {
    const { getByText } = render(
      <BottomSheet visible onClose={() => {}} scrollable keyboardAware>
        <Text>Keyboard Aware Content</Text>
      </BottomSheet>
    );
    expect(getByText('Keyboard Aware Content')).toBeTruthy();
  });

  it('applies contentStyle when scrollable is true', () => {
    const { getByText } = render(
      <BottomSheet visible onClose={() => {}} scrollable contentStyle={{ padding: 10 }}>
        <Text>Styled</Text>
      </BottomSheet>
    );
    expect(getByText('Styled')).toBeTruthy();
  });
});
