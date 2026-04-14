import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  StyleSheet, Alert, Animated, Keyboard,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useProfilePhotoPicker } from '../hooks/useProfilePhotoPicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as THEME_COLORS } from '../theme';
import { useSettingsStore } from '../stores/settingsStore';
import { getThemeForSex } from '../theme/getThemeForSex';
import { useModalAnimation } from '../hooks/useModalAnimation';
import { Button } from './UIComponents';
import { WheelDatePickerModal } from './WheelDatePickerModal';
import { useI18n } from '../i18n/i18n';
import { getChildLabelWithArticle } from '../utils/dashboardHelpers';
import { formatDisplayDate, toStorageDate } from '../utils/dateHelpers';
import { ProfileAvatar } from './ProfileAvatar';
import { useProfilePhoto, useSaveProfilePhoto } from '../hooks/useAssets';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function EditProfileModal({ visible, onClose, onSaved }: Readonly<EditProfileModalProps>) {
  const { t, locale } = useI18n();
  const insets = useSafeAreaInsets();
  const { name: storedName, sex: storedSex, birth: storedBirth } = useSettingsStore();
  const { translateY, backdropOpacity, dismissModal, panResponder } = useModalAnimation(visible, onClose);

  const [name, setName] = useState('');
  const [sex, setSex] = useState<'boy' | 'girl' | null>(null);
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const { data: profilePhoto } = useProfilePhoto();
  const saveProfilePhoto = useSaveProfilePhoto();
  const { handlePickPhoto, handleRemovePhoto } = useProfilePhotoPicker({
    onPhotoSelected: async (asset) => {
      setPhotoUri(asset.uri);
      await saveProfilePhoto.mutateAsync({
        sourceUri: asset.uri,
        mimeType: asset.mimeType ?? 'image/jpeg',
        fileSize: asset.fileSize ?? 0,
      });
    },
    onPhotoRemoved: () => setPhotoUri(null),
  });

  const childLabel = getChildLabelWithArticle(storedBirth ?? null, storedSex, locale, t);
  const accentColor = getThemeForSex(sex).colors.primary;
  const isBoy = sex === 'boy';
  const isGirl = sex === 'girl';

  // Pre-fill from store whenever the modal opens
  useEffect(() => {
    if (!visible) return;
    setName(storedName ?? '');
    setSex(storedSex ?? null);
    setBirthDate(() => {
      if (!storedBirth) return null;
      const [y, m, d] = storedBirth.split('-').map(Number);
      return new Date(y, m - 1, d);
    });
  }, [visible, storedName, storedSex, storedBirth]);

  // Pre-fill photo URI from query when modal opens
  useEffect(() => {
    if (!visible) return;
    setPhotoUri(profilePhoto?.uri ?? null);
  }, [visible, profilePhoto]);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert(t('common.attention'), t('onboarding.errorName')); return; }
    if (!sex) { Alert.alert(t('common.attention'), t('onboarding.errorSex')); return; }
    if (!birthDate) { Alert.alert(t('common.attention'), t('onboarding.errorBirth')); return; }
    setLoading(true);
    await useSettingsStore.getState().setProfile({ name: name.trim(), sex, birth: toStorageDate(birthDate) });
    setLoading(false);
    onClose();
    onSaved?.();
  };

  return (
    <>
      <Modal visible={visible} animationType="none" transparent onRequestClose={dismissModal}>
        <Animated.View style={[s.backdrop, { opacity: backdropOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => { Keyboard.dismiss(); dismissModal(); }} />
        </Animated.View>
        <View style={s.overlay} pointerEvents="box-none">
          <Animated.View style={[s.container, { paddingBottom: 24 + insets.bottom, transform: [{ translateY }] }]}>
            <View style={s.handleWrap} {...panResponder.panHandlers}>
              <View style={[s.handle, { backgroundColor: THEME_COLORS.textMuted }]} />
            </View>

            <Text style={[s.title, { color: THEME_COLORS.text }]} testID="edit-profile-title">
              {t('settings.editProfileTitle', { label: childLabel })}
            </Text>

            <KeyboardAwareScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bottomOffset={insets.bottom + 24}
            >
              {/* Photo */}
              <View style={s.photoSection}>
                <ProfileAvatar
                  size="lg"
                  photoUri={photoUri}
                  sex={sex}
                  onPress={handlePickPhoto}
                  showDecorations={false}
                  tapHint={photoUri ? undefined : t('onboarding.tapToAddPhoto')}
                  testID="edit-profile-avatar"
                />
                {photoUri ? (
                  <Text style={[s.photoHint, { color: THEME_COLORS.textMuted }]}>
                    {t('settings.tapToChangePhoto')}
                  </Text>
                ) : null}
                {photoUri ? (
                  <TouchableOpacity onPress={handleRemovePhoto} testID="edit-profile-remove-photo-btn">
                    <Text style={[s.removePhotoText, { color: THEME_COLORS.error }]}>
                      {t('settings.removePhoto')}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Name */}
              <Text style={[s.label, { color: THEME_COLORS.textSecondary }]}>{t('settings.childNameLabel', { label: childLabel }).toUpperCase()}</Text>
              <TextInput
                style={[s.input, { borderColor: name ? accentColor : THEME_COLORS.border }]}
                value={name}
                onChangeText={setName}
                placeholder={t('onboarding.babyNamePlaceholder')}
                placeholderTextColor={THEME_COLORS.textMuted}
                autoCapitalize="words"
                returnKeyType="done"
                testID="edit-profile-name-input"
              />

              {/* Sex */}
              <Text style={[s.label, { color: THEME_COLORS.textSecondary }]}>{t('onboarding.sex').toUpperCase()}</Text>
              <View style={s.sexRow}>
                <TouchableOpacity
                  style={[s.sexBtn, isGirl && s.sexBtnGirl]}
                  onPress={() => setSex('girl')}
                  testID="edit-profile-sex-girl-btn"
                >
                  <Text style={s.sexEmoji}>👧</Text>
                  <Text style={[s.sexLabel, isGirl && s.sexLabelActiveGirl]}>{t('onboarding.girl')}</Text>
                  {isGirl && <Text style={[s.sexCheck, { color: THEME_COLORS.profileGirl }]} testID="edit-profile-sex-girl-check">✓</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.sexBtn, isBoy && s.sexBtnBoy]}
                  onPress={() => setSex('boy')}
                  testID="edit-profile-sex-boy-btn"
                >
                  <Text style={s.sexEmoji}>👦</Text>
                  <Text style={[s.sexLabel, isBoy && s.sexLabelActiveBoy]}>{t('onboarding.boy')}</Text>
                  {isBoy && <Text style={[s.sexCheck, { color: THEME_COLORS.profileBoy }]} testID="edit-profile-sex-boy-check">✓</Text>}
                </TouchableOpacity>
              </View>

              {/* Birth date */}
              <Text style={[s.label, { color: THEME_COLORS.textSecondary }]}>{t('onboarding.birthDate').toUpperCase()}</Text>
              <TouchableOpacity
                style={[s.dateBtn, { borderColor: birthDate ? accentColor : THEME_COLORS.border }]}
                onPress={() => setShowPicker(true)}
                testID="edit-profile-birthdate-btn"
              >
                <Text style={[s.dateBtnText, !birthDate && s.dateBtnPlaceholder]}>
                  {birthDate ? formatDisplayDate(birthDate) : t('onboarding.selectDate')}
                </Text>
              </TouchableOpacity>

              {/* Actions */}
              <View style={s.actions}>
                <Button
                  title={t('common.cancel')}
                  onPress={onClose}
                  variant="outline"
                  style={[s.actionBtn, { borderColor: accentColor }]}
                  textStyle={{ color: accentColor }}
                  testID="edit-profile-cancel-btn"
                />
                <Button
                  title={loading ? t('onboarding.saving') : t('common.save')}
                  onPress={handleSave}
                  loading={loading}
                  style={[s.actionBtn, { backgroundColor: accentColor, shadowColor: accentColor }]}
                  testID="edit-profile-save-btn"
                />
              </View>
            </KeyboardAwareScrollView>
          </Animated.View>
        </View>
      </Modal>

      <WheelDatePickerModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onConfirm={(date) => { setBirthDate(date); setShowPicker(false); }}
        accentColor={accentColor}
        initialDate={birthDate}
      />
    </>
  );
}

const s = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)' },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  container: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '92%', backgroundColor: THEME_COLORS.background },
  handleWrap: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 10, marginBottom: 4 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 20 },
  photoSection: { alignItems: 'center', gap: 8, marginBottom: 20 },
  photoHint: { fontSize: 14 },
  removePhotoText: { fontSize: 13, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: THEME_COLORS.surface, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 18, color: THEME_COLORS.text, borderWidth: 2, marginBottom: 20,
  },
  sexRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  sexBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 16, borderWidth: 2, borderColor: THEME_COLORS.border,
    backgroundColor: THEME_COLORS.surface,
  },
  sexBtnGirl: { borderColor: THEME_COLORS.profileGirl, backgroundColor: THEME_COLORS.profileGirlBg },
  sexBtnBoy: { borderColor: THEME_COLORS.profileBoy, backgroundColor: THEME_COLORS.profileBoyBg },
  sexEmoji: { fontSize: 22 },
  sexLabel: { fontSize: 15, fontWeight: '600', color: THEME_COLORS.textSecondary },
  sexCheck: { fontSize: 13, fontWeight: '900' },
  sexLabelActiveGirl: { color: THEME_COLORS.profileGirl, fontWeight: '800' },
  sexLabelActiveBoy: { color: THEME_COLORS.profileBoy, fontWeight: '800' },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: THEME_COLORS.surface, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 16, borderWidth: 2, marginBottom: 24,
  },
  dateBtnText: { flex: 1, fontSize: 18, fontWeight: '600', color: THEME_COLORS.text },
  dateBtnPlaceholder: { color: THEME_COLORS.textMuted, fontWeight: '400' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8, paddingBottom: 16 },
  actionBtn: { flex: 1 },
});
