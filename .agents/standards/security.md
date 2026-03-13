# Security Standards

Aligned with the **Sonar Way** quality gate and OWASP Mobile Top 10 for React Native / TypeScript. All conditions apply to **new code**. Agents must not ship code that introduces security regressions.

---

## Sonar Way Quality Gate — Security Conditions

| Metric | Threshold | Meaning |
|--------|-----------|---------|
| Security Rating | **A** (0 vulnerabilities) | No new vulnerabilities introduced |
| Security Hotspots Reviewed | **100 %** | Every new hotspot must be triaged as Safe or acknowledged with `// NOSONAR` |

> A PR with unreviewed hotspots or any security vulnerability **must not be shipped**.

---

## Security Hotspot Review Protocol

When SonarCloud flags a **security hotspot** (not a vulnerability — a location requiring human review):

1. **Investigate** whether the pattern is actually exploitable in context.
2. If **safe**: add an inline `// NOSONAR` comment on the **exact flagged line** with a brief justification.
3. If **unsafe**: fix the code before shipping.

```ts
// ❌ NOSONAR on the wrong line — Sonar still flags line 2
// NOSONAR - uses array args, no shell expansion
return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' });

// ✅ NOSONAR inline on the flagged line
return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }); // NOSONAR - array-based args, no shell expansion
```

---

## Child Process Execution (S4036)

Rule S4036 — PATH variable must only contain fixed, unwriteable directories.

- **Always** use `execFileSync` (not `exec` or `execSync`) with an explicit **array** of arguments.
- Never build commands via string concatenation or template literals.
- Never pass user-supplied input as a command argument without sanitisation.

```ts
// ❌ Don't — string-based command, susceptible to injection
execSync(`git ${userInput}`);

// ❌ Don't — exec with shell=true (shell expansion)
exec('git status', { shell: true });

// ✅ Do — array args, no shell expansion
import { execFileSync } from 'node:child_process';
execFileSync('git', ['diff', '--name-only', 'HEAD'], { encoding: 'utf-8' }); // NOSONAR - array args, no shell expansion
```

---

## No Hardcoded Secrets or Credentials

- Never commit API keys, tokens, passwords, or private keys in source files.
- Use environment variables or EAS Secrets for build-time values.
- Git-tracked files must never contain secret material — not even in comments.

```ts
// ❌ Don't
const API_KEY = 'sk-1234abcd...';

// ✅ Do — inject at build time via EAS / env
const API_KEY = process.env.EXPO_PUBLIC_API_KEY;
```

---

## SQL Injection Prevention

The project uses `expo-sqlite` via parameterised helpers (`query<T>()` and `run()`). Always pass values as parameters — never interpolate them into SQL strings.

```ts
// ❌ Don't — SQL injection risk
db.runSync(`INSERT INTO words (word) VALUES ('${userInput}')`);

// ✅ Do — parameterised query via the project helper
await run('INSERT INTO words (word, date, category_id) VALUES (?, ?, ?)', [word, date, categoryId]);
```

---

## Sensitive Data Storage

React Native / Expo specifics:

| Data type | Storage |
|-----------|---------|
| Non-sensitive app state (locale, onboarding flag) | `expo-sqlite` `settings` table — OK |
| PII / tokens / credentials | **`expo-secure-store`** (Keychain on iOS, Keystore on Android) — never SQLite or AsyncStorage |
| Large non-sensitive blobs | `expo-file-system` |

```ts
// ❌ Don't — AsyncStorage is unencrypted
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.setItem('authToken', token);

// ✅ Do — SecureStore encrypts at rest
import * as SecureStore from 'expo-secure-store';
await SecureStore.setItemAsync('authToken', token);
```

---

## Deep Link / URL Handling

- Validate all incoming deep-link URLs before processing parameters.
- Never pass raw URL parameters directly to navigation or database operations.
- Treat every deep-link parameter as untrusted user input.

```ts
// ❌ Don't — unsanitised deep link param forwarded to DB
router.push(`/word/${params.id}`);

// ✅ Do — validate and coerce
const id = Number(params.id);
if (!Number.isInteger(id) || id <= 0) return;
router.push(`/word/${id}`);
```

---

## Dependency Security

- GitHub Actions **Dependency Review** blocks PRs with HIGH or CRITICAL severity advisories.
- **OWASP Dependency-Check** and **Trivy** run on every push to `main`.
- **Dependabot** raises automated PRs for npm updates — merge promptly for security patches.
- Before adding a new dependency, check its advisory history on [npm advisories](https://www.npmjs.com/advisories).

```bash
# Local advisory audit
npm audit
```

> Never use `npm audit --force` or `npm audit fix --force` without reviewing every change.

---

## Input Sanitisation (CSV / Text Import)

User-supplied CSV and text input is parsed by `src/utils/importHelpers.ts`. Rules:

- Strip surrounding quotes before storing values.
- Reject / ignore rows where the word field is empty.
- Never evaluate or execute imported content.
- `parseDateStr` must only accept known date formats (`DD/MM/YYYY` or `YYYY-MM-DD`) — anything else falls back to today's date.

---

## Network & API Security

- The app is currently **offline-first** with no remote API calls from the production bundle.
- If a network call is added in future, it **must** use HTTPS exclusively.
- Certificate pinning is recommended for any future authenticated endpoints.
- Never log response bodies that may contain PII.

---

## Security Checklist

Before every commit, verify new code:

- [ ] No hardcoded secrets, tokens, or credentials
- [ ] All child process calls use `execFileSync` with array arguments
- [ ] All `// NOSONAR` comments are on the exact flagged line with a justification
- [ ] SQL values passed as parameters — never interpolated into strings
- [ ] Sensitive data uses `expo-secure-store`, not SQLite or AsyncStorage
- [ ] Deep-link / URL parameters validated before use
- [ ] No new HIGH/CRITICAL dependency advisories (`npm audit`)
- [ ] All new security hotspots triaged (Sonar gate: 100 % reviewed)
