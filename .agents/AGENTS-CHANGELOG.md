# Changelog

Entries are added after every approved change. Most recent first.

---

### 2026-03-10_6

**[config] Strip Markdown markers from /ship commit messages**
- Updated `.claude/commands/ship.md`, `.codex/commands/ship.md`, and `.gemini/commands/ship.md` to explicitly require stripping `**` (bold) and `###` (heading) markers from the final commit message to reduce pollution in git history
- Maintains `[tag]` and agent markers (e.g., `(apsg)`) for traceability

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
