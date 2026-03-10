# /ship — Commit and push all unshipped changelog entries (Codex)

Commit all staged/unstaged changes and push to the remote branch. The commit message is built from every `.agents/AGENTS-CHANGELOG.md` entry that has not yet appeared in the git log.

> **`(apso)`** — *Agent-Programmed Source OpenAI*. A marker appended to every commit subject to identify commits where the code changes were authored by an AI agent (Codex). It is not a co-author credit — the human remains the sole git author — but serves as an internal audit trail distinguishing agent-driven work from manually written commits.

## Steps

1. **Branch check** — run `git branch --show-current`. If the current branch is `main` or `master`, stop immediately and ask the user to create a feature branch before shipping. Do not proceed.

2. **Find unshipped changelog entries** — do both of the following:
   - Run `git log --oneline -20` to get recent commit subjects.
   - Read `.agents/AGENTS-CHANGELOG.md` in full.

   Then, working from the top of the changelog (most recent first), collect every entry (heading + content) whose heading ID (e.g. `2026-03-09_5`) does **not** appear in any recent commit subject. Stop collecting when you hit an entry whose ID **is** already in a commit subject — everything from that point is already shipped.

   If all entries are already in git log, stop and tell the user there is nothing new to ship.

3. **Stage changes** — run `git status` to see what is modified or untracked. Stage relevant files, prefer specific paths over `git add -A`, and exclude secrets such as `.env`.

4. **Commit** — build the commit message from the collected unshipped entries:
   - **Subject line**: all the bold titles from every unshipped entry (`**[tag] Description**` lines), joined with ` / `, followed by ` (apso)`. Trim to 72 characters if needed.
   - **Body**: the full content of every unshipped entry, in chronological order (most recent first), separated by blank lines. Include the `### YYYY-MM-DD_N` heading for each entry so the history is traceable.
   - Use a HEREDOC to pass the message so formatting is preserved.

5. **Push** — run `git push -u origin <branch>` so the upstream is set if needed.

6. **Confirm** — output the commit hash and a one-line summary of how many changelog entries were included.
