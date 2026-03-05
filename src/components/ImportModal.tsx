import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { COLORS } from '../utils/theme';
import {
  getCategories, addCategory, findWordByName, addWord, addVariant, Category,
} from '../database/database';

interface ImportModalProps {
  visible: boolean;
  onClose: () => void;
  onImported: () => void;
}

interface ParsedRow {
  word: string;
  category?: string;
  date?: string;
  variant?: string;
}

interface ImportResult {
  wordsAdded: number;
  variantsAdded: number;
  skipped: string[];
  errors: string[];
}

// ─── Parser ───────────────────────────────────────────────────────────────────

function parseDate(raw: string): string {
  if (!raw) return new Date().toISOString().split('T')[0];
  // DD/MM/YYYY → YYYY-MM-DD
  const ddmmyyyy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2,'0')}-${ddmmyyyy[1].padStart(2,'0')}`;
  // YYYY-MM-DD already fine
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return new Date().toISOString().split('T')[0];
}

function parseTextInput(text: string): ParsedRow[] {
  const rows: ParsedRow[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    const parts = line.split(',').map(p => p.trim());
    if (!parts[0]) continue;
    rows.push({
      word: parts[0],
      category: parts[1] || undefined,
      date: parts[2] ? parseDate(parts[2]) : undefined,
    });
  }
  return rows;
}

function parseCSV(text: string): ParsedRow[] {
  const rows: ParsedRow[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return rows;

  // Detect header
  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes('palavra') || firstLine.includes('word') ||
                    firstLine.includes('categoria') || firstLine.includes('variante');
  const dataLines = hasHeader ? lines.slice(1) : lines;

  // Detect delimiter
  const delim = lines[0].includes(';') ? ';' : ',';

  // Parse header to find column indices
  let wordIdx = 0, catIdx = 1, dateIdx = 2, variantIdx = 3;
  if (hasHeader) {
    const headers = lines[0].split(delim).map(h => h.replace(/"/g,'').toLowerCase().trim());
    wordIdx   = headers.findIndex(h => h.includes('palavra') || h.includes('word')) ?? 0;
    catIdx    = headers.findIndex(h => h.includes('categor'));
    dateIdx   = headers.findIndex(h => h.includes('data') || h.includes('date'));
    variantIdx= headers.findIndex(h => h.includes('variant'));
    if (wordIdx < 0) wordIdx = 0;
  }

  for (const line of dataLines) {
    // Handle quoted fields
    const parts: string[] = [];
    let cur = '', inQuote = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQuote = !inQuote; continue; }
      if (line[i] === delim && !inQuote) { parts.push(cur.trim()); cur = ''; continue; }
      cur += line[i];
    }
    parts.push(cur.trim());

    const word = parts[wordIdx]?.replace(/"/g,'').trim();
    if (!word) continue;

    rows.push({
      word,
      category: catIdx >= 0 ? parts[catIdx]?.replace(/"/g,'').trim() || undefined : undefined,
      date: dateIdx >= 0 && parts[dateIdx] ? parseDate(parts[dateIdx].replace(/"/g,'').trim()) : undefined,
      variant: variantIdx >= 0 ? parts[variantIdx]?.replace(/"/g,'').trim() || undefined : undefined,
    });
  }
  return rows;
}

// ─── Importer ─────────────────────────────────────────────────────────────────

async function importRows(rows: ParsedRow[]): Promise<ImportResult> {
  const result: ImportResult = { wordsAdded: 0, variantsAdded: 0, skipped: [], errors: [] };

  // Load/cache categories
  const existingCats = await getCategories();
  const catMap = new Map<string, number>();
  for (const c of existingCats) catMap.set(c.name.toLowerCase(), c.id);

  const getOrCreateCat = async (name: string): Promise<number> => {
    const key = name.toLowerCase();
    if (catMap.has(key)) return catMap.get(key)!;
    const id = await addCategory(name, '#B2BEC3', '🏷️');
    catMap.set(key, id);
    return id;
  };

  // Group rows by word (case-insensitive) to collect all variants
  const grouped = new Map<string, { rows: ParsedRow[] }>();
  for (const row of rows) {
    const key = row.word.toLowerCase();
    if (!grouped.has(key)) grouped.set(key, { rows: [] });
    grouped.get(key)!.rows.push(row);
  }

  for (const [, group] of grouped) {
    const firstRow = group.rows[0];
    const wordText = firstRow.word;

    try {
      // Resolve category
      let categoryId: number | null = null;
      if (firstRow.category) {
        categoryId = await getOrCreateCat(firstRow.category);
      }

      const today = new Date().toISOString().split('T')[0];
      const dateAdded = firstRow.date || today;

      // Check if word already exists
      let existing = await findWordByName(wordText);
      let wordId: number;

      if (existing) {
        wordId = existing.id;
        result.skipped.push(wordText);
      } else {
        wordId = await addWord(wordText, categoryId, dateAdded);
        result.wordsAdded++;
      }

      // Add variants (from all rows that have a variant field)
      for (const row of group.rows) {
        if (row.variant && row.variant.trim()) {
          const varDate = row.date || today;
          await addVariant(wordId, row.variant.trim(), varDate);
          result.variantsAdded++;
        }
      }
    } catch (e: any) {
      result.errors.push(`"${wordText}": ${e?.message || 'erro desconhecido'}`);
    }
  }

  return result;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ImportModal: React.FC<ImportModalProps> = ({ visible, onClose, onImported }) => {
  const [tab, setTab] = useState<'text' | 'csv'>('text');
  const [textInput, setTextInput] = useState('');
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ParsedRow[]>([]);

  const reset = () => {
    setTextInput('');
    setCsvFileName(null);
    setCsvContent(null);
    setPreview([]);
  };

  const handleClose = () => { reset(); onClose(); };

  const updateTextPreview = (text: string) => {
    setTextInput(text);
    if (text.trim()) setPreview(parseTextInput(text).slice(0, 5));
    else setPreview([]);
  };

  const handlePickCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/plain', 'text/comma-separated-values', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      setCsvFileName(file.name);
      setCsvContent(content);
      const parsed = parseCSV(content);
      setPreview(parsed.slice(0, 5));
    } catch (e: any) {
      Alert.alert('Erro', 'Não foi possível ler o arquivo: ' + e.message);
    }
  };

  const handleImport = async () => {
    let rows: ParsedRow[] = [];
    if (tab === 'text') {
      rows = parseTextInput(textInput);
    } else {
      if (!csvContent) { Alert.alert('Atenção', 'Selecione um arquivo primeiro.'); return; }
      rows = parseCSV(csvContent);
    }

    if (rows.length === 0) {
      Alert.alert('Atenção', 'Nenhuma palavra encontrada para importar.');
      return;
    }

    setLoading(true);
    try {
      const result = await importRows(rows);
      setLoading(false);
      reset();
      onImported();
      onClose();

      const lines = [`✅ ${result.wordsAdded} palavra(s) importada(s)`];
      if (result.variantsAdded > 0) lines.push(`🗣️ ${result.variantsAdded} variante(s) adicionada(s)`);
      if (result.skipped.length > 0) lines.push(`⏭️ ${result.skipped.length} já existia(m): ${result.skipped.slice(0,3).join(', ')}${result.skipped.length > 3 ? '...' : ''}`);
      if (result.errors.length > 0) lines.push(`❌ ${result.errors.length} erro(s)`);

      Alert.alert('Importação concluída', lines.join('\n'));
    } catch (e: any) {
      setLoading(false);
      Alert.alert('Erro', e.message);
    }
  };

  const wordCount = tab === 'text'
    ? parseTextInput(textInput).length
    : csvContent ? parseCSV(csvContent).length : 0;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.handle} />

          <View style={styles.titleRow}>
            <Text style={styles.title}>📥 Importar palavras</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, tab === 'text' && styles.tabActive]}
              onPress={() => { setTab('text'); setPreview([]); }}
            >
              <Text style={[styles.tabText, tab === 'text' && styles.tabTextActive]}>✏️ Texto</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'csv' && styles.tabActive]}
              onPress={() => { setTab('csv'); setPreview([]); }}
            >
              <Text style={[styles.tabText, tab === 'csv' && styles.tabTextActive]}>📄 Arquivo CSV</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {tab === 'text' ? (
              <>
                <Text style={styles.hint}>
                  Uma palavra por linha. Opcionalmente: categoria e/ou data separados por vírgula.
                </Text>
                <View style={styles.exampleBox}>
                  <Text style={styles.exampleLabel}>Exemplos:</Text>
                  <Text style={styles.example}>mamãe</Text>
                  <Text style={styles.example}>água, Comida</Text>
                  <Text style={styles.example}>cachorro, Animais, 15/03/2025</Text>
                </View>

                <TextInput
                  style={styles.textBox}
                  value={textInput}
                  onChangeText={updateTextPreview}
                  placeholder={'mamãe\nágua, Comida\ncachorro, Animais, 15/03/2025'}
                  placeholderTextColor={COLORS.textLight}
                  multiline
                  textAlignVertical="top"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </>
            ) : (
              <>
                <Text style={styles.hint}>
                  Aceita CSV com colunas: <Text style={styles.bold}>palavra</Text>, categoria (opcional), data (opcional), variante (opcional).{'\n'}
                  Linhas com a mesma palavra são agrupadas — variantes são salvas separadamente.
                </Text>

                <TouchableOpacity style={styles.filePicker} onPress={handlePickCSV}>
                  <Text style={styles.filePickerIcon}>📂</Text>
                  <Text style={styles.filePickerText}>
                    {csvFileName || 'Selecionar arquivo CSV/TXT'}
                  </Text>
                </TouchableOpacity>

                {csvFileName && (
                  <TouchableOpacity onPress={() => { setCsvFileName(null); setCsvContent(null); setPreview([]); }}>
                    <Text style={styles.clearFile}>✕ Remover arquivo</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* Preview */}
            {preview.length > 0 && (
              <View style={styles.previewBox}>
                <Text style={styles.previewTitle}>Prévia ({wordCount} palavra{wordCount !== 1 ? 's' : ''})</Text>
                {preview.map((row, i) => (
                  <View key={i} style={styles.previewRow}>
                    <Text style={styles.previewWord}>{row.word}</Text>
                    {row.category && <Text style={styles.previewMeta}>{row.category}</Text>}
                    {row.date && <Text style={styles.previewMeta}>{row.date}</Text>}
                    {row.variant && <Text style={styles.previewVariant}>→ "{row.variant}"</Text>}
                  </View>
                ))}
                {wordCount > 5 && (
                  <Text style={styles.previewMore}>...e mais {wordCount - 5}</Text>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[styles.importBtn, (loading || wordCount === 0) && styles.importBtnDisabled]}
              onPress={handleImport}
              disabled={loading || wordCount === 0}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.importBtnText}>
                  {wordCount > 0 ? `Importar ${wordCount} palavra${wordCount !== 1 ? 's' : ''}` : 'Importar 0 palavras'}
                </Text>
              )}
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, maxHeight: '92%',
  },
  handle: {
    width: 40, height: 4, backgroundColor: COLORS.textLight,
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  closeBtn: { padding: 4 },
  closeText: { fontSize: 18, color: COLORS.textLight },
  tabs: {
    flexDirection: 'row', backgroundColor: COLORS.border,
    borderRadius: 12, padding: 3, marginBottom: 18,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.white, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.text, fontWeight: '700' },
  hint: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 12 },
  bold: { fontWeight: '700', color: COLORS.text },
  exampleBox: {
    backgroundColor: COLORS.white, borderRadius: 12,
    padding: 12, marginBottom: 14, borderWidth: 1, borderColor: COLORS.border,
  },
  exampleLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6, textTransform: 'uppercase' },
  example: { fontSize: 13, color: COLORS.primary, fontFamily: 'monospace', marginBottom: 2 },
  textBox: {
    backgroundColor: COLORS.white, borderRadius: 14,
    borderWidth: 1.5, borderColor: COLORS.border,
    padding: 14, fontSize: 15, color: COLORS.text,
    minHeight: 140, marginBottom: 16,
  },
  filePicker: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: 14,
    borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed',
    padding: 18, gap: 12, marginBottom: 8,
  },
  filePickerIcon: { fontSize: 24 },
  filePickerText: { fontSize: 15, color: COLORS.textSecondary, fontWeight: '500', flex: 1 },
  clearFile: { fontSize: 13, color: COLORS.error, textAlign: 'center', marginBottom: 14 },
  previewBox: {
    backgroundColor: COLORS.white, borderRadius: 14,
    borderWidth: 1.5, borderColor: COLORS.primaryLight,
    padding: 14, marginBottom: 16,
  },
  previewTitle: { fontSize: 12, fontWeight: '700', color: COLORS.primary, marginBottom: 10, textTransform: 'uppercase' },
  previewRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 6 },
  previewWord: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  previewMeta: {
    fontSize: 12, color: COLORS.textSecondary,
    backgroundColor: COLORS.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2,
  },
  previewVariant: { fontSize: 12, color: COLORS.secondary, fontStyle: 'italic' },
  previewMore: { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 4 },
  importBtn: {
    backgroundColor: COLORS.primary, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  importBtnDisabled: { backgroundColor: COLORS.primaryLight, shadowOpacity: 0, elevation: 0 },
  importBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
});
