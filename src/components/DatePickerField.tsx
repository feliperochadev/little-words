/**
 * DatePickerField — shared wheel date picker, locale-aware via i18n.
 */
import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal,
  StyleSheet, FlatList, Platform,
} from 'react-native';
import { COLORS } from '../utils/theme';
import { useI18n } from '../i18n/i18n';
import { daysInMonth, parseDate, toStorage, toDisplay } from '../utils/dateHelpers';

// ── constants ──────────────────────────────────────────────────────────────────
const ITEM_H = 44;
const VISIBLE = 5;
const WHEEL_H = ITEM_H * VISIBLE;
const PAD = ITEM_H * Math.floor(VISIBLE / 2);

// ── WheelColumn ───────────────────────────────────────────────────────────────
interface WheelProps {
  data: { label: string; value: number }[];
  selected: number;
  onChange: (v: number) => void;
  accent: string;
  width?: number;
  testID?: string;
}

function WheelColumn({ data, selected, onChange, accent, width, testID }: WheelProps) {
  const ref = useRef<FlatList>(null);
  const idx = data.findIndex(i => i.value === selected);
  const momentumStarted = useRef(false);

  useEffect(() => {
    if (ref.current && idx >= 0) {
      setTimeout(() => ref.current?.scrollToOffset({ offset: idx * ITEM_H, animated: false }), 60);
    }
  }, [selected, idx]);

  const snapAndNotify = (offsetY: number) => {
    const i = Math.round(offsetY / ITEM_H);
    const c = Math.max(0, Math.min(i, data.length - 1));
    if (data[c]) onChange(data[c].value);
  };

  return (
    <View style={[wh.col, width ? { width } : { flex: 1 }]} testID={testID}>
      <View style={[wh.highlight, { top: ITEM_H * Math.floor(VISIBLE / 2), borderColor: accent }]} pointerEvents="none" />
      <FlatList
        ref={ref}
        data={data}
        keyExtractor={i => String(i.value)}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: PAD }}
        getItemLayout={(_, index) => ({ length: ITEM_H, offset: ITEM_H * index, index })}
        onMomentumScrollBegin={() => { momentumStarted.current = true; }}
        onMomentumScrollEnd={e => {
          momentumStarted.current = false;
          snapAndNotify(e.nativeEvent.contentOffset.y);
        }}
        onScrollEndDrag={e => {
          // Fire onChange when drag ends without generating momentum (e.g. Maestro swipe gestures)
          const offsetY = e.nativeEvent.contentOffset.y;
          momentumStarted.current = false;
          setTimeout(() => {
            if (!momentumStarted.current) snapAndNotify(offsetY);
          }, 80);
        }}
        renderItem={({ item, index }) => {
          const sel = item.value === selected;
          return (
            <TouchableOpacity
              style={wh.item}
              activeOpacity={0.7}
              testID={testID ? `${testID}-item-${item.value}` : undefined}
              onPress={() => {
                onChange(item.value);
                ref.current?.scrollToOffset({ offset: index * ITEM_H, animated: true });
              }}
            >
              <Text style={[wh.text, sel && { color: accent, fontWeight: '800', fontSize: 17 }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const wh = StyleSheet.create({
  col:       { height: WHEEL_H, overflow: 'hidden' },
  highlight: { position: 'absolute', left: 4, right: 4, height: ITEM_H, borderRadius: 10, borderWidth: 2, backgroundColor: 'rgba(0,0,0,0.03)', zIndex: 1 },
  item:      { height: ITEM_H, justifyContent: 'center', alignItems: 'center' },
  text:      { fontSize: 15, color: COLORS.textSecondary, fontWeight: '500' },
});

// ── DatePickerField ────────────────────────────────────────────────────────────
interface Props {
  value: string;          // YYYY-MM-DD
  onChange: (v: string) => void;
  accentColor?: string;
  label?: string;
}

export const DatePickerField: React.FC<Props> = ({
  value, onChange, accentColor = COLORS.primary, label,
}) => {
  const { t, ta } = useI18n();
  // Pull locale-aware month names from catalogue
  const MONTHS: string[] = ta('datePicker.months');

  const [open, setOpen] = useState(false);
  const parsed = parseDate(value);
  const [pd, setPd] = useState(parsed.d);
  const [pm, setPm] = useState(parsed.m);
  const [py, setPy] = useState(parsed.y);

  const openPicker = () => {
    const p = parseDate(value);
    setPd(p.d); setPm(p.m); setPy(p.y);
    setOpen(true);
  };

  const confirm = () => {
    const max = daysInMonth(pm, py);
    onChange(toStorage(Math.min(pd, max), pm, py));
    setOpen(false);
  };

  const curYear  = new Date().getFullYear();
  const maxD     = daysInMonth(pm, py);
  const clampedD = Math.min(pd, maxD);

  const dayData   = Array.from({ length: maxD }, (_, i) => ({ label: String(i + 1).padStart(2, '0'), value: i + 1 }));
  const monthData = MONTHS.map((l: string, i: number) => ({ label: l, value: i }));
  const yearData  = Array.from({ length: 9 }, (_, i) => { const y = curYear - i; return { label: String(y), value: y }; });

  return (
    <>
      {label && <Text style={f.label}>{label}</Text>}

      <TouchableOpacity style={[f.btn, { borderColor: accentColor }]} onPress={openPicker} testID="date-picker-btn">
        <Text style={f.icon}>📅</Text>
        <Text style={f.val}>{toDisplay(value)}</Text>
        <Text style={[f.arrow, { color: accentColor }]}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide">
        <View style={f.overlay}>
          <View style={f.sheet}>
            <View style={f.header}>
              <TouchableOpacity onPress={() => setOpen(false)} testID="date-picker-cancel">
                <Text style={[f.hBtn, { color: COLORS.textSecondary }]}>{t('datePicker.cancel')}</Text>
              </TouchableOpacity>
              <Text style={f.hTitle}>{t('datePicker.title')}</Text>
              <TouchableOpacity onPress={confirm} testID="date-picker-confirm">
                <Text style={[f.hBtn, { color: accentColor }]}>{t('datePicker.confirm')}</Text>
              </TouchableOpacity>
            </View>

            <View style={f.wheels}>
              <WheelColumn data={dayData}   selected={clampedD} onChange={setPd} accent={accentColor} width={64}  testID="date-picker-day-wheel" />
              <WheelColumn data={monthData} selected={pm}       onChange={setPm} accent={accentColor}              testID="date-picker-month-wheel" />
              <WheelColumn data={yearData}  selected={py}       onChange={setPy} accent={accentColor} width={76}  testID="date-picker-year-wheel" />
            </View>

            <Text style={f.preview} testID="date-picker-preview">
              {String(clampedD).padStart(2, '0')} {MONTHS[pm]} {py}
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
};

const f = StyleSheet.create({
  label:   { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  btn:     { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1.5, marginBottom: 16 },
  icon:    { fontSize: 18, marginRight: 10 },
  val:     { flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.text },
  arrow:   { fontSize: 14 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:   { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: Platform.OS === 'ios' ? 36 : 24, paddingHorizontal: 16 },
  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  hTitle:  { fontSize: 16, fontWeight: '700', color: COLORS.text },
  hBtn:    { fontSize: 15, fontWeight: '600' },
  wheels:  { flexDirection: 'row', marginTop: 8 },
  preview: { textAlign: 'center', fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, paddingVertical: 12 },
});