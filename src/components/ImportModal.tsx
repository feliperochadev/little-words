import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File as FSFile } from 'expo-file-system';
import { COLORS } from '../utils/theme';
import {
  getCategories, addCategory, findWordByName, addWord, addVariant,
} from '../database/database';
import { useI18n } from '../i18n/i18n';
import { DEFAULT_CATEGORIES } from '../utils/categoryKeys';
import { deaccent, parseTextInput, parseCSV, type ParsedRow } from '../utils/importHelpers';
import enUS from '../i18n/en-US';
import ptBR from '../i18n/pt-BR';

// Build a reverse map: any translated category label (any locale) → canonical key
const labelToKey = new Map<string, string>();
for (const { key } of DEFAULT_CATEGORIES) {
  for (const catalogue of [enUS, ptBR]) {
    const label = (catalogue.categories as Record<string, string>)[key];
    if (label) labelToKey.set(deaccent(label), key);
  }
  labelToKey.set(key, key);
}

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

async function importRows(rows: ParsedRow[]): Promise<ImportResult> {
  const result: ImportResult = { wordsAdded: 0, variantsAdded: 0, skipped: [], errors: [] };
  const existingCats = await getCategories();
  const catMap = new Map<string, number>();
  for (const c of existingCats) catMap.set(deaccent(c.name), c.id);

  const getOrCreateCat = async (name: string): Promise<number> => {
    // Normalize accents + case, then resolve to canonical key if it's a known label
    const normalized = labelToKey.get(deaccent(name)) ?? name;
    const key = deaccent(normalized);
    if (catMap.has(key)) return catMap.get(key)!;
    const id = await addCategory(normalized, '#B2BEC3', '🏷️');
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
    const firstRow = group.rows[0];
    try {
      let categoryId: number | null = null;
      if (firstRow.category) categoryId = await getOrCreateCat(firstRow.category);
      const today = new Date().toISOString().split('T')[0];
      const dateAdded = firstRow.date || today;
      const existing = await findWordByName(firstRow.word);
      let wordId: number;
      if (existing) { wordId = existing.id; result.skipped.push(firstRow.word); }
      else { wordId = await addWord(firstRow.word, categoryId, dateAdded); result.wordsAdded++; }
      for (const row of group.rows) {
        if (row.variant?.trim()) {
          await addVariant(wordId, row.variant.trim(), row.date || today);
          result.variantsAdded++;
        }
      }
    } catch (e: any) {
      result.errors.push(`"${firstRow.word}": ${e?.message || 'error'}`);
    }
  }
  return result;
}

export const ImportModal: React.FC<ImportModalProps> = ({ visible, onClose, onImported }) => {
  const { t, tc } = useI18n();

  const [tab, setTab]               = useState<'text' | 'csv'>('text');
  const [textInput, setTextInput]   = useState('');
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);
  const [preview, setPreview]       = useState<ParsedRow[]>([]);

  const reset = () => { setTextInput(''); setCsvFileName(null); setCsvContent(null); setPreview([]); };
  const handleClose = () => { reset(); onClose(); };

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
    } catch (e: any) {
      Alert.alert(t('common.error'), t('importModal.errorReadFile', { error: e.message }));
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
      reset(); onImported(); onClose();

      const lines = [t('importModal.resultWords', { count: result.wordsAdded })];
      if (result.variantsAdded > 0) lines.push(t('importModal.resultVariants', { count: result.variantsAdded }));
      if (result.skipped.length > 0) {
        const wordList = result.skipped.slice(0, 3).join(', ') + (result.skipped.length > 3 ? '...' : '');
        lines.push(t('importModal.resultSkipped', { count: result.skipped.length, words: wordList }));
      }
      if (result.errors.length > 0) lines.push(t('importModal.resultErrors', { count: result.errors.length }));
      Alert.alert(t('importModal.resultTitle'), lines.join('\n'));
    } catch (e: any) {
      setLoading(false);
      Alert.alert(t('common.error'), e.message);
    }
  };

  const wordCount = tab === 'text'
    ? parseTextInput(textInput).length
    : csvContent ? parseCSV(csvContent).length : 0;

  const importBtnLabel = wordCount > 0
    ? tc('importModal.importBtn', wordCount)
    : t('importModal.importZero');

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.handle} />

          <View style={styles.titleRow}>
            <Text style={styles.title}>{t('importModal.title')}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, tab === 'text' && styles.tabActive]}
              onPress={() => { setTab('text'); setPreview([]); }}
            >
              <Text style={[styles.tabText, tab === 'text' && styles.tabTextActive]}>{t('importModal.tabText')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'csv' && styles.tabActive]}
              onPress={() => { setTab('csv'); setPreview([]); }}
            >
              <Text style={[styles.tabText, tab === 'csv' && styles.tabTextActive]}>{t('importModal.tabCSV')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {tab === 'text' ? (
              <>
                <Text style={styles.hint}>{t('importModal.textHint')}</Text>
                <View style={styles.exampleBox}>
                  <Text style={styles.exampleLabel}>{t('importModal.examplesLabel')}</Text>
                  <Text style={styles.example}>mamãe</Text>
                  <Text style={styles.example}>água, Comida</Text>
                  <Text style={styles.example}>cachorro, Animais, 15/03/2025</Text>
                </View>
                <TextInput
                  testID="import-text-input"
                  style={styles.textBox}
                  value={textInput}
                  onChangeText={updateTextPreview}
                  placeholder={'mamãe\nágua, Comida\ncachorro, Animais, 15/03/2025'}
                  placeholderTextColor={COLORS.textLight}
                  multiline textAlignVertical="top" autoCapitalize="none" autoCorrect={false}
                />
              </>
            ) : (
              <>
                <Text style={styles.hint}>{t('importModal.csvHint')}</Text>
                <TouchableOpacity style={styles.filePicker} onPress={handlePickCSV}>
                  <Text style={styles.filePickerIcon}>📂</Text>
                  <Text style={styles.filePickerText}>{csvFileName || t('importModal.pickFile')}</Text>
                </TouchableOpacity>
                {csvFileName && (
                  <TouchableOpacity onPress={() => { setCsvFileName(null); setCsvContent(null); setPreview([]); }}>
                    <Text style={styles.clearFile}>{t('importModal.removeFile')}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {preview.length > 0 && (
              <View style={styles.previewBox}>
                <Text style={styles.previewTitle}>
                  {tc('importModal.previewTitle', wordCount)}
                </Text>
                {preview.map((row, i) => (
                  <View key={i} style={styles.previewRow}>
                    <Text style={styles.previewWord}>{row.word}</Text>
                    {row.category && <Text style={styles.previewMeta}>{row.category}</Text>}
                    {row.date && <Text style={styles.previewMeta}>{row.date}</Text>}
                    {row.variant && <Text style={styles.previewVariant}>→ &ldquo;{row.variant}&rdquo;</Text>}
                  </View>
                ))}
                {wordCount > 5 && (
                  <Text style={styles.previewMore}>{t('importModal.andMore', { count: wordCount - 5 })}</Text>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[styles.importBtn, (loading || wordCount === 0) && styles.importBtnDisabled]}
              onPress={handleImport}
              disabled={loading || wordCount === 0}
            >
              {loading
                ? <ActivityIndicator color={COLORS.white} />
                : <Text style={styles.importBtnText}>{importBtnLabel}</Text>
              }
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay:           { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container:         { backgroundColor: COLORS.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '92%' },
  handle:            { width: 40, height: 4, backgroundColor: COLORS.textLight, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  titleRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title:             { fontSize: 20, fontWeight: '800', color: COLORS.text },
  closeBtn:          { padding: 4 },
  closeText:         { fontSize: 18, color: COLORS.textLight },
  tabs:              { flexDirection: 'row', backgroundColor: COLORS.border, borderRadius: 12, padding: 3, marginBottom: 18 },
  tab:               { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabActive:         { backgroundColor: COLORS.white, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabText:           { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive:     { color: COLORS.text, fontWeight: '700' },
  hint:              { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 12 },
  exampleBox:        { backgroundColor: COLORS.white, borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: COLORS.border },
  exampleLabel:      { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6, textTransform: 'uppercase' },
  example:           { fontSize: 13, color: COLORS.primary, fontFamily: 'monospace', marginBottom: 2 },
  textBox:           { backgroundColor: COLORS.white, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.border, padding: 14, fontSize: 15, color: COLORS.text, minHeight: 140, marginBottom: 16 },
  filePicker:        { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 14, borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed', padding: 18, gap: 12, marginBottom: 8 },
  filePickerIcon:    { fontSize: 24 },
  filePickerText:    { fontSize: 15, color: COLORS.textSecondary, fontWeight: '500', flex: 1 },
  clearFile:         { fontSize: 13, color: COLORS.error, textAlign: 'center', marginBottom: 14 },
  previewBox:        { backgroundColor: COLORS.white, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.primaryLight, padding: 14, marginBottom: 16 },
  previewTitle:      { fontSize: 12, fontWeight: '700', color: COLORS.primary, marginBottom: 10, textTransform: 'uppercase' },
  previewRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 6 },
  previewWord:       { fontSize: 15, fontWeight: '700', color: COLORS.text },
  previewMeta:       { fontSize: 12, color: COLORS.textSecondary, backgroundColor: COLORS.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  previewVariant:    { fontSize: 12, color: COLORS.secondary, fontStyle: 'italic' },
  previewMore:       { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 4 },
  importBtn:         { backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  importBtnDisabled: { backgroundColor: COLORS.primaryLight, shadowOpacity: 0, elevation: 0 },
  importBtnText:     { color: COLORS.white, fontSize: 16, fontWeight: '700' },
});