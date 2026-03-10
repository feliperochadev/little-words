COMMON RULES ACROSS DIFFERENT AGENT VENDORS ALWAYS USE THIS ONE AS BASELINE FOR CREATE YOURS (CLAUDE.MD, GEMINI.MD, CODEX.MD etc)

### Rules

1. **Always write tests for every code change.** Use unit tests for isolated functions (helpers, utils, parsers) and integration tests for components. Tests must cover at least of the changed code: 99% in lines and 95% in funcs, branch and stmts — every branch, edge case, and error path. Place them in the matching subdirectory under `__tests__/` (`unit/`, `integration/`, or `screens/`).

2. **Always run `npm run ci` after changes and only consider the task done when it passes.** The CI script runs `eslint` (fixes must include warnings, not just errors), `tsc --noEmit`, and `jest` in sequence (`npm run lint && npm run typecheck && npm run test`). A passing CI is required before any work is considered complete — do not skip or work around failures.

3. **Always update `{VENDOR-AGENT-INIT-FILE}.md` and `./agents/AGENTS-CHANGELOG.md` after every approved change.** Once changes pass CI and are approved: update the relevant sections of `{VENDOR-AGENT-INIT-FILE}.md` if architecture, conventions, or utilities changed; always append a new entry to `./agents/AGENTS-CHANGELOG.md` regardless — it is the permanent record of every approved change. Each entry heading follows the format `### YYYY-MM-DD_N` (e.g. `2026-03-09_1`, `2026-03-09_2`) where N increments within the same day, making every entry uniquely identifiable. Each change group within an entry must be prefixed with a category tag:
   - `[fix]` — bug fixes and test corrections
   - `[feature]` — new capabilities added to the app or test infrastructure
   - `[upgrade]` — dependency version bumps
   - `[config]` — documentation, tooling, or project configuration changes
   - `[test]` — new tests or test expansions with no production code change
   - Others like `[security]`, `[refactor]`, `[perf]` can be added as needed.

4. `/ship` is the standard way to commit and push approved changes if the current agent doesn't have one look the example on `.claude/commands/ship.md`. **Never run it automatically — only when explicitly requested by the user.**
   - **Agent Markers:** Every commit must include a standardized marker to identify the vendor: `apsc - gi` (Gemini), `apsc - ce` (Claude), or `apsc - cx` (Codex).
   - **Clean History:** Commit messages must have all Markdown formatting markers (like `**` and `###`) stripped to ensure a clean, unpolluted git log. Standard tags like `[fix]` and agent markers must be preserved.  