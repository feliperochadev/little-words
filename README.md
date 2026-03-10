# Palavrinhas

English | [Português (Brasil)](./README.pt-BR.md)

Palavrinhas is an Expo / React Native mobile app for recording a baby's first words, tracking pronunciation variants, and exporting or backing up data. The current app targets Android first, with local SQLite storage and optional Google Drive sync in native builds.

## Features

- Record words with category, date, and notes
- Track pronunciation variants for each word
- Bilingual UI: `en-US` and `pt-BR`, with locale persisted in SQLite
- Import from pasted text or CSV with preview before saving
- Export CSV with locale-aware column headers
- Save or share exports from the device
- Optional Google Drive backup on supported native builds
- Swipeable bottom-sheet modals and dashboard statistics

## Tech Stack

- Expo SDK 55, Expo Router 55
- React 19.2.0, React Native 0.83.2
- TypeScript 5.9
- SQLite via `expo-sqlite`
- Jest 30 + React Native Testing Library
- Maestro for E2E flows

## Project Structure

```text
app/                 Expo Router screens and layouts
app/(tabs)/          Home, words, variants, settings tabs
src/components/      Shared UI and modal components
src/database/        SQLite schema and data access
src/i18n/            en-US / pt-BR catalogues and provider
src/utils/           CSV, Google Drive, theme, and helper utilities
__tests__/           unit, integration, screen, and e2e coverage
assets/              icons, splash, and branding assets
```

## Development

```bash
npm install
npm start
npm run android
```

Useful commands:

- `npm run ci` runs lint, typecheck, and Jest; treat it as the required completion gate
- `npm test` runs unit, integration, and screen tests
- `npm run test:coverage` runs Jest with coverage output
- `npm run e2e:import` and `npm run e2e:export` run focused Maestro flows
- `npm run build:apk` builds an Android APK with EAS

## Architecture Notes

- `app/index.tsx` initializes the database, checks onboarding, and routes into the app
- Built-in categories are stored as locale-neutral English keys and translated at render time
- `src/utils/csvExport.ts` builds locale-aware CSV headers and category labels
- `src/utils/importHelpers.ts` parses both plain text and CSV input
- Google Drive backup is guarded by `isNativeBuild()` and does not work in Expo Go

## Testing

Tests live in `__tests__/unit`, `__tests__/integration`, `__tests__/screens`, and `__tests__/e2e`. Current repo rules expect tests for every code change and a passing `npm run ci` before work is considered complete. Maestro flows should prefer `testID`-based `id:` selectors over visible text where possible.
