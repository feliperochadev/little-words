import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors as THEME_COLORS } from '../src/theme';
import { useSettingsStore } from '../src/stores/settingsStore';
import { getThemeForSex } from '../src/theme/getThemeForSex';
import { BrandHeader } from '../src/components/BrandHeader';
import { ProfileAvatar } from '../src/components/ProfileAvatar';
import { WheelDatePickerModal } from '../src/components/WheelDatePickerModal';
import { useI18n, LANGUAGES } from '../src/i18n/i18n';
import { formatDisplayDate, toStorageDate } from '../src/utils/dateHelpers';
import { useSaveProfilePhoto } from '../src/hooks/useAssets';

export default function OnboardingScreen() {
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();

  const [name, setName] = useState('');
  const [sex, setSex] = useState<'boy' | 'girl' | null>(null);
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{ uri: string; mimeType: string; fileSize: number } | null>(null);
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const saveProfilePhoto = useSaveProfilePhoto();

  const isBoy = sex === 'boy';
  const isGirl = sex === 'girl';
  const accentColor = getThemeForSex(sex).colors.primary;
  const allFilled = !!name.trim() && !!sex && !!birthDate;
  const emojiBySex = { girl: '👧', boy: '👦' } as const;
  const profileEmoji = sex ? emojiBySex[sex] : '👶';
  const birthArticle = isBoy ? t('onboarding.bornOnMale') : t('onboarding.bornOn');

  useEffect(() => {
    if (allFilled) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [allFilled]);

  const handleContinue = async () => {
    if (!name.trim()) { Alert.alert(t('common.attention'), t('onboarding.errorName')); return; }
    if (!sex) { Alert.alert(t('common.attention'), t('onboarding.errorSex')); return; }
    if (!birthDate) { Alert.alert(t('common.attention'), t('onboarding.errorBirth')); return; }

    const selectedSex = sex;
    const selectedBirthDate = birthDate;
    if (!selectedSex || !selectedBirthDate) return;

    setLoading(true);
    await useSettingsStore.getState().setProfile({
      name: name.trim(),
      sex: selectedSex,
      birth: toStorageDate(selectedBirthDate),
    });
    if (selectedPhoto) {
      await saveProfilePhoto.mutateAsync({
        sourceUri: selectedPhoto.uri,
        mimeType: selectedPhoto.mimeType,
        fileSize: selectedPhoto.fileSize,
      });
    }
    await useSettingsStore.getState().setOnboardingDone();
    setLoading(false);
    router.replace('/(tabs)/home');
  };

  const launchPicker = async (source: 'camera' | 'library') => {
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('settings.photoPermissionDenied'));
        setPickingPhoto(false);
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedPhoto({ uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg', fileSize: asset.fileSize ?? 0 });
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('settings.photoPermissionDenied'));
        setPickingPhoto(false);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8,
      });
      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedPhoto({ uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg', fileSize: asset.fileSize ?? 0 });
      }
    }
    setPickingPhoto(false);
  };

  const handlePickPhoto = () => {
    if (pickingPhoto) return;
    setPickingPhoto(true);
    Alert.alert(
      t('settings.photoSourceTitle'),
      undefined,
      [
        { text: t('settings.photoSourceCamera'), onPress: () => { void launchPicker('camera'); } },
        { text: t('settings.photoSourceGallery'), onPress: () => { void launchPicker('library'); } },
        { text: t('common.cancel'), style: 'cancel', onPress: () => setPickingPhoto(false) },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <BrandHeader />

        <View style={styles.topAvatarWrap}>
          <ProfileAvatar
            size="lg"
            photoUri={selectedPhoto?.uri ?? null}
            sex={sex}
            onPress={handlePickPhoto}
            tapHint={t('onboarding.tapToAddPhoto')}
            testID="onboarding-profile-avatar"
          />
        </View>
        <Text style={styles.title}>{t('onboarding.welcome')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.subtitle')}</Text>

        {/* Language selector */}
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
                <Text style={[styles.langLabel, locale === lang.locale && { color: accentColor, fontWeight: '800' }]}>
                  {lang.label}
                </Text>
                {locale === lang.locale && <Text style={[styles.langCheck, { color: accentColor }]}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Name */}
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

        {/* Sex */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('onboarding.sex').toUpperCase()}</Text>
          <View style={styles.sexRow}>
            <TouchableOpacity style={[styles.sexBtn, isGirl && styles.sexBtnGirl]} onPress={() => setSex('girl')} testID="onboarding-sex-girl-btn">
              <Text style={styles.sexEmoji}>👧</Text>
              <Text style={[styles.sexLabel, isGirl && styles.sexLabelActiveGirl]}>{t('onboarding.girl')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sexBtn, isBoy && styles.sexBtnBoy]} onPress={() => setSex('boy')} testID="onboarding-sex-boy-btn">
              <Text style={styles.sexEmoji}>👦</Text>
              <Text style={[styles.sexLabel, isBoy && styles.sexLabelActiveBoy]}>{t('onboarding.boy')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Birth date */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('onboarding.birthDate').toUpperCase()}</Text>
          <TouchableOpacity
            style={[styles.dateBtn, { borderColor: birthDate ? accentColor : THEME_COLORS.border }]}
            onPress={() => setShowPicker(true)}
            testID="onboarding-birthdate-btn"
          >
            <Ionicons name="calendar-outline" size={18} color={THEME_COLORS.textSecondary} style={styles.dateBtnIcon} />
            <Text style={[styles.dateBtnText, !birthDate && styles.dateBtnPlaceholder]}>
              {birthDate ? formatDisplayDate(birthDate) : t('onboarding.selectDate')}
            </Text>
            {birthDate && <Ionicons name="chevron-down" size={14} color={accentColor} />}
          </TouchableOpacity>
        </View>

        {/* Preview */}
        {allFilled && (
          <View style={[styles.preview, { borderColor: accentColor }]}>
            <View style={styles.previewRow}>
              <Text style={styles.previewEmoji}>{profileEmoji}</Text>
              <Text style={[styles.previewName, { color: accentColor }]}>{name}</Text>
              {birthDate && (
                <Text style={styles.previewDate}>{`${birthArticle} ${formatDisplayDate(birthDate)}`}</Text>
              )}
            </View>
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
              {loading ? t('onboarding.saving') : t('onboarding.continueBtn', { name: name || t('common.ok') })}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <WheelDatePickerModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onConfirm={(date) => { setBirthDate(date); setShowPicker(false); }}
        accentColor={accentColor}
        initialDate={birthDate}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME_COLORS.background },
  content: { padding: 28, alignItems: 'center' },
  topAvatarWrap: { marginBottom: 16, marginTop: 8 },
  title: { fontSize: 30, fontWeight: '900', color: THEME_COLORS.text, textAlign: 'center', lineHeight: 36, marginBottom: 8 },
  subtitle: { fontSize: 15, color: THEME_COLORS.textSecondary, textAlign: 'center', marginBottom: 28 },
  field: { width: '100%', marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '700', color: THEME_COLORS.textSecondary, marginBottom: 10, letterSpacing: 0.5 },
  langRow: { flexDirection: 'row', gap: 10 },
  langBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 16,
    backgroundColor: THEME_COLORS.surface, borderWidth: 2, borderColor: THEME_COLORS.border,
  },
  langFlag: { fontSize: 22 },
  langLabel: { fontSize: 15, fontWeight: '600', color: THEME_COLORS.textSecondary },
  langCheck: { fontSize: 13, fontWeight: '900' },
  input: {
    backgroundColor: THEME_COLORS.surface, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 18, color: THEME_COLORS.text, borderWidth: 2,
  },
  sexRow: { flexDirection: 'row', gap: 12 },
  sexBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 16, borderWidth: 2, borderColor: THEME_COLORS.border,
    backgroundColor: THEME_COLORS.surface,
  },
  sexBtnGirl: { borderColor: THEME_COLORS.profileGirl, backgroundColor: THEME_COLORS.profileGirlBg },
  sexBtnBoy: { borderColor: THEME_COLORS.profileBoy, backgroundColor: THEME_COLORS.profileBoyBg },
  sexLabelActiveGirl: { color: THEME_COLORS.profileGirl, fontWeight: '800' },
  sexLabelActiveBoy: { color: THEME_COLORS.profileBoy, fontWeight: '800' },
  sexEmoji: { fontSize: 22 },
  sexLabel: { fontSize: 15, fontWeight: '600', color: THEME_COLORS.textSecondary },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: THEME_COLORS.surface, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 16, borderWidth: 2,
  },
  dateBtnIcon: { marginRight: 12 },
  dateBtnText: { flex: 1, fontSize: 18, fontWeight: '600', color: THEME_COLORS.text },
  dateBtnPlaceholder: { color: THEME_COLORS.textMuted, fontWeight: '400' },
  preview: {
    width: '100%', padding: 14,
    backgroundColor: THEME_COLORS.surface, borderRadius: 14, borderWidth: 2, marginBottom: 16,
    alignItems: 'center',
  },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
  previewEmoji: { fontSize: 30 },
  previewName: { fontSize: 18, fontWeight: '900', flexShrink: 1 },
  previewDate: { fontSize: 13, color: THEME_COLORS.textSecondary, flexShrink: 1 },
  continueBtn: {
    width: '100%', paddingVertical: 18, borderRadius: 18, alignItems: 'center',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  continueBtnText: { color: THEME_COLORS.textOnPrimary, fontSize: 17, fontWeight: '800' },
  bottomSpacer: { height: 40 },
});
