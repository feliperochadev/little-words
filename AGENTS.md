# Repository Guidelines

## Project Structure & Module Organization
`app/` holds Expo Router screens and layouts, including `app/(tabs)/` for the main navigation. Shared UI belongs in `src/components/`, SQLite DB client in `src/db/`, per-entity SQL modules in `src/repositories/`, service wrappers in `src/services/`, translations in `src/i18n/`, and helpers in `src/utils/`. Tests are split into `__tests__/unit`, `__tests__/integration`, `__tests__/screens`, and Maestro flows in `__tests__/e2e`. Keep static assets in `assets/`.

## Build, Test, and Development Commands
Use `npm start` for the Expo dev server and `npm run android` or `npm run ios` for native runs. Quality gates are mandatory:

- `npm run lint`: ESLint 9 with `eslint-config-expo`
- `npm run typecheck`: TypeScript compile check without emit
- `npm test`: Jest unit, integration, and screen tests
- `npm run ci`: required completion gate; runs lint, typecheck, Jest, and Semgrep
- `npm run e2e`, `npm run e2e:import`, `npm run e2e:export`: Maestro flows in `__tests__/e2e/`

Do not consider work complete until `npm run ci` passes.

Pre-push protection: the git `pre-push` hook blocks pushes to root branches (`main`, `master`, or the remote default branch from `<remote>/HEAD`). Use a feature branch and open a PR instead.

CI security tooling: GitHub Actions runs CodeQL, Dependency Review (PRs fail on high/critical), Semgrep CE (via `npm run ci`), Trivy FS, OWASP Dependency-Check, SonarCloud, and Dependabot for npm updates. Findings are surfaced in the GitHub Security tab via SARIF uploads.

10. **Architecture & Design Planning (`/plan`).** Before making any big or core change, run `/plan` to produce the appropriate planning artifact:
   - **Design document** (`.agents/plan/design/YYYY-MM-DD_NN-<slug>.md`) for new features with UI/data flow.
   - **ADR** (`.agents/plan/architecture/YYYY-MM-DD_NN-<slug>.md`) for significant architectural decisions between competing approaches.
   - **Research documents** (`.agents/plan/research-documents/YYYY-MM-DD_NN-<slug>/`) for analysis logs, benchmarks, or audits.
   - **UI/UX & Design System changes** (`.agents/plan/ui-changes/YYYY-MM-DD_NN-<slug>.md`) for visual design system updates, component library changes, screen layout redesigns, theme/branding updates, or accessibility improvements. See `.agents/plan/ui-changes/README.md` for details.
   - Templates live in `.agents/plan/design/DESIGN-TEMPLATE.md` and `.agents/plan/architecture/ADR-TEMPLATE.md`.
   - Required when the change touches ≥ 5 files, introduces a new dependency, replaces a core module, or requires ≥ 3 changelog categories.
   - Keep plans updated if implementation diverges. Superseded ADRs must reference their successor.
   - **⛔ `/plan` must NEVER auto-implement.** Its only output is documents in `.agents/plan/`. Implementation requires an explicit user request via `/implement [plan-name]`. No agent may self-trigger implementation after planning, regardless of mode (fleet, autopilot, or interactive).
   - **`/implement` tracking:** When `/implement` runs, it creates `.agents/implementation/[name].md` (from `TEMPLATE.md`) with `status: in progress` at start and `status: done` after CI passes. If another implementation file has `status: in progress`, a git worktree is created for isolation before any work begins.

11. **All commands must run within the project root only.** Every shell command — whether from `allowed_commands` or approved ad-hoc during a session — must execute inside this repository's root directory. Never `cd` to, create files in, or target paths outside the project root. This is enforced by `command_scope: "project_root_only"` in `.agents/agent-config.json`.

## Coding Style & Naming Conventions
Write concise TypeScript and keep shared theme values in `src/utils/theme.ts`. Preserve existing naming patterns: Expo Router files stay lowercase, React components use PascalCase, and helper modules use camelCase. Prefer `testID`-based selectors over visible text for app UI. Treat lint warnings as real work, not noise.

## Testing Guidelines
Every code change must include tests. Changed code should reach 99% line coverage and 95% function, branch, and statement coverage, including edge cases and error paths. Put pure logic in `__tests__/unit`, component behavior in `__tests__/integration`, and route-level behavior in `__tests__/screens`. In Maestro, prefer `id:` selectors, call `scrollUntilVisible` before off-screen assertions, and use `waitForAnimationToEnd` after modal or navigation transitions.

## Commit & Pull Request Guidelines
Recent history uses short, imperative subjects such as `fix test` and `fix import from text box`. Keep commits focused and descriptive. Pull requests should summarize user-visible changes, list tests run, link the related issue when applicable, and include screenshots or recordings for UI changes.

## Documentation & Shipping Rules
After every approved change, update the relevant agent documentation when conventions or architecture change and always append an entry to `.agents/AGENTS-CHANGELOG.md` using `### YYYY-MM-DD_N` and tags such as `[fix]`, `[feature]`, or `[config]`.

**Cross-vendor documentation rule:** When a change affects general rules, workflow, tooling, or architecture, update **all** vendor readme files listed in `.agents/agent-config.json` under `agents.{name}.readme_file`: `CLAUDE.md` (Claude), `AGENTS.md` (Codex), `GEMINI.md` (Gemini). All readmes must stay in sync on shared rules.

**Session Start — Review Feature Flags:** At the beginning of every session, read `features` from `.agents/agent-config.json` and ask the user:
> Current feature flags:
> - `automatic_commit`: true/false
> - `automatic_ship`: true/false
>
> Keep as is, or change any?

If keep → proceed. If change → ask which flag(s) and new value(s), update the file, then proceed. Do this before any other work.

**Automatic Commit Gate (`/commit`):** `/commit` always runs CI → `/review-custom` → respects `automatic_ship` when invoked. `features.automatic_commit` controls only whether the agent self-triggers it:
- `false` → wait for the user to explicitly call `/commit`; never self-trigger.
- `true` → agent may call `/commit` automatically once work is complete.
- Vendor-specific steps live in `.claude/commands/commit.md`, `.codex/commands/commit.md`, `.gemini/commands/commit.md`.

`/ship` is the standard push flow. Before running it, read `features.automatic_ship` from `.agents/agent-config.json`:
- `true` → run `/ship` automatically once `/review-custom` confirms approval (simple checklist passed, or complex change `status: approved` with required approvals met).
- `false` → **never run `/ship` automatically**; wait for explicit user request.
- **Agent Markers:** Commits must include a vendor marker: `apsc - gi` (Gemini), `apsc - ce` (Claude), or `apsc - cx` (Codex).
- **Clean History:** Commit messages must have Markdown markers (`**`, `###`) stripped. Standard tags (`[fix]`) and vendor markers must be kept.
- **Tag-based shipping boundary:** `/ship` uses git tags named `YYYY-MM-DD_N` to identify the last shipped changelog entry and only ships entries above it. If no tag exists yet, it falls back to the git-log method once, then creates the first tag.
- **Changelog immutability after push:** Never modify a changelog entry after it has been pushed. If corrections are needed, add a new entry referencing the old ID.
- Agent-specific `/ship` instructions live in `.claude/commands/ship.md`, `.codex/commands/ship.md`, and `.gemini/commands/ship.md`.

## Multi-Agent Review Protocol

Before running `/ship`, every agent must evaluate the latest changelog entry and run the appropriate review:

- `npm run agent:review` — detects complexity and, for complex changes, creates `.agents/reviews/review-{timestamp}.md`
- **Simple change** (≤ 10 change lines AND < 3 categories): internal review only; verify checklist in CLI output.
- **Complex change** (> 10 change lines OR ≥ 3 distinct categories): the review file must be reviewed by an external vendor agent (Codex or Gemini preferred). The reviewer sets `status: approved` or `status: changes_requested` in the file.
- Maximum **3 iterations**. If unresolved after 3, set `status: escalation_required` and halt — do not proceed to `/ship`.
- After `status: approved`, delete the review file and proceed normally.

Agents must never approve their own complex changes, bypass CI, or skip changelog updates.

External reviewers may run `/commit` and `/ship` themselves only after the review is approved and required approvals are met, and when `features.automatic_commit` or `features.automatic_ship` permit it. Always delete the review file after the code is committed.

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
- On completion: run CI, update changelog, run `/review-custom`, delete the task file.

Task files and agent availability are managed by `scripts/agent/task-persistence.ts` and `scripts/agent/agent-availability.ts`. Shared config lives in `.agents/agent-config.json`.

## Architecture Notes
The app uses Expo Router for navigation and `expo-sqlite` for storage. Built-in categories are stored as locale-neutral English keys and translated at render time.

### State Management Strategy

| Category | Tool | Examples |
|---|---|---|
| Server / SQLite state | **TanStack Query v5** | words, variants, categories, dashboard |
| Global client state | **Zustand v5** | child profile, onboarding |
| Local UI state | **useState** | modals, form inputs, sort order |

- `src/db/` — DB client (`client.ts`), initialization (`init.ts`), migrations (`migrator.ts`, `migrations/`)
- `src/repositories/` — per-entity SQL modules (`categoryRepository`, `wordRepository`, `variantRepository`, `settingsRepository`, `assetRepository`, `dashboardRepository`, `csvRepository`); no React/hooks/Zustand
- `src/services/` — thin wrappers over repositories (import boundary for hooks)
- `src/hooks/` — TanStack Query hooks (`useWords`, `useCategories`, `useVariants`, `useDashboard`, `useAssets`) + `queryKeys.ts`
- `src/stores/` — Zustand store (`settingsStore`); hydrated at app start in `app/index.tsx`
- `src/types/` — Shared TypeScript types (e.g. `asset.ts` for media asset types)
- `__tests__/helpers/renderWithProviders.tsx` — test wrapper with `QueryClientProvider` + `I18nProvider`
- **Stable empty-array defaults**: always use a module-level `const EMPTY: T[] = []` instead of inline `= []` for TQ defaults used in `useEffect` deps.

### Media Asset Layer

The app supports audio, photo, and video attachments on words and variants:
- **Types** (`src/types/asset.ts`): `ParentType` (`word`|`variant`), `AssetType` (`audio`|`photo`|`video`), MIME validation, file size limits.
- **Storage** (`src/utils/assetStorage.ts`): File-system layer using `expo-file-system` class API. Files stored in `Documents/media/{words|variants}/{id}/{audio|photos|videos}/`.
- **Service** (`src/services/assetService.ts`): Atomic save (DB + file with rollback), remove, bulk cleanup.
- **Hooks** (`src/hooks/useAssets.ts`): `useAssetsByParent`, `useAssetsByType`, `useSaveAsset`, `useRemoveAsset`.
- **DB**: `assets` table with `parent_type` discriminator, cascade deletion, `asset_count` in word/variant queries.

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
| SonarQube Rules | `.agents/standards/sonar.md` |
| Data Layer | `.agents/standards/data-layer.md` |

## Permanently Allowed Commands

The following commands are pre-approved and may be run at any time without asking for user permission. They are listed in `.agents/agent-config.json` under `allowed_commands`.

| Command | Purpose |
|---------|---------|
| `npm run ci` | Full quality gate: lint + typecheck + tests + semgrep |
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
