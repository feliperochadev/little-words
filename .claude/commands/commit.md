# /commit — Run CI + review + ship

When this command is invoked (by the user or automatically), always proceed with the full commit flow regardless of flags.

`features.automatic_commit` in `.agents/agent-config.json` controls only **whether the agent calls `/commit` automatically** after finishing work:
- `false` → agent must wait for the user to explicitly invoke `/commit`; never self-trigger it.
- `true` → agent may call `/commit` on its own once work is complete.

## Steps (always execute when invoked)

1. **Run CI** — `npm run ci` must exit with code 0. Fix any failures before continuing.

2. **Verify changelog** — confirm `.agents/AGENTS-CHANGELOG.md` has been updated with a `### YYYY-MM-DD_N` entry covering the current changes.

3. **Run `/review`** — this will:
   - Detect complexity (simple vs complex).
   - Perform internal or external review checklist.
   - If `features.automatic_ship: true` and review passes → run `/ship` automatically.
   - If `features.automatic_ship: false` and review passes → output `Safe to /ship.` and wait for user.

---

## Notes

- Never skip CI before proceeding to `/review`.
- `automatic_commit: false` means the agent waits to be asked — it does NOT mean the command does nothing when invoked.
- The `automatic_commit` flag is a safety valve: set it to `false` when E2E or integration tests are flaky and you want to manually trigger commits.
- `/ship` determines unshipped entries using `YYYY-MM-DD_N` git tags; if none exist yet, it falls back to the git-log method once.
- Once a changelog entry is pushed, never modify it; add a new entry referencing the original ID if corrections are needed.
