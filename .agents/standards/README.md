# Code Standards — Palavrinhas

This directory is the authoritative reference for how code is written in this repository.

**Audience:** AI agents and human contributors alike.

**Relationship to agent docs:** `CLAUDE.md`, `AGENTS.md`, and `GEMINI.md` describe *how to operate* (commit flow, review protocol, CI, etc.). This directory describes *how to code* — patterns, naming, architecture choices.

---

## How Agents Should Use This

Before making changes in a given domain, read the relevant standard file. Before reviewing a PR or changelog entry, check whether any standard is violated. When a new pattern is established that belongs here, update the relevant file as part of the changelog entry.

---

## Quick Reference

| Domain | File | Key Topics |
|---|---|---|
| TypeScript | [`typescript.md`](typescript.md) | `interface` vs `type`, generics, banned patterns, type assertions |
| Components | [`components.md`](components.md) | structure, props, memo policy, accessibility, size limits |
| State Management | [`state-management.md`](state-management.md) | TQ vs Zustand vs useState, selector hooks, hydration |
| Hooks | [`hooks.md`](hooks.md) | naming, `useEffect` rules, stable closures, empty-array consts |
| Testing | [`testing.md`](testing.md) | Jest structure, RNTL, Maestro, coverage floors, mocking |
| Styling & Naming | [`styling-and-naming.md`](styling-and-naming.md) | StyleSheet, colors, file/variable naming conventions |
| Quality | [`quality.md`](quality.md) | Sonar gate thresholds, complexity, duplication, magic numbers |
| Security | [`security.md`](security.md) | Secrets, SQL injection, secure storage, child processes |
| SonarQube Rules | [`sonar.md`](sonar.md) | Full AI CodeFix rule reference for TypeScript/JavaScript |
| Data Layer | [`data-layer.md`](data-layer.md) | Repository pattern, DB client, migrations, SQL conventions, test mocking |

---

## Maintenance Rule

When a change affects a pattern documented here, update the relevant standard file in the same PR/commit. Standards are living documents — not historical records.
