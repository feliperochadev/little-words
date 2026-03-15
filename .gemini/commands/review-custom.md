# /review-custom — Run post-CI review before shipping (Gemini)

Call this command after `npm run ci` passes and the changelog has been updated. It detects whether the change is simple or complex and performs the appropriate review.

This process is governed by `.agents/agent-config.json`.

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
[ ] Docs           — GEMINI.md updated if architecture/conventions changed
```

If all items are `[ok]`, output:

```
Internal review passed.
```

Check `.agents/agent-config.json`:
- If `features.automatic_ship` is `true`, proceed to `/ship` automatically.
- Otherwise, output: `Safe to /ship.`

If any item is `[fail]`, list the failures and fix them before /ship.

---

## Step 3 — External Review Request (complex change)

1. Collect a one-line summary of the change from the latest `.agents/AGENTS-CHANGELOG.md` entry title.

2. Run:
   ```
   npm run agent:review "<summary>"
   ```
   This creates or updates `.agents/reviews/review-{timestamp}.md` with `status: pending`.

3. Output the path to the review file and the following message:

   ```
   Complex change — external review required.
   Review file: .agents/reviews/review-{timestamp}.md

   Hand this file to an external reviewer (Codex or Claude).
   The reviewer must update the file and set:
     status: approved        → records approval for this agent
     status: changes_requested → apply fixes, re-run CI, re-run /review

   A total of <requiredApprovals> independent approvals are required.
   ```

4. Check if approvals are sufficient:
   - Read `.agents/agent-config.json` for `review.external_agents_required_for_auto_ship`.
   - Read the review file and count agents in the `approvals:` list.
   - If `status: approved` AND `approvals >= required`:
     - If `features.automatic_ship` is `true`, proceed to `/ship` automatically.
     - Otherwise, output: `Required approvals met. Safe to /ship.`
   - Else:
     - Output: `Awaiting more external reviewers.`
     - Stop. Do not proceed to `/ship` until approvals are met.

---

## Notes

- Never approve your own complex changes.
- Never skip this command before `/ship` on a complex change.
- Approval is recorded when a DIFFERENT vendor agent sets `status: approved` and adds their marker (e.g., `apsc - ce` for Claude, `apsc - cx` for Codex) to the `approvals:` list in the review file.
- An external reviewer may run `/commit` and `/ship` only after the review is approved and required approvals are met, and when `features.automatic_commit` or `features.automatic_ship` allow it.
- Always delete the review file after the code is committed (`rm .agents/reviews/review-*.md`).
