/**
 * DatePickerField — shared wheel date picker, locale-aware via i18n.
 */
import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal,
  StyleSheet, FlatList, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { layout } from '../theme/layout';
import { useI18n } from '../i18n/i18n';
import { daysInMonth, parseDate, toStorage, toDisplay } from '../utils/dateHelpers';
import { TIMING } from '../utils/animationConstants';
import { useTheme } from '../hooks/useTheme';

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

function WheelColumn({ data, selected, onChange, accent, width, testID }: Readonly<WheelProps>) {
  const { colors } = useTheme();
  const ref = useRef<FlatList>(null);
  const idx = data.findIndex(i => i.value === selected);
  const momentumStarted = useRef(false);

  useEffect(() => {
    if (ref.current && idx >= 0) {
      setTimeout(() => ref.current?.scrollToOffset({ offset: idx * ITEM_H, animated: false }), TIMING.SCROLL_INITIAL_DELAY);
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
          }, TIMING.DRAG_SNAP_DELAY);
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
              <Text style={[wh.text, { color: colors.textSecondary }, sel && { color: accent, fontWeight: '800', fontSize: 17 }]}>
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
  highlight: { position: 'absolute', left: 4, right: 4, height: ITEM_H, borderRadius: layout.highlightBorderRadius, borderWidth: 2, backgroundColor: 'rgba(0,0,0,0.03)', zIndex: 1 },
  item:      { height: ITEM_H, justifyContent: 'center', alignItems: 'center' },
  text:      { fontSize: 15, fontWeight: '500' },
});

// ── DatePickerField ────────────────────────────────────────────────────────────
interface Props {
  value: string;          // YYYY-MM-DD
  onChange: (v: string) => void;
  accentColor?: string;
  label?: string;
}

export function DatePickerField({
  value, onChange, accentColor, label,
}: Readonly<Props>) {
  const { t, ta } = useI18n();
  const { colors } = useTheme();
  const resolvedAccentColor = accentColor ?? colors.primary;
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
      {label && <Text style={[f.label, { color: colors.textSecondary }]}>{label}</Text>}

      <TouchableOpacity style={[f.btn, { borderColor: resolvedAccentColor, backgroundColor: colors.surface }]} onPress={openPicker} testID="date-picker-btn">
        <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} style={f.icon} />
        <Text style={[f.val, { color: colors.text }]}>{toDisplay(value)}</Text>
        <Ionicons name="chevron-down" size={14} color={resolvedAccentColor} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide">
        <View style={f.overlay}>
          <View style={[f.sheet, { backgroundColor: colors.surface }]}>
            <View style={[f.header, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setOpen(false)} testID="date-picker-cancel">
                <Text style={[f.hBtn, { color: colors.textSecondary }]}>{t('datePicker.cancel')}</Text>
              </TouchableOpacity>
              <Text style={[f.hTitle, { color: colors.text }]}>{t('datePicker.title')}</Text>
              <TouchableOpacity onPress={confirm} testID="date-picker-confirm">
                <Text style={[f.hBtn, { color: resolvedAccentColor }]}>{t('datePicker.confirm')}</Text>
              </TouchableOpacity>
            </View>

            <View style={f.wheels}>
              <WheelColumn data={dayData}   selected={clampedD} onChange={setPd} accent={resolvedAccentColor} width={64}  testID="date-picker-day-wheel" />
              <WheelColumn data={monthData} selected={pm}       onChange={setPm} accent={resolvedAccentColor}              testID="date-picker-month-wheel" />
              <WheelColumn data={yearData}  selected={py}       onChange={setPy} accent={resolvedAccentColor} width={76}  testID="date-picker-year-wheel" />
            </View>

            <Text style={[f.preview, { color: colors.textSecondary }]} testID="date-picker-preview">
              {String(clampedD).padStart(2, '0')} {MONTHS[pm]} {py}
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const f = StyleSheet.create({
  label:   { fontSize: 13, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  btn:     { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1.5, marginBottom: 16 },
  icon:    { marginRight: 10 },
  val:     { flex: 1, fontSize: 16, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:   { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: Platform.OS === 'ios' ? 36 : 24, paddingHorizontal: 16 },
  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
  hTitle:  { fontSize: 16, fontWeight: '700' },
  hBtn:    { fontSize: 15, fontWeight: '600' },
  wheels:  { flexDirection: 'row', marginTop: 8 },
  preview: { textAlign: 'center', fontSize: 14, fontWeight: '600', paddingVertical: 12 },
});
