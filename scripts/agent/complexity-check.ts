/**
 * Complexity detection utility for the multi-agent review system.
 *
 * Reads the latest entry from .agents/AGENTS-CHANGELOG.md and determines
 * whether the change qualifies as "complex" (requiring external review)
 * or "simple" (internal review sufficient).
 *
 * Rules:
 *   Rule A — change line count > 10
 *   Rule B — 3 or more distinct category tags
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface ComplexityResult {
  isComplex: boolean;
  changeLineCount: number;
  categoryCount: number;
  categories: string[];
  reason: string | null;
}

const KNOWN_CATEGORIES = ['fix', 'feature', 'upgrade', 'config', 'test', 'refactor', 'perf', 'security'];

/**
 * Extract the latest changelog entry (everything between the first and second ### heading).
 */
export function parseLatestEntry(changelogContent: string): string {
  const lines = changelogContent.split('\n');
  let entryStart = -1;
  let entryEnd = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('### ')) {
      if (entryStart === -1) {
        entryStart = i;
      } else {
        entryEnd = i;
        break;
      }
    }
  }

  if (entryStart === -1) return '';
  const endIdx = entryEnd === -1 ? lines.length : entryEnd;
  return lines.slice(entryStart, endIdx).join('\n');
}

/**
 * Count lines that represent individual change items (lines starting with "- ").
 */
export function countChangeLines(entry: string): number {
  return entry
    .split('\n')
    .filter((line) => /^\s*- /.test(line))
    .length;
}

/**
 * Extract unique category tags present in the entry.
 */
export function extractCategories(entry: string): string[] {
  const pattern = new RegExp(String.raw`\[(${KNOWN_CATEGORIES.join('|')})\]`, 'gi');
  const matches = [...entry.matchAll(pattern)].map(m => m[0]);
  const unique = new Set(matches.map((m) => m.toLowerCase()));
  return Array.from(unique);
}

/**
 * Evaluate complexity from a parsed changelog entry string.
 */
export function evaluateComplexity(entry: string): ComplexityResult {
  const changeLineCount = countChangeLines(entry);
  const categories = extractCategories(entry);
  const categoryCount = categories.length;

  const tooManyChanges = changeLineCount > 10;
  const tooManyCategories = categoryCount >= 3;
  const isComplex = tooManyChanges || tooManyCategories;

  let reason: string | null = null;
  if (tooManyChanges && tooManyCategories) {
    reason = `${changeLineCount} change lines and ${categoryCount} categories (${categories.join(', ')})`;
  } else if (tooManyChanges) {
    reason = `${changeLineCount} change lines (> 10)`;
  } else if (tooManyCategories) {
    reason = `${categoryCount} categories (>= 3): ${categories.join(', ')}`;
  }

  return { isComplex, changeLineCount, categoryCount, categories, reason };
}

/**
 * Full pipeline: read changelog from disk and return complexity result.
 */
export function checkComplexity(changelogPath?: string): ComplexityResult {
  const path = changelogPath ?? join(process.cwd(), '.agents', 'AGENTS-CHANGELOG.md');
  const content = readFileSync(path, 'utf-8');
  const latestEntry = parseLatestEntry(content);
  return evaluateComplexity(latestEntry);
}

// CLI entry point
if (require.main === module) {
  const result = checkComplexity();
  console.log(JSON.stringify(result, null, 2));
  if (result.isComplex) {
    console.log(`\nComplex change detected: ${result.reason}`);
    process.exit(1);
  } else {
    console.log('\nSimple change — internal review sufficient.');
    process.exit(0);
  }
}
