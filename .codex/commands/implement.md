# /implement [implementation-name] — Structured Plan Implementation

Implement a specific part of an existing plan in a structured and safe way.

`[implementation-name]` must match the `YYYY-MM-DD_NN-<slug>` of a plan that already exists in `.agents/plan/`.

---

## Step 0 — Check for Concurrent Implementations

Before doing anything else, scan `.agents/implementation/` for any `.md` files (excluding `TEMPLATE.md`) that have `status: in progress`.

**If one or more in-progress implementations are found:**

1. Do **not** work directly on the current branch — another agent is already modifying files there.
2. Create a new git worktree from the current branch:
   ```
   git worktree add .worktrees/[implementation-name] -b impl/[implementation-name]
   ```
3. All subsequent work in Steps 1–4 takes place inside that worktree.
4. Record the worktree path in the tracking file (`worktree: .worktrees/[implementation-name]`).
5. When done, merge the worktree branch back (or open a PR) and remove the worktree with `git worktree remove .worktrees/[implementation-name]`.

**If no in-progress implementations are found:** proceed on the current branch normally.

---

## Step 1 — Locate the Plan

Search for files matching the given `[implementation-name]` slug across all plan subdirectories:

| Folder | File pattern |
|--------|-------------|
| `.agents/plan/prompts/` | `[implementation-name].md` |
| `.agents/plan/design/` | `[implementation-name].md` |
| `.agents/plan/architecture/` | `[implementation-name].md` |
| `.agents/plan/research-documents/` | `[implementation-name]/` (directory) |

If no plan files are found, stop and inform the user. Do not proceed without a matching plan.

**Create the implementation tracking file** at `.agents/implementation/[implementation-name].md` using the template from `.agents/implementation/TEMPLATE.md`. Set:
- `status: in progress`
- `started: <today's date>`
- `agent: <your vendor name>`
- `plan:` pointing to the plan file(s) found above
- `worktree: false` (or the worktree path if Step 0 created one)

---

## Step 2 — Review All Plan Artifacts

Read every file found in Step 1 before writing any code. Build a complete understanding of:

- The **refined prompt** (from `prompts/`) — the authoritative statement of intent.
- The **design** — UI layout, data flow, component breakdown, acceptance criteria.
- The **architectural decisions** — patterns, constraints, chosen approaches, rejected alternatives.
- The **research** — benchmarks, audits, or analysis that informed decisions.

**As you review, identify any open questions** related to architecture, design, or behaviour. Document these explicitly before moving to Step 3.

---

## Step 3 — Ask About Open Architecture &amp; Design Questions

If you identify **any open questions** about architecture, design decisions, or ambiguities in expected behaviour:

1. **Pause and list the questions clearly** with context from the plan.
2. **Provide 2–4 concrete options** for each question (preferably using `ask_user` with a `choices` array).
3. **Wait for user input** before proceeding.
4. **Record the decisions** in the implementation tracking file (`.agents/implementation/[implementation-name].md`) under a new `## Design Decisions Made` section.

If the plan is unambiguous and complete, write "No open questions — plan is complete and clear."

---

## Step 4 — Identify Implementation Scope

Determine exactly what this `/implement` invocation will deliver:

- If the plan covers multiple independent features, identify which one the user is requesting.
- If `[implementation-name]` is ambiguous (matches multiple plan entries), ask the user to clarify before proceeding.
- Define the output boundary: what files will be created or modified, what will be left for a future `/implement` call.

---

## Step 4 — Execute Implementation

Follow these rules strictly:

- **Adhere to plan documents.** Do not deviate from architectural decisions or design specs without explicit user approval.
- **Break work into clear, atomic steps.** Complete one step before moving to the next.
- **Explain major design choices** inline as you implement — especially where the plan left room for interpretation.
- **Follow all repository code standards** in `.agents/standards/` relevant to the files being changed.
- **Write tests** for every change (unit, integration, or screen tests as appropriate). Coverage target: 99% lines, 95% functions/branches/statements.
- **Run `npm run ci`** after implementation is complete. Do not consider the task done until CI passes.

---

## Step 5 — Execute Implementation

Follow these rules strictly:

- **Adhere to plan documents.** Do not deviate from architectural decisions or design specs without explicit user approval.
- **Break work into clear, atomic steps.** Complete one step before moving to the next.
- **Explain major design choices** inline as you implement — especially where the plan left room for interpretation.
- **When encountering ambiguities during implementation**, pause immediately and ask the user with options (do not guess).
- **Follow all repository code standards** in `.agents/standards/` relevant to the files being changed.
- **Write tests** for every change (unit, integration, or screen tests as appropriate). Coverage target: 99% lines, 95% functions/branches/statements.
- **Run `npm run ci`** after implementation is complete. Do not consider the task done until CI passes.

---

## Step 6 — Review and Update Plan Documents

Once CI passes, **before marking the implementation done**:

1. Re-read all plan documents created in Step 1.
2. **Identify any new information discovered during implementation** that was not in the plan:
   - Architectural decisions made mid-implementation (from Step 3 questions or Step 5 ambiguities).
   - Design choices that evolved as code was written.
   - New constraints, edge cases, or accepted tradeoffs.
   - Changes to file structure, API, or data model.
3. **Update all related plan documents** to reflect these discoveries:
   - `design/` — update UI/component specs, data flows, acceptance criteria.
   - `architecture/` — update architectural decisions, patterns, or rejected alternatives.
   - `prompts/` — update the refined prompt if scope changed.
   - Implementation tracking file — record all decisions under `## Design Decisions Made`.
4. **Ensure consistency** across all updated documents so future readers understand the actual implementation, not just the original plan.

---

## Step 7 — Mark Implementation as Done

Once CI passes and plan documents are updated, update `.agents/implementation/[implementation-name].md`:

1. Set `status: done`.
2. Fill in the `## Changes` table with every file that was created, modified, or deleted.
3. Add a one-sentence `## Summary` describing what was delivered.
4. Ensure `## Design Decisions Made` section is complete with all decisions from Steps 3 and 5.

If a worktree was used, merge or open a PR for the worktree branch, then clean it up:
```
git worktree remove .worktrees/[implementation-name]
```

---

## Decision Handling

If a major ambiguity or unresolved architectural decision is encountered mid-implementation:

1. **Pause immediately.** Do not guess or proceed unilaterally.
2. Present the decision point clearly.
3. Provide 2–4 concrete options.
4. Explain the tradeoffs of each.
5. Ask the user to choose before resuming.

---

## Output Format

### 1. Implementation Scope
State which part of the plan is being implemented and what files will be affected.

### 2. Implementation Steps
Numbered step-by-step breakdown of what will be done before writing any code.

### 3. Questions / Decisions
List any blocking questions or unresolved architectural decisions that must be answered before or during implementation. If none, write "None — proceeding."

### 4. Implementation Result
The actual code changes, clearly organized by file. Reference the relevant plan section for each major decision made.
