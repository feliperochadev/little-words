import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  StyleSheet, ScrollView, Alert, ActivityIndicator, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { File as FSFile } from 'expo-file-system';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../hooks/useTheme';
import { getCategories, addCategory } from '../services/categoryService';
import { findWordByName, addWord } from '../services/wordService';
import { addVariant } from '../services/variantService';
import { QUERY_KEYS } from '../hooks/queryKeys';
import { useModalAnimation } from '../hooks/useModalAnimation';
import { useI18n } from '../i18n/i18n';
import { DEFAULT_CATEGORIES, canonicalizeCategoryName, categoryLookupKey } from '../utils/categoryKeys';
import { parseTextInput, parseCSV, type ParsedRow } from '../utils/importHelpers';

interface ImportModalProps {
  visible: boolean;
  onClose: () => void;
  onImported: () => void;
}

interface ImportResult {
  wordsAdded: number;
  variantsAdded: number;
  skipped: string[];
  errors: string[];
}

const DEFAULT_IMPORT_CATEGORY_COLOR = DEFAULT_CATEGORIES.find(({ key }) => key === 'others')?.color ?? '#9CA3AF';

async function addVariantsForWord(wordId: number, rows: ParsedRow[], today: string): Promise<number> {
  let count = 0;
  for (const row of rows) {
    if (row.variant?.trim()) {
      await addVariant(wordId, row.variant.trim(), row.date || today);
      count++;
    }
  }
  return count;
}

async function processGroup(
  group: { rows: ParsedRow[] },
  result: ImportResult,
  getOrCreateCat: (name: string) => Promise<number>,
): Promise<void> {
  const firstRow = group.rows[0];
  let categoryId: number | null = null;
  if (firstRow.category) categoryId = await getOrCreateCat(firstRow.category);
  const today = new Date().toISOString().split('T')[0];
  const dateAdded = firstRow.date || today;
  const existing = await findWordByName(firstRow.word);
  let wordId: number;
  if (existing) { wordId = existing.id; result.skipped.push(firstRow.word); }
  else { wordId = await addWord(firstRow.word, categoryId, dateAdded); result.wordsAdded++; }
  result.variantsAdded += await addVariantsForWord(wordId, group.rows, today);
}

async function importRows(rows: ParsedRow[]): Promise<ImportResult> {
  const result: ImportResult = { wordsAdded: 0, variantsAdded: 0, skipped: [], errors: [] };
  const existingCats = await getCategories();
  const catMap = new Map<string, number>();
  for (const c of existingCats) catMap.set(categoryLookupKey(c.name), c.id);

  const getOrCreateCat = async (name: string): Promise<number> => {
    const normalized = canonicalizeCategoryName(name);
    const key = categoryLookupKey(normalized);
    if (catMap.has(key)) return catMap.get(key)!;
    const id = await addCategory(normalized, DEFAULT_IMPORT_CATEGORY_COLOR, '🏷️');
    catMap.set(key, id);
    return id;
  };

  const grouped = new Map<string, { rows: ParsedRow[] }>();
  for (const row of rows) {
    const key = row.word.toLowerCase();
    if (!grouped.has(key)) grouped.set(key, { rows: [] });
    grouped.get(key)!.rows.push(row);
  }

  for (const [, group] of grouped) {
    try {
      await processGroup(group, result, getOrCreateCat);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'error';
      result.errors.push(`"${group.rows[0].word}": ${message}`);
    }
  }
  return result;
}

export function ImportModal({ visible, onClose, onImported }: Readonly<ImportModalProps>) {
  const { t, tc } = useI18n();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const [tab, setTab]               = useState<'text' | 'csv'>('text');
  const [textInput, setTextInput]   = useState('');
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);
  const [preview, setPreview]       = useState<ParsedRow[]>([]);

  const reset = () => { setTextInput(''); setCsvFileName(null); setCsvContent(null); setPreview([]); };
  const handleClose = () => { reset(); onClose(); };

  // Modal animation and gesture handling
  const { translateY, backdropOpacity, dismissModal, panResponder } = useModalAnimation(visible, handleClose);

  const updateTextPreview = (text: string) => {
    setTextInput(text);
    setPreview(text.trim() ? parseTextInput(text).slice(0, 5) : []);
  };

  const handlePickCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv','text/plain','text/comma-separated-values','*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      const content = await new FSFile(file.uri).text();
      setCsvFileName(file.name);
      setCsvContent(content);
      setPreview(parseCSV(content).slice(0, 5));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t('common.error');
      Alert.alert(t('common.error'), t('importModal.errorReadFile', { error: message }));
    }
  };

  const handleImport = async () => {
    let rows: ParsedRow[] = [];
    if (tab === 'text') {
      rows = parseTextInput(textInput);
    } else {
      if (!csvContent) { Alert.alert(t('common.attention'), t('importModal.selectFileFirst')); return; }
      rows = parseCSV(csvContent);
    }
    if (!rows.length) { Alert.alert(t('common.attention'), t('importModal.noWordsFound')); return; }

    setLoading(true);
    try {
      const result = await importRows(rows);
      setLoading(false);
      [['words'], QUERY_KEYS.allVariants(), QUERY_KEYS.categories(), QUERY_KEYS.dashboard()].forEach(
        key => queryClient.invalidateQueries({ queryKey: key })
      );
      reset(); onImported(); onClose();

      const lines = [t('importModal.resultWords', { count: result.wordsAdded })];
      if (result.variantsAdded > 0) lines.push(t('importModal.resultVariants', { count: result.variantsAdded }));
      if (result.skipped.length > 0) {
        const wordList = result.skipped.slice(0, 3).join(', ') + (result.skipped.length > 3 ? '...' : '');
        lines.push(t('importModal.resultSkipped', { count: result.skipped.length, words: wordList }));
      }
      if (result.errors.length > 0) lines.push(t('importModal.resultErrors', { count: result.errors.length }));
      Alert.alert(t('importModal.resultTitle'), lines.join('\n'));
    } catch (e: unknown) {
      setLoading(false);
      const message = e instanceof Error ? e.message : t('common.error');
      Alert.alert(t('common.error'), message);
    }
  };

  const wordCount = (() => {
    if (tab === 'text') return parseTextInput(textInput).length;
    if (!csvContent) return 0;
    return parseCSV(csvContent).length;
  })();

  const importBtnLabel = wordCount > 0
    ? tc('importModal.importBtn', wordCount)
    : t('importModal.importZero');

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={dismissModal}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={dismissModal} />
      </Animated.View>
      <View style={styles.overlay} pointerEvents="box-none">
        <Animated.View style={[styles.container, { paddingBottom: 24 + insets.bottom, transform: [{ translateY }], backgroundColor: colors.background }]}>
          <View style={styles.handleWrap} {...panResponder.panHandlers}>
            <View style={[styles.handle, { backgroundColor: colors.textMuted }]} />
          </View>

          <View style={styles.titleRow}>
            <View style={styles.titleWrap}>
              <Ionicons name="download-outline" size={20} color={colors.primary} testID="import-title-icon" />
              <Text style={[styles.title, { color: colors.text }]} testID="modal-title-import">{t('importModal.title')}</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn} testID="import-close-btn">
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={[styles.tabs, { backgroundColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.tab, tab === 'text' && styles.tabActive, tab === 'text' && { backgroundColor: colors.surface, shadowColor: colors.text }]}
              onPress={() => { setTab('text'); setPreview([]); }}
              testID="import-tab-text"
            >
              <Text style={[styles.tabText, { color: colors.textSecondary }, tab === 'text' && styles.tabTextActive, tab === 'text' && { color: colors.text }]}>{t('importModal.tabText')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'csv' && styles.tabActive, tab === 'csv' && { backgroundColor: colors.surface, shadowColor: colors.text }]}
              onPress={() => { setTab('csv'); setPreview([]); }}
              testID="import-tab-csv"
            >
              <Text style={[styles.tabText, { color: colors.textSecondary }, tab === 'csv' && styles.tabTextActive, tab === 'csv' && { color: colors.text }]}>{t('importModal.tabCSV')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {tab === 'text' ? (
              <>
                <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('importModal.textHint')}</Text>
                <View style={[styles.exampleBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.exampleLabel, { color: colors.textSecondary }]}>{t('importModal.examplesLabel')}</Text>
                  <Text style={[styles.example, { color: colors.primary }]}>mamãe</Text>
                  <Text style={[styles.example, { color: colors.primary }]}>água, Comida</Text>
                  <Text style={[styles.example, { color: colors.primary }]}>cachorro, Animais, 15/03/2025</Text>
                </View>
                <TextInput
                  testID="import-text-input"
                  style={[styles.textBox, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={textInput}
                  onChangeText={updateTextPreview}
                  placeholder={'mamãe\nágua, Comida\ncachorro, Animais, 15/03/2025'}
                  placeholderTextColor={colors.textMuted}
                  multiline textAlignVertical="top" autoCapitalize="none" autoCorrect={false}
                />
              </>
            ) : (
              <>
                <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('importModal.csvHint')}</Text>
                <TouchableOpacity style={[styles.filePicker, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handlePickCSV} testID="import-csv-pick-btn">
                  <Ionicons name="folder-open-outline" size={22} color={colors.primary} style={styles.filePickerIcon} />
                  <Text style={[styles.filePickerText, { color: colors.textSecondary }]}>{csvFileName || t('importModal.pickFile')}</Text>
                </TouchableOpacity>
                {csvFileName && (
                  <TouchableOpacity onPress={() => { setCsvFileName(null); setCsvContent(null); setPreview([]); }}>
                    <Text style={[styles.clearFile, { color: colors.error }]}>{t('importModal.removeFile')}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {preview.length > 0 && (
              <View style={[styles.previewBox, { backgroundColor: colors.surface, borderColor: colors.primaryLight }]}>
                <Text style={[styles.previewTitle, { color: colors.primary }]} testID="import-preview-title">
                  {tc('importModal.previewTitle', wordCount)}
                </Text>
                {preview.map(row => (
                  <View key={`${row.word}-${row.category ?? ''}-${row.date ?? ''}-${row.variant ?? ''}`} style={styles.previewRow}>
                    <Text style={[styles.previewWord, { color: colors.text }]} testID={`import-preview-word-${row.word}`}>{row.word}</Text>
                    {row.category && <Text style={[styles.previewMeta, { color: colors.textSecondary, backgroundColor: colors.border }]}>{row.category}</Text>}
                    {row.date && <Text style={[styles.previewMeta, { color: colors.textSecondary, backgroundColor: colors.border }]}>{row.date}</Text>}
                    {row.variant && <Text style={[styles.previewVariant, { color: colors.secondary }]}>→ &ldquo;{row.variant}&rdquo;</Text>}
                  </View>
                ))}
                {wordCount > 5 && (
                  <Text style={[styles.previewMore, { color: colors.textSecondary }]}>{t('importModal.andMore', { count: wordCount - 5 })}</Text>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.importBtn,
                { backgroundColor: colors.primary, shadowColor: colors.primary },
                (loading || wordCount === 0) && styles.importBtnDisabled,
                (loading || wordCount === 0) && { backgroundColor: colors.primaryLight },
              ]}
              onPress={handleImport}
              disabled={loading || wordCount === 0}
              testID="import-submit-btn"
            >
              {loading
                ? <ActivityIndicator color={colors.textOnPrimary} />
                : <Text style={[styles.importBtnText, { color: colors.textOnPrimary }]}>{importBtnLabel}</Text>
              }
            </TouchableOpacity>

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop:          { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  overlay:           { flex: 1, justifyContent: 'flex-end' },
  container:         { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '92%' },
  handleWrap:        { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 10, marginBottom: 6 },
  handle:            { width: 40, height: 4, borderRadius: 2 },
  titleRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  titleWrap:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title:             { fontSize: 20, fontWeight: '800' },
  closeBtn:          { padding: 4 },
  tabs:              { flexDirection: 'row', borderRadius: 12, padding: 3, marginBottom: 18 },
  tab:               { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabActive:         { shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabText:           { fontSize: 14, fontWeight: '600' },
  tabTextActive:     { fontWeight: '700' },
  hint:              { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  exampleBox:        { borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1 },
  exampleLabel:      { fontSize: 11, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' },
  example:           { fontSize: 13, fontFamily: 'monospace', marginBottom: 2 },
  textBox:           { borderRadius: 14, borderWidth: 1.5, padding: 14, fontSize: 15, minHeight: 140, marginBottom: 16 },
  filePicker:        { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 2, borderStyle: 'dashed', padding: 18, gap: 12, marginBottom: 8 },
  filePickerIcon:    {},
  filePickerText:    { fontSize: 15, fontWeight: '500', flex: 1 },
  clearFile:         { fontSize: 13, textAlign: 'center', marginBottom: 14 },
  previewBox:        { borderRadius: 14, borderWidth: 1.5, padding: 14, marginBottom: 16 },
  previewTitle:      { fontSize: 12, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase' },
  previewRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 6 },
  previewWord:       { fontSize: 15, fontWeight: '700' },
  previewMeta:       { fontSize: 12, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  previewVariant:    { fontSize: 12, fontStyle: 'italic' },
  previewMore:       { fontSize: 12, fontStyle: 'italic', marginTop: 4 },
  importBtn:         { borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  importBtnDisabled: { shadowOpacity: 0, elevation: 0 },
  importBtnText:     { fontSize: 16, fontWeight: '700' },
  bottomSpacer:      { height: 20 },
});
