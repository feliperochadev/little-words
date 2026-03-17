import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { clearAllData } from '../../src/services/settingsService';
import { AddCategoryModal, CategoryToEdit } from '../../src/components/AddCategoryModal';
import { useCategoryName, useI18n, LANGUAGES } from '../../src/i18n/i18n';
import { withOpacity } from '../../src/utils/colorHelpers';
import { saveCSVToDevice, shareCSV, buildCategoryResolver, buildCSVHeader } from '../../src/utils/csvExport';
import { Card, Button } from '../../src/components/UIComponents';
import Constants from 'expo-constants';
import { ImportModal } from '../../src/components/ImportModal';
import { useCategories } from '../../src/hooks/useCategories';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useTheme } from '../../src/hooks/useTheme';

function getSexDisplay(sex: string | undefined | null, t: (key: string) => string): string {
  if (sex === 'girl') return t('settings.girl');
  if (sex === 'boy') return t('settings.boy');
  return '—';
}

export default function SettingsScreen() {
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const { colors } = useTheme();
  const categoryName = useCategoryName();
  const categoryResolver = buildCategoryResolver(t);
  const csvHeader = buildCSVHeader(t);

  const { data: categories = [] } = useCategories();
  const { name: childName, sex: childSex } = useSettingsStore();

  const [editCategory, setEditCategory] = useState<CategoryToEdit | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const handleShare = async () => {
    setExporting(true);
    const result = await shareCSV(categoryResolver, csvHeader, t);
    setExporting(false);
    if (!result.success) Alert.alert(t('common.error'), result.error || t('settings.errorShare'));
  };

  const handleSaveToDevice = async () => {
    setSaving(true);
    const result = await saveCSVToDevice(categoryResolver, csvHeader, t);
    setSaving(false);
    if (result.success) {
      Alert.alert(t('settings.saveCsvSuccess'), t('settings.saveCsvMsg'));
    } else if (result.error !== 'cancelled') {
      Alert.alert(t('common.error'), result.error || t('settings.errorShare'));
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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
        <View style={styles.pageTitleRow}>
          <Ionicons name="settings-outline" size={22} color={colors.primary} testID="settings-title-icon" />
          <Text style={[styles.pageTitle, { color: colors.text }]}>{t('settings.title')}</Text>
        </View>

        {/* Baby Profile */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('settings.babyProfile')}
              </Text>
            <TouchableOpacity testID="settings-edit-profile-btn" onPress={() => router.push('/onboarding')} style={[styles.editProfileBtn, { backgroundColor: withOpacity(colors.primary, '15') }]}>
              <Text style={[styles.editProfileText, { color: colors.primary }]}>{t('settings.editProfile')}</Text>
            </TouchableOpacity>
          </View>
          {childName ? (
            <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>{childName} · {sexLabel}</Text>
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

        {/* Categories */}
        <Card style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="pricetag-outline" size={17} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]} testID="settings-categories-title">{t('settings.categories')}</Text>
          </View>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>{t('settings.categoriesDesc')}</Text>
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
          <TouchableOpacity style={[styles.addCategoryBtn, { borderColor: colors.primary }]} onPress={() => setShowAddCategory(true)}>
            <Text style={[styles.addCategoryBtnText, { color: colors.primary }]}>{t('words.addCategory')}</Text>
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
        <Card style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="cloud-upload-outline" size={17} color={colors.textSecondary} testID="settings-export-icon" />
            <Text style={[styles.sectionTitle, { color: colors.text }]} testID="settings-export-title">{t('settings.exportData')}</Text>
          </View>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>{t('settings.exportDesc')}</Text>
          <View style={styles.buttonRow}>
            <Button
              title={saving ? t('settings.saving') : t('settings.saveToDrive')}
              onPress={handleSaveToDevice}
              loading={saving}
              icon={<Ionicons name="save-outline" size={16} color={colors.textOnPrimary} testID="settings-save-btn-icon" />}
              style={[styles.flexBtn, styles.exportBtn]}
              textStyle={styles.exportButtonText}
              testID="settings-save-btn"
            />
            <Button
              title={exporting ? t('settings.sharing') : t('settings.shareExport')}
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
  addCategoryBtn: { marginTop: 8, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  addCategoryBtnText: { fontWeight: '700', fontSize: 14 },
  editProfileBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  editProfileText: { fontSize: 13, fontWeight: '700' },
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
});
