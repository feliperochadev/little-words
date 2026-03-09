import React from 'react';
import { render } from '@testing-library/react-native';
import LoadingScreen from '../../app/loading';

describe('LoadingScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<LoadingScreen />);
    expect(toJSON()).toBeTruthy();
  });
});
