import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { clearAllData } from '../../src/database/database';
import { AddCategoryModal, CategoryToEdit } from '../../src/components/AddCategoryModal';
import { useCategoryName, useI18n, LANGUAGES } from '../../src/i18n/i18n';
import { COLORS } from '../../src/utils/theme';
import { withOpacity } from '../../src/utils/colorHelpers';
import { saveCSVToDevice, shareCSV, buildCategoryResolver, buildCSVHeader } from '../../src/utils/csvExport';
import { Card, Button } from '../../src/components/UIComponents';
import Constants from 'expo-constants';
import { ImportModal } from '../../src/components/ImportModal';
import { useCategories } from '../../src/hooks/useCategories';
import { useSettingsStore } from '../../src/stores/settingsStore';

function getSexDisplay(sex: string | undefined | null, t: (key: string) => string): { emoji: string; label: string } {
  if (sex === 'girl') return { emoji: '👧', label: t('settings.girl') };
  if (sex === 'boy') return { emoji: '👦', label: t('settings.boy') };
  return { emoji: '👶', label: '—' };
}

export default function SettingsScreen() {
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
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

  const { emoji: sexEmoji, label: sexLabel } = getSexDisplay(childSex, t);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>{t('settings.title')}</Text>

        {/* Baby Profile */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {sexEmoji} {t('settings.babyProfile')}
            </Text>
            <TouchableOpacity onPress={() => router.push('/onboarding')} style={styles.editProfileBtn}>
              <Text style={styles.editProfileText}>{t('settings.editProfile')}</Text>
            </TouchableOpacity>
          </View>
          {childName ? (
            <Text style={styles.sectionDesc}>{childName} · {sexLabel}</Text>
          ) : (
            <Text style={styles.sectionDesc}>{t('settings.noProfile')}</Text>
          )}
        </Card>

        {/* Language */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>🌐 {t('settings.language')}</Text>
          <Text style={styles.sectionDesc}>{t('settings.languageDesc')}</Text>
          <View style={styles.languageRow}>
            {LANGUAGES.map(lang => (
              <TouchableOpacity
                key={lang.locale}
                style={[
                  styles.langBtn,
                  locale === lang.locale && styles.langBtnActive,
                ]}
                onPress={() => setLocale(lang.locale)}
              >
                <Text style={styles.langFlag}>{lang.flag}</Text>
                <Text style={[
                  styles.langLabel,
                  locale === lang.locale && styles.langLabelActive,
                ]}>
                  {lang.label}
                </Text>
                {locale === lang.locale && (
                  <Text style={styles.langCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Categories */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle} testID="settings-categories-title">🏷️ {t('settings.categories')}</Text>
          <Text style={styles.sectionDesc}>{t('settings.categoriesDesc')}</Text>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={styles.categoryRow}
              onPress={() => setEditCategory({ id: cat.id, name: categoryName(cat.name), color: cat.color, emoji: cat.emoji })}
            >
              <View style={[styles.categoryDot, { backgroundColor: cat.color + '25' }]}>
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              </View>
              <Text style={styles.categoryRowName} numberOfLines={1}>
                {categoryName(cat.name)}
              </Text>
              <Text style={styles.categoryChevron}>›</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.addCategoryBtn} onPress={() => setShowAddCategory(true)}>
            <Text style={styles.addCategoryBtnText}>{t('words.addCategory')}</Text>
          </TouchableOpacity>
        </Card>

        {/* Import */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle} testID="settings-import-title">{t('settings.importWords')}</Text>
          <Text style={styles.sectionDesc}>{t('settings.importDesc')}</Text>
          <Button title={t('settings.importBtn')} onPress={() => setShowImport(true)} style={styles.actionButton} testID="settings-import-btn" />
        </Card>

        {/* Export */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle} testID="settings-export-title">{t('settings.exportData')}</Text>
          <Text style={styles.sectionDesc}>{t('settings.exportDesc')}</Text>
          <View style={styles.buttonRow}>
            <Button
              title={saving ? t('settings.saving') : t('settings.saveToDrive')}
              onPress={handleSaveToDevice}
              loading={saving}
              style={[styles.flexBtn, styles.exportBtn]}
              textStyle={styles.exportButtonText}
              testID="settings-save-btn"
            />
            <Button
              title={exporting ? t('settings.sharing') : t('settings.shareExport')}
              onPress={handleShare}
              loading={exporting}
              variant="outline"
              style={[styles.flexBtn, styles.exportBtn]}
              textStyle={styles.exportButtonText}
              testID="settings-share-btn"
            />
          </View>
        </Card>

        {/* Danger Zone */}
        <Card style={[styles.section, styles.dangerCard]}>
          <Text style={styles.sectionTitle}>{t('settings.dangerZone')}</Text>
          <Text style={styles.sectionDesc}>{t('settings.dangerDesc')}</Text>
          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={handleClearData}
            testID="settings-delete-all-btn"
          >
            <Text style={styles.dangerBtnText}>{t('settings.deleteAll')}</Text>
          </TouchableOpacity>
        </Card>

        {/* About */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.about')}</Text>
          <Text style={styles.aboutText}>{t('settings.aboutText')}</Text>
          <Text style={styles.versionText}>
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
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20 },
  pageTitle: { fontSize: 26, fontWeight: '900', color: COLORS.text, marginBottom: 20 },
  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  sectionDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 14 },
  actionButton: { marginTop: 4 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  exportButtonText: { fontSize: 12, fontWeight: '700' },
  flexBtn: { flex: 1 },
  exportBtn: { paddingVertical: 10, paddingHorizontal: 8 },
  aboutText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
  versionText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8, opacity: 0.6 },
  dangerCard: { borderWidth: 1.5, borderColor: withOpacity(COLORS.error, '40') },
  dangerBtn: { backgroundColor: withOpacity(COLORS.error, '15'), borderWidth: 1.5, borderColor: COLORS.error, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  dangerBtnText: { color: COLORS.error, fontWeight: '700', fontSize: 15 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  categoryDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  categoryEmoji: { fontSize: 18 },
  categoryRowName: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '500' },
  categoryChevron: { fontSize: 22, color: COLORS.textLight, fontWeight: '300' },
  addCategoryBtn: { marginTop: 8, borderWidth: 1.5, borderColor: COLORS.primary, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  addCategoryBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  editProfileBtn: { backgroundColor: withOpacity(COLORS.primary, '15'), paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  editProfileText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  // Language picker
  languageRow: { flexDirection: 'row', gap: 10 },
  langBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 14,
    backgroundColor: COLORS.white, borderWidth: 2, borderColor: COLORS.border,
  },
  langBtnActive: { borderColor: COLORS.primary, backgroundColor: withOpacity(COLORS.primary, '10') },
  langFlag: { fontSize: 20 },
  langLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  langLabelActive: { color: COLORS.primary, fontWeight: '800' },
  langCheck: { fontSize: 13, color: COLORS.primary, fontWeight: '900' },
  bottomSpacer: { height: 40 },
});
