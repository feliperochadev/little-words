/**
 * @jest-environment node
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  buildTaskFilename,
  completeTask,
  createUnfinishedTask,
  formatTaskFile,
  listPendingTasks,
  markTaskInProgress,
  parseTaskFile,
  type UnfinishedTask,
} from '../../scripts/agent/task-persistence';

const baseTask: UnfinishedTask = {
  status: 'pending',
  createdBy: 'claude',
  createdAt: '2026-03-10T12:00:00Z',
  reason: 'rate_limit',
  taskDescription: 'Implement new feature X.',
  taskContext: 'User asked: add feature X to the settings screen.',
  progressMade: '- Added skeleton component',
  filesTouched: ['app/(tabs)/settings.tsx', 'src/utils/helper.ts'],
  nextSteps: '1. Implement the full feature\n2. Write tests\n3. Run CI',
  requiredChecks: ['run npm run ci', 'ensure tests pass'],
};

// ---------------------------------------------------------------------------
// buildTaskFilename
// ---------------------------------------------------------------------------

describe('buildTaskFilename', () => {
  it('returns task-{today}-001 for zero existing files', () => {
    const name = buildTaskFilename(0);
    const today = new Date().toISOString().split('T')[0];
    expect(name).toBe(`task-${today}-001.md`);
  });

  it('increments sequence based on existing count', () => {
    const name = buildTaskFilename(4);
    const today = new Date().toISOString().split('T')[0];
    expect(name).toBe(`task-${today}-005.md`);
  });
});

// ---------------------------------------------------------------------------
// formatTaskFile
// ---------------------------------------------------------------------------

describe('formatTaskFile', () => {
  it('includes all metadata fields', () => {
    const output = formatTaskFile(baseTask);
    expect(output).toContain('status: pending');
    expect(output).toContain('created_by: claude');
    expect(output).toContain('created_at: 2026-03-10T12:00:00Z');
    expect(output).toContain('reason: rate_limit');
  });

  it('includes all section headings', () => {
    const output = formatTaskFile(baseTask);
    expect(output).toContain('## Task Description');
    expect(output).toContain('## Task Context');
    expect(output).toContain('## Progress Made');
    expect(output).toContain('## Files Touched');
    expect(output).toContain('## Next Steps');
    expect(output).toContain('## Required Checks');
  });

  it('includes task content', () => {
    const output = formatTaskFile(baseTask);
    expect(output).toContain('Implement new feature X.');
    expect(output).toContain('add feature X to the settings screen.');
    expect(output).toContain('Added skeleton component');
    expect(output).toContain('Implement the full feature');
    expect(output).toContain('run npm run ci');
  });

  it('lists each touched file with a dash', () => {
    const output = formatTaskFile(baseTask);
    expect(output).toContain('- app/(tabs)/settings.tsx');
    expect(output).toContain('- src/utils/helper.ts');
  });

  it('shows (none) for empty filesTouched', () => {
    const output = formatTaskFile({ ...baseTask, filesTouched: [] });
    expect(output).toContain('(none)');
  });

  it('shows default required check when requiredChecks is empty', () => {
    const output = formatTaskFile({ ...baseTask, requiredChecks: [] });
    expect(output).toContain('- run npm run ci');
  });

  it('shows (none) for empty progressMade', () => {
    const output = formatTaskFile({ ...baseTask, progressMade: '' });
    expect(output).toContain('(none)');
  });
});

// ---------------------------------------------------------------------------
// parseTaskFile
// ---------------------------------------------------------------------------

describe('parseTaskFile', () => {
  it('parses status, createdBy, createdAt, reason', () => {
    const content = `# Unfinished Task\n\nstatus: in_progress\ncreated_by: gemini\ncreated_at: 2026-03-10T09:00:00Z\n\nreason: rate_limit\n`;
    const result = parseTaskFile(content);
    expect(result.status).toBe('in_progress');
    expect(result.createdBy).toBe('gemini');
    expect(result.createdAt).toBe('2026-03-10T09:00:00Z');
    expect(result.reason).toBe('rate_limit');
  });

  it('defaults createdBy to unknown when missing', () => {
    const result = parseTaskFile('status: pending');
    expect(result.createdBy).toBe('unknown');
  });

  it('defaults createdAt to empty string when missing', () => {
    const result = parseTaskFile('status: pending');
    expect(result.createdAt).toBe('');
  });

  it('defaults reason to unknown when missing', () => {
    const result = parseTaskFile('status: pending');
    expect(result.reason).toBe('unknown');
  });

  it('handles completed status', () => {
    const result = parseTaskFile('status: completed\ncreated_by: codex\ncreated_at: now\nreason: rate_limit');
    expect(result.status).toBe('completed');
  });
});

// ---------------------------------------------------------------------------
// createUnfinishedTask
// ---------------------------------------------------------------------------

describe('createUnfinishedTask', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'task-persist-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates a task file in the given directory', () => {
    const filepath = createUnfinishedTask(baseTask, tmpDir);
    expect(fs.existsSync(filepath)).toBe(true);
  });

  it('creates directory if it does not exist', () => {
    const nested = path.join(tmpDir, 'nested', 'tasks');
    const filepath = createUnfinishedTask(baseTask, nested);
    expect(fs.existsSync(filepath)).toBe(true);
  });

  it('file name matches task-{date}-{seq}.md pattern', () => {
    const filepath = createUnfinishedTask(baseTask, tmpDir);
    expect(path.basename(filepath)).toMatch(/^task-\d{4}-\d{2}-\d{2}-\d{3}\.md$/);
  });

  it('first file gets seq 001', () => {
    const filepath = createUnfinishedTask(baseTask, tmpDir);
    expect(path.basename(filepath)).toMatch(/-001\.md$/);
  });

  it('second file on same day gets seq 002', () => {
    createUnfinishedTask(baseTask, tmpDir);
    const second = createUnfinishedTask(baseTask, tmpDir);
    expect(path.basename(second)).toMatch(/-002\.md$/);
  });

  it('file content includes task description', () => {
    const filepath = createUnfinishedTask(baseTask, tmpDir);
    const content = fs.readFileSync(filepath, 'utf-8');
    expect(content).toContain('Implement new feature X.');
  });
});

// ---------------------------------------------------------------------------
// listPendingTasks
// ---------------------------------------------------------------------------

describe('listPendingTasks', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'task-list-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty array when directory does not exist', () => {
    const result = listPendingTasks(path.join(tmpDir, 'nonexistent'));
    expect(result).toEqual([]);
  });

  it('returns empty array when no task files exist', () => {
    expect(listPendingTasks(tmpDir)).toEqual([]);
  });

  it('returns pending tasks', () => {
    createUnfinishedTask(baseTask, tmpDir);
    const result = listPendingTasks(tmpDir);
    expect(result).toHaveLength(1);
    expect(result[0].task.status).toBe('pending');
  });

  it('filters out non-pending tasks', () => {
    const inProgressTask: UnfinishedTask = { ...baseTask, status: 'in_progress' };
    createUnfinishedTask(inProgressTask, tmpDir);
    const result = listPendingTasks(tmpDir);
    expect(result).toHaveLength(0);
  });

  it('returns multiple pending tasks', () => {
    createUnfinishedTask(baseTask, tmpDir);
    createUnfinishedTask(baseTask, tmpDir);
    const result = listPendingTasks(tmpDir);
    expect(result).toHaveLength(2);
  });

  it('ignores non-task files in the directory', () => {
    fs.writeFileSync(path.join(tmpDir, '.gitkeep'), '', 'utf-8');
    fs.writeFileSync(path.join(tmpDir, 'notes.md'), '# notes', 'utf-8');
    const result = listPendingTasks(tmpDir);
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// markTaskInProgress
// ---------------------------------------------------------------------------

describe('markTaskInProgress', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'task-progress-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('updates status to in_progress', () => {
    const filepath = createUnfinishedTask(baseTask, tmpDir);
    markTaskInProgress(filepath);
    const content = fs.readFileSync(filepath, 'utf-8');
    expect(content).toContain('status: in_progress');
  });

  it('no longer shows status: pending after marking', () => {
    const filepath = createUnfinishedTask(baseTask, tmpDir);
    markTaskInProgress(filepath);
    const result = listPendingTasks(tmpDir);
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// completeTask
// ---------------------------------------------------------------------------

describe('completeTask', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'task-complete-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('deletes the task file', () => {
    const filepath = createUnfinishedTask(baseTask, tmpDir);
    expect(fs.existsSync(filepath)).toBe(true);
    completeTask(filepath);
    expect(fs.existsSync(filepath)).toBe(false);
  });

  it('removes task from pending list', () => {
    const filepath = createUnfinishedTask(baseTask, tmpDir);
    completeTask(filepath);
    expect(listPendingTasks(tmpDir)).toHaveLength(0);
  });
});
