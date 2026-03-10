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
- `src/database/`: SQLite schema and data access layer (`database.ts`).
- `src/components/`: Reusable UI components and modals.
- `src/i18n/`: Internationalization logic and translation catalogues.
- `src/utils/`:
  - `googleDrive.ts`: Cloud backup integration (native builds only).
  - `csvExport.ts` / `importHelpers.ts`: Data portability logic.
  - `theme.ts`: Centralized color and style constants.

## Key Development Commands
### Environment Setup
- `npm install`: Install dependencies.
- `npx expo start`: Start the Expo development server.

### Quality Assurance
- `npm run ci`: Run the full CI suite (Lint -> Typecheck -> Test). **Mandatory before completion.**
- `npm run lint`: Run ESLint.
- `npm run typecheck`: Run TypeScript compiler check.
- `npm test`: Run Jest unit and integration tests.
- `npm run test:coverage`: Run tests with coverage reports.
- `npm run e2e`: Run full Maestro E2E test suite (requires an emulator/device).

### Building
- `npm run build:apk`: Generate an Android APK via EAS.
- `npm run build:android`: Generate an Android preview build via EAS.

## Development Conventions
- **Testing Policy:** 
  - Every change requires tests (Unit for logic, Integration for components).
  - Goal: 99% line coverage and 95% for functions/branches/statements.
  - Place tests in `__tests__/` mirroring the source structure.
- **CI Enforcement:** Always run `npm run ci` after changes. Task is only done if it passes.
- **Internationalization:**
  - Support `en-US` and `pt-BR`.
  - Use `useI18n()` hook for translations.
  - Built-in categories use English keys in the DB, translated at render time via `useCategoryName()`.
- **E2E Testing (Maestro):**
  - Use `testID` for all interactive elements.
  - Prefer `id:` selector over text matching.
  - Always `scrollUntilVisible` before asserting off-screen elements.
- **Documentation:**
  - Update `GEMINI.md` for architectural or convention changes.
  - Always append every approved change to `.agents/AGENTS-CHANGELOG.md` after CI passes.
  - Entry headings must follow the `### YYYY-MM-DD_N` format.
  - Use category tags: `[fix]`, `[feature]`, `[upgrade]`, `[config]`, `[test]`, `[refactor]`.

4. **Shipping code (`/ship`):**
   - `/ship` is the standard way to commit and push approved changes.
   - **Never run it automatically** — only when explicitly requested by the user.
   - Follow the detailed implementation in `.gemini/commands/ship.md`.
   - Appends `(apsc - gi)` to the commit subject to mark it as a Gemini-authored commit.

## Commands
```bash
# Start dev server
npx expo start

# Run full CI suite (Mandatory before completion)
npm run ci

# Shipping code
/ship
```

## Changelog
See [.agents/AGENTS-CHANGELOG.md](.agents/AGENTS-CHANGELOG.md).
- `categories`: Stores category metadata (neutral keys for defaults).
- `words`: Main word records linked to categories.
- `variants`: Pronunciation variations linked to words.
- `settings`: Key-value store for app state (locale, onboarding status, tokens).

## Additional Documentation
- `AGENTS.md`: strict contributor guide covering repository layout plus mandatory testing, CI, changelog, and `/ship` rules.
