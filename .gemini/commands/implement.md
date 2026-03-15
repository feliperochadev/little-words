# /implement [implementation-name] — Structured Plan Implementation

Implement a specific part of an existing plan in a structured and safe way.

`[implementation-name]` must match the `YYYY-MM-DD_NN-<slug>` of a plan that already exists in `.agents/plan/`.

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

---

## Step 2 — Review All Plan Artifacts

Read every file found in Step 1 before writing any code. Build a complete understanding of:

- The **refined prompt** (from `prompts/`) — the authoritative statement of intent.
- The **design** — UI layout, data flow, component breakdown, acceptance criteria.
- The **architectural decisions** — patterns, constraints, chosen approaches, rejected alternatives.
- The **research** — benchmarks, audits, or analysis that informed decisions.

---

## Step 3 — Identify Implementation Scope

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
