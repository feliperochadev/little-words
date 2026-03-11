# /plan — Design & Architecture Planning

Call this command **before making any big or core change** to the codebase. It produces one or more of:

- A **Design document** in `.agents/plan/design/` describing what to build and how.
- An **Architecture Decision Record (ADR)** in `.agents/plan/architecture/` capturing a significant architectural choice.
- **Research documents** in `.agents/plan/research-documents/` containing supporting analysis.

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

## Step 4 — Link Plan to Implementation

Before starting implementation:

- Add a reference to the design/ADR file in your first commit message or changelog entry.
- If the design has **Open Questions**, resolve them before writing production code.
- If the ADR status remains `Proposed`, do not merge the implementation until it is `Accepted`.

---

## Step 5 — Keep Plans Updated

- If implementation diverges from the plan, update the design doc or add a superseding ADR.
- Mark superseded ADRs with `Status: Superseded by ADR-XXXX` (using the new naming convention if applicable).
- Plans are living documents — they must reflect the current state of the system.
