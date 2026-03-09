import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { I18nProvider } from '../../src/i18n/i18n';
import { DatePickerField } from '../../src/components/DatePickerField';

jest.mock('../../src/database/database', () => ({
  ...jest.requireActual('../../src/database/database'),
  getSetting: jest.fn().mockResolvedValue(null),
  setSetting: jest.fn().mockResolvedValue(undefined),
}));

function renderPicker(props: Partial<React.ComponentProps<typeof DatePickerField>> = {}) {
  return render(
    <I18nProvider>
      <DatePickerField value="2024-03-15" onChange={jest.fn()} {...props} />
    </I18nProvider>
  );
}

describe('DatePickerField', () => {
  it('renders the formatted date', async () => {
    const { findByText } = renderPicker();
    expect(await findByText('15/03/2024')).toBeTruthy();
  });

  it('renders label when provided', async () => {
    const { findByText } = renderPicker({ label: 'Birth Date' });
    expect(await findByText('Birth Date')).toBeTruthy();
  });

  it('opens picker modal on press', async () => {
    const { findByText } = renderPicker();
    fireEvent.press(await findByText('15/03/2024'));
    expect(await findByText('Select Date')).toBeTruthy();
  });

  it('renders calendar emoji', async () => {
    const { findByText } = renderPicker();
    expect(await findByText('📅')).toBeTruthy();
  });

  it('confirms date selection', async () => {
    const onChange = jest.fn();
    const { findByText } = renderPicker({ onChange });
    // Open picker
    fireEvent.press(await findByText('15/03/2024'));
    // Press confirm
    fireEvent.press(await findByText('Confirm'));
    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    });
  });

  it('cancels date picker', async () => {
    const onChange = jest.fn();
    const { findByText } = renderPicker({ onChange });
    // Open picker
    fireEvent.press(await findByText('15/03/2024'));
    expect(await findByText('Select Date')).toBeTruthy();
    // Press cancel
    fireEvent.press(await findByText('Cancel'));
    // onChange should not have been called
    expect(onChange).not.toHaveBeenCalled();
  });
});
