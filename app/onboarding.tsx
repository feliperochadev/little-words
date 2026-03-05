import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, Platform, Modal,
  FlatList, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setSetting } from '../src/database/database';
import { COLORS } from '../src/utils/theme';

/* ───────── constants ───────── */
const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const currentYear = new Date().getFullYear();
const MIN_YEAR = currentYear - 8;
const MAX_YEAR = currentYear;

/* ───────── helpers ───────── */
function formatDisplayDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function toStorageDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${y}-${m}-${d}`;
}

function daysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/* ─────────────────────────────────────────────
   WheelColumn – a single scrollable wheel column
   ───────────────────────────────────────────── */
interface WheelColumnProps {
  data: { label: string; value: number }[];
  selectedValue: number;
  onValueChange: (value: number) => void;
  accentColor: string;
  width?: number;
}

function WheelColumn({ data, selectedValue, onValueChange, accentColor, width }: WheelColumnProps) {
  const flatListRef = useRef<FlatList>(null);
  const selectedIndex = data.findIndex((item) => item.value === selectedValue);

  useEffect(() => {
    if (flatListRef.current && selectedIndex >= 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({
          offset: selectedIndex * ITEM_HEIGHT,
          animated: false,
        });
      }, 50);
    }
  }, []);

  const handleMomentumEnd = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, data.length - 1));
    if (data[clamped]) {
      onValueChange(data[clamped].value);
    }
  };

  return (
    <View style={[wheelStyles.column, width ? { width } : { flex: 1 }]}>
      {/* Highlight bar */}
      <View
        style={[
          wheelStyles.highlight,
          { top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2), borderColor: accentColor },
        ]}
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
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        renderItem={({ item }) => {
          const isSelected = item.value === selectedValue;
          return (
            <View style={wheelStyles.item}>
              <Text
                style={[
                  wheelStyles.itemText,
                  isSelected && { color: accentColor, fontWeight: '800', fontSize: 18 },
                ]}
              >
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
    position: 'absolute',
    left: 4,
    right: 4,
    height: ITEM_HEIGHT,
    borderRadius: 10,
    borderWidth: 2,
    backgroundColor: 'rgba(0,0,0,0.03)',
    zIndex: 1,
  },
  item: { height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' },
  itemText: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '500' },
});

/* ─────────────────────────────────────────────
   Main Onboarding Screen
   ───────────────────────────────────────────── */
export default function OnboardingScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [sex, setSex] = useState<'boy' | 'girl' | null>(null);
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // Temp picker state
  const defaultDate = new Date();
  defaultDate.setFullYear(defaultDate.getFullYear() - 1);

  const [pickerDay, setPickerDay] = useState(birthDate?.getDate() ?? defaultDate.getDate());
  const [pickerMonth, setPickerMonth] = useState(birthDate?.getMonth() ?? defaultDate.getMonth());
  const [pickerYear, setPickerYear] = useState(birthDate?.getFullYear() ?? defaultDate.getFullYear());

  const isBoy = sex === 'boy';
  const isGirl = sex === 'girl';
  const accentColor = isGirl ? '#FF6B9D' : isBoy ? '#74B9FF' : COLORS.primary;
  const allFilled = !!name.trim() && !!sex && !!birthDate;

  // Clamp day when month/year changes
  const maxDay = daysInMonth(pickerMonth, pickerYear);
  const clampedDay = Math.min(pickerDay, maxDay);

  const dayData = Array.from({ length: maxDay }, (_, i) => ({
    label: String(i + 1).padStart(2, '0'),
    value: i + 1,
  }));

  const monthData = MONTHS_PT.map((label, i) => ({ label, value: i }));

  const yearData = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => {
    const y = MAX_YEAR - i;
    return { label: String(y), value: y };
  });

  const openPicker = () => {
    const ref = birthDate ?? defaultDate;
    setPickerDay(ref.getDate());
    setPickerMonth(ref.getMonth());
    setPickerYear(ref.getFullYear());
    setShowPicker(true);
  };

  const confirmPicker = () => {
    const finalDay = Math.min(clampedDay, daysInMonth(pickerMonth, pickerYear));
    const chosen = new Date(pickerYear, pickerMonth, finalDay);

    // Don't allow future dates
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (chosen > today) {
      Alert.alert('Data inválida', 'A data não pode ser no futuro.');
      return;
    }

    setBirthDate(chosen);
    setShowPicker(false);
  };

  const handleContinue = async () => {
    if (!name.trim()) { Alert.alert('Atenção', 'Digite o nome do bebê.'); return; }
    if (!sex) { Alert.alert('Atenção', 'Selecione o sexo.'); return; }
    if (!birthDate) { Alert.alert('Atenção', 'Selecione a data de nascimento.'); return; }

    setLoading(true);
    await setSetting('child_name', name.trim());
    await setSetting('child_sex', sex);
    await setSetting('child_birth', toStorageDate(birthDate));
    await setSetting('onboarding_done', '1');
    setLoading(false);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.emoji}>{isGirl ? '👧' : isBoy ? '👦' : '👶'}</Text>
        <Text style={styles.title}>Bem-vindo ao{'\n'}Palavrinhas! 💕</Text>
        <Text style={styles.subtitle}>Vamos personalizar o app para o seu bebê</Text>

        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Nome do bebê</Text>
          <TextInput
            style={[styles.input, { borderColor: name ? accentColor : COLORS.border }]}
            value={name}
            onChangeText={setName}
            placeholder="Ex: Sofia, Miguel..."
            placeholderTextColor={COLORS.textLight}
            autoCapitalize="words"
          />
        </View>

        {/* Sex */}
        <View style={styles.field}>
          <Text style={styles.label}>Sexo</Text>
          <View style={styles.sexRow}>
            <TouchableOpacity
              style={[styles.sexBtn, isGirl && styles.sexBtnGirl]}
              onPress={() => setSex('girl')}
            >
              <Text style={styles.sexEmoji}>👧</Text>
              <Text style={[styles.sexLabel, isGirl && { color: '#FF6B9D', fontWeight: '800' }]}>Menina</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sexBtn, isBoy && styles.sexBtnBoy]}
              onPress={() => setSex('boy')}
            >
              <Text style={styles.sexEmoji}>👦</Text>
              <Text style={[styles.sexLabel, isBoy && { color: '#74B9FF', fontWeight: '800' }]}>Menino</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Birth date */}
        <View style={styles.field}>
          <Text style={styles.label}>Data de nascimento</Text>
          <TouchableOpacity
            style={[styles.dateBtn, { borderColor: birthDate ? accentColor : COLORS.border }]}
            onPress={openPicker}
          >
            <Text style={styles.dateBtnIcon}>📅</Text>
            <Text style={[styles.dateBtnText, !birthDate && styles.dateBtnPlaceholder]}>
              {birthDate ? formatDisplayDate(birthDate) : 'Selecionar data'}
            </Text>
            {birthDate && <Text style={[styles.dateBtnArrow, { color: accentColor }]}>▾</Text>}
          </TouchableOpacity>
        </View>

        {/* Preview */}
        {allFilled && (
          <View style={[styles.preview, { borderColor: accentColor }]}>
            <Text style={styles.previewEmoji}>{isGirl ? '👧' : '👦'}</Text>
            <Text style={[styles.previewName, { color: accentColor }]}>{name}</Text>
            <Text style={styles.previewDate}>
              nascido em {formatDisplayDate(birthDate!)}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.continueBtn, { backgroundColor: accentColor }, !allFilled && styles.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={loading || !allFilled}
        >
          <Text style={styles.continueBtnText}>
            {loading ? 'Salvando...' : `Começar com ${name || 'meu bebê'} 💕`}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── JS-only Date Picker Modal ── */}
      <Modal visible={showPicker} transparent animationType="slide">
        <View style={modalStyles.overlay}>
          <View style={modalStyles.sheet}>
            {/* Header */}
            <View style={modalStyles.header}>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Text style={[modalStyles.headerBtn, { color: COLORS.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={modalStyles.headerTitle}>Data de Nascimento</Text>
              <TouchableOpacity onPress={confirmPicker}>
                <Text style={[modalStyles.headerBtn, { color: accentColor }]}>Confirmar</Text>
              </TouchableOpacity>
            </View>

            {/* Wheels */}
            <View style={modalStyles.wheelsRow}>
              <WheelColumn
                data={dayData}
                selectedValue={clampedDay}
                onValueChange={setPickerDay}
                accentColor={accentColor}
                width={70}
              />
              <WheelColumn
                data={monthData}
                selectedValue={pickerMonth}
                onValueChange={setPickerMonth}
                accentColor={accentColor}
              />
              <WheelColumn
                data={yearData}
                selectedValue={pickerYear}
                onValueChange={setPickerYear}
                accentColor={accentColor}
                width={80}
              />
            </View>

            {/* Preview inside modal */}
            <Text style={modalStyles.previewText}>
              {String(clampedDay).padStart(2, '0')} de {MONTHS_PT[pickerMonth]} de {pickerYear}
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ───────── Modal styles ───────── */
const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: COLORS.white ?? '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  headerBtn: { fontSize: 15, fontWeight: '600' },
  wheelsRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  previewText: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
    paddingVertical: 12,
  },
});

/* ───────── Screen styles ───────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 28, alignItems: 'center' },
  emoji: { fontSize: 72, marginBottom: 16, marginTop: 8 },
  title: { fontSize: 30, fontWeight: '900', color: COLORS.text, textAlign: 'center', lineHeight: 36, marginBottom: 8 },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 32 },
  field: { width: '100%', marginBottom: 24 },
  label: {
    fontSize: 13, fontWeight: '700', color: COLORS.textSecondary,
    marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.white, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 18, color: COLORS.text, borderWidth: 2,
  },
  sexRow: { flexDirection: 'row', gap: 12 },
  sexBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 18,
    backgroundColor: COLORS.white, borderRadius: 16, borderWidth: 2, borderColor: COLORS.border,
  },
  sexBtnGirl: { borderColor: '#FF6B9D', backgroundColor: '#FFF0F5' },
  sexBtnBoy: { borderColor: '#74B9FF', backgroundColor: '#F0F7FF' },
  sexEmoji: { fontSize: 36, marginBottom: 6 },
  sexLabel: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 16,
    borderWidth: 2,
  },
  dateBtnIcon: { fontSize: 22, marginRight: 12 },
  dateBtnText: { flex: 1, fontSize: 18, fontWeight: '600', color: COLORS.text },
  dateBtnPlaceholder: { color: COLORS.textLight, fontWeight: '400' },
  dateBtnArrow: { fontSize: 16 },
  preview: {
    width: '100%', alignItems: 'center', padding: 16,
    backgroundColor: COLORS.white, borderRadius: 16, borderWidth: 2, marginBottom: 20,
  },
  previewEmoji: { fontSize: 40, marginBottom: 4 },
  previewName: { fontSize: 20, fontWeight: '900', marginBottom: 2 },
  previewDate: { fontSize: 13, color: COLORS.textSecondary },
  continueBtn: {
    width: '100%', paddingVertical: 18, borderRadius: 18, alignItems: 'center',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  continueBtnDisabled: { opacity: 0.5, shadowOpacity: 0 },
  continueBtnText: { color: COLORS.white, fontSize: 17, fontWeight: '800' },
});