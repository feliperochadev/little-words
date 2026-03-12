/**
 * Task persistence utility for Rate Limit Resilience.
 *
 * When an agent hits 95% of its quota it must:
 *   1. Revert uncommitted changes (handled by the /rate-limit-abort command)
 *   2. Call createUnfinishedTask() to persist context
 *   3. Call setAgentAvailable(agentName, false) to mark itself offline
 *
 * Recovery:
 *   Any available agent calls /check-unfinished-tasks which reads these files
 *   and resumes the work.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface UnfinishedTask {
  status: TaskStatus;
  createdBy: string;
  createdAt: string;
  reason: string;
  taskDescription: string;
  taskContext: string;
  progressMade: string;
  filesTouched: string[];
  nextSteps: string;
  requiredChecks: string[];
}

const TASKS_DIR = join(process.cwd(), '.agents', 'unfinished-tasks');

export function getTasksDir(): string {
  return TASKS_DIR;
}

export function buildTaskFilename(existingCount: number): string {
  const date = new Date().toISOString().split('T')[0];
  const seq = String(existingCount + 1).padStart(3, '0');
  return `task-${date}-${seq}.md`;
}

export function formatTaskFile(task: UnfinishedTask): string {
  const fileList =
    task.filesTouched.length > 0
      ? task.filesTouched.map((f) => `- ${f}`).join('\n')
      : '(none)';

  const checkList =
    task.requiredChecks.length > 0
      ? task.requiredChecks.map((c) => `- ${c}`).join('\n')
      : '- run npm run ci';

  return `# Unfinished Task

status: ${task.status}
created_by: ${task.createdBy}
created_at: ${task.createdAt}

reason: ${task.reason}

---

## Task Description

${task.taskDescription}

---

## Task Context

${task.taskContext}

---

## Progress Made

${task.progressMade || '(none)'}

---

## Files Touched

${fileList}

---

## Next Steps

${task.nextSteps}

---

## Required Checks

${checkList}
`;
}

export function parseTaskFile(content: string): Partial<UnfinishedTask> {
  let status: TaskStatus | undefined;
  let createdBy = 'unknown';
  let createdAt = '';
  let reason = 'unknown';

  for (const line of content.split('\n')) {
    if (line.startsWith('status:')) {
      status = line.slice('status:'.length).trim() as TaskStatus;
    } else if (line.startsWith('created_by:')) {
      createdBy = line.slice('created_by:'.length).trim() || 'unknown';
    } else if (line.startsWith('created_at:')) {
      createdAt = line.slice('created_at:'.length).trim();
    } else if (line.startsWith('reason:')) {
      reason = line.slice('reason:'.length).trim() || 'unknown';
    }
  }

  return { status, createdBy, createdAt, reason };
}

export function createUnfinishedTask(task: UnfinishedTask, tasksDir?: string): string {
  const dir = tasksDir ?? TASKS_DIR;

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const date = new Date().toISOString().split('T')[0];
  const existing = readdirSync(dir).filter(
    (f) => f.startsWith(`task-${date}`) && f.endsWith('.md'),
  ).length;

  const filename = buildTaskFilename(existing);
  const filepath = join(dir, filename);

  writeFileSync(filepath, formatTaskFile(task), 'utf-8');
  return filepath;
}

export function listPendingTasks(tasksDir?: string): { filepath: string; task: Partial<UnfinishedTask> }[] {
  const dir = tasksDir ?? TASKS_DIR;

  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((f) => f.startsWith('task-') && f.endsWith('.md'))
    .map((f) => {
      const filepath = join(dir, f);
      const content = readFileSync(filepath, 'utf-8');
      const task = parseTaskFile(content);
      return { filepath, task };
    })
    .filter(({ task }) => task.status === 'pending');
}

export function markTaskInProgress(filepath: string): void {
  const content = readFileSync(filepath, 'utf-8');
  const updated = content
    .split('\n')
    .map((line) => (line.startsWith('status:') ? 'status: in_progress' : line))
    .join('\n');
  writeFileSync(filepath, updated, 'utf-8');
}

export function completeTask(filepath: string): void {
  unlinkSync(filepath);
}

// CLI entry point
if (require.main === module) {
  const pending = listPendingTasks();

  if (pending.length === 0) {
    console.log('No pending unfinished tasks.');
    process.exit(0);
  }

  console.log(`Found ${pending.length} pending task(s):\n`);
  pending.forEach(({ filepath, task }, i) => {
    console.log(`${i + 1}. ${filepath}`);
    console.log(`   created_by: ${task.createdBy}`);
    console.log(`   created_at: ${task.createdAt}`);
    console.log(`   reason:     ${task.reason}`);
    console.log();
  });

  process.exit(0);
}
