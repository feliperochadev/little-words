# Design: [Feature / Component Name]

**Date:** YYYY-MM-DD
**Status:** Draft | Approved | Superseded
**Author:** [agent name]
**Related ADR:** [ADR-XXXX or N/A]

---

## Problem Statement

What user-facing or developer-facing problem does this design solve? Be specific.

## Goals

- [goal 1]
- [goal 2]

## Non-Goals

- [explicitly out of scope 1]
- [explicitly out of scope 2]

## Design

### Overview

High-level description of the approach.

### Component / Module Breakdown

| Component | Responsibility | File(s) |
|-----------|---------------|---------|
| [name]    | [what it does] | `src/...` |

### Data Flow

Describe how data moves through the system for the key user actions.

```
[User action] → [Component] → [DB/API] → [Result]
```

### UI / UX Decisions

- [screen or modal name]: [key behaviour or layout choice]

### Error Handling

- [error scenario]: [how it is handled]

## Alternatives Considered

Brief notes on approaches that were discarded and why.

## Open Questions

- [ ] [question that still needs resolution before implementation]

## Acceptance Criteria

- [ ] [testable criterion 1]
- [ ] [testable criterion 2]
- [ ] New code follows all rules in `.agents/standards/sonar.md` — no S6749, S2004, S3776, or other documented violations introduced
