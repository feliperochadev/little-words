/**
 * DatePickerField — shared wheel date picker, same feel as onboarding.
 * Usage: <DatePickerField label="Data" value="2024-03-29" onChange={v => setDate(v)} accentColor="#FF6B9D" />
 * value and onChange both use YYYY-MM-DD strings.
 */
import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal,
  StyleSheet, FlatList, Platform,
} from 'react-native';
import { COLORS } from '../utils/theme';

// ── constants ──────────────────────────────────────────────────────────────────
const ITEM_H = 44;
const VISIBLE = 5;
const WHEEL_H = ITEM_H * VISIBLE;
const PAD = ITEM_H * Math.floor(VISIBLE / 2);

const MONTHS_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

// ── helpers ───────────────────────────────────────────────────────────────────
function daysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate();
}

function parseDate(s: string): { d: number; m: number; y: number } {
  const [y, m, d] = s.split('-').map(Number);
  return { y: isNaN(y) ? new Date().getFullYear() : y,
           m: isNaN(m) ? new Date().getMonth() : m - 1,
           d: isNaN(d) ? new Date().getDate() : d };
}

function toStorage(d: number, m: number, y: number) {
  return `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

function toDisplay(s: string) {
  const { d, m, y } = parseDate(s);
  return `${String(d).padStart(2,'0')}/${String(m + 1).padStart(2,'0')}/${y}`;
}

// ── WheelColumn ───────────────────────────────────────────────────────────────
interface WheelProps {
  data: { label: string; value: number }[];
  selected: number;
  onChange: (v: number) => void;
  accent: string;
  width?: number;
}

function WheelColumn({ data, selected, onChange, accent, width }: WheelProps) {
  const ref = useRef<FlatList>(null);
  const idx = data.findIndex(i => i.value === selected);

  useEffect(() => {
    if (ref.current && idx >= 0) {
      setTimeout(() => ref.current?.scrollToOffset({ offset: idx * ITEM_H, animated: false }), 60);
    }
  }, [selected]);

  return (
    <View style={[wh.col, width ? { width } : { flex: 1 }]}>
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
        onMomentumScrollEnd={e => {
          const i = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
          const c = Math.max(0, Math.min(i, data.length - 1));
          if (data[c]) onChange(data[c].value);
        }}
        renderItem={({ item }) => {
          const sel = item.value === selected;
          return (
            <View style={wh.item}>
              <Text style={[wh.text, sel && { color: accent, fontWeight: '800', fontSize: 17 }]}>
                {item.label}
              </Text>
            </View>
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

  const dayData   = Array.from({ length: maxD }, (_, i) => ({ label: String(i+1).padStart(2,'0'), value: i+1 }));
  const monthData = MONTHS_PT.map((l, i) => ({ label: l, value: i }));
  const yearData  = Array.from({ length: 9 }, (_, i) => { const y = curYear - i; return { label: String(y), value: y }; });

  return (
    <>
      {label && <Text style={f.label}>{label}</Text>}

      <TouchableOpacity style={[f.btn, { borderColor: accentColor }]} onPress={openPicker}>
        <Text style={f.icon}>📅</Text>
        <Text style={f.val}>{toDisplay(value)}</Text>
        <Text style={[f.arrow, { color: accentColor }]}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide">
        <View style={f.overlay}>
          <View style={f.sheet}>
            {/* header */}
            <View style={f.header}>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Text style={[f.hBtn, { color: COLORS.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={f.hTitle}>Selecionar Data</Text>
              <TouchableOpacity onPress={confirm}>
                <Text style={[f.hBtn, { color: accentColor }]}>Confirmar</Text>
              </TouchableOpacity>
            </View>

            {/* wheels */}
            <View style={f.wheels}>
              <WheelColumn data={dayData}   selected={clampedD} onChange={setPd} accent={accentColor} width={64} />
              <WheelColumn data={monthData} selected={pm}       onChange={setPm} accent={accentColor} />
              <WheelColumn data={yearData}  selected={py}       onChange={setPy} accent={accentColor} width={76} />
            </View>

            <Text style={f.preview}>
              {String(clampedD).padStart(2,'0')} de {MONTHS_PT[pm]} de {py}
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
