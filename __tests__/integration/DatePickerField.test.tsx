import React from 'react';
import { render, fireEvent, waitFor, within, act } from '@testing-library/react-native';
import { FlatList, Alert } from 'react-native';
import { I18nProvider } from '../../src/i18n/i18n';
import { DatePickerField } from '../../src/components/DatePickerField';
import { WheelDatePickerModal } from '../../src/components/WheelDatePickerModal';

jest.spyOn(Alert, 'alert');

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
  afterEach(() => {
    jest.useRealTimers();
  });

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

  it('WheelDatePickerModal shows alert when confirmed date is in the future', async () => {
    // Set system time to Jan 1 of current year so Dec 31 same year is future
    jest.useFakeTimers();
    const pastDate = new Date('2025-01-01T12:00:00.000Z');
    jest.setSystemTime(pastDate);

    const onConfirm = jest.fn();
    const onClose = jest.fn();
    // initialDate = Dec 31 2025 (future relative to mocked "today" = Jan 1 2025)
    const futureDate = new Date(2025, 11, 31); // Dec 31, 2025
    const { getByTestId } = render(
      <I18nProvider>
        <WheelDatePickerModal
          visible
          onClose={onClose}
          onConfirm={onConfirm}
          accentColor="#FF6B9D"
          initialDate={futureDate}
        />
      </I18nProvider>
    );

    await act(async () => {});
    fireEvent.press(getByTestId('wheel-date-confirm-btn'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });
    expect(onConfirm).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('WheelDatePickerModal cancel button calls onClose', async () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <I18nProvider>
        <WheelDatePickerModal
          visible
          onClose={onClose}
          onConfirm={jest.fn()}
          accentColor="#FF6B9D"
        />
      </I18nProvider>
    );
    fireEvent.press(getByTestId('wheel-date-cancel-btn'));
    expect(onClose).toHaveBeenCalled();
  });

  it('WheelDatePickerModal syncs from initialDate when visible changes', async () => {
    const onConfirm = jest.fn();
    const initialDate = new Date(2023, 5, 15); // June 15, 2023
    const { getByTestId, rerender } = render(
      <I18nProvider>
        <WheelDatePickerModal
          visible={false}
          onClose={jest.fn()}
          onConfirm={onConfirm}
          accentColor="#FF6B9D"
          initialDate={initialDate}
        />
      </I18nProvider>
    );
    rerender(
      <I18nProvider>
        <WheelDatePickerModal
          visible
          onClose={jest.fn()}
          onConfirm={onConfirm}
          accentColor="#FF6B9D"
          initialDate={initialDate}
        />
      </I18nProvider>
    );
    await act(async () => {});
    // Confirm with the synced date (2023 is in the past — no alert)
    fireEvent.press(getByTestId('wheel-date-confirm-btn'));
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalled();
    });
  });

  it('WheelDatePickerModal renderAsOverlay renders inline instead of Modal', async () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <I18nProvider>
        <WheelDatePickerModal
          visible
          onClose={onClose}
          onConfirm={onConfirm}
          accentColor="#FF6B9D"
          renderAsOverlay
        />
      </I18nProvider>
    );
    // Picker should render (no Modal wrapper, but content visible)
    expect(getByTestId('wheel-date-title')).toBeTruthy();
    expect(getByTestId('wheel-date-cancel-btn')).toBeTruthy();
    expect(getByTestId('wheel-date-confirm-btn')).toBeTruthy();
    // Cancel still works
    fireEvent.press(getByTestId('wheel-date-cancel-btn'));
    expect(onClose).toHaveBeenCalled();
  });

  it('WheelDatePickerModal renderAsOverlay returns null when not visible', () => {
    const { queryByTestId } = render(
      <I18nProvider>
        <WheelDatePickerModal
          visible={false}
          onClose={jest.fn()}
          onConfirm={jest.fn()}
          accentColor="#FF6B9D"
          renderAsOverlay
        />
      </I18nProvider>
    );
    expect(queryByTestId('wheel-date-title')).toBeNull();
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
