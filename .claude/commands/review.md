# /review — Run post-CI review before shipping

Call this command after `npm run ci` passes and the changelog has been updated. It detects whether the change is simple or complex and performs the appropriate review.

## Steps

1. **Detect complexity** — run `npm run agent:review` and capture the output.

   - If output contains `Simple change`, proceed to **Internal Review** (Step 2).
   - If output contains `Complex change detected`, proceed to **External Review Request** (Step 3).

---

## Step 2 — Internal Review (simple change)

Perform this checklist by reading the relevant files. Report each item as `[ok]` or `[fail]` with a one-line explanation.

```
[ ] Tests written  — every changed function has at least one test
[ ] CI passed      — npm run ci exited with code 0
[ ] Coverage       — changed code meets 99% line / 95% branch targets
[ ] Naming         — files, functions, variables follow existing conventions
[ ] No dead code   — no unused imports, variables, or unreachable branches
[ ] No secrets     — no tokens, passwords, or .env values hardcoded
[ ] Changelog      — .agents/AGENTS-CHANGELOG.md updated with correct format
[ ] Docs           — CLAUDE.md updated if architecture/conventions changed
```

If all items are `[ok]`, output `Internal review passed.` then check `.agents/agent-config.json`:
- `features.automatic_ship: true` → run `/ship` automatically now.
- `features.automatic_ship: false` → output `Safe to /ship.` and wait for user.

---

## Step 3 — External Review Request (complex change)

1. Collect a one-line summary of the change from the latest `.agents/AGENTS-CHANGELOG.md` entry title.

2. Run:
   ```
   npm run agent:review "<summary>"
   ```
   This creates `.agents/reviews/review-{timestamp}.md` with `status: pending`.

3. Output the path to the review file and the following message:

   ```
   Complex change — external review required.
   Review file: .agents/reviews/review-{timestamp}.md

   Hand this file to an external reviewer (Codex or Gemini).
   The reviewer must update the file and set:
     status: approved        → proceed to /ship
     status: changes_requested → apply fixes, re-run CI, re-run /review

   Do NOT run /ship until status is approved.
   Maximum 3 iterations. If still unresolved, set status: escalation_required and stop.
   ```

4. Stop. Do not proceed to `/ship` until the review file is resolved.

---

## Notes

- Never approve your own complex changes.
- Never skip this command before `/ship` on a complex change.
- After `status: approved`, delete the review file with `cleanupReviews()` or by removing `.agents/reviews/review-*.md` before shipping.
