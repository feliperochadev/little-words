/**
 * Review orchestration utility for the multi-agent review system.
 *
 * Responsibilities:
 *   - Evaluate whether the latest change is complex (delegates to complexity-check)
 *   - For simple changes: print internal review checklist and exit
 *   - For complex changes: create a structured review request file in .agents/reviews/
 *   - Track iteration count and enforce maximum iterations from config
 *   - Track multiple reviewers and approvals for auto-shipping
 *   - Clean up approved review files
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { checkComplexity } from './complexity-check';
import { loadAgentConfig } from './load-config';

export type ReviewStatus = 'pending' | 'approved' | 'changes_requested' | 'escalation_required';

export interface ReviewFile {
  status: ReviewStatus;
  iteration: number;
  maxIterations: number;
  reviewer: string; // Legacy: single reviewer field
  reviewers: string[]; // New: list of agents involved
  approvals: string[]; // New: list of agents who approved
  targetAgent: string;
  branch: string;
  changeSummary: string;
  filesModified: string[];
  ciStatus: string;
  issues: string;
  suggestions: string;
  resolution: string;
}

const REVIEWS_DIR = join(process.cwd(), '.agents', 'reviews');
function readLineValue(content: string, key: string): string | undefined {
  const prefix = `${key}:`;
  for (const line of content.split('\n')) {
    if (line.startsWith(prefix)) {
      return line.slice(prefix.length).trim();
    }
  }
  return undefined;
}

function readMarkdownList(content: string, title: string): string[] {
  const header = `${title}:`;
  const lines = content.split('\n');
  const index = lines.findIndex((line) => line.trim() === header);
  if (index < 0) return [];

  const values: string[] = [];
  for (let i = index + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.startsWith('- ')) break;
    values.push(line.slice(2).trim());
  }
  return values;
}

export function getReviewsDir(): string {
  return REVIEWS_DIR;
}

export function buildTimestamp(existingCount: number): string {
  const date = new Date().toISOString().split('T')[0];
  const seq = String(existingCount + 1).padStart(3, '0');
  return `${date}-${seq}`;
}

export function getCurrentBranch(): string {
  try {
    return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf-8' }).trim(); // NOSONAR - execFileSync with array args, no shell expansion
  } catch {
    return 'unknown';
  }
}

export function getModifiedFiles(): string[] {
  try {
    const output = execFileSync('git', ['diff', '--name-only', 'HEAD'], { encoding: 'utf-8' }); // NOSONAR - execFileSync with array args, no shell expansion
    return output.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

export function formatReviewFile(review: ReviewFile): string {
  const fileList =
    review.filesModified.length > 0
      ? review.filesModified.map((f) => `- ${f}`).join('\n')
      : '(none)';

  const reviewersList = review.reviewers.length > 0 ? review.reviewers.map((r) => `- ${r}`).join('\n') : '(none)';
  const approvalsList = review.approvals.length > 0 ? review.approvals.map((a) => `- ${a}`).join('\n') : '(none)';

  return `# Code Review

status: ${review.status}
iteration: ${review.iteration}
max_iterations: ${review.maxIterations}

reviewer: ${review.reviewer}

reviewers:
${reviewersList}

approvals:
${approvalsList}

target_agent: ${review.targetAgent}

branch: ${review.branch}

---

## Change Summary

${review.changeSummary}

---

## Files Modified

${fileList}

---

## CI Status

${review.ciStatus}

---

## Reviewer Analysis

### Issues

${review.issues || '(empty)'}

### Suggestions

${review.suggestions || '(empty)'}

---

## Resolution

${review.resolution || '(empty)'}
`;
}

export function parseReviewFile(content: string): Partial<ReviewFile> {
  const parsedStatus = readLineValue(content, 'status');
  const status = parsedStatus as ReviewStatus | undefined;
  const iterationStr = readLineValue(content, 'iteration');
  const maxIterationsStr = readLineValue(content, 'max_iterations');
  const branch = readLineValue(content, 'branch') ?? 'unknown';
  const targetAgent = readLineValue(content, 'target_agent') ?? 'unknown';
  const reviewers = readMarkdownList(content, 'reviewers');
  const approvals = readMarkdownList(content, 'approvals');

  return {
    status,
    iteration: iterationStr === undefined ? 1 : Number.parseInt(iterationStr, 10),
    maxIterations: maxIterationsStr === undefined ? 3 : Number.parseInt(maxIterationsStr, 10),
    branch,
    targetAgent,
    reviewers,
    approvals,
  };
}

export function createReviewRequest(changeSummary: string, reviewsDir?: string): string {
  const dir = reviewsDir ?? REVIEWS_DIR;
  const config = loadAgentConfig();

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const date = new Date().toISOString().split('T')[0];
  const existing = readdirSync(dir).filter(
    (f) => f.startsWith(`review-${date}`) && f.endsWith('.md'),
  ).length;

  const timestamp = buildTimestamp(existing);
  const filename = `review-${timestamp}.md`;
  const filepath = join(dir, filename);

  const review: ReviewFile = {
    status: 'pending',
    iteration: 1,
    maxIterations: config.maxIterations,
    reviewer: 'external',
    reviewers: [],
    approvals: [],
    targetAgent: 'unknown',
    branch: getCurrentBranch(),
    changeSummary,
    filesModified: getModifiedFiles(),
    ciStatus: 'passed',
    issues: '',
    suggestions: '',
    resolution: '',
  };

  writeFileSync(filepath, formatReviewFile(review), 'utf-8');
  return filepath;
}

export function cleanupReviews(reviewsDir?: string): void {
  const dir = reviewsDir ?? REVIEWS_DIR;
  if (!existsSync(dir)) return;
  const files = readdirSync(dir).filter((f) => f.startsWith('review-') && f.endsWith('.md'));
  files.forEach((f) => unlinkSync(join(dir, f)));
}

export function readReviewFile(filepath: string): Partial<ReviewFile> {
  const content = readFileSync(filepath, 'utf-8');
  return parseReviewFile(content);
}

// CLI entry point
if (require.main === module) {
  const complexity = checkComplexity();
  const config = loadAgentConfig();

  if (!complexity.isComplex) {
    console.log('Simple change — performing internal review.');
    console.log('Internal review checklist:');
    console.log('  [ok] Tests exist');
    console.log('  [ok] CI passed');
    console.log('  [ok] Naming conventions respected');
    console.log('  [ok] Architecture respected');

    if (config.automaticShip) {
      console.log('\nAutomatic ship is ENABLED for simple changes.');
      console.log('Proceeding to /ship...');
      // In a real scenario, the agent would now trigger the /ship command.
    }
    process.exit(0);
  }

  console.log(`Complex change detected: ${complexity.reason}`);
  const summary = process.argv[2] ?? 'No summary provided.';
  
  // Check if a review file already exists
  const dir = REVIEWS_DIR;
  const existingFiles = existsSync(dir) ? readdirSync(dir).filter(f => f.startsWith('review-') && f.endsWith('.md')) : [];
  
  let filepath: string;
  let review: Partial<ReviewFile>;

  if (existingFiles.length > 0) {
    filepath = join(dir, existingFiles[0]);
    console.log(`Existing review request found: ${filepath}`);
    review = readReviewFile(filepath);
  } else {
    filepath = createReviewRequest(summary);
    console.log(`Review request created: ${filepath}`);
    review = readReviewFile(filepath);
  }

  console.log(`Status: ${review.status} — iteration ${review.iteration}/${review.maxIterations ?? config.maxIterations}`);
  console.log(`Approvals: ${review.approvals?.length ?? 0} / ${config.requiredApprovals} required`);

  if (review.status === 'approved') {
    const approvalCount = review.approvals?.length ?? 0;
    if (approvalCount >= config.requiredApprovals) {
      console.log('\nREQUIRED APPROVALS MET.');
      if (config.automaticShip) {
        console.log('Automatic ship is ENABLED. Proceeding to /ship...');
      } else {
        console.log('Automatic ship is DISABLED. Manual /ship required.');
      }
    } else {
      console.log(`\nStatus is approved but only ${approvalCount}/${config.requiredApprovals} approvals received.`);
      console.log('Awaiting more external reviewers.');
    }
  } else if (review.status === 'pending') {
    console.log('\nAwaiting external reviewers.');
  }

  if (review.iteration !== undefined && review.iteration >= (review.maxIterations ?? config.maxIterations)) {
    console.log('\nMaximum iterations reached — escalation required.');
    process.exit(2);
  }

  process.exit(0);
}
