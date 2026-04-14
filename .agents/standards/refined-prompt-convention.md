# Refined Prompt Convention

## Overview

Refined prompts are prompts that have been analyzed, strengthened, and documented using the `/refine` skill. This convention ensures prompts are clear, complete, and actionable before planning or implementation begins.

## Refined Prompt Storage

All refined prompts must be saved to **`.agents/refined-prompts/`** — the canonical location for all `/refine` output across all agents. File naming: `YYYY-MM-DD_NN-<slug>.md` (same convention as plans).

Do NOT save refined prompts to the project root, `.agents/plan/prompts/`, or any other location.

## Refined Prompt Marker

**When using `/refine` to refine a prompt:**
- The `/refine` skill outputs an improved version of the prompt
- **Always save** to `.agents/refined-prompts/YYYY-MM-DD_NN-<slug>.md` automatically — no user confirmation needed
- Add a YAML frontmatter block at the top with the following marker:

```markdown
---
refined: true
refined_at: YYYY-MM-DD HH:MM:SS UTC
refined_by: [Claude|Codex|Gemini]
---

# [Refined Prompt Title]

[Refined prompt content...]
```

### Example

```markdown
---
refined: true
refined_at: 2026-03-23 14:30:00 UTC
refined_by: Claude
---

# Export/Import Enhancement — Full Backup with Media Assets

## Overview

Enhance the Export/Import feature in Settings to support full backup...
```

## /plan Usage with Refined Prompts

**When running `/plan` on a refined prompt or `.md` file:**

1. **Check for the `refined: true` marker** in the file's frontmatter
2. **If `refined: true` exists:**
   - Skip the refinement phase (don't re-run `/refine`)
   - Proceed directly to architecture/design planning
   - Reference the refined prompt in the plan document
3. **If `refined: true` does NOT exist:**
   - Treat it as an unrefined prompt
   - Optionally run `/refine` first (recommended for complex features)
   - Then proceed to `/plan`

### Pseudo-code (Agent Implementation)

```typescript
// When /plan is invoked on a .md file:
const promptFile = readFile(filePath);
const frontmatter = parseFrontmatter(promptFile);

if (frontmatter.refined === true) {
  console.log("✓ Prompt is refined. Skipping /refine phase.");
  proceedToArchitecturePlanning();
} else {
  console.log("⚠ Prompt is not refined. Consider running /refine first.");
  // Agent may suggest /refine or proceed with planning anyway
}
```

## Benefits

- **Efficiency:** Avoids re-analyzing already-refined prompts
- **Clarity:** Documents when a prompt was refined and by whom
- **Consistency:** All agents follow the same convention
- **Traceability:** Links refined artifacts to their source

## Workflow Example

### Without Refined Prompt
```
User: "Add a feature to export data"
  → /refine → Refine prompt
  → /plan → Plan based on refined prompt
  → /implement → Build feature
```

### With Refined Prompt
```
User: "Use EXPORT_IMPORT_ENHANCEMENT.md as the spec"
[File has refined: true marker]
  → /plan → Skip /refine, plan directly
  → /implement → Build feature
```

## Agent Responsibilities

All agents (Claude, Codex, Gemini) must:

1. **When using `/refine`:** Auto-save to `.agents/refined-prompts/YYYY-MM-DD_NN-<slug>.md` with the `refined: true` frontmatter marker. No user confirmation needed.
2. **When using `/plan` on a `.md` file:** Check for `refined: true` before processing
3. **When recommending `/refine`:** Suggest it for unrefined or unclear prompts
4. **When inheriting refined prompts:** Skip re-refinement and document the reuse
5. **Canonical save location:** Always `.agents/refined-prompts/` — never root, never `.agents/plan/prompts/` or elsewhere

## Notes

- Refined prompts are **NOT** editable after the marker is added — if changes are needed, remove the marker or create a new refined version
- The timestamp field helps track when the prompt was refined
- The `refined_by` field documents which agent performed the refinement (useful for multi-agent teams)
