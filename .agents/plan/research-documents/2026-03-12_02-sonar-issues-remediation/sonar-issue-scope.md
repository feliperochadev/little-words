# Sonar Issue Scope Snapshot

**Date:** 2026-03-12

## Inputs

- Project issues API:
  - `componentKeys=feliperochadev_little-words`
  - `statuses=OPEN,CONFIRMED`
- PR issues API:
  - `componentKeys=feliperochadev_little-words`
  - `pullRequest=19`
  - `statuses=OPEN,CONFIRMED`

## Totals

- Project backlog: **150** open issues.
- PR #19: **13** open issues.

## PR #19 Rule Profile

- `typescript:S6759` (readonly props): 12 issues across component files.
- `typescript:S3358` (nested ternary): 1 issue in `app/onboarding.tsx`.

## Project Backlog Hotspots (top sample)

- `typescript:S7772` (`node:*` imports) — tests/scripts.
- `typescript:S7781`, `S6594`, `S3358` — app/component readability and modern API usage.
- `githubactions:S8233`, `S8264` — workflow permission scope.
- High-touch files include:
  - `app/(tabs)/home.tsx`
  - `app/onboarding.tsx`
  - `src/components/AddWordModal.tsx`
  - `src/components/ImportModal.tsx`
  - `src/components/UIComponents.tsx`

## Remediation Strategy

1. Resolve all PR #19 issues first.
2. While editing same files, opportunistically fix additional Sonar findings with low regression risk.
3. Re-run CI and iterate.
