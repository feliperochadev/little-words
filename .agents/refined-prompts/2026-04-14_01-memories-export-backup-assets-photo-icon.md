---
refined: true
refined_at: 2026-04-14 13:56:57 UTC
refined_by: Codex
---

# Memories: export backup assets and photo icon alignment

Update the `memories` feature with two related fixes:

1. Include the keepsake book in the export backup assets output.
2. Update the JSON metadata that controls backup/export contents so it also includes the keepsake book.
3. Fix the photo attachment icon positioning so it is rendered inside the photo frame, aligned visually with the frame instead of sitting outside or misaligned.

Requirements:

- Make the export and metadata changes consistent with the existing backup format and naming conventions.
- Preserve backward compatibility where possible so existing exports continue to work.
- Update or add tests for both the export/metadata behavior and the photo icon layout.
- Keep the UI change minimal and consistent with the current design system.

Acceptance criteria:

- The keepsake book appears in the exported backup assets.
- The JSON metadata includes the keepsake book entry.
- The photo icon sits inside the photo frame and is visually centered/aligned.
- Tests cover the changed behavior.
