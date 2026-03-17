import React, { useState } from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Input } from '../../src/components/Input';

function Controlled() {
  const [value, setValue] = useState('');
  return <Input value={value} onChangeText={setValue} placeholder="Type here" testID="input" />;
}

describe('Input', () => {
  it('renders with placeholder', () => {
    const { getByPlaceholderText } = render(<Controlled />);
    expect(getByPlaceholderText('Type here')).toBeTruthy();
  });

  it('updates on change', () => {
    const { getByTestId } = render(<Controlled />);
    fireEvent.changeText(getByTestId('input'), 'hello');
    expect(getByTestId('input').props.value).toBe('hello');
  });

  it('renders label when provided', () => {
    const { getByText } = render(
      <Input value="" onChangeText={() => {}} label="Name" />
    );
    expect(getByText('Name')).toBeTruthy();
  });

  it('renders error message when provided', () => {
    const { getByText } = render(
      <Input value="" onChangeText={() => {}} error="Required" />
    );
    expect(getByText('Required')).toBeTruthy();
  });
});
