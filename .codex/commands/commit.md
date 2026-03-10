# /commit — Gate automatic CI + review + ship (Codex)

Call this command when all code and test changes are complete. It reads `features.automatic_commit` from `.agents/agent-config.json` to decide whether to proceed automatically or wait for the user.

## Steps

1. **Read the flag** — check `features.automatic_commit` in `.agents/agent-config.json`.

---

## If `automatic_commit: false`

Output the following and stop:

```
Automatic commit is disabled (features.automatic_commit: false).
Changes are complete and ready but will NOT be committed automatically.

To proceed manually:
  1. Run npm run ci to verify everything passes.
  2. Update .agents/AGENTS-CHANGELOG.md with a ### YYYY-MM-DD_N entry.
  3. Explicitly request /ship when ready.
```

Do NOT run CI, `/review`, or `/ship`. Wait for the user.

---

## If `automatic_commit: true`

Proceed with the full commit flow:

1. **Run CI** — `npm run ci` must exit with code 0. If it fails, fix the issues and re-run before continuing.

2. **Verify changelog** — confirm `.agents/AGENTS-CHANGELOG.md` has been updated with a `### YYYY-MM-DD_N` entry covering the current changes.

3. **Run `/review`** — this will:
   - Detect complexity (simple vs complex).
   - Perform internal or external review checklist.
   - If `features.automatic_ship: true` and review passes → run `/ship` automatically.
   - If `features.automatic_ship: false` and review passes → output `Safe to /ship.` and wait for user.

---

## Notes

- Never skip CI before proceeding to `/review`.
- Never commit when `automatic_commit: false` — even if the user asks you to "just commit quickly". Change the flag first.
- The `automatic_commit` flag is a safety valve: set it to `false` when E2E or integration tests are flaky and you want a human to verify before committing.
