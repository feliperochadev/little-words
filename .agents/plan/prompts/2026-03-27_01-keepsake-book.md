# Prompt — 2026-03-27_01-keepsake-book

## Original Prompt

See `keepsake-book.md` (project root) — the user provided a refined prompt file with `refined: true` frontmatter (refined at 2026-03-27 03:20:00 UTC). The `/refine` phase was skipped per the refined prompt convention.

## Resolved Open Questions

The following open questions from the refined prompt were resolved in conversation:

1. **Memories screen identity**: The feature lives in `app/(tabs)/memories.tsx`, NOT `progress.tsx`. The keepsake section goes above the timeline. Existing analytics in `progress.tsx` are unrelated.
2. **Word selection ordering**: Confirmed `words.date_added ASC` (child said it earliest).
3. **Editing scope**: v1 shows the first 3 words only. No word picker in v1. Structure must be flexible for future expansion (more photos, word selection).
4. **Persistence**: SQLite for metadata + file system for the rendered image. Survives app restarts.
5. **QR code**: Static bundled PNG is acceptable for v1.
6. **Decorative theme**: Fixed nursery palette for now (cream + stars/moon/bear), independent of sex-adaptive theme. Keep flexible for future themes.
7. **Empty slots**: If fewer than 3 words, adapt the layout for 2 or 1 photo — do NOT show empty dashed frames.
8. **Home screen memories card**: Simple small preview thumbnail if keepsake is generated. If not generated, show a text message ("no keepsake book created yet, enter memories to create one"). No separate mockup provided.
