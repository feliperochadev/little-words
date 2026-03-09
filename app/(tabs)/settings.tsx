import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSetting, clearAllData, getCategories, Category } from '../../src/database/database';
import { AddCategoryModal, CategoryToEdit } from '../../src/components/AddCategoryModal';
import { useCategoryName } from '../../src/i18n/i18n';
import { COLORS } from '../../src/utils/theme';
import { saveCSVToDevice, shareCSV, buildCategoryResolver } from '../../src/utils/csvExport';
import {
  isGoogleConnected, signInWithGoogle, signOutGoogle,
  performSync, getGoogleUserEmail,
} from '../../src/utils/googleDrive';
import { Card, Button } from '../../src/components/UIComponents';
import Constants from 'expo-constants';
import { SvgXml } from 'react-native-svg';
import { ImportModal } from '../../src/components/ImportModal';
import { useI18n, LANGUAGES, type Locale } from '../../src/i18n/i18n';

const GOOGLE_DRIVE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 32 32">
  <path fill="#4285f4" d="M29.5,21l-3.1708,5.5489A3.07,3.07,0,0,1,23.6459,28H8.3541a3.07,3.07,0,0,1-2.6833-1.4511L4.3687,24.27,9.7578,21Z"/>
  <path fill="#00ac47" d="M12.3822,4.13a3.2262,3.2262,0,0,0-1.7067,1.4276L2.9591,18.76a3.07,3.07,0,0,0-.1012,3.0489l1.53,2.4658L9.7579,21,16,10.32Z"/>
  <path fill="#0066da" d="M9.7578,21H2.568a2.6543,2.6543,0,0,0,.29.8089L4.38,24.2632l-.0115.007L5.6709,26.549A2.8267,2.8267,0,0,0,7.008,27.6974L9.7578,21l-.0081.0049Z"/>
  <path fill="#ffba00" d="M19.6068,4.13a3.2256,3.2256,0,0,1,1.7066,1.4276L29.03,18.76a3.07,3.07,0,0,1,.1013,3.0489l-1.5295,2.4658L22.2311,21,15.9889,10.32Z"/>
  <path fill="#ea4435" d="M22.2311,21h7.19a2.6541,2.6541,0,0,1-.29.8089l-1.5224,2.4544.0116.007L26.3181,26.549a2.8272,2.8272,0,0,1-1.3371,1.1484L22.2312,21l.0081.0049Z"/>
  <path fill="#188038" d="M19.6155,4.1342l.0023-.004a2.7726,2.7726,0,0,0-.3609-.0983L16,4l-3.2569.0319a2.7726,2.7726,0,0,0-.3609.0983,3.0224,3.0224,0,0,0-.367.1666L15.9889,10.32,19.977,4.2993A3.03,3.03,0,0,0,19.6155,4.1342Z"/>
</svg>`;

export default function SettingsScreen() {
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const categoryName = useCategoryName();
  const categoryResolver = buildCategoryResolver(t);

  const [categories, setCategories] = useState<Category[]>([]);
  const [editCategory, setEditCategory] = useState<CategoryToEdit | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);

  const [childName, setChildName] = useState('');
  const [childSex, setChildSex] = useState<'boy' | 'girl' | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const load = async () => {
    const connected = await isGoogleConnected();
    setGoogleConnected(connected);
    if (connected) {
      setGoogleEmail(await getGoogleUserEmail());
      setLastSync(await getSetting('google_last_sync'));
    }
    const name = await getSetting('child_name');
    const sex = await getSetting('child_sex');
    if (name) setChildName(name);
    if (sex) setChildSex(sex as 'boy' | 'girl');
    setCategories(await getCategories());
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const handleShare = async () => {
    setExporting(true);
    const result = await shareCSV(categoryResolver);
    setExporting(false);
    if (!result.success) Alert.alert(t('common.error'), result.error || t('settings.errorShare'));
  };

  const handleSaveToDevice = async () => {
    setSaving(true);
    const result = await saveCSVToDevice(categoryResolver);
    setSaving(false);
    if (result.success) {
      Alert.alert(t('settings.saveCsvSuccess'), t('settings.saveCsvMsg'));
    } else if (result.error !== 'cancelled') {
      Alert.alert(t('common.error'), result.error || t('settings.errorShare'));
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    const result = await performSync();
    setSyncing(false);
    if (result.success) {
      setLastSync(result.lastSync || null);
      Alert.alert(t('settings.syncSuccess'), t('settings.syncSuccessMsg'));
    } else if (result.error !== 'cancelled') {
      Alert.alert(t('common.error'), result.error || t('settings.errorSync'));
      if (result.error?.includes('expirada') || result.error?.includes('expired')) {
        setGoogleConnected(false);
        setGoogleEmail(null);
      }
    }
  };

  const handleSignIn = async () => {
    setSigningIn(true);
    const result = await signInWithGoogle();
    setSigningIn(false);
    if (result.success) {
      await load();
      performSync().catch(console.error);
    } else if (result.error && result.error !== 'cancelled' && result.error !== 'in_progress') {
      Alert.alert(t('common.error'), result.error);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      t('settings.disconnectTitle'),
      t('settings.disconnectMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.disconnect'), style: 'destructive',
          onPress: async () => {
            await signOutGoogle();
            setGoogleConnected(false);
            setGoogleEmail(null);
            setLastSync(null);
          },
        },
      ]
    );
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
                  onPress: async () => {
                    await clearAllData();
                    router.replace('/onboarding');
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleString(locale === 'pt-BR' ? 'pt-BR' : 'en-US'); }
    catch { return iso; }
  };

  const sexLabel = childSex === 'girl'
    ? t('settings.girl')
    : childSex === 'boy'
      ? t('settings.boy')
      : '—';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>{t('settings.title')}</Text>

        {/* Baby Profile */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {childSex === 'girl' ? '👧' : childSex === 'boy' ? '👦' : '👶'} {t('settings.babyProfile')}
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
                onPress={() => setLocale(lang.locale as Locale)}
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

        {/* Import */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.importWords')}</Text>
          <Text style={styles.sectionDesc}>{t('settings.importDesc')}</Text>
          <Button title={t('settings.importBtn')} onPress={() => setShowImport(true)} style={styles.actionButton} />
        </Card>

        {/* Export */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.exportData')}</Text>
          <Text style={styles.sectionDesc}>{t('settings.exportDesc')}</Text>
          <View style={styles.buttonRow}>
            <Button
              title={saving ? t('settings.saving') : t('settings.saveToDrive')}
              onPress={handleSaveToDevice}
              loading={saving}
              style={[styles.flexBtn, styles.exportBtn]}
              textStyle={{ fontSize: 12, fontWeight: '700' }}
            />
            <Button
              title={exporting ? t('settings.sharing') : t('settings.shareExport')}
              onPress={handleShare}
              loading={exporting}
              variant="outline"
              style={[styles.flexBtn, styles.exportBtn]}
              textStyle={{ fontSize: 12, fontWeight: '700' }}
            />
          </View>
        </Card>

        {/* Google Drive */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <SvgXml xml={GOOGLE_DRIVE_SVG} width={20} height={20} />
              <Text style={styles.sectionTitle}>{t('settings.googleDrive')}</Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: googleConnected ? COLORS.success : COLORS.textLight }]} />
          </View>

          {googleConnected ? (
            <>
              <View style={styles.connectedRow}>
                <View style={styles.connectedIcon}>
                  <Text style={styles.connectedIconText}>✓</Text>
                </View>
                <View style={styles.connectedInfo}>
                  <Text style={styles.connectedLabel}>{t('settings.autoBackupActive')}</Text>
                  {googleEmail ? <Text style={styles.connectedEmail}>{googleEmail}</Text> : null}
                </View>
              </View>
              {lastSync ? (
                <Text style={styles.lastSync}>{t('settings.lastSync', { date: formatDate(lastSync) })}</Text>
              ) : null}
              <View style={styles.buttonRow}>
                <Button
                  title={syncing ? t('settings.syncing') : t('settings.sync')}
                  onPress={handleSync}
                  loading={syncing}
                  style={styles.flexBtn}
                />
                <Button
                  title={t('settings.disconnect')}
                  onPress={handleSignOut}
                  variant="outline"
                  style={styles.flexBtn}
                />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.sectionDesc}>{t('settings.googleDesc')}</Text>
              <Button
                title={signingIn ? t('settings.connecting') : t('settings.connectGoogle')}
                onPress={handleSignIn}
                loading={signingIn}
                style={styles.actionButton}
              />
            </>
          )}
        </Card>

        {/* Categories */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>🏷️ {t('settings.categories')}</Text>
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

        {/* Danger Zone */}
        <Card style={[styles.section, styles.dangerCard]}>
          <Text style={styles.sectionTitle}>{t('settings.dangerZone')}</Text>
          <Text style={styles.sectionDesc}>{t('settings.dangerDesc')}</Text>
          <TouchableOpacity style={styles.dangerBtn} onPress={handleClearData}>
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

        <View style={{ height: 40 }} />

        <ImportModal
          visible={showImport}
          onClose={() => setShowImport(false)}
          onImported={load}
        />

        <AddCategoryModal
          visible={showAddCategory || !!editCategory}
          onClose={() => { setShowAddCategory(false); setEditCategory(null); }}
          onSave={() => { load(); setEditCategory(null); }}
          onDeleted={() => { load(); setEditCategory(null); }}
          editCategory={editCategory}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20 },
  pageTitle: { fontSize: 26, fontWeight: '900', color: COLORS.text, marginBottom: 20 },
  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  sectionDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 14 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  lastSync: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 12 },
  actionButton: { marginTop: 4 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  flexBtn: { flex: 1 },
  exportBtn: { paddingVertical: 10, paddingHorizontal: 8 },
  connectedRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  connectedIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.success + '20', alignItems: 'center', justifyContent: 'center' },
  connectedIconText: { fontSize: 18, color: COLORS.success, fontWeight: '800' },
  connectedInfo: { flex: 1 },
  connectedLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  connectedEmail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  aboutText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
  versionText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8, opacity: 0.6 },
  dangerCard: { borderWidth: 1.5, borderColor: COLORS.error + '40' },
  dangerBtn: { backgroundColor: COLORS.error + '15', borderWidth: 1.5, borderColor: COLORS.error, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  dangerBtnText: { color: COLORS.error, fontWeight: '700', fontSize: 15 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  categoryDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  categoryEmoji: { fontSize: 18 },
  categoryRowName: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '500' },
  categoryChevron: { fontSize: 22, color: COLORS.textLight, fontWeight: '300' },
  addCategoryBtn: { marginTop: 8, borderWidth: 1.5, borderColor: COLORS.primary, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  addCategoryBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  editProfileBtn: { backgroundColor: COLORS.primary + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  editProfileText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  // Language picker
  languageRow: { flexDirection: 'row', gap: 10 },
  langBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 14,
    backgroundColor: COLORS.white, borderWidth: 2, borderColor: COLORS.border,
  },
  langBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  langFlag: { fontSize: 20 },
  langLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  langLabelActive: { color: COLORS.primary, fontWeight: '800' },
  langCheck: { fontSize: 13, color: COLORS.primary, fontWeight: '900' },
});