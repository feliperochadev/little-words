# Design: Sonar Issues Remediation (Project + PR-19)

**Date:** 2026-03-12
**Status:** Draft
**Author:** Codex (apsc - cx)
**Related ADR:** N/A
**Research:** `.agents/plan/research-documents/2026-03-12_02-sonar-issues-remediation/sonar-issue-scope.md`

---

## Problem Statement

SonarCloud reports open issues on both the full project backlog and PR #19. The PR-specific issues are merge blockers, while project-level issues include high-value maintainability and security findings that have accumulated over time. We need a safe, behavior-preserving remediation pass that clears PR findings and reduces the broader backlog in touched domains.

## Goals

- Resolve all open Sonar issues listed for PR #19.
- Address additional high-impact project issues in the same touched files/rules where practical.
- Keep runtime behavior unchanged.
- Validate with existing repository CI (`npm run ci`).

## Non-Goals

- Zeroing the full historical Sonar backlog in one change.
- Introducing new dependencies or large architectural rewrites.
- UI/feature redesign.

## Design

### Overview

Use a two-tier approach:

1. **Tier A (mandatory):** fix all PR #19 issues.
2. **Tier B (opportunistic):** fix recurring/high-impact project issues in the same files while code is open.

### Component / Module Breakdown

| Area | Focus | Files |
|---|---|---|
| PR-19 compliance | S6759 readonly props + S3358 ternary cleanup | `app/onboarding.tsx`, `src/components/*` |
| Home screen cleanup | S6479, S3358, S6509/S7735, S7781, parseInt rules | `app/(tabs)/home.tsx` |
| Complexity/readability cleanup | deep nesting, optional chaining, key usage | `src/components/AddWordModal.tsx`, `src/components/ImportModal.tsx` |
| Security workflow scoping | workflow permissions (where valid) | `.github/workflows/security.yml` |

### Data Flow

```
Sonar API issue list
  → group by rule/file
  → apply surgical code changes
  → run CI
  → iterate until CI green + targeted issue set resolved
```

### Error Handling

- No silent catches added.
- Preserve existing translated alerts and user-visible error behavior.

## Alternatives Considered

- Fix only PR #19 issues: faster, but leaves easy wins in same files.
- Attempt all 150 project issues in one pass: high risk and excessive churn.

## Open Questions

- [ ] Should workflow-level Sonar security issues be fixed in this pass if they affect non-PR files only?
- [ ] Should remaining backlog be addressed in a dedicated follow-up epic by rule group?

## Acceptance Criteria

- [ ] PR #19 Sonar issue list is fully resolved.
- [ ] No regressions in lint/typecheck/tests (`npm run ci` passes).
- [ ] Changelog reflects remediation scope and verification.
