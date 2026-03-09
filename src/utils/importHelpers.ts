/**
 * CSV/text parsing helpers extracted from ImportModal for testability.
 */

export const deaccent = (s: string): string =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function parseDateStr(raw: string): string {
  if (!raw) return new Date().toISOString().split('T')[0];
  const ddmmyyyy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
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
    const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
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
    const headers = lines[0].split(delim).map(h => h.replace(/"/g, '').toLowerCase().trim());
    const wi = headers.findIndex(h => h.includes('palavra') || h.includes('word'));
    if (wi >= 0) wordIdx = wi;
    catIdx     = headers.findIndex(h => h.includes('categor'));
    dateIdx    = headers.findIndex(h => h.includes('data') || h.includes('date'));
    variantIdx = headers.findIndex(h => h.includes('variant'));
  }

  for (const line of dataLines) {
    const parts: string[] = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQ = !inQ; continue; }
      if (line[i] === delim && !inQ) { parts.push(cur.trim()); cur = ''; continue; }
      cur += line[i];
    }
    parts.push(cur.trim());
    const word = parts[wordIdx]?.replace(/"/g, '').trim();
    if (!word) continue;
    rows.push({
      word,
      category: catIdx >= 0 ? parts[catIdx]?.replace(/"/g, '').trim() || undefined : undefined,
      date: dateIdx >= 0 && parts[dateIdx] ? parseDateStr(parts[dateIdx].replace(/"/g, '').trim()) : undefined,
      variant: variantIdx >= 0 ? parts[variantIdx]?.replace(/"/g, '').trim() || undefined : undefined,
    });
  }
  return rows;
}
