# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Palavrinhas** ("Little Words") is a React Native / Expo mobile app for recording a baby's first words. It tracks words, pronunciation variants, and categories, with optional Google Drive backup. Targets Android (APK via EAS Build); built with Expo SDK 52.

The `main` branch is SDK 52. There is a pending `update-dependencies` branch that upgrades to Expo SDK 55 (React 19, React Native 0.83.2, Jest 30).

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

## Testing

The project uses **Jest** (via `jest-expo`) with **@testing-library/react-native**.

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
- `src/utils/csvExport.ts` — CSV generation helpers.
- `src/components/UIComponents.tsx` — Shared UI primitives (Button, Card, SearchBar, etc.).
- `src/utils/importHelpers.ts` — CSV/text parsing helpers (`parseTextInput`, `parseCSV`, `parseDateStr`, `deaccent`). `parseTextInput` handles both simple line format and pasted CSV content (strips quotes, skips header rows, reads variant column).
