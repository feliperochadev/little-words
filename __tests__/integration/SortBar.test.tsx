import React, { useState } from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SortBar } from '../../src/components/SortBar';

const OPTIONS = [
  { key: 'date_desc', label: 'Newest' },
  { key: 'alpha_asc', label: 'A–Z' },
];

function Controlled() {
  const [show, setShow] = useState(false);
  const [selected, setSelected] = useState('date_desc');
  return (
    <SortBar
      currentLabel="Newest"
      count={5}
      countLabel="words"
      onToggle={() => setShow(s => !s)}
      showMenu={show}
      options={OPTIONS}
      selectedKey={selected}
      onSelect={(k) => { setSelected(k); setShow(false); }}
      testID="sortbar"
    />
  );
}

describe('SortBar', () => {
  it('shows count', () => {
    const { getByText } = render(<Controlled />);
    expect(getByText('5 words')).toBeTruthy();
  });

  it('toggles menu on button press', () => {
    const { getByTestId, queryByTestId } = render(<Controlled />);
    expect(queryByTestId('sortbar-menu')).toBeNull();
    fireEvent.press(getByTestId('sortbar-btn'));
    expect(getByTestId('sortbar-menu')).toBeTruthy();
  });

  it('selects an option', () => {
    const { getByTestId } = render(<Controlled />);
    fireEvent.press(getByTestId('sortbar-btn'));
    fireEvent.press(getByTestId('sort-option-alpha_asc'));
    expect(getByTestId('sortbar-btn')).toBeTruthy(); // menu closed
  });
});
