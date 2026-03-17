import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, Platform, Modal,
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors as THEME_COLORS } from '../src/theme';
import { useSettingsStore } from '../src/stores/settingsStore';
import { getThemeForSex } from '../src/theme/getThemeForSex';
import { BrandHeader } from '../src/components/BrandHeader';
import { useI18n, LANGUAGES } from '../src/i18n/i18n';
import { formatDisplayDate, toStorageDate, daysInMonth } from '../src/utils/dateHelpers';

/* ───────── constants ───────── */
const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

/* ─────────────────────────────────────────────
   WheelColumn
   ───────────────────────────────────────────── */
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
    if (data[clamped]) {
      onValueChange(data[clamped].value);
    }
  };

  return (
    <View style={[wheelStyles.column, width ? { width } : { flex: 1 }]}>
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
    position: 'absolute', left: 4, right: 4, height: ITEM_HEIGHT,
    borderRadius: 10, borderWidth: 2, backgroundColor: 'rgba(0,0,0,0.03)', zIndex: 1,
  },
  item: { height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' },
  itemText: { fontSize: 16, color: THEME_COLORS.textSecondary, fontWeight: '500' },
});

/* ─────────────────────────────────────────────
   Main Onboarding Screen
   ───────────────────────────────────────────── */
export default function OnboardingScreen() {
  const router = useRouter();
  const { t, ta, locale, setLocale } = useI18n();

  // Months come from the translation catalogue so they're locale-aware
  const MONTHS: string[] = ta('datePicker.months');

  const currentYear = new Date().getFullYear();
  const MIN_YEAR = currentYear - 8;
  const MAX_YEAR = currentYear;

  const [name, setName] = useState('');
  const [sex, setSex] = useState<'boy' | 'girl' | null>(null);
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const defaultDate = new Date();
  defaultDate.setFullYear(defaultDate.getFullYear() - 1);

  const [pickerDay, setPickerDay] = useState(birthDate?.getDate() ?? defaultDate.getDate());
  const [pickerMonth, setPickerMonth] = useState(birthDate?.getMonth() ?? defaultDate.getMonth());
  const [pickerYear, setPickerYear] = useState(birthDate?.getFullYear() ?? defaultDate.getFullYear());

  const isBoy = sex === 'boy';
  const isGirl = sex === 'girl';
  const accentColor = getThemeForSex(sex).colors.primary;
  const allFilled = !!name.trim() && !!sex && !!birthDate;
  const emojiBySex = { girl: '👧', boy: '👦' } as const;
  const profileEmoji = sex ? emojiBySex[sex] : '👶';

  useEffect(() => {
    if (allFilled) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [allFilled]);

  const maxDay = daysInMonth(pickerMonth, pickerYear);
  const clampedDay = Math.min(pickerDay, maxDay);

  const dayData = Array.from({ length: maxDay }, (_, i) => ({
    label: String(i + 1).padStart(2, '0'),
    value: i + 1,
  }));
  const monthData = MONTHS.map((label: string, i: number) => ({ label, value: i }));
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
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (chosen > today) {
      Alert.alert(t('common.attention'), t('onboarding.errorFutureDate'));
      return;
    }
    setBirthDate(chosen);
    setShowPicker(false);
  };

  const handleContinue = async () => {
    if (!name.trim()) { Alert.alert(t('common.attention'), t('onboarding.errorName')); return; }
    if (!sex) { Alert.alert(t('common.attention'), t('onboarding.errorSex')); return; }
    if (!birthDate) { Alert.alert(t('common.attention'), t('onboarding.errorBirth')); return; }

    const selectedSex = sex;
    const selectedBirthDate = birthDate;
    if (!selectedSex || !selectedBirthDate) {
      return;
    }

    setLoading(true);
    await useSettingsStore.getState().setProfile({
      name: name.trim(),
      sex: selectedSex,
      birth: toStorageDate(selectedBirthDate),
    });
    await useSettingsStore.getState().setOnboardingDone();
    setLoading(false);
    router.replace('/(tabs)/home');
  };

  const birthArticle = isBoy ? t('onboarding.bornOnMale') : t('onboarding.bornOn');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <BrandHeader />

        <Text style={styles.emoji}>{profileEmoji}</Text>
        <Text style={styles.title}>{t('onboarding.welcome')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.subtitle')}</Text>

        {/* ── Language selector ── */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('onboarding.language').toUpperCase()}</Text>
          <View style={styles.langRow}>
            {LANGUAGES.map(lang => (
              <TouchableOpacity
                key={lang.locale}
                style={[
                  styles.langBtn,
                  locale === lang.locale && { borderColor: accentColor, backgroundColor: accentColor + '12' },
                ]}
                onPress={() => setLocale(lang.locale)}
              >
                <Text style={styles.langFlag}>{lang.flag}</Text>
                <Text style={[
                  styles.langLabel,
                  locale === lang.locale && { color: accentColor, fontWeight: '800' },
                ]}>
                  {lang.label}
                </Text>
                {locale === lang.locale && (
                  <Text style={[styles.langCheck, { color: accentColor }]}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Name ── */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('onboarding.babyName').toUpperCase()}</Text>
          <TextInput
            style={[styles.input, { borderColor: name ? accentColor : THEME_COLORS.border }]}
            value={name}
            onChangeText={setName}
            placeholder={t('onboarding.babyNamePlaceholder')}
            placeholderTextColor={THEME_COLORS.textMuted}
            autoCapitalize="words"
            testID="onboarding-name-input"
          />
        </View>

        {/* ── Sex ── */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('onboarding.sex').toUpperCase()}</Text>
          <View style={styles.sexRow}>
              <TouchableOpacity
                style={[styles.sexBtn, isGirl && styles.sexBtnGirl]}
                onPress={() => setSex('girl')}
                testID="onboarding-sex-girl-btn"
              >
              <Text style={styles.sexEmoji}>👧</Text>
              <Text style={[styles.sexLabel, isGirl && styles.sexLabelActiveGirl]}>
                {t('onboarding.girl')}
              </Text>
            </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sexBtn, isBoy && styles.sexBtnBoy]}
                onPress={() => setSex('boy')}
                testID="onboarding-sex-boy-btn"
              >
              <Text style={styles.sexEmoji}>👦</Text>
              <Text style={[styles.sexLabel, isBoy && styles.sexLabelActiveBoy]}>
                {t('onboarding.boy')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Birth date ── */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('onboarding.birthDate').toUpperCase()}</Text>
          <TouchableOpacity
            style={[styles.dateBtn, { borderColor: birthDate ? accentColor : THEME_COLORS.border }]}
            onPress={openPicker}
            testID="onboarding-birthdate-btn"
          >
            <Ionicons name="calendar-outline" size={18} color={THEME_COLORS.textSecondary} style={styles.dateBtnIcon} />
            <Text style={[styles.dateBtnText, !birthDate && styles.dateBtnPlaceholder]}>
              {birthDate ? formatDisplayDate(birthDate) : t('onboarding.selectDate')}
            </Text>
            {birthDate && <Ionicons name="chevron-down" size={14} color={accentColor} />}
          </TouchableOpacity>
        </View>

        {/* ── Preview ── */}
        {allFilled && (
          <View style={[styles.preview, { borderColor: accentColor }]}>
            <View style={styles.previewRow}>
              <Text style={styles.previewEmoji}>{profileEmoji}</Text>
              <Text style={[styles.previewName, { color: accentColor }]}>{name}</Text>
            </View>
            <Text style={styles.previewDate}>
              {birthDate ? `${birthArticle} ${formatDisplayDate(birthDate)}` : ''}
            </Text>
          </View>
        )}

        {allFilled && (
        <TouchableOpacity
          style={[styles.continueBtn, { backgroundColor: accentColor }]}
          onPress={handleContinue}
          disabled={loading}
          testID="onboarding-continue-btn"
        >
          <Text style={styles.continueBtnText}>
            {loading
              ? t('onboarding.saving')
              : t('onboarding.continueBtn', { name: name || t('common.ok') })}
          </Text>
        </TouchableOpacity>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ── Date Picker Modal ── */}
      <Modal visible={showPicker} transparent animationType="slide">
        <View style={modalStyles.overlay}>
          <View style={modalStyles.sheet}>
            <View style={modalStyles.header}>
              <TouchableOpacity onPress={() => setShowPicker(false)} testID="onboarding-date-cancel-btn">
                <Text style={[modalStyles.headerBtn, { color: THEME_COLORS.textSecondary }]}>
                  {t('onboarding.datePicker.cancel')}
                </Text>
              </TouchableOpacity>
              <Text style={modalStyles.headerTitle} testID="onboarding-date-title">{t('onboarding.datePicker.title')}</Text>
              <TouchableOpacity onPress={confirmPicker} testID="onboarding-date-confirm-btn">
                <Text style={[modalStyles.headerBtn, { color: accentColor }]}>
                  {t('onboarding.datePicker.confirm')}
                </Text>
              </TouchableOpacity>
            </View>

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

            <Text style={modalStyles.previewText}>
              {String(clampedDay).padStart(2, '0')} {MONTHS[pickerMonth]} {pickerYear}
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ───────── Modal styles ───────── */
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
  previewText: {
    textAlign: 'center', fontSize: 15, fontWeight: '600',
    color: THEME_COLORS.textSecondary, paddingVertical: 12,
  },
});

/* ───────── Screen styles ───────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME_COLORS.background },
  content: { padding: 28, alignItems: 'center' },
  emoji: { fontSize: 72, marginBottom: 16, marginTop: 8 },
  title: { fontSize: 30, fontWeight: '900', color: THEME_COLORS.text, textAlign: 'center', lineHeight: 36, marginBottom: 8 },
  subtitle: { fontSize: 15, color: THEME_COLORS.textSecondary, textAlign: 'center', marginBottom: 28 },
  field: { width: '100%', marginBottom: 24 },
  label: {
    fontSize: 13, fontWeight: '700', color: THEME_COLORS.textSecondary,
    marginBottom: 10, letterSpacing: 0.5,
  },
  // Language
  langRow: { flexDirection: 'row', gap: 10 },
  langBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 16,
    backgroundColor: THEME_COLORS.surface, borderWidth: 2, borderColor: THEME_COLORS.border,
  },
  langFlag: { fontSize: 22 },
  langLabel: { fontSize: 15, fontWeight: '600', color: THEME_COLORS.textSecondary },
  langCheck: { fontSize: 13, fontWeight: '900' },
  // Name
  input: {
    backgroundColor: THEME_COLORS.surface, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 18, color: THEME_COLORS.text, borderWidth: 2,
  },
  // Sex
  sexRow: { flexDirection: 'row', gap: 12 },
  sexBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 18,
    backgroundColor: THEME_COLORS.surface, borderRadius: 16, borderWidth: 2, borderColor: THEME_COLORS.border,
  },
  sexBtnGirl: { borderColor: THEME_COLORS.profileGirl, backgroundColor: THEME_COLORS.profileGirlBg },
  sexBtnBoy: { borderColor: THEME_COLORS.profileBoy, backgroundColor: THEME_COLORS.profileBoyBg },
  sexLabelActiveGirl: { color: THEME_COLORS.profileGirl, fontWeight: '800' },
  sexLabelActiveBoy: { color: THEME_COLORS.profileBoy, fontWeight: '800' },
  sexEmoji: { fontSize: 36, marginBottom: 6 },
  sexLabel: { fontSize: 15, fontWeight: '600', color: THEME_COLORS.textSecondary },
  // Date
  dateBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: THEME_COLORS.surface, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 16, borderWidth: 2,
  },
  dateBtnIcon: { marginRight: 12 },
  dateBtnText: { flex: 1, fontSize: 18, fontWeight: '600', color: THEME_COLORS.text },
  dateBtnPlaceholder: { color: THEME_COLORS.textMuted, fontWeight: '400' },
  // Preview
  preview: {
    width: '75%', alignItems: 'center', padding: 10,
    backgroundColor: THEME_COLORS.surface, borderRadius: 14, borderWidth: 2, marginBottom: 16,
  },
  previewRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  previewEmoji: { fontSize: 28 },
  previewName:  { fontSize: 15, fontWeight: '900' },
  previewDate:  { fontSize: 11, color: THEME_COLORS.textSecondary },
  // Button
  continueBtn: {
    width: '100%', paddingVertical: 18, borderRadius: 18, alignItems: 'center',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  continueBtnText: { color: THEME_COLORS.textOnPrimary, fontSize: 17, fontWeight: '800' },
  bottomSpacer: { height: 40 },
});
