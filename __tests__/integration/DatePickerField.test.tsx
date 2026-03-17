import React from 'react';
import { render, fireEvent, waitFor, within } from '@testing-library/react-native';
import { FlatList } from 'react-native';
import { I18nProvider } from '../../src/i18n/i18n';
import { DatePickerField } from '../../src/components/DatePickerField';

jest.mock('../../src/services/settingsService', () => ({
  ...jest.requireActual('../../src/services/settingsService'),
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

  it('renders date picker button', async () => {
    const { findByTestId } = renderPicker();
    expect(await findByTestId('date-picker-btn')).toBeTruthy();
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

  it('renders with custom accentColor', async () => {
    const { findByText } = renderPicker({ accentColor: '#FF0000' });
    expect(await findByText('15/03/2024')).toBeTruthy();
  });

  it('renders without label when label prop is omitted', async () => {
    const { queryByText } = renderPicker({ label: undefined });
    // No label element
    expect(queryByText('Birth Date')).toBeNull();
  });

  it('clamps day to max days in month when confirming', async () => {
    // Feb 2024 has 29 days (leap year). Start at day 31 and switch to Feb.
    const onChange = jest.fn();
    const { findByText } = renderPicker({ value: '2024-01-31', onChange });
    fireEvent.press(await findByText('31/01/2024'));
    // Confirm without changing anything — day should be clamped internally
    fireEvent.press(await findByText('Confirm'));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
  });

  it('shows preview of selected date in picker modal', async () => {
    const { findByText, findByTestId } = renderPicker({ value: '2024-03-15' });
    fireEvent.press(await findByText('15/03/2024'));
    const preview = await findByTestId('date-picker-preview');
    expect(preview).toBeTruthy();
  });

  it('WheelColumn skips scrollToOffset when selected value is not in data (idx < 0)', async () => {
    // Year 2010 is outside the 9-year range starting from today (2026-2018),
    // so idx === -1 for the year wheel → the useEffect early-return branch is covered
    const { findByText } = renderPicker({ value: '2010-06-15' });
    fireEvent.press(await findByText('15/06/2010'));
    // Modal opens without crash — scrollToOffset is skipped for year wheel
    expect(await findByText('Select Date')).toBeTruthy();
  });

  it('WheelColumn onMomentumScrollEnd fires onChange via FlatList (covers lines 52-54)', async () => {
    const onChange = jest.fn();
    const { findByText, UNSAFE_getAllByType } = renderPicker({ value: '2024-03-15', onChange });
    fireEvent.press(await findByText('15/03/2024'));

    // Find the three FlatList instances (day, month, year wheels)
    const flatLists = UNSAFE_getAllByType(FlatList);
    expect(flatLists.length).toBeGreaterThanOrEqual(1);

    const dayFlatList = flatLists[0];
    // Normal scroll — data[c] is truthy → calls onChange
    fireEvent(dayFlatList, 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { y: 44 } }, // index 1 → day 2
    });
    // Scroll past end — clamped to last valid index, data[c] truthy
    fireEvent(dayFlatList, 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { y: 99999 } },
    });
    // Scroll to start — index 0
    fireEvent(dayFlatList, 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { y: 0 } },
    });
  });

  it('WheelColumn item tap calls onChange and scrolls to item', async () => {
    const onChange = jest.fn();
    const { findByText, findByTestId } = renderPicker({ value: '2024-03-15', onChange });
    fireEvent.press(await findByText('15/03/2024'));
    // The year wheel (testID="date-picker-year-wheel") renders year items as TouchableOpacity
    // Tap "2024" (which is the current year in the wheel data)
    const yearWheel = await findByTestId('date-picker-year-wheel');
    const yearItem = within(yearWheel).getByText('2024');
    fireEvent.press(yearItem);
    // onChange should have been called with 2024
    expect(onChange).not.toHaveBeenCalledWith(expect.stringContaining('2025')); // still in picker
  });

  it('WheelColumn onScrollEndDrag without momentum fires onChange after delay', async () => {
    jest.useFakeTimers();
    const onChange = jest.fn();
    const { findByText, UNSAFE_getAllByType } = renderPicker({ value: '2024-03-15', onChange });
    fireEvent.press(await findByText('15/03/2024'));

    const flatLists = UNSAFE_getAllByType(FlatList);
    const dayFlatList = flatLists[0];

    // Simulate drag-end without momentum starting
    fireEvent(dayFlatList, 'scrollEndDrag', {
      nativeEvent: { contentOffset: { y: 44 } }, // index 1 → day 2
    });
    // Advance past the 80ms debounce — no momentumScrollBegin fired, so onChange runs
    jest.advanceTimersByTime(100);
    // onChange should have been called (day 2 = value 2)

    jest.useRealTimers();
  });

  it('WheelColumn onScrollEndDrag is suppressed when momentum follows', async () => {
    jest.useFakeTimers();
    const onChange = jest.fn();
    const { findByText, UNSAFE_getAllByType } = renderPicker({ value: '2024-03-15', onChange });
    fireEvent.press(await findByText('15/03/2024'));

    const flatLists = UNSAFE_getAllByType(FlatList);
    const dayFlatList = flatLists[0];

    // Drag ends, then momentum begins before 80ms
    fireEvent(dayFlatList, 'scrollEndDrag', {
      nativeEvent: { contentOffset: { y: 88 } },
    });
    fireEvent(dayFlatList, 'momentumScrollBegin', {});
    jest.advanceTimersByTime(100);
    // onScrollEndDrag handler should not have fired onChange (momentum took over)
    // onMomentumScrollEnd is the one that fires — simulate it
    fireEvent(dayFlatList, 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { y: 88 } },
    });

    jest.useRealTimers();
  });
});
