/**
 * CSV/text parsing helpers extracted from ImportModal for testability.
 */

export const deaccent = (s: string): string =>
  s.normalize('NFD').replaceAll(/[\u0300-\u036f]/g, '').toLowerCase();

export function parseDateStr(raw: string): string {
  if (!raw) return new Date().toISOString().split('T')[0];
  const ddmmyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
  if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return new Date().toISOString().split('T')[0];
}

export interface ParsedRow {
  word: string;
  category?: string;
  date?: string;
  variant?: string;
}

export function parseTextInput(text: string): ParsedRow[] {
  const rows: ParsedRow[] = [];
  for (const line of text.split('\n').map(l => l.trim()).filter(Boolean)) {
    const parts = line.split(',').map(p => p.trim().replaceAll(/^"|"$/g, ''));
    const word = parts[0];
    if (!word) continue;
    // Skip CSV header rows
    const wordLower = word.toLowerCase();
    if (wordLower === 'palavra' || wordLower === 'word') continue;
    rows.push({
      word,
      category: parts[1] || undefined,
      date: parts[2] ? parseDateStr(parts[2]) : undefined,
      variant: parts[3] || undefined,
    });
  }
  return rows;
}

function splitCSVLine(line: string, delim: string): string[] {
  const parts: string[] = [];
  let cur = '', inQ = false;
  for (const char of line) {
    if (char === '"') { inQ = !inQ; continue; }
    if (char === delim && !inQ) { parts.push(cur.trim()); cur = ''; continue; }
    cur += char;
  }
  parts.push(cur.trim());
  return parts;
}

function resolveColumnIndices(
  lines: string[],
  delim: string,
): { wordIdx: number; catIdx: number; dateIdx: number; variantIdx: number } {
  const headers = lines[0].split(delim).map(h => h.replaceAll('"', '').toLowerCase().trim());
  const wi = headers.findIndex(h => h.includes('palavra') || h.includes('word'));
  return {
    wordIdx: wi >= 0 ? wi : 0,
    catIdx: headers.findIndex(h => h.includes('categor')),
    dateIdx: headers.findIndex(h => h.includes('data') || h.includes('date')),
    variantIdx: headers.findIndex(h => h.includes('variant')),
  };
}

function buildParsedRow(
  parts: string[], wordIdx: number, catIdx: number, dateIdx: number, variantIdx: number,
): ParsedRow | null {
  const word = parts[wordIdx]?.replaceAll('"', '').trim();
  if (!word) return null;
  return {
    word,
    category: catIdx >= 0 ? parts[catIdx]?.replaceAll('"', '').trim() || undefined : undefined,
    date: dateIdx >= 0 && parts[dateIdx] ? parseDateStr(parts[dateIdx].replaceAll('"', '').trim()) : undefined,
    variant: variantIdx >= 0 ? parts[variantIdx]?.replaceAll('"', '').trim() || undefined : undefined,
  };
}

export function parseCSV(text: string): ParsedRow[] {
  const rows: ParsedRow[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return rows;

  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes('palavra') || firstLine.includes('word') ||
                    firstLine.includes('categoria') || firstLine.includes('variante');
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const delim = lines[0].includes(';') ? ';' : ',';

  let wordIdx = 0, catIdx = 1, dateIdx = 2, variantIdx = 3;
  if (hasHeader) {
    ({ wordIdx, catIdx, dateIdx, variantIdx } = resolveColumnIndices(lines, delim));
  }

  for (const line of dataLines) {
    const parts = splitCSVLine(line, delim);
    const row = buildParsedRow(parts, wordIdx, catIdx, dateIdx, variantIdx);
    if (row) rows.push(row);
  }
  return rows;
}
