# GEMINI.md - Palavrinhas (Little Words)

## Project Overview

**Palavrinhas** is a React Native / Expo mobile application designed to track a baby's first words, pronunciation variants, and developmental progress. It features a bilingual UI (English and Brazilian Portuguese), local SQLite storage, CSV export/import, and optional Google Drive backup.

### Tech Stack
- **Framework:** Expo SDK 55 (React Native 0.83.2, React 19.2.0)
- **Navigation:** Expo Router 55 (File-based navigation)
- **Database:** `expo-sqlite` (Local SQLite database)
- **Language:** TypeScript 5.9
- **Testing:** Jest 30 (Unit/Integration), Maestro (E2E)
- **Build System:** EAS Build (Android targeted)
- **CI/CD:** ESLint 9 (flat config), TypeScript type-checking, Jest

## Architecture & Core Modules

- `app/`: Expo Router screens and layouts.
  - `_layout.tsx`: Root layout with `I18nProvider` and Google Sign-In config.
  - `index.tsx`: Entry point, DB initialization, and routing logic.
  - `(tabs)/`: Main application tabs (Home, Words, Variants, Settings).
- `src/database/`: SQLite schema and data access layer (`database.ts`). Tables: `categories`, `words`, `variants`, `settings`.
- `src/components/`: Reusable UI components and modals.
- `src/i18n/`: Internationalization logic and translation catalogues (`en-US`, `pt-BR`).
- `src/utils/`:
  - `googleDrive.ts`: Cloud backup integration (native builds only — guarded by `isNativeBuild()`).
  - `csvExport.ts` / `importHelpers.ts`: Data portability logic.
  - `theme.ts`: Centralized color and style constants.
  - `agent/`: Multi-agent workflow scripts (`complexity-check.ts`, `review-loop.ts`, `task-persistence.ts`, `agent-availability.ts`, `load-config.ts`).

## Rules

1. **Always write tests for every code change.** Use unit tests for isolated functions and integration tests for components. Coverage goal: 99% lines, 95% functions/branches/statements. Place tests under `__tests__/unit/`, `__tests__/integration/`, or `__tests__/screens/`.

2. **Always run `npm run ci` after changes and only consider the task done when it passes.** CI runs `eslint` (warnings count), `tsc --noEmit`, and `jest` in sequence.

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
   - `/commit` always runs CI → `/review` → respects `automatic_ship` when invoked. Follow `.gemini/commands/commit.md` for detailed steps.
   - `features.automatic_commit` controls only whether the agent self-triggers it:
     - `false` (default) → wait for the user to explicitly call `/commit`; never self-trigger.
     - `true` → agent may call `/commit` automatically once work is complete.

6. **Shipping code (`/ship`):**
   - `/ship` is the standard way to commit and push approved changes. Follow `.gemini/commands/ship.md` for detailed steps.
   - Appends `(apsc - gi)` to the commit subject to mark it as a Gemini-authored commit.
   - **Auto-ship:** Before every `/ship` decision, read `features.automatic_ship` from `.agents/agent-config.json`:
     - `true` → run `/ship` automatically once `/review` confirms approval.
     - `false` → **never run `/ship` automatically**; wait for explicit user request.

7. **Multi-Agent Review Protocol (`/review`):**
   - Run `/review` after `npm run ci` passes and before `/ship`.
   - Internally calls `npm run agent:review` to classify the change as simple or complex.
   - **Simple** (≤ 10 change lines AND < 3 category tags): internal checklist review. If all items pass, output `Internal review passed. Safe to /ship.`
   - **Complex** (> 10 change lines OR ≥ 3 distinct category tags): creates `.agents/reviews/review-{timestamp}.md` and requires an external reviewer (Codex or Claude) to set `status: approved`. Required approvals and iteration limits are read from `.agents/agent-config.json`.
   - Maximum 3 review iterations; if unresolved, set `status: escalation_required` and stop.
   - Never approve your own complex changes. Never skip `/review` before `/ship`.

8. **Rate Limit Resilience (`/rate-limit-abort` / `/check-unfinished-tasks`):**
   - When approaching 95% of usage quota mid-task, call `/rate-limit-abort` immediately:
     - Run `git reset && git restore .` to revert all uncommitted changes.
     - Write `.agents/unfinished-tasks/task-{date}-{seq}.md` with task description, context, progress made, and explicit next steps.
     - Set `agents.gemini.available: false` in `.agents/agent-config.json`.
     - Stop. Do not proceed to `/ship`.
   - At session start, call `/check-unfinished-tasks`:
     - Re-mark Gemini as `available: true` in `agent-config.json`.
     - List pending tasks. Pick the oldest, mark it `in_progress`, follow its `## Next Steps`.
     - On completion: run CI, update changelog, run `/review`, delete the task file.

## Commands

```bash
# Start dev server
npx expo start

# Run full CI suite (mandatory before completion)
npm run ci

# Run post-CI review (required before /ship)
/review

# Rate limit resilience
npm run agent:check-tasks    # list pending unfinished tasks
npm run agent:availability   # show which agents are online/offline

# Complexity check / create review request directly
npm run agent:review
npm run agent:review "Change summary"

# Ship approved changes
/ship
```

## Changelog

### 2026-03-10_27

**[feature] Unique variant per word — duplicate detection in AddVariantModal and AddWordModal**
- Added `findVariantByName(wordId, variant)` to `database.ts`: queries `variants` with case-insensitive `LOWER(variant)` match scoped to the given `word_id`, mirroring `findWordByName`
- `AddVariantModal`: debounced duplicate check (400ms) fires when variant text changes and an effective word is known; shows red-bordered input + warning card "⚠️ Variant already exists for `word`" with the duplicate variant text; save button dimmed and Alert blocks save — same UX pattern as word duplicate detection; check is skipped when editing an existing variant
- `AddWordModal`: `handleSave` now silently deduplicates inline new-variant rows against existing variants and against each other using a running lowercase `Set`, so re-entered pronunciations are dropped rather than inserted twice
- Added `addVariant.duplicateTitle` and `addVariant.duplicateAlert` keys to `en-US.ts` and `pt-BR.ts`
- Unit test: `findVariantByName` null and match cases in `database.test.ts`
- Integration tests: duplicate warning card display, save blocked by Alert, edit-mode skips check, reset on reopen — in `AddVariantModal.test.tsx`
- **E2E tests**: added "DUPLICATE VARIANT DETECTION" section to `crud-variant.yaml` and "ADD VARIANTS WITH DEDUPLICATION" section to `crud-word.yaml`.

### 2026-03-10_26

**[fix] AddWordModal — select new category and scroll carousel to left after addition**
- Modified `AddCategoryModal` (`AddCategoryModal.tsx`): updated `onSave` callback to return the ID of the newly created or updated category.
- Modified `AddWordModal` (`AddWordModal.tsx`): updated `onSave` handler for `AddCategoryModal` to automatically set `selectedCategory` to the new ID and scroll the `category-section` carousel back to the left (`x: 0`) as requested — this ensures the user sees the new category immediately if it's sorted at the beginning and resets the view if they had scrolled to the end to add it.
- Verified compatibility in `app/(tabs)/words.tsx` and `app/(tabs)/settings.tsx` — both remain functional with the updated `onSave(id?: number)` signature.
- Updated `__tests__/integration/AddCategoryModal.test.tsx`: verified `onSave` is called with the category ID.
- Updated `__tests__/integration/AddWordModal.test.tsx`: added a test case to verify that the newly created category is selected and the carousel refreshes.
- **E2E tests**: updated `crud-word.yaml` to remove manual category selection and carousel scrolling steps, as these are now automated.

See [.agents/AGENTS-CHANGELOG.md](.agents/AGENTS-CHANGELOG.md).

## Additional Documentation

- `AGENTS.md`: Contributor guide covering repository layout, testing, CI, changelog, and `/ship` rules (used as the Codex readme).
- `CLAUDE.md`: Claude-specific agent instructions.
- `.agents/COMMON-RULES.md`: Vendor-agnostic baseline for all shared rules.
