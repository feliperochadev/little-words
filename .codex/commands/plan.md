# /plan — Design & Architecture Planning

Call this command **before making any big or core change** to the codebase. It produces one or both of:

- A **Design document** in `.agents/plan/design/` describing what to build and how.
- An **Architecture Decision Record (ADR)** in `.agents/plan/architecture/` capturing a significant architectural choice.

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
| Both (e.g., new feature that also requires an architectural choice) | Both |

---

## Step 3A — Write a Design Document

1. Copy `.agents/plan/design/DESIGN-TEMPLATE.md` to `.agents/plan/design/DESIGN-<kebab-slug>.md`.
2. Fill in every section. Leave `## Open Questions` items as checkboxes if unresolved.
3. Save the file. Reference it in the task description or changelog entry.

**Naming convention:** `DESIGN-<feature-slug>.md` — e.g., `DESIGN-google-drive-backup.md`, `DESIGN-word-import-preview.md`.

---

## Step 3B — Write an Architecture Decision Record (ADR)

1. Determine the next ADR number by listing files in `.agents/plan/architecture/` and incrementing the highest `ADR-NNNN` prefix (ignore `ADR-TEMPLATE.md`).
2. Copy `.agents/plan/architecture/ADR-TEMPLATE.md` to `.agents/plan/architecture/ADR-<NNNN>-<kebab-slug>.md`.
3. Fill in all sections. Set **Status** to `Proposed` initially.
4. Once the approach is agreed upon (or self-approved for simple cases), update **Status** to `Accepted`.

**Naming convention:** `ADR-0001-use-expo-sqlite.md`, `ADR-0002-file-based-navigation.md`.

---

## Step 4 — Link Plan to Implementation

Before starting implementation:

- Add a reference to the design/ADR file in your first commit message or changelog entry.
- If the design has **Open Questions**, resolve them before writing production code.
- If the ADR status remains `Proposed`, do not merge the implementation until it is `Accepted`.

---

## Step 5 — Keep Plans Updated

- If implementation diverges from the plan, update the design doc or add a superseding ADR.
- Mark superseded ADRs with `Status: Superseded by ADR-XXXX`.
- Plans are living documents — they must reflect the current state of the system.
