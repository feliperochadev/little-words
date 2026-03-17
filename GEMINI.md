# GEMINI.md - Palavrinhas (Little Words)

## Project Overview

**Palavrinhas** is a React Native / Expo mobile application designed to track a baby's first words, pronunciation variants, and developmental progress. It features a bilingual UI (English and Brazilian Portuguese), local SQLite storage, and CSV export/import.

### Tech Stack
- **Framework:** Expo SDK 55 (React Native 0.83.2, React 19.2.0)
- **Navigation:** Expo Router 55 (File-based navigation)
- **Database:** `expo-sqlite` (Local SQLite database)
- **Language:** TypeScript 5.9
- **Testing:** Jest 30 (Unit/Integration), Maestro (E2E)
- **Build System:** EAS Build (Android targeted)
- **CI/CD:** ESLint 9 (flat config), TypeScript type-checking, Jest, Semgrep (`p/default` ruleset)

CI security tooling: GitHub Actions runs CodeQL, Dependency Review (PRs fail on high/critical), Semgrep CE (via `npm run ci`), Trivy FS, OWASP Dependency-Check, SonarCloud, and Dependabot for npm updates. Findings are surfaced in the GitHub Security tab via SARIF uploads.

## Architecture & Core Modules

- `app/`: Expo Router screens and layouts.
  - `_layout.tsx`: Root layout with `QueryClientProvider` and `I18nProvider`.
  - `index.tsx`: Entry point, DB initialization, Zustand store hydration, and routing logic.
  - `(tabs)/`: Main application tabs (Home, Words, Variants, Settings).
- `src/db/`: DB client (`client.ts` — `query`/`run`/`withTransaction` async helpers), initialization (`init.ts` — DDL at startup), migrations (`migrator.ts` + `migrations/` — schema versioning via `schema_migrations` table). Only `init.ts` and `migrator.ts` call `getDb()` directly.
- `src/repositories/`: Per-entity SQL modules — `categoryRepository`, `wordRepository`, `variantRepository`, `settingsRepository`, `assetRepository`, `dashboardRepository`, `csvRepository`. No React, hooks, or Zustand. Tables: `categories`, `words`, `variants`, `settings`, `assets`, `schema_migrations`.
- `src/services/`: Thin service wrappers over repositories providing a clean import boundary for hooks (`categoryService`, `wordService`, `variantService`, `settingsService`, `dashboardService`, `assetService`).
- `src/hooks/`: TanStack Query hooks for all SQLite data (`useWords`, `useCategories`, `useVariants`, `useDashboard`, `useAssets`) + `queryKeys.ts`.
- `src/stores/`: Zustand store for global client state (`settingsStore` — child profile/onboarding).
- `src/types/`: Shared TypeScript types (`asset.ts` — media asset types, MIME validation, file size limits).
- `src/components/`: Reusable UI components and modals.
- `src/i18n/`: Internationalization logic and translation catalogues (`en-US`, `pt-BR`).
- `src/utils/`:
  - `csvExport.ts` / `importHelpers.ts`: Data portability logic.
  - `assetStorage.ts`: File-system management for media assets.
  - `theme.ts`: Centralized color and style constants.
- `scripts/agent/`: Multi-agent workflow scripts (`complexity-check.ts`, `review-loop.ts`, `task-persistence.ts`, `agent-availability.ts`, `load-config.ts`).

### State Management Strategy

| Category | Tool | Examples |
|---|---|---|
| Server / SQLite state | **TanStack Query v5** | words, variants, categories, dashboard |
| Global client state | **Zustand v5** | child profile, onboarding |
| Local UI state | **useState** | modals, form inputs, sort order |

**Key patterns:**
- Screens are pure UI — no DB imports, no `useFocusEffect`, no `load()` callbacks.
- `useFocusEffect` refetch lives inside the hooks (e.g. `useDashboardStats`), not in screens.
- Module-level stable empty arrays for TQ defaults: `const EMPTY: T[] = []` — never `= []` inline in JSX/hooks when used in `useEffect` deps.
- `useEffect` that resets form state must NOT include TQ data arrays in deps — split into separate effects.
- Test helper: `__tests__/helpers/renderWithProviders.tsx` wraps in `QueryClientProvider` + `I18nProvider`. Use `useSettingsStore.setState(...)` to seed store state in tests.

### Media Asset Layer

The app supports audio, photo, and video attachments on words and variants:
- **Types** (`src/types/asset.ts`): `ParentType` (`word`|`variant`), `AssetType` (`audio`|`photo`|`video`), MIME validation, file size limits (50 MB).
- **Storage** (`src/utils/assetStorage.ts`): File-system layer using `expo-file-system` class API (`File`, `Directory`, `Paths.document`). Files stored in `Documents/media/{words|variants}/{id}/{audio|photos|videos}/`.
- **Service** (`src/services/assetService.ts`): Atomic save (DB insert → build filename → copy file → update DB; rollback on failure), remove, bulk cleanup.
- **Hooks** (`src/hooks/useAssets.ts`): `useAssetsByParent`, `useAssetsByType`, `useSaveAsset`, `useRemoveAsset`.
- **DB**: `assets` table with `parent_type` discriminator + indexes, cascade deletion via `withTransactionSync`, `asset_count` subquery in word/variant queries.
- **Dependencies**: `expo-av` (audio), `expo-image-picker` (camera/gallery), `expo-file-system` (persistent storage).

## Rules

1. **Always write tests for every code change.** Use unit tests for isolated functions and integration tests for components. Coverage goal: 99% lines, 95% functions/branches/statements. Place tests under `__tests__/unit/`, `__tests__/integration/`, or `__tests__/screens/`.

2. **Always run `npm run ci` after changes and only consider the task done when it passes.** CI runs `eslint` (warnings count), `tsc --noEmit`, `jest`, and `semgrep` in sequence (`npm run lint && npm run typecheck && npm run test:coverage && npm run semgrep`).

3. **Always update `GEMINI.md` and `.agents/AGENTS-CHANGELOG.md` after every approved change.** Update `GEMINI.md` when architecture, conventions, or tooling change. Always append a changelog entry using `### YYYY-MM-DD_N` format with category tags (`[fix]`, `[feature]`, `[config]`, `[test]`, `[upgrade]`, etc.).
   - **Cross-vendor documentation rule:** When a change affects general rules, workflow, or architecture, update **all** vendor readmes listed in `.agents/agent-config.json` under `agents.{name}.readme_file`: `CLAUDE.md` (Claude), `AGENTS.md` (Codex), `GEMINI.md` (Gemini). All readmes must stay in sync on shared rules.

4. **Session Start — Review Feature Flags:**
   - At the beginning of every session, read `features` from `.agents/agent-config.json` and ask the user:
     > Current feature flags:
     > - `automatic_commit`: true/false
     > - `automatic_ship`: true/false
     >
     > Keep as is, or change any?
   - If keep → proceed. If change → ask which flag(s) and new value(s), update `.agents/agent-config.json`, then proceed.
   - Do this before any other work in the session.

5. **Automatic Commit Gate (`/commit`):**
   - `/commit` always runs CI → `/review-custom` → respects `automatic_ship` when invoked. Follow `.gemini/commands/commit.md` for detailed steps.
   - `features.automatic_commit` controls only whether the agent self-triggers it:
     - `false` → wait for the user to explicitly call `/commit`; never self-trigger.
     - `true` → agent may call `/commit` automatically once work is complete.

6. **Shipping code (`/ship`):**
   - `/ship` is the standard way to commit and push approved changes. Follow `.gemini/commands/ship.md` for detailed steps.
   - Appends `(apsc - gi)` to the commit subject to mark it as a Gemini-authored commit.
   - **Auto-ship:** Before every `/ship` decision, read `features.automatic_ship` from `.agents/agent-config.json`:
     - `true` → run `/ship` automatically once `/review-custom` confirms approval.
     - `false` → **never run `/ship` automatically**; wait for explicit user request.
   - **Tag-based shipping boundary:** `/ship` uses git tags named `YYYY-MM-DD_N` to identify the last shipped changelog entry and only ships entries above it. If no tag exists yet, it falls back to the git-log method once, then creates the first tag.
   - **Changelog immutability after push:** Never modify a changelog entry after it has been pushed. If corrections are needed, add a new entry referencing the old ID.

7. **Multi-Agent Review Protocol (`/review-custom`):**
   - Run `/review-custom` after `npm run ci` passes and before `/ship`.
   - Internally calls `npm run agent:review` to classify the change as simple or complex.
   - **Simple** (≤ 10 change lines AND < 3 category tags): internal checklist review. If all items pass, output `Internal review passed. Safe to /ship.`
   - **Complex** (> 10 change lines OR ≥ 3 distinct category tags): creates `.agents/reviews/review-{timestamp}.md` and requires an external reviewer (Codex or Claude) to set `status: approved`. Required approvals and iteration limits are read from `.agents/agent-config.json`.
   - Maximum 3 review iterations; if unresolved, set `status: escalation_required` and stop.
   - Never approve your own complex changes. Never skip `/review-custom` before `/ship`.

8. **Rate Limit Resilience (`/rate-limit-abort` / `/check-unfinished-tasks`):**
   - When approaching 95% of usage quota mid-task, call `/rate-limit-abort` immediately:
     - Run `git reset && git restore .` to revert all uncommitted changes.
     - Write `.agents/unfinished-tasks/task-{date}-{seq}.md` with task description, context, progress made, and explicit next steps.
     - Set `agents.gemini.available: false` in `.agents/agent-config.json`.
     - Stop. Do not proceed to `/ship`.
   - At session start, call `/check-unfinished-tasks`:
      - Re-mark Gemini as `available: true` in `agent-config.json`.
      - List pending tasks. Pick the oldest, mark it `in_progress`, follow its `## Next Steps`.
      - On completion: run CI, update changelog, run `/review-custom`, delete the task file.

9. **Pre-push protection.** The git `pre-push` hook blocks pushes to root branches (`main`, `master`, or the remote default branch from `<remote>/HEAD`). Use a feature branch and open a PR instead.

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

11. **Reviewer shipping + cleanup.** External reviewers may run `/commit` and `/ship` themselves only after the review is approved and required approvals are met, and when `features.automatic_commit` or `features.automatic_ship` permit it. Always delete the review file after the code is committed.

12. **All commands must run within the project root only.** Every shell command — whether from `allowed_commands` or approved ad-hoc during a session — must execute inside this repository's root directory. Never `cd` to, create files in, or target paths outside the project root. This is enforced by `command_scope: "project_root_only"` in `.agents/agent-config.json`.

## Commands

```bash
# Start dev server
npx expo start

# Run full CI suite (mandatory before completion)
npm run ci

# Run post-CI review (required before /ship)
/review-custom

# Rate limit resilience
npm run agent:check-tasks    # list pending unfinished tasks
npm run agent:availability   # show which agents are online/offline

# Complexity check / create review request directly
npm run agent:review
npm run agent:review "Change summary"

# Ship approved changes
/ship
```

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

## Changelog

See [.agents/AGENTS-CHANGELOG.md](.agents/AGENTS-CHANGELOG.md).

## Code Standards

Authoritative coding standards live in `.agents/standards/`. Read the relevant file before making changes in that domain. Standards cover TypeScript patterns, component design, state management, hooks, testing, and styling/naming conventions.

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

## Additional Documentation

- `AGENTS.md`: Contributor guide covering repository layout, testing, CI, changelog, and `/ship` rules (used as the Codex readme).
- `CLAUDE.md`: Claude-specific agent instructions.
- `.agents/COMMON-RULES.md`: Vendor-agnostic baseline for all shared rules.
