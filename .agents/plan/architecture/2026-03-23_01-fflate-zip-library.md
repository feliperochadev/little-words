# ADR: Use fflate as ZIP Library for Full Backup Feature

**Date:** 2026-03-23
**Status:** Accepted
**Deciders:** claude, user

---

## Context

The Export/Import feature needs ZIP archive creation and extraction to support full backups with media assets. The app runs on Expo SDK 55 managed workflow (no ejecting). ZIP operations must handle binary files (audio M4A/MP3, photos JPEG/PNG) and JSON data, with typical archive sizes under 50MB.

The key constraint is Expo managed workflow compatibility — libraries requiring native modules must either ship a config plugin or be ruled out.

## Decision Drivers

- **Expo managed workflow compatibility** — must work without ejecting or adding native modules
- **Binary file support** — must handle audio/photo files reliably
- **Performance** — acceptable speed for archives up to 50-100MB on mobile devices
- **Bundle size** — minimal impact on app size
- **Maintenance** — actively maintained, stable API

## Considered Options

1. **fflate** — Pure JS, ~8KB, sync API works in React Native/Hermes
2. **jszip** — Pure JS, mature but unmaintained (~4 years), memory-hungry
3. **react-native-zip-archive** — Native, excellent performance, requires custom dev build
4. **react-native-blob-util** — No ZIP support (download/upload utility only)

## Decision

**Chosen option: fflate**, because it is the only option that satisfies all decision drivers simultaneously.

### Pros
- Zero native modules — works with Expo Go and managed workflow out of the box
- Smallest bundle size (~8KB minzipped vs ~90KB for jszip)
- ~40-50% faster than pako, significantly faster than jszip
- Native `Uint8Array` API pairs perfectly with `expo-file-system`'s `File.bytes()` / `File.write()`
- Actively maintained (v0.8.2, Feb 2025, 19M weekly npm downloads)
- `zipSync` / `unzipSync` confirmed working in React Native/Hermes

### Cons
- **Async API does not work in React Native** — Web Workers (used by `zip`/`unzip`) don't run in Hermes. Limited to synchronous operations.
- **Blocks JS thread** during ZIP creation/extraction — UI freezes for duration of operation. Mitigated by showing a loading overlay; typical backup sizes (<50MB) process in 1-5 seconds.
- **In-memory processing** — entire archive held in memory. Peak RAM ~2x archive size during creation. Acceptable for <50MB; may need chunked approach for very large libraries.

### Why not the others

- **jszip**: Effectively unmaintained (last release 4 years ago). 3-4x larger bundle. Same in-memory limitation as fflate but slower. Known Android binary data issues.
- **react-native-zip-archive**: Excellent native performance but requires custom dev build. The current project builds via EAS with `eas build --profile apk`, adding native modules increases build complexity and breaks Expo Go debugging. Overkill for typical <50MB backup sizes.

## Consequences

### Positive
- No new native dependencies — build pipeline unchanged
- Fast, lightweight implementation with minimal bundle impact
- Simple API: `zipSync(fileMap)` / `unzipSync(bytes)` with `Uint8Array` throughout

### Negative / Risks
- UI freeze during large ZIP operations (mitigated by loading overlay + typically <5s)
- If backup sizes grow beyond ~100MB, may need to revisit with native solution or streaming approach
- Must use `File.bytes()` (sync) from expo-file-system, not the legacy `readAsStringAsync` with base64

## Links

- [fflate GitHub](https://github.com/101arrowz/fflate)
- [fflate React Native discussion](https://github.com/101arrowz/fflate/discussions/236)
- [expo-file-system File API](https://docs.expo.dev/versions/latest/sdk/filesystem/)
- Related design: `.agents/plan/design/2026-03-23_01-export-import-full-backup.md`
