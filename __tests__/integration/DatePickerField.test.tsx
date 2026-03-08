import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { I18nProvider } from '../../src/i18n/i18n';
import { DatePickerField } from '../../src/components/DatePickerField';

function renderWithProvider(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('DatePickerField', () => {
  it('renders the formatted date', async () => {
    const { findByText } = renderWithProvider(
      <DatePickerField value="2024-03-15" onChange={jest.fn()} />
    );
    expect(await findByText('15/03/2024')).toBeTruthy();
  });

  it('renders label when provided', async () => {
    const { findByText } = renderWithProvider(
      <DatePickerField value="2024-03-15" onChange={jest.fn()} label="Birth Date" />
    );
    expect(await findByText('Birth Date')).toBeTruthy();
  });

  it('opens picker modal on press', async () => {
    const { findByText } = renderWithProvider(
      <DatePickerField value="2024-03-15" onChange={jest.fn()} />
    );
    fireEvent.press(await findByText('15/03/2024'));
    expect(await findByText('Select Date')).toBeTruthy();
  });

  it('renders calendar emoji', async () => {
    const { findByText } = renderWithProvider(
      <DatePickerField value="2024-01-01" onChange={jest.fn()} />
    );
    expect(await findByText('📅')).toBeTruthy();
  });
});
