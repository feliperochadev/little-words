import React, { useState } from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LanguagePicker } from '../../src/components/LanguagePicker';

function Controlled() {
  const [locale, setLocale] = useState('pt-BR');
  return <LanguagePicker locale={locale} onSelect={setLocale} testID="lang" />;
}

describe('LanguagePicker', () => {
  it('renders both language options', () => {
    const { getByTestId } = render(<Controlled />);
    expect(getByTestId('lang-pt-BR')).toBeTruthy();
    expect(getByTestId('lang-en-US')).toBeTruthy();
  });

  it('calls onSelect when a language is pressed', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <LanguagePicker locale="pt-BR" onSelect={onSelect} testID="lang" />
    );
    fireEvent.press(getByTestId('lang-en-US'));
    expect(onSelect).toHaveBeenCalledWith('en-US');
  });
});
