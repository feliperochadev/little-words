# /refine — Prompt Refinement

Analyze and strengthen a prompt provided by the user to make it more precise, complete, and actionable.

---

## Steps

1. **Analyze** the prompt for clarity, completeness, and potential ambiguities.
2. **Identify** missing constraints, assumptions, or edge cases.
3. **Suggest** improvements that make the prompt more precise and actionable.
4. **Ask** clarifying questions if any important information is missing.
5. **Provide** an improved version of the prompt.
6. **Always save** the refined prompt to `.agents/refined-prompts/YYYY-MM-DD_NN-<slug>.md` automatically (no user confirmation needed). Use the next available sequence number `NN` for the current date. Do NOT ask whether to save — always do it.

---

## Output Format

### 1. Prompt Analysis
- **Intent:** What the prompt is trying to accomplish.
- **Weaknesses or ambiguities:** Parts that are vague, contradictory, or open to interpretation.
- **Missing constraints or context:** Scope limits, format requirements, environment assumptions, or preconditions that are absent.

### 2. Edge Cases
List potential edge cases or failure scenarios the prompt should explicitly account for.

### 3. Suggested Improvements
Bullet points explaining concrete changes that would make the prompt stronger.

### 4. Clarifying Questions
Questions that should be answered before execution (omit this section if none).

### 5. Refined Prompt
The improved version of the prompt, ready to be used as-is.

### 6. Save to File
Save the refined prompt to `.agents/refined-prompts/YYYY-MM-DD_NN-<slug>.md` with the following frontmatter:

```markdown
---
refined: true
refined_at: YYYY-MM-DD HH:MM:SS UTC
refined_by: Codex
---

# [Refined Prompt Title]

[Refined prompt content...]
```

Confirm to the user: "Saved to `.agents/refined-prompts/YYYY-MM-DD_NN-<slug>.md`."
