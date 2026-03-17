import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { IconButton } from '../../src/components/IconButton';

describe('IconButton', () => {
  it('renders and fires onPress', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <IconButton
        icon={<Text>X</Text>}
        onPress={onPress}
        accessibilityLabel="Close"
        testID="icon-btn"
      />
    );
    fireEvent.press(getByTestId('icon-btn'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled=true', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <IconButton
        icon={<Text>X</Text>}
        onPress={onPress}
        accessibilityLabel="Close"
        testID="icon-btn"
        disabled
      />
    );
    fireEvent.press(getByTestId('icon-btn'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('enforces minimum 48dp touch target', () => {
    const { getByTestId } = render(
      <IconButton
        icon={<Text>X</Text>}
        onPress={() => {}}
        accessibilityLabel="Close"
        testID="icon-btn"
        size={24}
      />
    );
    const btn = getByTestId('icon-btn');
    const style = btn.props.style;
    const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style;
    expect(flatStyle.width).toBeGreaterThanOrEqual(48);
    expect(flatStyle.height).toBeGreaterThanOrEqual(48);
  });
});
