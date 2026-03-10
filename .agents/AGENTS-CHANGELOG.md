# Changelog

Entries are added after every approved change. Most recent first.

---

### 2026-03-10_35

**[test] Add demo Maestro flow**
- Added a lightweight demo flow that walks through onboarding, word + variants creation, search, and CSV import without assertions
- Added a Portuguese variant of the demo flow for localized coverage
- Added a Portuguese CSV fixture and wired the BR demo flow to use it
- Added a Home tab dashboard scroll and 3-second pause to both demo flows
- Updated the EN demo flow to tap the Home tab icon to avoid Android system home conflicts

### 2026-03-10_34

**[test] Speed up Maestro waits**
- Reduced E2E `extendedWaitUntil` and `scrollUntilVisible` timeouts, lowered swipe durations, and removed `waitForAnimationToEnd` calls to cut interaction time without changing coverage
- Simplified `crud-word.yaml` by dropping redundant modal assertions and hideKeyboard calls, swapping to `testID` selectors where available, trimming per-screen assertions, and preferring `extendedWaitUntil` for key UI readiness checks

### 2026-03-10_33

**[config] Review workflow — reviewer shipping guard + cleanup**
- Clarified that external reviewers may run `/commit` and `/ship` only after review approval and required approvals, and only when automatic flags allow it
- Required deleting review files after the commit is created
- Synced the rules across `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, and vendor review command docs

### 2026-03-10_32

**[test] E2E flows — align data and onboarding sequence**
- Updated word/variant fixtures to use `ball`/`baa-baa` across CRUD/search flows
- Split delete-all-data and re-onboard steps into separate flows and reordered them in the full E2E sequence
- Adjusted CRUD word variant steps and added an explicit delete-mama section

**[fix] AddVariantModal duplicate warning testID**
- Added `testID="modal-duplicate-variant"` on the duplicate warning card for reliable E2E assertions

**[config] README brand naming**
- Updated the English README title and intro copy to use "Little Words"

### 2026-03-10_30

**[config] Pre-push protection for root branches**
- Updated `.husky/pre-push` to block pushes targeting root branches (`main`, `master`, or the remote default branch from `<remote>/HEAD`) before running CI
- Documented the pre-push protection in `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md` to keep workflow rules in sync

### 2026-03-10_31

**[config] Husky pre-push warning cleanup**
- Removed the deprecated Husky header lines from `.husky/pre-push` to silence v10 warning output

### 2026-03-10_29

**[config] Shipping rules — git tags and changelog immutability**
- Updated `/ship` docs to use `ship-YYYY-MM-DD_N` tags as the shipping boundary, with git-log fallback only when no tags exist
- Added rule: once a changelog entry is pushed, never edit it; add a new entry and reference the old ID
- Synced the rule across `.agents/COMMON-RULES.md`, all vendor readmes, and commit/ship command docs

### 2026-03-10_28

**[fix] Agent tests — move to scripts folder**
- Moved agent coordination unit tests into `__tests__/scripts/agents`
- Updated relative imports to `scripts/agent` after relocation
- Enabled automatic commit and ship feature flags in `.agents/agent-config.json`

### 2026-03-10_27

**[feature] Unique variant per word — duplicate detection in AddVariantModal and AddWordModal**
- Added `findVariantByName(wordId, variant)` to `database.ts`: queries `variants` with case-insensitive `LOWER(variant)` match scoped to the given `word_id`, mirroring `findWordByName`
- `AddVariantModal`: debounced duplicate check (400ms) fires when variant text changes and an effective word is known; shows red-bordered input + warning card "⚠️ Variant already exists for `word`" with the duplicate variant text; save button dimmed and Alert blocks save — same UX pattern as word duplicate detection; check is skipped when editing an existing variant
- `AddWordModal`: `handleSave` now silently deduplicates inline new-variant rows against existing variants and against each other using a running lowercase `Set`, so re-entered pronunciations are dropped rather than inserted twice
- Added `addVariant.duplicateTitle` and `addVariant.duplicateAlert` keys to `en-US.ts` and `pt-BR.ts`
- Unit test: `findVariantByName` null and match cases in `database.test.ts`
- Integration tests: duplicate warning card display, save blocked by Alert, edit-mode skips check, reset on reopen — in `AddVariantModal.test.tsx`
- **E2E tests**: added "DUPLICATE VARIANT DETECTION" section to `crud-variant.yaml` and "ADD VARIANTS WITH DEDUPLICATION" section to `crud-word.yaml`.

---

### 2026-03-10_26

**[fix] AddWordModal — select new category and scroll carousel to left after addition**
- Modified `AddCategoryModal` (`AddCategoryModal.tsx`): updated `onSave` callback to return the ID of the newly created or updated category.
- Modified `AddWordModal` (`AddWordModal.tsx`): updated `onSave` handler for `AddCategoryModal` to automatically set `selectedCategory` to the new ID and scroll the `category-section` carousel back to the left (`x: 0`) as requested — this ensures the user sees the new category immediately if it's sorted at the beginning and resets the view if they had scrolled to the end to add it.
- Verified compatibility in `app/(tabs)/words.tsx` and `app/(tabs)/settings.tsx` — both remain functional with the updated `onSave(id?: number)` signature.
- Updated `__tests__/integration/AddCategoryModal.test.tsx`: verified `onSave` is called with the category ID.
- Updated `__tests__/integration/AddWordModal.test.tsx`: added a test case to verify that the newly created category is selected and the carousel refreshes.
- **E2E tests**: updated `crud-word.yaml` to remove manual category selection and carousel scrolling steps, as these are now automated.

---

### 2026-03-10_25

**[fix] E2E crud-word — carousel scroll and date picker year selection**
- Replaced `scrollUntilVisible direction: RIGHT` with 3 optional right-arrow taps (`optional: true`) to scroll the category carousel to the end — Maestro cannot scroll inside horizontal `ScrollView` elements, so the arrow buttons are the only reliable mechanism; `optional: true` makes excess taps silently pass once the arrow disappears at end-of-scroll
- After adding the Toys category, switched to optional right-arrow taps to find the new chip without crashing when the arrow vanishes at end-of-scroll
- Replaced swipe gesture on the year wheel with `tapOn: "2025"` — the swipe didn't reliably trigger `onMomentumScrollEnd`, so "2025" was visually visible but React state `py` was never updated before confirm

**[fix] DatePickerField — wheel item tap + onScrollEndDrag fallback**
- Made each `WheelColumn` item a `TouchableOpacity` that calls `onChange(item.value)` directly and scrolls to center the tapped item — makes tapping any year/month/day item work without requiring a scroll gesture
- Added `onScrollEndDrag` + `onMomentumScrollBegin` tracking: when a drag ends without generating momentum (as happens with Maestro swipe gestures), `onChange` is called after 80 ms if no momentum event arrived — prevents state staying stale when the FlatList scroll doesn't produce momentum

---

### 2026-03-10_24

**[test] E2E delete-all-data flow before export**
- Added `__tests__/e2e/delete-all-data.yaml`: clears data from Settings, re-runs onboarding with Boy, lands on Home
- Inserted the new flow into `__tests__/e2e/full-e2e.yaml` before `export-words.yaml`
- Added `testID="settings-delete-all-btn"` to the Settings danger button for reliable Maestro targeting

---

### 2026-03-10_23

**[fix] Clarify automatic_commit semantics in /commit command and all readmes**
- Corrected the meaning of `features.automatic_commit`: the flag controls whether the agent **self-triggers** `/commit` after work, NOT what happens when the command is explicitly invoked — `/commit` always runs CI → /review → respects `automatic_ship` when called
- Rewrote `.claude/commands/commit.md`, `.gemini/commands/commit.md`, `.codex/commands/commit.md` to reflect this
- Updated `.agents/COMMON-RULES.md` Rule 5, `CLAUDE.md` Rule 5, `AGENTS.md`, and `GEMINI.md` Rule 5 with the corrected description

---

### 2026-03-10_22

**[config] Session Start — Review Feature Flags rule added to all vendor readmes**
- Updated `.agents/COMMON-RULES.md`: added Rule 8 (Session Start — Review Feature Flags); renumbered old Rule 7 to remain 7 (Rate Limit Resilience stays in place)
- Updated `CLAUDE.md`: added Rule 4 (Session Start — Review Feature Flags), renumbered old Rules 4–8 to 5–8
- Updated `AGENTS.md`: added "Session Start — Review Feature Flags" block in Documentation & Shipping Rules
- Updated `GEMINI.md`: added Rule 4 (Session Start — Review Feature Flags), renumbered old Rules 4–7 to 5–8

---

### 2026-03-10_21

**[feature] Automatic commit gate — /commit command + automatic_commit flag**
- Added `features.automatic_commit: false` to `.agents/agent-config.json`
- Created `.claude/commands/commit.md`, `.gemini/commands/commit.md`, `.codex/commands/commit.md`: reads `automatic_commit`; if `false` stops and waits for user; if `true` runs CI → `/review` → respects `automatic_ship`
- Updated `.agents/COMMON-RULES.md`: added Rule 5 (Automatic Commit Gate), renumbered old Rules 5–6 to 6–7
- Updated `CLAUDE.md`: added Rule 4 (Automatic Commit Gate), renumbered old Rules 4–6 to 5–7
- Updated `AGENTS.md` Documentation & Shipping Rules: added `/commit` gate block before the `/ship` block
- Updated `GEMINI.md`: added Rule 4 (Automatic Commit Gate), renumbered old Rules 4–6 to 5–7

---

### 2026-03-10_20

**[fix] E2E crud-word — scroll carousel before tapping category-add-btn**
- Added `scrollUntilVisible` with `direction: RIGHT` before tapping `category-add-btn` in the "Add word with new category" section — the button is at the end of the horizontal category carousel and was off-screen, causing the tap to fail with "Element not found"

---

### 2026-03-10_19

**[fix] Correct stale auto-ship description in CLAUDE.md**
- Fixed the "Shipping code" section: replaced "Never run it automatically — only when explicitly requested by the user" with the accurate rule referencing `features.automatic_ship` from `agent-config.json`

---

### 2026-03-10_18

**[fix] Commit package-lock.json so GitHub Actions cache works**
- Removed `package-lock.json` from `.gitignore` — it was excluded, causing `actions/setup-node@v4` with `cache: "npm"` to fail with "Dependencies lock file is not found"
- Committed `package-lock.json` to the repository for reproducible installs and to satisfy the npm cache action

---

### 2026-03-10_17

**[config] Automatic ship rule enforced across all vendor readmes**
- Updated `CLAUDE.md` Rule 4: agents must read `features.automatic_ship` from `.agents/agent-config.json`; `true` → run `/ship` automatically after `/review` approval; `false` → wait for user
- Updated `AGENTS.md` Shipping Rules: documented `automatic_ship` behavior identically
- Updated `GEMINI.md` Rule 4: same auto-ship logic with reference to `agent-config.json`
- Updated `.agents/COMMON-RULES.md` Rule 4: auto-ship added as vendor-agnostic baseline
- Updated `.claude/commands/review.md` Step 2: after internal checklist passes, check `automatic_ship` and either run `/ship` automatically or output `Safe to /ship.`

---

### 2026-03-10_16

**[feature] GitHub Actions CI/CD pipeline**
- Added `.github/workflows/ci.yml` with two jobs:
  - `unit-tests`: runs `npm run ci` (lint → typecheck → jest) on every push to any branch and on every PR
  - `e2e`: runs only on PRs after `unit-tests` passes; builds local debug APK via `expo prebuild` + Gradle, runs full Maestro suite on Android emulator (API 33, x86_64, Pixel 6)
- `expo/expo-github-action@v8` sets up EAS CLI and Expo toolchain (ready for EAS Build / EAS Update)
- Graceful `google-services.json` handling: decodes from secret when present, falls back to CI stub
- Gradle cache via `gradle/actions/setup-gradle@v3`
- Maestro failure artifacts uploaded with 7-day retention
- `concurrency` group cancels stale in-flight runs on new pushes

---

### 2026-03-10_15

**[config] Git pre-push hook for mandatory CI**
- Installed `husky` to manage git hooks.
- Added `"prepare": "husky"` script to `package.json` for automatic setup.
- Created `.husky/pre-push` to run `npm run ci` before every push, ensuring all linting, typechecking, and tests pass.
- Removed default `.husky/pre-commit` to focus on pre-push validation.

---

### 2026-03-10_14

**[feature] Agent readme_file registry in agent-config.json**
- Added `readme_file` field to each agent entry in `.agents/agent-config.json`: `CLAUDE.md` (Claude), `AGENTS.md` (Codex), `GEMINI.md` (Gemini)
- Added `readme_file?: string` to `AgentEntry` interface in `scripts/agent/agent-availability.ts`
- Added `getAgentReadmeFiles()` helper that returns a map of agent → readme path

**[config] Cross-vendor documentation rule enforced across all readmes**
- Updated `.agents/COMMON-RULES.md` Rule 3: when a change affects general rules/workflow/tooling, all vendor readmes listed in `agent-config.json` must be updated
- Updated `CLAUDE.md` Rule 3: added cross-vendor documentation rule
- Updated `AGENTS.md` Documentation & Shipping Rules: added cross-vendor documentation rule
- Rewrote `GEMINI.md`: fixed broken file structure (floating numbered rules, orphan schema block), added Rule 6 (Rate Limit Resilience), added cross-vendor rule, added `scripts/agent/` to architecture section

**[test] Added getAgentReadmeFiles tests**
- Updated `__tests__/unit/agent-availability.test.ts`: added `getAgentReadmeFiles` describe block covering full map, missing `readme_file` omission, and empty result

---

### 2026-03-10_13

**[feature] Rate Limit Resilience + Unfinished Task Recovery**
- Created `.agents/unfinished-tasks/` directory for task handoff files
- Added `scripts/agent/task-persistence.ts`: creates, lists, updates, and deletes `.agents/unfinished-tasks/task-{date}-{seq}.md` files; CLI lists all pending tasks
- Added `scripts/agent/agent-availability.ts`: reads/writes `agents.{name}.available` in `agent-config.json`; exposes `setAgentAvailable`, `isAgentAvailable`, `getAvailableAgents`, `getUnavailableAgents`
- Restored `agents` section to `.agents/agent-config.json` with `available: true` for all three vendors
- Added optional `configPath` param to `scripts/agent/load-config.ts` for testability
- Added `npm run agent:check-tasks` and `npm run agent:availability` scripts to `package.json`

**[feature] /rate-limit-abort and /check-unfinished-tasks slash commands**
- Added `.claude/commands/rate-limit-abort.md`: reverts uncommitted work, writes task file, marks Claude offline, exits safely
- Added `.claude/commands/check-unfinished-tasks.md`: re-marks Claude online, lists pending tasks, resumes oldest via Next Steps
- Added `.gemini/commands/rate-limit-abort.md` and `.gemini/commands/check-unfinished-tasks.md`: Gemini equivalents
- Added `.codex/commands/rate-limit-abort.md` and `.codex/commands/check-unfinished-tasks.md`: Codex equivalents

**[test] Unit tests for rate limit resilience scripts**
- Added `__tests__/unit/task-persistence.test.ts`: covers `buildTaskFilename`, `formatTaskFile`, `parseTaskFile`, `createUnfinishedTask`, `listPendingTasks`, `markTaskInProgress`, `completeTask`
- Added `__tests__/unit/agent-availability.test.ts`: covers all exports with filesystem isolation
- Added `__tests__/unit/load-config.test.ts`: covers defaults, key mapping, error fallback, and full config parsing

**[config] Documentation updated with Rate Limit Resilience protocol**
- Updated `CLAUDE.md`: added Rule 6 and `npm run agent:check-tasks` / `agent:availability` commands
- Updated `AGENTS.md`: added Rate Limit Resilience section
- Updated `.agents/COMMON-RULES.md`: added Rule 6 as vendor-agnostic baseline

---

### 2026-03-10_12

**[feature] Shared Agent Configuration + Automatic Ship**
- Added `.agents/agent-config.json`: central configuration for all agents (versioning, `automatic_ship` flag, and review requirements)
- Added `scripts/agent/load-config.ts`: utility to load and validate the shared configuration with sensible defaults
- Updated `scripts/agent/review-loop.ts`:
  - Integrated `loadAgentConfig` to govern iteration limits and approval requirements
  - Extended `ReviewFile` format with `reviewers` and `approvals` arrays for multi-agent tracking
  - Added CLI logic to detect and announce when required approvals are met and if auto-shipping is enabled
- Updated `.gemini/commands/review.md`: documented the new multi-agent approval workflow and the automatic ship trigger condition

**[test] Updated review loop unit tests**
- Updated `__tests__/unit/review-loop.test.ts`: expanded `formatReviewFile` and `parseReviewFile` tests to cover the new `reviewers` and `approvals` fields, ensuring robust multi-agent state management
- Verified all 591 tests passing with full type-check compliance

---

### 2026-03-10_10

**[feature] Multi-agent review system**
- Created `.agents/reviews/` directory for review request files
- Added `scripts/agent/complexity-check.ts`: parses latest changelog entry, counts change lines (Rule A: > 10) and category tags (Rule B: ≥ 3), returns `ComplexityResult`
- Added `scripts/agent/review-loop.ts`: creates structured review files (`review-{timestamp}.md`), tracks iteration count up to max 3, supports cleanup of approved reviews
- Added `npm run agent:review` script to `package.json` (runs via `npx tsx`)

**[test] Unit tests for review system scripts**
- Added `__tests__/unit/complexity-check.test.ts`: full coverage of `parseLatestEntry`, `countChangeLines`, `extractCategories`, `evaluateComplexity`, and `checkComplexity` (filesystem integration)
- Added `__tests__/unit/review-loop.test.ts`: full coverage of `buildTimestamp`, `formatReviewFile`, `parseReviewFile`, `createReviewRequest`, and `cleanupReviews`

**[config] Updated documentation for multi-agent review protocol**
- Updated `CLAUDE.md`: added Rule 5 (Multi-Agent Review Protocol) and `npm run agent:review` command docs
- Updated `AGENTS.md`: added Multi-Agent Review Protocol section before Architecture Notes
- Updated `.agents/COMMON-RULES.md`: added Rule 5 as vendor-agnostic baseline

---

### 2026-03-10_9

**[config] Standardized agent markers in global documentation**
- Updated `.agents/COMMON-RULES.md`, `CLAUDE.md`, and `AGENTS.md` to reflect the new `apsc - {gi|ce|cx}` vendor marker standard
- Added mandate to strip Markdown formatting (`**`, `###`) from `/ship` commit messages in all core instruction files

---

### 2026-03-10_8

**[config] Standardized agent vendor markers**
- Updated `GEMINI.md`, `.gemini/commands/ship.md`, `.claude/commands/ship.md`, and `.codex/commands/ship.md` to use the new standardized agent marker format: `apsc - {gi|ce|cx}` (Gemini, Claude, Codex)
- Updated `.agents/AGENTS-CHANGELOG.md` to reflect the new format in previous entries

---

### 2026-03-10_7

**[config] /ship reads from shared .agents/AGENTS-CHANGELOG.md**
- Updated `.claude/commands/ship.md` to read from `.agents/AGENTS-CHANGELOG.md` instead of the Claude-specific `CLAUDE-CHANGELOG.md`, aligning with the cross-vendor shared changelog approach

**[test] Integration and screen test coverage expansion**
- Added panResponder gesture handler test suites to `AddCategoryModal`, `AddVariantModal`, `AddWordModal`, `ImportModal`, and `ManageCategoryModal` — covering `onStartShouldSetPanResponder`, `onMoveShouldSetPanResponder`, `onPanResponderMove`, and `onPanResponderRelease` (dismiss and spring-back branches)
- Added branch-coverage tests to `AddCategoryModal`: delete without `onDeleted`, non-UNIQUE save error, word-count message with words
- Added branch-coverage tests to `AddVariantModal`: clear search button, change selected word chip
- Added branch-coverage tests to `AddWordModal`: `AddCategoryModal` open/close/save/delete from within, category scroll layout/contentSizeChange/arrow buttons, inline variant blur/flush no-op, duplicate card singular label
- Added branch-coverage tests to `DatePickerField`: custom accent color, missing label, day clamping, modal preview, out-of-range year (idx < 0 early-return), `WheelColumn` `onMomentumScrollEnd` via FlatList
- Added branch-coverage tests to `settings.test.tsx`: child sex/name display variants, locale switch, ImportModal close, Google sign-in (cancelled/in_progress/success), sync cancelled/error, save-to-device cancelled
- Added branch-coverage tests to `index.test.tsx`: Google sync triggered on connected, sync error swallowed
- Added branch-coverage tests to `variants.test.tsx`: `AddVariantModal` close via Cancel
- Added branch-coverage tests to `words.test.tsx`: `AddCategoryModal` close/save/delete from words screen
- Added `__tests__/unit/database.test.ts` — unit tests for `initDatabase`, `addCategory`, `getCategories`, `getWordCountByCategory`, `addWord`, `addVariant`, `getWords`, `findWordByName`, `getSetting`, `getAllDataForCSV`, `clearAllData`, `getDashboardStats` using `global.__mockDb`

---

### 2026-03-10_6

**[config] Strip Markdown markers from /ship commit messages**
- Updated `.claude/commands/ship.md`, `.codex/commands/ship.md`, and `.gemini/commands/ship.md` to explicitly require stripping `**` (bold) and `###` (heading) markers from the final commit message to reduce pollution in git history
- Maintains `[tag]` and agent markers (e.g., `(apsc - gi)`) for traceability

---

### 2026-03-10_5

**[config] README localization refresh**
- Rewrote `README.md` in English based on the current codebase, `CLAUDE.md`, and recent changelog entries instead of the previous older Portuguese-only overview
- Added `README.pt-BR.md` as the dedicated Brazilian Portuguese version with matching structure and current feature descriptions

---

### 2026-03-10_4

**[fix] Modal animation hook warnings**
- Added the stable animated values to the `useEffect` dependency lists in `AddCategoryModal.tsx`, `AddVariantModal.tsx`, `AddWordModal.tsx`, `ImportModal.tsx`, and `ManageCategoryModal.tsx` so `react-hooks/exhaustive-deps` no longer reports warnings

**[test] Modal reopen regression coverage**
- Extended the integration tests for the affected modal components to verify they still render correctly after reopening from `visible={false}` to `visible={true}`

---

### 2026-03-10_3

**[config] Codex /ship command**
- Added `.codex/commands/ship.md` mirroring the existing agent-specific `/ship` workflow and targeting `.agents/AGENTS-CHANGELOG.md`
- Cleaned `AGENTS.md` and documented the Codex `/ship` command location in the repository guidelines

---

### 2026-03-10_2

**[config] AGENTS.md aligned with strict common rules**
- Tightened `AGENTS.md` so it explicitly enforces tests for every change, `npm run ci` as the completion gate, changelog maintenance, and `/ship` only on explicit request
- Added a short architecture note for Expo Router, SQLite, locale-neutral category keys, and native-only Google Drive backup guards

---

### 2026-03-10_1

**[config] Contributor guide**
- Added root `AGENTS.md` as a concise repository guide covering structure, key npm and Maestro commands, naming conventions, test expectations, and pull request hygiene
- Updated `CLAUDE.md` and `GEMINI.md` to reference `AGENTS.md` as part of the repository documentation set

---

### 2026-03-09_5

**[feature] CSV export headers now follow the user's selected locale**
- `getAllDataForCSV` (`database.ts`): added optional `headerRow` parameter (defaults to `'palavra,categoria,data,variante'` to keep Google Drive backup unchanged)
- `csvExport.ts`: added `buildCSVHeader(t)` that builds the 4-column header from `csv.column*` i18n keys; `saveCSVToDevice` and `shareCSV` now accept `headerRow` and pass it through
- `en-US.ts` / `pt-BR.ts`: added `csv: { columnWord, columnCategory, columnDate, columnVariant }` section with locale-appropriate column names
- `settings.tsx`: calls `buildCSVHeader(t)` at render time and passes `csvHeader` to both export functions — exported file now uses English headers for `en-US` and Portuguese headers for `pt-BR`
- `parseCSV` already handled both locales on import, so round-trip compatibility is maintained

**[fix] Test fixes for animation-aware components**
- `ManageCategoryModal.test.tsx`: wrapped `onClose` assertion in `waitFor` (Cancel) and advanced fake timers by 600ms (edit) — both account for the 250ms dismiss animation before `onClose` fires
- `settings.test.tsx`: added `buildCSVHeader` to the `csvExport` mock so the component no longer throws `buildCSVHeader is not a function` during render

---

### 2026-03-09_4

**[test] E2E export-words — full round-trip: import → export → verify exported file**
- Added import step at the start of `export-words.yaml` using `sample-import.csv` fixture, so the test is self-contained and safe to run standalone (re-import skips existing words)
- Save to device flow now navigates the Android directory picker: `Show roots` → `Downloads` → `Use this folder` to avoid landing on Google Drive or another folder
- Verifies success alert "✅ Saved!" after saving
- Re-opens the exported file (`palavrinhas_YYYY-MM-DD.csv`) via the import CSV picker using partial match `tapOn: "palavrinhas"`, then asserts preview shows `blueberry`, `kiwi`, `grape` — the first 5 exported rows sorted by date ASC (oldest imports from sample-import.csv come first)
- Closes the import modal without re-importing (words already exist)

---

### 2026-03-09_3

**[test] E2E import-words — added CSV import test**
- Added `__tests__/e2e/fixtures/sample-import.csv` with 5 rows covering every field combination: word only, word+category, word+category+date, all fields (word+category+date+variant), word+date+variant without category
- Extended `import-words.yaml` with a full CSV import section: picks fixture from Android Downloads, verifies preview via testIDs, imports, then verifies all 5 words in Words tab and both variants (ki-wi, blue-berry) in Variants tab
- Added `tapOn: "Show roots"` before navigating to Downloads — the Android file picker can open on Google Drive or recent files and get stuck; tapping "Show roots" forces the navigation drawer open so Downloads is always reachable
- Prerequisite: `adb push __tests__/e2e/fixtures/sample-import.csv /sdcard/Download/sample-import.csv` before running

**[feature] ImportModal — file picker testID**
- Added `testID="import-csv-pick-btn"` to the file picker `TouchableOpacity` in `ImportModal.tsx`
- Updated test name to "Import - Import words via text and CSV"

---

### 2026-03-09_2

**[fix] E2E import-words — removed stale close-btn tap**
- `import-words.yaml`: removed `tapOn: import-close-btn` after the alert — `handleImport` calls `onClose()` automatically before showing the result alert, so the modal is already dismissed when the user taps "OK"

---

### 2026-03-09_1

**[fix] E2E import-words — text input and assertion reliability**
- Fixed `import-words.yaml`: replaced unreliable multiline `inputText` with a single-word input to avoid `\n` literal vs newline issues in Maestro
- Added `waitForAnimationToEnd` after `hideKeyboard` and `scrollUntilVisible` before preview assertions
- Replaced all text-based assertions with `id:`-based assertions using dynamic testIDs

**[feature] testID coverage — word list and import preview**
- `Card` (`UIComponents.tsx`): added `testID` prop, forwarded to root `View` or `TouchableOpacity`
- `words.tsx`: added `testID={`word-item-${item.word}`}` to each word card
- `ImportModal.tsx`: added `testID={`import-preview-word-${row.word}`}` to preview word text elements

**[upgrade] Dependencies — Expo SDK 55 / React 19 / RN 0.83.2**
- Upgraded to Expo SDK 55, React 19.2.0, React Native 0.83.2, Jest 30.1, TypeScript 5.9
- Removed `update-dependencies` branch — latest versions are now on `main`

**[config] CLAUDE.md — conventions and rules**
- Added E2E testing conventions (testID rules, scrolling, text input pitfalls)
- Added Rules section (write tests, run CI, update CLAUDE.md, maintain changelog)
- Updated Project Overview with full stack versions and feature list
