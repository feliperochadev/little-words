import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Modal, FlatList, Platform, StyleSheet, Alert,
  type NativeScrollEvent, type NativeSyntheticEvent,
} from 'react-native';
import { colors as THEME_COLORS } from '../theme';
import { daysInMonth } from '../utils/dateHelpers';
import { useI18n } from '../i18n/i18n';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

interface WheelColumnProps {
  data: { label: string; value: number }[];
  selectedValue: number;
  onValueChange: (value: number) => void;
  accentColor: string;
  width?: number;
}

function WheelColumn({ data, selectedValue, onValueChange, accentColor, width }: Readonly<WheelColumnProps>) {
  const flatListRef = useRef<FlatList>(null);
  const initialIndexRef = useRef(data.findIndex((item) => item.value === selectedValue));

  useEffect(() => {
    if (flatListRef.current && initialIndexRef.current >= 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({
          offset: initialIndexRef.current * ITEM_HEIGHT,
          animated: false,
        });
      }, 50);
    }
  }, []);

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, data.length - 1));
    if (data[clamped]) onValueChange(data[clamped].value);
  };

  return (
    <View style={[wheelStyles.column, width ? { width } : { flex: 1 }]}>
      <View
        style={[wheelStyles.highlight, { top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2), borderColor: accentColor }]}
        pointerEvents="none"
      />
      <FlatList
        ref={flatListRef}
        data={data}
        keyExtractor={(item) => String(item.value)}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={{
          paddingTop: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
          paddingBottom: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
        }}
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
        renderItem={({ item }) => {
          const isSelected = item.value === selectedValue;
          return (
            <View style={wheelStyles.item}>
              <Text style={[wheelStyles.itemText, isSelected && { color: accentColor, fontWeight: '800', fontSize: 18 }]}>
                {item.label}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const wheelStyles = StyleSheet.create({
  column: { height: PICKER_HEIGHT, overflow: 'hidden' },
  highlight: {
    position: 'absolute', left: 4, right: 4, height: ITEM_HEIGHT,
    borderRadius: 10, borderWidth: 2, backgroundColor: 'rgba(0,0,0,0.03)', zIndex: 1,
  },
  item: { height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' },
  itemText: { fontSize: 16, color: THEME_COLORS.textSecondary, fontWeight: '500' },
});

interface WheelDatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (date: Date) => void;
  accentColor: string;
  initialDate?: Date | null;
}

export function WheelDatePickerModal({ visible, onClose, onConfirm, accentColor, initialDate }: Readonly<WheelDatePickerModalProps>) {
  const { t, ta } = useI18n();
  const MONTHS: string[] = ta('datePicker.months');

  const currentYear = new Date().getFullYear();
  const MIN_YEAR = currentYear - 8;
  const MAX_YEAR = currentYear;

  const defaultDate = new Date();
  defaultDate.setFullYear(defaultDate.getFullYear() - 1);

  const [pickerDay, setPickerDay] = useState(defaultDate.getDate());
  const [pickerMonth, setPickerMonth] = useState(defaultDate.getMonth());
  const [pickerYear, setPickerYear] = useState(defaultDate.getFullYear());
  const [columnKey, setColumnKey] = useState(0);

  // Sync from initialDate whenever the modal opens
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!visible) return;
    const ref = initialDate ?? defaultDate;
    setPickerDay(ref.getDate());
    setPickerMonth(ref.getMonth());
    setPickerYear(ref.getFullYear());
    setColumnKey(k => k + 1);
  }, [visible]);

  const maxDay = daysInMonth(pickerMonth, pickerYear);
  const clampedDay = Math.min(pickerDay, maxDay);

  const dayData = Array.from({ length: maxDay }, (_, i) => ({ label: String(i + 1).padStart(2, '0'), value: i + 1 }));
  const monthData = MONTHS.map((label: string, i: number) => ({ label, value: i }));
  const yearData = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => {
    const y = MAX_YEAR - i;
    return { label: String(y), value: y };
  });

  const handleConfirm = () => {
    const finalDay = Math.min(clampedDay, daysInMonth(pickerMonth, pickerYear));
    const chosen = new Date(pickerYear, pickerMonth, finalDay);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (chosen > today) {
      Alert.alert(t('common.attention'), t('onboarding.errorFutureDate'));
      return;
    }
    onConfirm(chosen);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <View style={modalStyles.header}>
            <TouchableOpacity onPress={onClose} testID="wheel-date-cancel-btn">
              <Text style={[modalStyles.headerBtn, { color: THEME_COLORS.textSecondary }]}>
                {t('onboarding.datePicker.cancel')}
              </Text>
            </TouchableOpacity>
            <Text style={modalStyles.headerTitle} testID="wheel-date-title">{t('onboarding.datePicker.title')}</Text>
            <TouchableOpacity onPress={handleConfirm} testID="wheel-date-confirm-btn">
              <Text style={[modalStyles.headerBtn, { color: accentColor }]}>
                {t('onboarding.datePicker.confirm')}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={modalStyles.wheelsRow}>
            <WheelColumn key={`day-${columnKey}`} data={dayData} selectedValue={clampedDay} onValueChange={setPickerDay} accentColor={accentColor} width={70} />
            <WheelColumn key={`month-${columnKey}`} data={monthData} selectedValue={pickerMonth} onValueChange={setPickerMonth} accentColor={accentColor} />
            <WheelColumn key={`year-${columnKey}`} data={yearData} selectedValue={pickerYear} onValueChange={setPickerYear} accentColor={accentColor} width={80} />
          </View>
          <Text style={modalStyles.previewText}>
            {String(clampedDay).padStart(2, '0')} {MONTHS[pickerMonth]} {pickerYear}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: THEME_COLORS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24, paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: THEME_COLORS.border,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: THEME_COLORS.text },
  headerBtn: { fontSize: 15, fontWeight: '600' },
  wheelsRow: { flexDirection: 'row', marginTop: 8 },
  previewText: { textAlign: 'center', fontSize: 15, fontWeight: '600', color: THEME_COLORS.textSecondary, paddingVertical: 12 },
});
