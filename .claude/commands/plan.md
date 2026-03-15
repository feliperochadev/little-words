# /plan — Design & Architecture Planning

Call this command **before making any big or core change** to the codebase. It produces one or more of:

- A **Prompt record** in `.agents/plan/prompts/` capturing the original and refined request.
- A **Design document** in `.agents/plan/design/` describing what to build and how.
- An **Architecture Decision Record (ADR)** in `.agents/plan/architecture/` capturing a significant architectural choice.
- **Research documents** in `.agents/plan/research-documents/` containing supporting analysis.

> **⛔ PLANNING ONLY — NO IMPLEMENTATION.**
> `/plan` must ONLY produce documents in `.agents/plan/`. It must NEVER proceed to implementation, write production code, install dependencies, or create test files. Implementation requires an explicit user request — preferably via `/implement [plan-name]`. This rule applies to ALL agents regardless of mode (fleet, autopilot, or interactive). No agent may self-trigger implementation after planning.

---

## When to Run `/plan`

Run `/plan` whenever the change involves any of the following:

- Adding or replacing a core module (database schema, navigation, i18n, auth, sync)
- Changing a shared utility used by 3+ screens or components
- Introducing a new external dependency
- Changing data flow or state management patterns
- Any feature that will touch ≥ 5 files or require ≥ 3 changelog categories

For small, self-contained bug fixes or additions of a single UI element, `/plan` is optional but encouraged.

---

## Step 0 — Refine the Prompt

Before any scoping or planning work begins, run `/refine` on the user's original request.

1. Run `/refine` against the full original prompt as provided by the user.
2. Determine the plan slug using the same `YYYY-MM-DD_NN-<slug>` naming convention that will be used for the resulting design/ADR/research output.
3. Save the prompt record to `.agents/plan/prompts/YYYY-MM-DD_NN-<slug>.md` using this template:

```markdown
# Prompt — YYYY-MM-DD_NN-<slug>

## Original Prompt
<paste the user's original prompt verbatim>

## Refined Prompt
<paste the full output of /refine — all five sections>
```

4. Use the **Refined Prompt** as the basis for all subsequent planning steps.

**Naming convention mirrors the plan output:** if the design doc will be `2026-03-11_01-google-drive-backup.md`, the prompt file is `.agents/plan/prompts/2026-03-11_01-google-drive-backup.md`.

---

## Step 1 — Clarify Scope

Ask the user (or infer from context) the following:

1. What problem is being solved?
2. What parts of the codebase are affected?
3. Are there known constraints (performance, backwards compatibility, native-only guards)?
4. Does this change introduce a new architectural pattern or just extend an existing one?

---

## Step 2 — Determine Output Type

| Change type | Output needed |
|-------------|--------------|
| New feature with defined UI/data flow | Design doc |
| Decision between two or more technical approaches | ADR |
| Extensive analysis, benchmarks, or existing code audits | Research docs |
| Both (e.g., new feature that also requires an architectural choice) | Both |

---

## Step 3A — Write a Design Document

1. Copy `.agents/plan/design/DESIGN-TEMPLATE.md` to `.agents/plan/design/YYYY-MM-DD_NN-<slug>.md`.
2. Fill in every section. Leave `## Open Questions` items as checkboxes if unresolved.
3. Save the file. Reference it in the task description or changelog entry.

**Naming convention:** `2026-03-11_01-google-drive-backup.md`, `2026-03-11_02-word-import-preview.md` (where `NN` is a daily sequence number).

---

## Step 3B — Write an Architecture Decision Record (ADR)

1. Determine the next sequence number `NN` for the current date by checking existing files in `.agents/plan/architecture/`.
2. Copy `.agents/plan/architecture/ADR-TEMPLATE.md` to `.agents/plan/architecture/YYYY-MM-DD_NN-<slug>.md`.
3. Fill in all sections. Set **Status** to `Proposed` initially.
4. Once the approach is agreed upon (or self-approved for simple cases), update **Status** to `Accepted`.

**Naming convention:** `2026-03-11_01-use-expo-sqlite.md`.

---

## Step 3C — Store Research Documents

If the planning phase generates multiple analysis files (audits, logs, benchmarks):

1. Create a subdirectory `.agents/plan/research-documents/YYYY-MM-DD_NN-<slug>/` (matching the ADR or Design slug).
2. Move all supporting markdown files into that folder.
3. Do not leave research files in the project root.

---

## Step 4 — Stop and Report

After producing the plan documents, **stop**. Do not begin implementation.

- Present a summary of what was planned and which documents were created.
- Remind the user they can start implementation with `/implement [plan-name]`.
- If the design has **Open Questions**, flag them as blockers that must be resolved before implementation.
- If the ADR status remains `Proposed`, note that it must be `Accepted` before implementation begins.

> **The `/plan` command ends here.** Any implementation must be triggered separately by the user.

---

## Step 5 — Keep Plans Updated

- If implementation diverges from the plan, update the design doc or add a superseding ADR.
- Mark superseded ADRs with `Status: Superseded by ADR-XXXX` (using the new naming convention if applicable).
- Plans are living documents — they must reflect the current state of the system.
