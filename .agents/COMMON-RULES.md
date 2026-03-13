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
   - **Cross-vendor documentation rule:** When a change affects general rules, workflow, tooling, or architecture (not just one vendor's quirks), update **all** vendor readme files listed in `.agents/agent-config.json` under `agents.{name}.readme_file`. Currently: `CLAUDE.md` (Claude), `AGENTS.md` (Codex), `GEMINI.md` (Gemini). Every readme must stay in sync on shared rules.

4. `/ship` is the standard way to commit and push approved changes. Vendor-specific steps live in `.claude/commands/ship.md`, `.gemini/commands/ship.md`, `.codex/commands/ship.md`.
   - **Auto-ship:** Read `features.automatic_ship` from `.agents/agent-config.json` before every `/ship` decision:
     - `true` → run `/ship` automatically after `/review` confirms approval (simple change passes checklist, or complex change has `status: approved` with required approvals met).
     - `false` → **never run `/ship` automatically**; wait for explicit user request.
   - **Agent Markers:** Every commit must include a standardized marker to identify the vendor: `apsc - gi` (Gemini), `apsc - ce` (Claude), or `apsc - cx` (Codex).
   - **Clean History:** Commit messages must have all Markdown formatting markers (like `**` and `###`) stripped to ensure a clean, unpolluted git log. Standard tags like `[fix]` and agent markers must be preserved.
   - **Tag-based shipping boundary:** `/ship` uses git tags named `ship-YYYY-MM-DD_N` to locate the most recently shipped changelog entry. Collect entries above that ID only. If no tag exists yet, fall back to the git-log method once, then create the first tag.
   - **Changelog immutability after push:** Once a changelog entry has been pushed, never modify it. If a correction is needed, add a new entry and reference the old ID.

5. **Automatic Commit Gate (`/commit`).** `/commit` always runs CI → `/review` → respects `automatic_ship` when invoked. `features.automatic_commit` in `.agents/agent-config.json` controls only **whether the agent self-triggers `/commit`** after finishing work:
   - `false` (default) → agent must wait for the user to explicitly call `/commit`; never self-trigger it.
   - `true` → agent may call `/commit` automatically once work is complete.
   - Vendor-specific steps live in `.claude/commands/commit.md`, `.gemini/commands/commit.md`, `.codex/commands/commit.md`.

6. **Multi-Agent Review Protocol.** Before `/ship`, run `npm run agent:review` to evaluate complexity. Scripts live in `scripts/agent/`.
   - **Simple change** (≤ 10 change lines AND < 3 category tags): internal review only.
   - **Complex change** (> 10 change lines OR ≥ 3 distinct category tags): creates `.agents/reviews/review-{timestamp}.md`. An external vendor agent must set `status: approved` or `status: changes_requested`. Maximum 3 iterations; if still unresolved, set `status: escalation_required` and stop.
   - Agents must never approve their own complex changes or proceed to `/ship` while a review file has status `pending` or `changes_requested`.

8. **Session Start — Review Feature Flags.** At the beginning of every session, read `features` from `.agents/agent-config.json` and ask the user:

   > Current feature flags:
   > - `automatic_commit`: true/false
   > - `automatic_ship`: true/false
   >
   > Keep as is, or change any?

   - If **keep** → proceed normally.
   - If **change** → ask which flag(s) to update and their new values, apply them to `.agents/agent-config.json`, then proceed.
   - Do this before any other work in the session.

7. **Rate Limit Resilience.** When approaching 95% of usage quota mid-task, trigger `/rate-limit-abort`:
   - Run `git reset && git restore .` to revert all uncommitted changes.
   - Write `.agents/unfinished-tasks/task-{date}-{seq}.md` with task description, context, progress, and explicit next steps.
   - Set `agents.{self}.available: false` in `.agents/agent-config.json`.
   - Stop immediately. Do not proceed to `/ship`.
   At session start, call `/check-unfinished-tasks`: re-mark yourself available, list pending tasks, pick the oldest, and resume from `## Next Steps`.

8. **All commands must run within the project root only.** Every shell command — whether from `allowed_commands` or approved ad-hoc during a session — must execute inside this repository's root directory. Never `cd` to, create files in, or target paths outside the project root. This is enforced by `command_scope: "project_root_only"` in `.agents/agent-config.json`.

## Permanently Allowed Commands

The following commands are pre-approved for all agents and may be executed at any time without asking for user permission. They are also listed in `.agents/agent-config.json` under `allowed_commands`.

| Command | Purpose |
|---------|---------|
| `npm run ci` | Full quality gate: lint + typecheck + tests |
| `npm run lint` | ESLint only |
| `npm run typecheck` | TypeScript type-check only |
| `npm run test` | Jest tests (no coverage) |
| `npm run test:coverage` | Jest tests with LCOV coverage report |
| `npm run agent:review` | Complexity check + review file creation |
| `npm run agent:check-tasks` | List pending unfinished agent tasks |
| `npm run agent:availability` | Show which agents are online/offline |
| `git status` | Working tree status |
| `git diff` | Show unstaged / staged changes |
| `git add` | Stage files for commit |
| `git commit` | Create a commit |
| `git push` | Push branch and/or tags to remote |
| `git tag` | Create or list tags |
| `git log` | Inspect commit history |
| `git branch` | List or show current branch |

## Code Standards

Authoritative coding standards live in `.agents/standards/`. Read the relevant file before making changes in that domain.

| Domain | File |
|--------|------|
| TypeScript | `.agents/standards/typescript.md` |
| Components | `.agents/standards/components.md` |
| State Management | `.agents/standards/state-management.md` |
| Hooks | `.agents/standards/hooks.md` |
| Testing | `.agents/standards/testing.md` |
| Styling & Naming | `.agents/standards/styling-and-naming.md` |
| Code Quality | `.agents/standards/quality.md` |
| Security | `.agents/standards/security.md` |
