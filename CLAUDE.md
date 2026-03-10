# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Palavrinhas** ("Little Words") is a React Native / Expo mobile app for recording a baby's first words. It tracks words, pronunciation variants, and categories, with optional Google Drive backup.

**Stack (current, fully up to date):**
- Expo SDK 55, expo-router 55 (file-based navigation)
- React 19.2.0, React Native 0.83.2
- TypeScript 5.9, ESLint 9 (flat config via `eslint-config-expo`)
- Jest 30.1, jest-expo 55, @testing-library/react-native 13
- Maestro for E2E tests
- EAS Build for Android APK/preview distribution

**Core features:**
- Record and manage a baby's first words with dates and categories
- Track pronunciation variants per word
- Bilingual UI: English (`en-US`) and Brazilian Portuguese (`pt-BR`), locale persisted to SQLite
- CSV export (share or save to device) and text/CSV import with preview
- Optional Google Drive backup (native builds only — guarded by `isNativeBuild()`)
- Swipeable bottom-sheet modals with pan gesture dismiss

**Targets:** Android (primary). APK built via EAS (`npm run build:apk`). iOS untested.

### Rules

1. **Always write tests for every code change.** Use unit tests for isolated functions (helpers, utils, parsers) and integration tests for components. Tests must cover at least of the changed code: 99% in lines and 95% in funcs, branch and stmts — every branch, edge case, and error path. Place them in the matching subdirectory under `__tests__/` (`unit/`, `integration/`, or `screens/`).

2. **Always run `npm run ci` after changes and only consider the task done when it passes.** The CI script runs `eslint` (fixes must include warnings, not just errors), `tsc --noEmit`, and `jest` in sequence (`npm run lint && npm run typecheck && npm run test`). A passing CI is required before any work is considered complete — do not skip or work around failures.

3. **Always update `CLAUDE.md` and `CLAUDE-CHANGELOG.md` after every approved change.** Once changes pass CI and are approved: update the relevant sections of `CLAUDE.md` if architecture, conventions, or utilities changed; always append a new entry to `CLAUDE-CHANGELOG.md` regardless — it is the permanent record of every approved change. Each entry heading follows the format `### YYYY-MM-DD_N` (e.g. `2026-03-09_1`, `2026-03-09_2`) where N increments within the same day, making every entry uniquely identifiable. Each change group within an entry must be prefixed with a category tag:
   - `[fix]` — bug fixes and test corrections
   - `[feature]` — new capabilities added to the app or test infrastructure
   - `[upgrade]` — dependency version bumps
   - `[config]` — documentation, tooling, or project configuration changes
   - `[test]` — new tests or test expansions with no production code change
   - Others like `[security]`, `[refactor]`, `[perf]` can be added as needed.
   - **Cross-vendor documentation rule:** When a change affects general rules, workflow, tooling, or architecture (not just Claude-specific behaviour), update **all** vendor readme files listed in `.agents/agent-config.json` under `agents.{name}.readme_file`: `CLAUDE.md` (Claude), `AGENTS.md` (Codex), `GEMINI.md` (Gemini). All readmes must stay in sync on shared rules.

4. `/ship` is the standard way to commit and push approved changes. **Never run it automatically — only when explicitly requested by the user.**

5. **Multi-Agent Review Protocol.** Before `/ship`, evaluate the latest changelog entry for complexity and run the appropriate review:
   - **Simple change** (≤ 10 change lines AND < 3 categories): internal review only — run `npm run agent:review` and verify checklist passes.
   - **Complex change** (> 10 change lines OR ≥ 3 distinct categories): `npm run agent:review "<summary>"` creates a structured review file in `.agents/reviews/`. An external reviewer (Codex or Gemini) must update the file and set `status: approved` or `status: changes_requested`. Maximum 3 iterations; if still unresolved after 3, status becomes `escalation_required` and the agent must stop and ask the user.
   - After approval, delete review files and proceed to `/ship`.

6. **Rate Limit Resilience.** If approaching 95% of usage quota mid-task, call `/rate-limit-abort` immediately:
   - Reverts all uncommitted changes (`git reset && git restore .`).
   - Persists the task context to `.agents/unfinished-tasks/task-{date}-{seq}.md`.
   - Marks Claude as unavailable in `.agents/agent-config.json`.
   - Another agent resumes by running `/check-unfinished-tasks` at session start.
   - On session start, Claude re-marks itself available and checks for pending tasks.

## Commands

```bash
# Start dev server (scan QR with Expo Go)
npx expo start

# Start targeting a specific platform
npx expo start --android
npx expo start --ios

# Build APK via EAS (requires eas login)
npm run build:apk        # → eas build --platform android --profile apk
npm run build:android    # → eas build --platform android --profile preview
```

```bash
# Run unit/integration tests
npm test

# Run tests with coverage
npm run test:coverage
```

```bash
# Run multi-agent review (complexity detection + review file creation if complex)
npm run agent:review                      # auto-detects complexity
npm run agent:review "Change summary"    # passes summary for complex review requests

# Rate limit resilience
npm run agent:check-tasks    # list pending unfinished tasks
npm run agent:availability   # show which agents are online/offline
```

### Shipping code (`/ship`)

`/ship` is the standard way to commit and push approved changes. **Never run it automatically — only when explicitly requested by the user.**

```
/ship
```

What it does:
1. Verifies the current branch is not `main`/`master` (asks the user to create a branch if so).
2. Reads `.agents/AGENTS-CHANGELOG.md` and collects every entry whose heading ID is not yet in `git log` — these are the unshipped changes.
3. Stages modified/untracked files (no `.env` or secrets).
4. Commits with a message built from all unshipped changelog entries:
   - **Subject line**: titles joined with ` / `, followed by ` (apsc - ce)`. **Strip the `**` bold markers.**
   - **Body**: full content of entries, chronologically (most recent first). **Strip Markdown formatting** (`###` headings, `**` bold text).
5. Pushes with `git push -u origin <branch>`.

## Testing

### E2E Tests (Maestro)

E2E tests live in `__tests__/e2e/` as Maestro YAML flows. Run via `maestro test __tests__/e2e/<file>.yaml`.

**testID rules — always prefer `id:` over text matching:**
- Every interactive or assertable element must have a `testID`. Text-based assertions (`assertVisible: "some text"`) are only acceptable for OS-level alerts (which can't have testIDs) or truly unique, stable UI strings.
- Use `id:` for all assertions on app-rendered elements: `assertVisible: id: "my-test-id"`, `tapOn: id: "my-test-id"`.
- Dynamic list items must include the item's key in the testID, e.g. `testID={`word-item-${item.word}`}`, `testID={`import-preview-word-${row.word}`}`. This makes individual items assertable without text matching.
- `Card` in `UIComponents.tsx` accepts and forwards `testID` — always use it when the card needs to be asserted in a test.

**Scrolling — always scroll before asserting:**
- Never `assertVisible` on an element that may be below the fold without first calling `scrollUntilVisible`. This applies especially to: preview sections that appear below a tall input (`minHeight`), items in modals with a `ScrollView`, and list items after navigation.
- Use `scrollUntilVisible` targeting the specific element you are about to assert, not a nearby container.
- After `hideKeyboard`, always add `waitForAnimationToEnd` before any scroll or assertion — the layout shifts when the keyboard dismisses.

**Text input:**
- Maestro's `inputText` passes the string as typed characters. `\n` in YAML double-quoted strings does NOT reliably produce a newline in the TextInput — it arrives as literal `\` + `n`. Do not rely on `\n` for multiline text input.
- For tests that only need to verify parsing/preview of a single word, input one word with no newlines. This is always reliable.
- Avoid `pressKey: Enter` to simulate newlines in multiline inputs — its behavior is inconsistent across platforms.

**General conventions:**
- Always `waitForAnimationToEnd` after modal open/close, navigation taps, and form submissions.
- Use `scrollUntilVisible` before tapping elements that may be off-screen (e.g. buttons at the bottom of a settings screen).
- Prefer `eraseText: N` over clearing a field by re-tapping — it's more reliable.

### Unit/Integration Tests (Jest)

- Tests live in `__tests__/` with three subdirectories:
  - `unit/` — pure logic (helpers, i18n catalogues, date utils, import helpers)
  - `integration/` — component tests (modals, UI components, database layer)
  - `screens/` — full screen render tests
- Test setup is in `jest.setup.js` — mocks for `expo-sqlite`, `expo-file-system`, `expo-sharing`, `expo-router`, `react-native-safe-area-context`, `react-native-svg`, `expo-constants`, `expo-document-picker`, `expo-status-bar`, `@react-native-google-signin/google-signin`, `expo-asset`.
- The shared mock DB instance is exposed as `global.__mockDb` — reset mocks with `jest.clearAllMocks()` in `beforeEach`.
- `react-test-renderer` version must exactly match the installed `react` version (enforced by RNTL at runtime).

## Architecture

### Navigation (expo-router file-based)

- `app/index.tsx` — Splash/entry: initializes SQLite DB, checks onboarding flag, then routes to `/(tabs)/home` or `/onboarding`. Also triggers Google Drive sync on startup.
- `app/_layout.tsx` — Root layout: wraps everything in `<I18nProvider>`, calls `configureGoogleSignIn()`.
- `app/(tabs)/` — Tab navigator with: `home.tsx` (dashboard/stats), `words.tsx` (word list + search), `variants.tsx` (pronunciation variants list), `settings.tsx` (categories, CSV export, Google Drive).
- `app/onboarding.tsx` — First-run flow; sets `onboarding_done` setting when complete.

### Data Layer (`src/database/database.ts`)

Single SQLite database (`palavrinhas.db`) opened synchronously via `expo-sqlite`. All DB operations use two internal helpers — `query<T>()` for SELECT and `run()` for INSERT/UPDATE/DELETE — both returning Promises despite using the sync expo-sqlite API under the hood.

**Schema:** `categories`, `words`, `variants`, `settings` (key/value store for locale, Google tokens, onboarding flag).

**Category i18n pattern:** Built-in categories are stored in the DB using locale-neutral English keys (e.g. `'animals'`, `'food'`). At render time, `useCategoryName()` resolves them to translated strings. User-created categories are stored as literal names and are never translated.

### Internationalization (`src/i18n/`)

- `i18n.tsx` — `I18nProvider` context + `useI18n()` hook. Exposes `t(key, params)`, `ta(key)` (returns array), `tc(key, count)` (pluralization). Locale is persisted to SQLite via the `app_locale` setting key. Supported locales: `en-US`, `pt-BR`.
- `en-US.ts` / `pt-BR.ts` — Translation catalogues (nested objects, dot-path access).
- Interpolation uses `{{placeholder}}` syntax. Pluralization appends `Plural` to the key when `count !== 1`.

### Utilities

- `src/utils/theme.ts` — All colors (`COLORS`), category color palette (`CATEGORY_COLORS`), and category emojis (`CATEGORY_EMOJIS`). Always import colors from here.
- `src/utils/categoryKeys.ts` — `DEFAULT_CATEGORIES` array and `DEFAULT_CATEGORY_KEY_SET` (for O(1) lookup). Source of truth for built-in category keys.
- `src/utils/googleDrive.ts` — Google Sign-In + Drive v3 REST API for CSV backup. **Only works in native builds**, not in Expo Go (`isNativeBuild()` guard throughout). Tokens stored in the `settings` table.
- `src/utils/csvExport.ts` — CSV generation helpers. `buildCSVHeader(t)` returns locale-aware column headers; `buildCategoryResolver(t)` translates built-in category keys. Both `saveCSVToDevice` and `shareCSV` require a pre-built `headerRow` string. Google Drive backup calls `getAllDataForCSV` directly with the Portuguese default.
- `src/components/UIComponents.tsx` — Shared UI primitives (Button, Card, SearchBar, etc.).
- `src/utils/importHelpers.ts` — CSV/text parsing helpers (`parseTextInput`, `parseCSV`, `parseDateStr`, `deaccent`). `parseTextInput` handles both simple line format and pasted CSV content (strips quotes, skips header rows, reads variant column).

## Changelog

See [.agents/AGENTS-CHANGELOG.md](.agents/AGENTS-CHANGELOG.md).

## Additional Documentation

- `AGENTS.md` — strict contributor guide mirroring the repository enforcement rules for testing, CI, changelog maintenance, and `/ship` usage.
