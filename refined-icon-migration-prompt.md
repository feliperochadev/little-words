# Refined Prompt — Replace Generic Emojis with Design-System Icons

Continue the icon-system cleanup by replacing remaining generic emoji-based UI chrome with unique Ionicons that follow the app design system.

## Goal
Remove emoji icons used as interface chrome in the following areas and replace them with semantically appropriate, non-emoji icons from `@expo/vector-icons/Ionicons`, while preserving existing behavior and layout:

- `app/(tabs)/home.tsx`
  - category modal
  - recent words section
  - monthly progress section
- `app/(tabs)/words.tsx`
  - top-left books icon
  - sort-by calendar icon
- `app/(tabs)/variants.tsx`
  - analogous books/calendar style icons used in title/sort UI
- `app/(tabs)/settings.tsx`
  - top header gear icon
  - import modal trigger/related UI icon
  - export modal trigger/related UI icon

## Requirements
1. Audit the listed files for UI-chrome emojis and replace them with Ionicons (no emoji for navigation, actions, status, section headers, filters, or controls).
2. Use icons that are unique per purpose (avoid reusing the same icon for unrelated actions where better semantic options exist).
3. Keep current UX and logic unchanged:
   - no copy/text changes unless needed for accessibility labels,
   - no structural refactors unrelated to icon replacement,
   - preserve spacing/alignment/interaction behavior.
4. Ensure icon colors are theme-adaptive using existing design-system patterns (`useTheme()` / runtime `colors`) rather than static palette constants for runtime surfaces.
5. Keep category/user content emojis intact when they represent actual content data, not UI chrome.
6. Add or update tests covering changed surfaces (at minimum screen/integration tests for the touched files) to verify:
   - expected Ionicon names render,
   - key icon colors remain valid for blossom and breeze contexts where applicable.
7. Run `npm run ci` and resolve failures.
8. Update `.agents/implementation/2026-03-17_02-sex-adaptive-theme-icon-sweep.md` with what was completed in this icon cleanup follow-up.

## Acceptance Criteria
- No generic UI-chrome emojis remain in the listed surfaces.
- All replacements use Ionicons and align with app design-system conventions.
- Existing UX/behavior remains unchanged.
- Tests updated and passing.
- `npm run ci` exits successfully.
