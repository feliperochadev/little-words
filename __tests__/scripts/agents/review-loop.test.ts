/**
 * @jest-environment node
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  buildTimestamp,
  cleanupReviews,
  createReviewRequest,
  formatReviewFile,
  parseReviewFile,
  type ReviewFile,
} from '../../../scripts/agent/review-loop';

// ---------------------------------------------------------------------------
// buildTimestamp
// ---------------------------------------------------------------------------

describe('buildTimestamp', () => {
  it('returns date-001 when there are no existing files', () => {
    const ts = buildTimestamp(0);
    const today = new Date().toISOString().split('T')[0];
    expect(ts).toBe(`${today}-001`);
  });

  it('increments the sequence number based on existing count', () => {
    const ts = buildTimestamp(2);
    const today = new Date().toISOString().split('T')[0];
    expect(ts).toBe(`${today}-003`);
  });
});

// ---------------------------------------------------------------------------
// formatReviewFile
// ---------------------------------------------------------------------------

describe('formatReviewFile', () => {
  const base: ReviewFile = {
    status: 'pending',
    iteration: 1,
    maxIterations: 3,
    reviewer: 'external',
    reviewers: [],
    approvals: [],
    targetAgent: 'unknown',
    branch: 'feature-branch',
    changeSummary: 'Added new screen.',
    filesModified: ['app/screen.tsx', 'src/utils/helper.ts'],
    ciStatus: 'passed',
    issues: '',
    suggestions: '',
    resolution: '',
  };

  it('includes all top-level metadata fields', () => {
    const output = formatReviewFile(base);
    expect(output).toContain('status: pending');
    expect(output).toContain('iteration: 1');
    expect(output).toContain('max_iterations: 3');
    expect(output).toContain('reviewer: external');
    expect(output).toContain('target_agent: unknown');
    expect(output).toContain('branch: feature-branch');
    expect(output).toContain('reviewers:');
    expect(output).toContain('approvals:');
  });

  it('includes reviewers and approvals lists', () => {
    const output = formatReviewFile({
      ...base,
      reviewers: ['claude', 'codex'],
      approvals: ['claude'],
    });
    expect(output).toContain('- claude');
    expect(output).toContain('- codex');
    expect(output).toContain('approvals:\n- claude');
  });

  it('includes change summary', () => {
    const output = formatReviewFile(base);
    expect(output).toContain('Added new screen.');
  });

  it('lists each modified file with a dash', () => {
    const output = formatReviewFile(base);
    expect(output).toContain('- app/screen.tsx');
    expect(output).toContain('- src/utils/helper.ts');
  });

  it('shows (none) when no files are modified', () => {
    const output = formatReviewFile({ ...base, filesModified: [] });
    expect(output).toContain('(none)');
  });

  it('shows (empty) for blank issues/suggestions/resolution', () => {
    const output = formatReviewFile(base);
    expect(output).toContain('(empty)');
  });

  it('includes populated issues and suggestions', () => {
    const output = formatReviewFile({
      ...base,
      issues: 'Missing error handling.',
      suggestions: 'Add try/catch.',
      resolution: 'Applied fixes.',
    });
    expect(output).toContain('Missing error handling.');
    expect(output).toContain('Add try/catch.');
    expect(output).toContain('Applied fixes.');
  });

  it('includes CI status', () => {
    const output = formatReviewFile(base);
    expect(output).toContain('passed');
  });
});

// ---------------------------------------------------------------------------
// parseReviewFile
// ---------------------------------------------------------------------------

describe('parseReviewFile', () => {
  it('parses status, iteration, max_iterations and branch', () => {
    const content = `# Code Review\n\nstatus: approved\niteration: 2\nmax_iterations: 3\n\nreviewer: external\ntarget_agent: unknown\n\nbranch: main\n`;
    const result = parseReviewFile(content);
    expect(result.status).toBe('approved');
    expect(result.iteration).toBe(2);
    expect(result.maxIterations).toBe(3);
    expect(result.branch).toBe('main');
  });

  it('parses reviewers and approvals lists', () => {
    const content = `reviewers:\n- claude\n- codex\n\napprovals:\n- claude\n`;
    const result = parseReviewFile(content);
    expect(result.reviewers).toEqual(['claude', 'codex']);
    expect(result.approvals).toEqual(['claude']);
  });

  it('handles empty reviewers and approvals lists', () => {
    const content = `reviewers:\n(none)\n\napprovals:\n(none)\n`;
    const result = parseReviewFile(content);
    expect(result.reviewers).toEqual([]);
    expect(result.approvals).toEqual([]);
  });

  it('defaults iteration to 1 when missing', () => {
    const result = parseReviewFile('status: pending\nbranch: test');
    expect(result.iteration).toBe(1);
  });

  it('defaults maxIterations to 3 when missing', () => {
    const result = parseReviewFile('status: pending\nbranch: test');
    expect(result.maxIterations).toBe(3);
  });

  it('defaults branch to unknown when missing', () => {
    const result = parseReviewFile('status: pending');
    expect(result.branch).toBe('unknown');
  });

  it('handles changes_requested status', () => {
    const result = parseReviewFile('status: changes_requested\nbranch: fix-branch');
    expect(result.status).toBe('changes_requested');
  });

  it('handles escalation_required status', () => {
    const result = parseReviewFile('status: escalation_required\nbranch: some-branch');
    expect(result.status).toBe('escalation_required');
  });
});

// ---------------------------------------------------------------------------
// createReviewRequest
// ---------------------------------------------------------------------------

describe('createReviewRequest', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'review-loop-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates a review file in the given directory', () => {
    const filepath = createReviewRequest('Test summary', tmpDir);
    expect(fs.existsSync(filepath)).toBe(true);
  });

  it('creates the directory if it does not exist', () => {
    const nested = path.join(tmpDir, 'nested', 'reviews');
    const filepath = createReviewRequest('Summary', nested);
    expect(fs.existsSync(filepath)).toBe(true);
  });

  it('file name follows review-{date}-{seq}.md pattern', () => {
    const filepath = createReviewRequest('Summary', tmpDir);
    const filename = path.basename(filepath);
    expect(filename).toMatch(/^review-\d{4}-\d{2}-\d{2}-\d{3}\.md$/);
  });

  it('increments sequence for same-day files', () => {
    const first = createReviewRequest('First', tmpDir);
    const second = createReviewRequest('Second', tmpDir);
    expect(first).not.toBe(second);
    expect(path.basename(first)).toMatch(/-001\.md$/);
    expect(path.basename(second)).toMatch(/-002\.md$/);
  });

  it('file contains the change summary', () => {
    const filepath = createReviewRequest('My change summary', tmpDir);
    const content = fs.readFileSync(filepath, 'utf-8');
    expect(content).toContain('My change summary');
  });

  it('file starts with status: pending and iteration: 1', () => {
    const filepath = createReviewRequest('Summary', tmpDir);
    const content = fs.readFileSync(filepath, 'utf-8');
    expect(content).toContain('status: pending');
    expect(content).toContain('iteration: 1');
  });
});

// ---------------------------------------------------------------------------
// cleanupReviews
// ---------------------------------------------------------------------------

describe('cleanupReviews', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cleanup-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('does nothing when the directory does not exist', () => {
    expect(() => cleanupReviews(path.join(tmpDir, 'nonexistent'))).not.toThrow();
  });

  it('deletes all review-*.md files', () => {
    fs.writeFileSync(path.join(tmpDir, 'review-2026-03-10-001.md'), '# review', 'utf-8');
    fs.writeFileSync(path.join(tmpDir, 'review-2026-03-10-002.md'), '# review', 'utf-8');
    cleanupReviews(tmpDir);
    const remaining = fs.readdirSync(tmpDir).filter((f) => f.startsWith('review-'));
    expect(remaining).toHaveLength(0);
  });

  it('leaves non-review files untouched', () => {
    fs.writeFileSync(path.join(tmpDir, 'review-2026-03-10-001.md'), '# review', 'utf-8');
    fs.writeFileSync(path.join(tmpDir, '.gitkeep'), '', 'utf-8');
    cleanupReviews(tmpDir);
    expect(fs.existsSync(path.join(tmpDir, '.gitkeep'))).toBe(true);
  });

  it('does nothing when no review files exist', () => {
    fs.writeFileSync(path.join(tmpDir, 'other.md'), '# other', 'utf-8');
    expect(() => cleanupReviews(tmpDir)).not.toThrow();
    expect(fs.existsSync(path.join(tmpDir, 'other.md'))).toBe(true);
  });
});
