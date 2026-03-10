# Repository Guidelines

## Project Structure & Module Organization
`app/` holds Expo Router screens and layouts, including `app/(tabs)/` for the main navigation. Shared UI belongs in `src/components/`, SQLite data access in `src/database/`, translations in `src/i18n/`, and helpers in `src/utils/`. Tests are split into `__tests__/unit`, `__tests__/integration`, `__tests__/screens`, and Maestro flows in `__tests__/e2e`. Keep static assets in `assets/`.

## Build, Test, and Development Commands
Use `npm start` for the Expo dev server and `npm run android` or `npm run ios` for native runs. Quality gates are mandatory:

- `npm run lint`: ESLint 9 with `eslint-config-expo`
- `npm run typecheck`: TypeScript compile check without emit
- `npm test`: Jest unit, integration, and screen tests
- `npm run ci`: required completion gate; runs lint, typecheck, and Jest
- `npm run e2e`, `npm run e2e:import`, `npm run e2e:export`: Maestro flows in `__tests__/e2e/`

Do not consider work complete until `npm run ci` passes.

## Coding Style & Naming Conventions
Write concise TypeScript and keep shared theme values in `src/utils/theme.ts`. Preserve existing naming patterns: Expo Router files stay lowercase, React components use PascalCase, and helper modules use camelCase. Prefer `testID`-based selectors over visible text for app UI. Treat lint warnings as real work, not noise.

## Testing Guidelines
Every code change must include tests. Changed code should reach 99% line coverage and 95% function, branch, and statement coverage, including edge cases and error paths. Put pure logic in `__tests__/unit`, component behavior in `__tests__/integration`, and route-level behavior in `__tests__/screens`. In Maestro, prefer `id:` selectors, call `scrollUntilVisible` before off-screen assertions, and use `waitForAnimationToEnd` after modal or navigation transitions.

## Commit & Pull Request Guidelines
Recent history uses short, imperative subjects such as `fix test` and `fix import from text box`. Keep commits focused and descriptive. Pull requests should summarize user-visible changes, list tests run, link the related issue when applicable, and include screenshots or recordings for UI changes.

## Documentation & Shipping Rules
After every approved change, update the relevant agent documentation when conventions or architecture change and always append an entry to `.agents/AGENTS-CHANGELOG.md` using `### YYYY-MM-DD_N` and tags such as `[fix]`, `[feature]`, or `[config]`.

**Cross-vendor documentation rule:** When a change affects general rules, workflow, tooling, or architecture, update **all** vendor readme files listed in `.agents/agent-config.json` under `agents.{name}.readme_file`: `CLAUDE.md` (Claude), `AGENTS.md` (Codex), `GEMINI.md` (Gemini). All readmes must stay in sync on shared rules.

**Automatic Commit Gate (`/commit`):** When all code and test changes are complete, call `/commit`. It reads `features.automatic_commit` from `.agents/agent-config.json`:
- `false` (default) → stop; output that changes are ready but do NOT run CI, `/review`, or `/ship`; wait for the user.
- `true` → run `npm run ci`, verify the changelog entry, then run `/review`.
- Never bypass this gate — if the flag is `false`, do not commit even if asked to "just commit quickly".
- Vendor-specific steps live in `.claude/commands/commit.md`, `.codex/commands/commit.md`, `.gemini/commands/commit.md`.

`/ship` is the standard push flow. Before running it, read `features.automatic_ship` from `.agents/agent-config.json`:
- `true` → run `/ship` automatically once `/review` confirms approval (simple checklist passed, or complex change `status: approved` with required approvals met).
- `false` → **never run `/ship` automatically**; wait for explicit user request.
- **Agent Markers:** Commits must include a vendor marker: `apsc - gi` (Gemini), `apsc - ce` (Claude), or `apsc - cx` (Codex).
- **Clean History:** Commit messages must have Markdown markers (`**`, `###`) stripped. Standard tags (`[fix]`) and vendor markers must be kept.
- Agent-specific `/ship` instructions live in `.claude/commands/ship.md`, `.codex/commands/ship.md`, and `.gemini/commands/ship.md`.

## Multi-Agent Review Protocol

Before running `/ship`, every agent must evaluate the latest changelog entry and run the appropriate review:

- `npm run agent:review` — detects complexity and, for complex changes, creates `.agents/reviews/review-{timestamp}.md`
- **Simple change** (≤ 10 change lines AND < 3 categories): internal review only; verify checklist in CLI output.
- **Complex change** (> 10 change lines OR ≥ 3 distinct categories): the review file must be reviewed by an external vendor agent (Codex or Gemini preferred). The reviewer sets `status: approved` or `status: changes_requested` in the file.
- Maximum **3 iterations**. If unresolved after 3, set `status: escalation_required` and halt — do not proceed to `/ship`.
- After `status: approved`, delete the review file and proceed normally.

Agents must never approve their own complex changes, bypass CI, or skip changelog updates.

## Rate Limit Resilience

When approaching 95% of usage quota mid-task, call `/rate-limit-abort` immediately:

- Run `git reset && git restore .` to revert all uncommitted changes.
- Write `.agents/unfinished-tasks/task-{date}-{seq}.md` with the task description, context, progress made, and explicit next steps.
- Update `.agents/agent-config.json` to mark the current agent as `"available": false`.
- Do not proceed further. Another agent resumes via `/check-unfinished-tasks`.

When starting a new session, call `/check-unfinished-tasks`:
- Mark yourself as `"available": true` in `agent-config.json`.
- List pending tasks in `.agents/unfinished-tasks/`.
- Pick the oldest pending task, mark it `in_progress`, and follow the `## Next Steps` section.
- On completion: run CI, update changelog, run `/review`, delete the task file.

Task files and agent availability are managed by `scripts/agent/task-persistence.ts` and `scripts/agent/agent-availability.ts`. Shared config lives in `.agents/agent-config.json`.

## Architecture Notes
The app uses Expo Router for navigation and `expo-sqlite` for storage. Built-in categories are stored as locale-neutral English keys and translated at render time. Google Drive backup is native-build only, so preserve `isNativeBuild()` guards when changing sync or settings code.
