import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ScreenHeader } from '../../src/components/ScreenHeader';

describe('ScreenHeader', () => {
  it('renders title', () => {
    const { getByText } = render(<ScreenHeader title="Words" />);
    expect(getByText('Words')).toBeTruthy();
  });

  it('renders action button when provided', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <ScreenHeader title="Words" action={{ label: '+ Add', onPress, testID: 'add-btn' }} />
    );
    fireEvent.press(getByTestId('add-btn'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not render action button when not provided', () => {
    const { queryByRole } = render(<ScreenHeader title="Words" />);
    expect(queryByRole('button')).toBeNull();
  });
});
