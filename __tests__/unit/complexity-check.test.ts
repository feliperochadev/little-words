/**
 * @jest-environment node
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  checkComplexity,
  countChangeLines,
  evaluateComplexity,
  extractCategories,
  parseLatestEntry,
} from '../../scripts/agent/complexity-check';

// ---------------------------------------------------------------------------
// parseLatestEntry
// ---------------------------------------------------------------------------

describe('parseLatestEntry', () => {
  it('returns empty string when no entries exist', () => {
    expect(parseLatestEntry('# Changelog\n\nNo entries.')).toBe('');
  });

  it('returns everything up to the next ### heading', () => {
    const content = `# Changelog

### 2026-03-10_2

**[fix] Something**
- fixed a bug

---

### 2026-03-10_1

**[config] Older entry**
- older change
`;
    const result = parseLatestEntry(content);
    expect(result).toContain('2026-03-10_2');
    expect(result).toContain('[fix] Something');
    expect(result).not.toContain('2026-03-10_1');
  });

  it('returns full content when only one entry exists', () => {
    const content = `# Changelog

### 2026-03-10_1

**[feature] Only entry**
- added something
`;
    const result = parseLatestEntry(content);
    expect(result).toContain('Only entry');
    expect(result).toContain('- added something');
  });

  it('handles changelog with leading dashes between entries', () => {
    const content = `### 2026-03-10_2

- line one
- line two

---

### 2026-03-10_1

- older
`;
    const result = parseLatestEntry(content);
    expect(result).toContain('line one');
    expect(result).not.toContain('older');
  });
});

// ---------------------------------------------------------------------------
// countChangeLines
// ---------------------------------------------------------------------------

describe('countChangeLines', () => {
  it('returns 0 for empty string', () => {
    expect(countChangeLines('')).toBe(0);
  });

  it('counts lines starting with "- "', () => {
    const entry = `### heading\n\n- change one\n- change two\n- change three`;
    expect(countChangeLines(entry)).toBe(3);
  });

  it('counts lines with leading spaces before "- "', () => {
    const entry = `  - indented item\n- normal item`;
    expect(countChangeLines(entry)).toBe(2);
  });

  it('does not count prose lines that do not start with "- "', () => {
    const entry = `Some paragraph text\n**[fix] heading**\n- actual change`;
    expect(countChangeLines(entry)).toBe(1);
  });

  it('counts exactly 10 lines as not exceeding threshold', () => {
    const lines = Array.from({ length: 10 }, (_, i) => `- change ${i + 1}`).join('\n');
    expect(countChangeLines(lines)).toBe(10);
  });

  it('counts 11 lines as exceeding threshold', () => {
    const lines = Array.from({ length: 11 }, (_, i) => `- change ${i + 1}`).join('\n');
    expect(countChangeLines(lines)).toBe(11);
  });
});

// ---------------------------------------------------------------------------
// extractCategories
// ---------------------------------------------------------------------------

describe('extractCategories', () => {
  it('returns empty array when no categories present', () => {
    expect(extractCategories('no categories here')).toEqual([]);
  });

  it('extracts a single category', () => {
    expect(extractCategories('**[fix] Some bug fix**')).toEqual(['[fix]']);
  });

  it('extracts multiple unique categories', () => {
    const entry = '**[fix]** something\n**[feature]** another\n**[test]** tests';
    const result = extractCategories(entry);
    expect(result).toHaveLength(3);
    expect(result).toContain('[fix]');
    expect(result).toContain('[feature]');
    expect(result).toContain('[test]');
  });

  it('deduplicates repeated categories', () => {
    const entry = '[fix] first\n[fix] second\n[fix] third';
    const result = extractCategories(entry);
    expect(result).toHaveLength(1);
    expect(result).toContain('[fix]');
  });

  it('is case-insensitive', () => {
    const entry = '[FIX] upper\n[Feature] mixed';
    const result = extractCategories(entry);
    expect(result).toHaveLength(2);
    expect(result).toContain('[fix]');
    expect(result).toContain('[feature]');
  });

  it('ignores unknown tags', () => {
    const entry = '[unknown] tag\n[fix] valid';
    const result = extractCategories(entry);
    expect(result).toEqual(['[fix]']);
  });

  it('recognises all known category types', () => {
    const all = '[fix] [feature] [upgrade] [config] [test] [refactor] [perf] [security]';
    const result = extractCategories(all);
    expect(result).toHaveLength(8);
  });
});

// ---------------------------------------------------------------------------
// evaluateComplexity
// ---------------------------------------------------------------------------

describe('evaluateComplexity', () => {
  it('marks a short single-category entry as simple', () => {
    const entry = `### 2026-03-10_1\n\n**[fix] Small fix**\n- fixed one thing\n- fixed another`;
    const result = evaluateComplexity(entry);
    expect(result.isComplex).toBe(false);
    expect(result.reason).toBeNull();
  });

  it('marks complex when change lines exceed 10 (Rule A)', () => {
    const lines = Array.from({ length: 11 }, (_, i) => `- change ${i + 1}`).join('\n');
    const entry = `### heading\n\n**[fix] Big fix**\n${lines}`;
    const result = evaluateComplexity(entry);
    expect(result.isComplex).toBe(true);
    expect(result.changeLineCount).toBe(11);
    expect(result.reason).toContain('11 change lines');
  });

  it('marks complex when 3 or more categories present (Rule B)', () => {
    const entry = `### heading\n\n**[fix]** fix\n**[feature]** feat\n**[test]** tests\n- one change`;
    const result = evaluateComplexity(entry);
    expect(result.isComplex).toBe(true);
    expect(result.categoryCount).toBe(3);
    expect(result.reason).toContain('3 categories');
  });

  it('marks complex and combines reason when both rules triggered', () => {
    const lines = Array.from({ length: 12 }, (_, i) => `- change ${i + 1}`).join('\n');
    const entry = `### heading\n\n**[fix]** a\n**[feature]** b\n**[test]** c\n${lines}`;
    const result = evaluateComplexity(entry);
    expect(result.isComplex).toBe(true);
    expect(result.reason).toContain('12 change lines');
    expect(result.reason).toContain('3 categories');
  });

  it('is not complex with exactly 10 change lines and 2 categories', () => {
    const lines = Array.from({ length: 10 }, (_, i) => `- change ${i + 1}`).join('\n');
    const entry = `### heading\n\n**[fix]** a\n**[feature]** b\n${lines}`;
    const result = evaluateComplexity(entry);
    expect(result.isComplex).toBe(false);
  });

  it('returns correct counts', () => {
    const entry = `### heading\n\n**[config]** a\n- item 1\n- item 2`;
    const result = evaluateComplexity(entry);
    expect(result.changeLineCount).toBe(2);
    expect(result.categoryCount).toBe(1);
    expect(result.categories).toEqual(['[config]']);
  });
});

// ---------------------------------------------------------------------------
// checkComplexity (integration with filesystem)
// ---------------------------------------------------------------------------

describe('checkComplexity', () => {
  const tmpDir = path.join(require('os').tmpdir(), 'complexity-check-test');
  const tmpFile = path.join(tmpDir, 'AGENTS-CHANGELOG.md');

  beforeAll(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('reads from the provided path and evaluates complexity', () => {
    fs.writeFileSync(
      tmpFile,
      `# Changelog\n\n### 2026-03-10_1\n\n**[fix] Simple fix**\n- one change\n`,
      'utf-8',
    );
    const result = checkComplexity(tmpFile);
    expect(result.isComplex).toBe(false);
    expect(result.changeLineCount).toBe(1);
  });

  it('returns complex: true for entry with > 10 changes', () => {
    const lines = Array.from({ length: 11 }, (_, i) => `- change ${i + 1}`).join('\n');
    fs.writeFileSync(
      tmpFile,
      `# Changelog\n\n### 2026-03-10_1\n\n**[fix] Big**\n${lines}\n`,
      'utf-8',
    );
    const result = checkComplexity(tmpFile);
    expect(result.isComplex).toBe(true);
  });
});
