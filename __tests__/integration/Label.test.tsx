import React from 'react';
import { render } from '@testing-library/react-native';
import { Label } from '../../src/components/Label';

describe('Label', () => {
  it('renders children', () => {
    const { getByText } = render(<Label>Name</Label>);
    expect(getByText('Name')).toBeTruthy();
  });

  it('renders small variant', () => {
    const { getByText } = render(<Label size="sm">Small</Label>);
    expect(getByText('Small')).toBeTruthy();
  });
});
