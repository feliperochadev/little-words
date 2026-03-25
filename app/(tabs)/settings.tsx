import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { clearAllData } from '../../src/services/settingsService';
import { formatAgeText, formatDisplayDate } from '../../src/utils/dateHelpers';
import { getChildLabelWithArticle } from '../../src/utils/dashboardHelpers';
import { AddCategoryModal, CategoryToEdit } from '../../src/components/AddCategoryModal';
import { useCategoryName, useI18n, LANGUAGES } from '../../src/i18n/i18n';
import { withOpacity } from '../../src/utils/colorHelpers';
import { saveCSVToDevice, shareCSV, buildCategoryResolver, buildCSVHeader } from '../../src/utils/csvExport';
import { shareFullBackup, saveFullBackupToDevice } from '../../src/utils/backupExport';
import { Card, Button } from '../../src/components/UIComponents';
import Constants from 'expo-constants';
import { ImportModal } from '../../src/components/ImportModal';
import { EditProfileModal } from '../../src/components/EditProfileModal';
import { ProfileAvatar } from '../../src/components/ProfileAvatar';
import { useCategories } from '../../src/hooks/useCategories';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useTheme } from '../../src/hooks/useTheme';
import { useProfilePhoto } from '../../src/hooks/useAssets';
import {
  isNotificationsEnabled,
  cancelAllNotifications,
  scheduleAll,
  getPermissionStatus,
} from '../../src/services/notificationService';
import {
  setNotificationState,
  getNotificationState,
} from '../../src/repositories/notificationRepository';

function getSexDisplay(sex: string | undefined | null, t: (key: string) => string): string {
  if (sex === 'girl') return t('settings.girl');
  if (sex === 'boy') return t('settings.boy');
  return '—';
}

export default function SettingsScreen() {
  const router = useRouter();
  const { scrollTo } = useLocalSearchParams<{ scrollTo?: string }>();
  const { t, locale, setLocale } = useI18n();
  const { colors } = useTheme();
  const categoryName = useCategoryName();
  const categoryResolver = buildCategoryResolver(t);
  const csvHeader = buildCSVHeader(t);

  const { data: categories = [] } = useCategories();
  const { name: childName, sex: childSex, birth: childBirth } = useSettingsStore();

  const { data: profilePhoto } = useProfilePhoto();
  const profilePhotoUri = profilePhoto?.uri ?? null;

  const childBirthDate: Date | null = childBirth
    ? (() => { const [y, m, d] = childBirth.split('-').map(Number); return new Date(y, m - 1, d); })()
    : null;

  const [editCategory, setEditCategory] = useState<CategoryToEdit | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);

  const [exportMode, setExportMode] = useState<'csv' | 'zip'>('zip');
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // Notifications state
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Scroll-to-export support
  const scrollRef = useRef<ScrollView>(null);
  const exportSectionYRef = useRef<number>(0);

  // Load notification toggle state on mount
  useEffect(() => {
    void (async () => {
      const [enabled, permReq] = await Promise.all([
        isNotificationsEnabled(),
        getNotificationState('permission_requested'),
      ]);
      setNotificationsEnabled(enabled);
      if (permReq === '1' && !enabled) {
        const { canAskAgain } = await getPermissionStatus();
        setPermissionDenied(!canAskAgain);
      }
    })();
  }, []);

  // Scroll to export section when deep-linked from backup reminder
  useEffect(() => {
    if (scrollTo === 'export' && exportSectionYRef.current > 0) {
      const timeout = setTimeout(() => {
        scrollRef.current?.scrollTo({ y: exportSectionYRef.current, animated: true });
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [scrollTo]);

  // Scroll to top when leaving the screen
  useFocusEffect(
    useCallback(() => {
      return () => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      };
    }, [])
  );

  const handleNotificationsToggle = useCallback(async (value: boolean) => {
    setNotificationsEnabled(value);
    await setNotificationState('notifications_enabled', value ? '1' : '0');
    if (value) {
      void scheduleAll();
    } else {
      await cancelAllNotifications();
    }
  }, []);

  const recordBackupDate = useCallback(async () => {
    await setNotificationState('last_backup_date', new Date().toISOString());
  }, []);

  const handleShare = async () => {
    setExporting(true);
    if (exportMode === 'zip') {
      const result = await shareFullBackup(t, locale);
      setExporting(false);
      if (result.success) {
        void recordBackupDate();
      } else {
        Alert.alert(t('common.error'), result.error || t('backup.errorShare'));
      }
    } else {
      const result = await shareCSV(categoryResolver, csvHeader, t);
      setExporting(false);
      if (!result.success) Alert.alert(t('common.error'), result.error || t('settings.errorShare'));
    }
  };

  const handleSaveToDevice = async () => {
    setSaving(true);
    if (exportMode === 'zip') {
      const result = await saveFullBackupToDevice(t, locale);
      setSaving(false);
      if (result.success) {
        void recordBackupDate();
        Alert.alert(t('backup.saveSuccess'), t('backup.saveMsg'));
      } else if (result.error !== 'cancelled') {
        Alert.alert(t('common.error'), result.error || t('backup.errorShare'));
      }
    } else {
      const result = await saveCSVToDevice(categoryResolver, csvHeader, t);
      setSaving(false);
      if (result.success) {
        Alert.alert(t('settings.saveCsvSuccess'), t('settings.saveCsvMsg'));
      } else if (result.error !== 'cancelled') {
        Alert.alert(t('common.error'), result.error || t('settings.errorShare'));
      }
    }
  };

  const handleConfirmClearData = () => {
    void clearAllData().then(() => router.replace('/onboarding'));
  };

  const handleClearData = () => {
    Alert.alert(
      t('settings.deleteAllTitle'),
      t('settings.deleteAllMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.deleteAllExportFirst'),
          onPress: () => { void shareFullBackup(t, locale); },
        },
        {
          text: t('settings.deleteAll'), style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('settings.deleteAllConfirmTitle'),
              t('settings.deleteAllConfirmMsg'),
              [
                { text: t('settings.deleteAllNo'), style: 'cancel' },
                {
                  text: t('settings.deleteAllYes'), style: 'destructive',
                  onPress: handleConfirmClearData,
                },
              ]
            );
          },
        },
      ]
    );
  };

  const sexLabel = getSexDisplay(childSex, t);
  const childLabel = getChildLabelWithArticle(childBirth ?? null, childSex, locale, t);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView ref={scrollRef} style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
        <View style={styles.pageTitleRow}>
          <Ionicons name="settings-outline" size={22} color={colors.primary} testID="settings-title-icon" />
          <Text style={[styles.pageTitle, { color: colors.text }]}>{t('settings.title')}</Text>
        </View>

        {/* Baby Profile */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('settings.profileSectionTitle', { label: childLabel })}
              </Text>
            <TouchableOpacity testID="settings-edit-profile-btn" onPress={() => setShowEditProfile(true)} style={[styles.editProfileBtn, { backgroundColor: withOpacity(colors.primary, '15') }]}>
              <Text style={[styles.editProfileText, { color: colors.primary }]}>{t('settings.editProfileTitle', { label: childLabel })}</Text>
            </TouchableOpacity>
          </View>
          {childName ? (
            <View style={styles.profileRow}>
              <ProfileAvatar size="md" photoUri={profilePhotoUri} sex={childSex} showDecorations={false} testID="settings-profile-emoji" />
              <View style={styles.profileTextCol}>
                <Text style={[styles.sectionDesc, styles.profileNameInline, { color: colors.textSecondary }]} testID="settings-profile-name">
                  {childName} · {sexLabel}
                </Text>
                {childBirthDate ? (
                  <>
                    <Text style={[styles.profileBirth, { color: colors.textMuted }]} testID="settings-profile-birth">
                      {t('settings.profileBirthLabel')}: {formatDisplayDate(childBirthDate)}
                    </Text>
                    <Text style={[styles.profileBirth, { color: colors.textMuted }]}>
                      {formatAgeText(childBirthDate, t)}
                    </Text>
                  </>
                ) : null}
              </View>
            </View>
          ) : (
            <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>{t('settings.noProfile')}</Text>
          )}
        </Card>

        {/* Language */}
        <Card style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="globe-outline" size={17} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('settings.language')}</Text>
          </View>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>{t('settings.languageDesc')}</Text>
          <View style={styles.languageRow}>
            {LANGUAGES.map(lang => (
              <TouchableOpacity
                key={lang.locale}
                style={[
                  styles.langBtn,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  locale === lang.locale && styles.langBtnActive,
                  locale === lang.locale && { borderColor: colors.primary, backgroundColor: withOpacity(colors.primary, '10') },
                ]}
                onPress={() => setLocale(lang.locale)}
              >
                <Text style={styles.langFlag}>{lang.flag}</Text>
                <Text style={[
                  styles.langLabel,
                  { color: colors.textSecondary },
                  locale === lang.locale && styles.langLabelActive,
                  locale === lang.locale && { color: colors.primary },
                ]}>
                  {lang.label}
                </Text>
                {locale === lang.locale && (
                  <Ionicons name="checkmark" size={14} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Notifications */}
        <Card style={styles.section} testID="settings-notifications-card">
          <View style={styles.sectionTitleRow}>
            <Ionicons name="notifications-outline" size={17} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]} testID="settings-notifications-title">
              {t('notifications.sectionTitle')}
            </Text>
          </View>
          <View style={styles.notifToggleRow}>
            <Text style={[styles.notifToggleLabel, { color: colors.text }]}>
              {t('notifications.enableToggle')}
            </Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
              testID="settings-notifications-toggle"
            />
          </View>
          {!notificationsEnabled && (
            <Text style={[styles.sectionDesc, { color: colors.textMuted, marginBottom: 0, marginTop: 6 }]} testID="settings-notifications-hint">
              {permissionDenied
                ? t('notifications.permissionDeniedHint')
                : t('notifications.disabledHint')}
            </Text>
          )}
        </Card>

        {/* Categories */}
        <Card style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="pricetag-outline" size={17} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]} testID="settings-categories-title">{t('settings.categories')}</Text>
          </View>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>{t('settings.categoriesDesc')}</Text>
          {categoriesExpanded && (
            <>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.categoryRow}
                  onPress={() => setEditCategory({ id: cat.id, name: categoryName(cat.name), color: cat.color, emoji: cat.emoji })}
                >
                  <View style={[styles.categoryDot, { backgroundColor: cat.color + '25' }]}>
                    <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  </View>
                  <Text style={[styles.categoryRowName, { color: colors.text }]} numberOfLines={1}>
                    {categoryName(cat.name)}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[styles.addCategoryBtn, { borderColor: colors.primary }]} onPress={() => setShowAddCategory(true)} testID="settings-add-category-btn">
                <Ionicons name="add" size={16} color={colors.primary} />
                <Text style={[styles.addCategoryBtnText, { color: colors.primary }]}>{t('words.addCategory')}</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            style={[styles.categoriesExpandBtn, { borderColor: colors.border }]}
            onPress={() => setCategoriesExpanded(prev => !prev)}
            testID="settings-categories-expand-btn"
            accessibilityRole="button"
            accessibilityLabel={categoriesExpanded ? t('settings.categoriesCollapse') : t('settings.categoriesExpand')}
          >
            <Text style={[styles.categoriesExpandText, { color: colors.primary }]}>
              {categoriesExpanded ? t('settings.categoriesCollapse') : t('settings.categoriesExpand')}
            </Text>
            <Ionicons name={categoriesExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
          </TouchableOpacity>
        </Card>

        {/* Import */}
        <Card style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="cloud-download-outline" size={17} color={colors.textSecondary} testID="settings-import-icon" />
            <Text style={[styles.sectionTitle, { color: colors.text }]} testID="settings-import-title">{t('settings.importWords')}</Text>
          </View>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>{t('settings.importDesc')}</Text>
          <Button
            title={t('settings.importBtn')}
            onPress={() => setShowImport(true)}
            style={styles.actionButton}
            icon={<Ionicons name="download-outline" size={16} color={colors.textOnPrimary} testID="settings-import-btn-icon" />}
            testID="settings-import-btn"
          />
        </Card>

        {/* Export */}
        <View onLayout={(e) => { exportSectionYRef.current = e.nativeEvent.layout.y; }}>
        <Card style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="cloud-upload-outline" size={17} color={colors.textSecondary} testID="settings-export-icon" />
            <Text style={[styles.sectionTitle, { color: colors.text }]} testID="settings-export-title">{t('settings.exportData')}</Text>
          </View>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>{t('settings.exportDesc')}</Text>

          {/* Export format selector */}
          <View style={styles.exportModeRow}>
            <TouchableOpacity
              style={[
                styles.exportModeCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                exportMode === 'zip' && { borderColor: colors.primary, backgroundColor: withOpacity(colors.primary, '10') },
              ]}
              onPress={() => setExportMode('zip')}
              testID="settings-export-mode-zip"
            >
              <Text style={styles.exportModeIcon}>📦</Text>
              <Text style={[styles.exportModeTitle, { color: exportMode === 'zip' ? colors.primary : colors.text }]}>{t('backup.zipCardTitle')}</Text>
              <Text style={[styles.exportModeDesc, { color: colors.textSecondary }]}>{t('backup.zipCardDesc')}</Text>
              {exportMode === 'zip' && <Ionicons name="checkmark-circle" size={16} color={colors.primary} style={styles.exportModeCheck} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.exportModeCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                exportMode === 'csv' && { borderColor: colors.primary, backgroundColor: withOpacity(colors.primary, '10') },
              ]}
              onPress={() => setExportMode('csv')}
              testID="settings-export-mode-csv"
            >
              <Text style={styles.exportModeIcon}>📄</Text>
              <Text style={[styles.exportModeTitle, { color: exportMode === 'csv' ? colors.primary : colors.text }]}>{t('backup.csvCardTitle')}</Text>
              <Text style={[styles.exportModeDesc, { color: colors.textSecondary }]}>{t('backup.csvCardDesc')}</Text>
              {exportMode === 'csv' && <Ionicons name="checkmark-circle" size={16} color={colors.primary} style={styles.exportModeCheck} />}
            </TouchableOpacity>
          </View>

          <View style={styles.buttonRow}>
            <Button
              title={saving ? t('backup.saving') : t('settings.saveToDrive')}
              onPress={handleSaveToDevice}
              loading={saving}
              icon={<Ionicons name="save-outline" size={16} color={colors.textOnPrimary} testID="settings-save-btn-icon" />}
              style={[styles.flexBtn, styles.exportBtn]}
              textStyle={styles.exportButtonText}
              testID="settings-save-btn"
            />
            <Button
              title={exporting ? t('backup.sharing') : t('settings.shareExport')}
              onPress={handleShare}
              loading={exporting}
              variant="outline"
              icon={<Ionicons name="share-social-outline" size={16} color={colors.primary} testID="settings-share-btn-icon" />}
              style={[styles.flexBtn, styles.exportBtn]}
              textStyle={styles.exportButtonText}
              testID="settings-share-btn"
            />
          </View>
        </Card>
        </View>

        {/* Danger Zone */}
        <Card style={[styles.section, styles.dangerCard, { borderColor: withOpacity(colors.error, '40') }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('settings.dangerZone')}</Text>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>{t('settings.dangerDesc')}</Text>
          <TouchableOpacity
            style={[styles.dangerBtn, { backgroundColor: withOpacity(colors.error, '15'), borderColor: colors.error }]}
            onPress={handleClearData}
            testID="settings-delete-all-btn"
          >
            <Text style={[styles.dangerBtnText, { color: colors.error }]}>{t('settings.deleteAll')}</Text>
          </TouchableOpacity>
        </Card>

        {/* About */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('settings.about')}</Text>
          <Text style={[styles.aboutText, { color: colors.textSecondary }]}>{t('settings.aboutText')}</Text>
          <Text style={[styles.versionText, { color: colors.textSecondary }]}>
            {t('settings.version')} {Constants.expoConfig?.version ?? '—'}
          </Text>
        </Card>

        <View style={styles.bottomSpacer} />

        <ImportModal
          visible={showImport}
          onClose={() => setShowImport(false)}
          onImported={() => setShowImport(false)}
        />

        <AddCategoryModal
          visible={showAddCategory || !!editCategory}
          onClose={() => { setShowAddCategory(false); setEditCategory(null); }}
          onSave={() => setEditCategory(null)}
          onDeleted={() => setEditCategory(null)}
          editCategory={editCategory}
        />

        <EditProfileModal
          visible={showEditProfile}
          onClose={() => setShowEditProfile(false)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 20 },
  pageTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  pageTitle: { fontSize: 26, fontWeight: '900' },
  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  sectionDesc: { fontSize: 13, lineHeight: 18, marginBottom: 14 },
  actionButton: { marginTop: 4 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  exportButtonText: { fontSize: 12, fontWeight: '700' },
  flexBtn: { flex: 1 },
  exportBtn: { paddingVertical: 10, paddingHorizontal: 8 },
  aboutText: { fontSize: 14, lineHeight: 22 },
  versionText: { fontSize: 12, marginTop: 8, opacity: 0.6 },
  dangerCard: { borderWidth: 1.5 },
  dangerBtn: { borderWidth: 1.5, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  dangerBtnText: { fontWeight: '700', fontSize: 15 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  categoryDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  categoryEmoji: { fontSize: 18 },
  categoryRowName: { flex: 1, fontSize: 15, fontWeight: '500' },
  addCategoryBtn: { marginTop: 8, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  addCategoryBtnText: { fontWeight: '700', fontSize: 14 },
  editProfileBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  editProfileText: { fontSize: 13, fontWeight: '700' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4 },
  profileTextCol: { flex: 1 },
  profileNameInline: { marginBottom: 0 },
  profileBirth: { fontSize: 12, marginTop: 2 },
  // Language picker
  languageRow: { flexDirection: 'row', gap: 10 },
  langBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 14,
    borderWidth: 2,
  },
  langBtnActive: {},
  langFlag: { fontSize: 20 },
  langLabel: { fontSize: 14, fontWeight: '600' },
  langLabelActive: { fontWeight: '800' },
  bottomSpacer: { height: 40 },
  categoriesExpandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  categoriesExpandText: {
    fontSize: 13,
    fontWeight: '700',
  },
  notifToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  notifToggleLabel: { fontSize: 15, fontWeight: '600', flex: 1 },
  exportModeRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  exportModeCard: {
    flex: 1, borderRadius: 14, borderWidth: 2, padding: 12,
    alignItems: 'flex-start', gap: 4, position: 'relative',
  },
  exportModeIcon: { fontSize: 22, marginBottom: 2 },
  exportModeTitle: { fontSize: 13, fontWeight: '800' },
  exportModeDesc: { fontSize: 11, lineHeight: 15 },
  exportModeCheck: { position: 'absolute', top: 8, right: 8 },
});
