# /enhance-implementation [implementation-name] [change-description] — Improve Recent Implementation

Enhance and improve a recently completed implementation to fix bugs, apply missed design decisions, or improve implementation quality based on user feedback.

**Usage:**
```
/enhance-implementation 2026-03-18_01-baby-profile-photo "Add missing audio validation and improve error messaging"
```

---

## Step 0 — Locate Implementation File

Search for `.agents/implementation/[implementation-name].md` (where `[implementation-name]` matches `YYYY-MM-DD_NN-<slug>`).

**If not found**, stop and inform the user. Do not proceed without the implementation file.

**If found but `status: done` is not set**, stop and inform the user that only completed implementations can be enhanced. Suggest calling `/implement` if work is still in progress.

---

## Step 1 — Refine the Change Description

Run `/refine` on the user-provided `[change-description]` to strengthen it according to project standards:

1. Use the `/refine` skill with the description as the prompt.
2. Ask the user to confirm the refined description.
3. Record the refined description for use in changelog and commit messages.

---

## Step 2 — Review Implementation Context

Read the implementation file and all related plan documents:

- `.agents/implementation/[implementation-name].md` — scope, changes made, design decisions.
- The plan files referenced in the implementation (design, architecture, prompts, research).

Understand:
- What was originally delivered.
- What design decisions were made.
- What files were modified.
- Any constraints or assumptions.

---

## Step 3 — Locate Related Plan Files

Find all plan documents related to this implementation by reading the `plan:` field in the implementation file.

If plan files exist and relate to the enhancement (e.g., design documents that need updates), keep them ready for Step 5.

---

## Step 4 — Apply the Enhancement

Execute the improvement described in the refined change description:

1. **Create a git worktree** (if not already in one) to isolate your work:
   ```
   git worktree add .worktrees/enhance-[implementation-name] -b enhance/[implementation-name]
   ```

2. **Modify files** as needed to deliver the enhancement. Follow all repository code standards from `.agents/standards/`.

3. **Write or update tests** to cover the enhancement. Coverage target: 99% lines, 95% functions/branches/statements.

4. **Run `npm run ci`** to verify the enhancement passes all quality gates.

---

## Step 5 — Update Plan Documents (If Necessary)

If the enhancement changed architectural decisions, design patterns, or acceptance criteria:

1. **Review all related plan files** from Step 3.
2. **Update** any design or architecture documents that now reflect the enhancement.
3. **Preserve superseded decisions** — mark old decisions as "superseded by 2026-03-20_01-enhance-baby-profile-photo" rather than deleting them.

---

## Step 6 — Update Implementation File

Update `.agents/implementation/[implementation-name].md`:

1. Add a new `## Enhancements` section (or append to existing one) with:
   - Date of enhancement
   - Refined description of what was improved
   - Files modified by this enhancement
   - Link to related plan updates (if any)

Example:
```markdown
## Enhancements

### 2026-03-20 — Audio Validation & Error Messaging

- **Description:** Added missing audio file MIME validation and improved error messaging for unsupported formats.
- **Files Modified:** `src/services/assetService.ts`, `src/types/asset.ts`, `src/i18n/en-US.ts`, `src/i18n/pt-BR.ts`
- **Plan Updates:** Updated `src/types/asset.ts` MIME validation constraints in design document.
```

---

## Step 7 — Create Changelog Entry

Add a new entry to `.agents/AGENTS-CHANGELOG.md` (at the top, following the format `### YYYY-MM-DD_N`):

```markdown
### 2026-03-20_1

**[fix/feature] Enhance [original-implementation-name]: [refined-description]**

- List specific improvements made
- Reference the related implementation (e.g. "Builds on 2026-03-18_01-baby-profile-photo")
- Note any plan documents updated
```

Use tags like `[fix]`, `[feature]`, or `[refactor]` as appropriate.

---

## Step 8 — Commit and Close Enhancement

1. **Stage changes:**
   ```
   git add -A
   ```

2. **Commit with message:**
   ```
   [tag] Enhance [implementation-name]: [refined-description] (apsc - ce)

   - Change 1
   - Change 2

   Relates to: 2026-03-18_01-baby-profile-photo
   Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
   ```

3. **Clean up worktree** (if one was created):
   ```
   git worktree remove .worktrees/enhance-[implementation-name]
   ```

4. **Push the enhancement branch** and let the user decide on next steps (PR, merge, etc.).

---

## Decision Handling

If a major ambiguity is encountered during enhancement:

1. **Pause immediately.** Do not guess.
2. Present the decision point clearly with 2–4 options.
3. Explain tradeoffs.
4. Ask the user to choose before resuming.

---

## Output Format

### 1. Enhancement Scope
State what improvement is being made and which files will be affected.

### 2. Implementation Steps
Numbered breakdown of the enhancement steps before writing any code.

### 3. Questions / Decisions
List any blocking questions or unresolved decisions. If none, write "None — proceeding."

### 4. Enhancement Result
Code changes and updates, organized by file.

### 5. Plan Document Updates
If plan files were updated, summarize the changes and reasoning.

### 6. Changelog Entry
The entry added to `.agents/AGENTS-CHANGELOG.md`.
