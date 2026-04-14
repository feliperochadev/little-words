# Prompt — 2026-04-13_01-ux-improvements-part-2

## Original Prompt

Apply the changes in those areas:

Variant:
- Disable it while no words have been added, and when there is at least 1 word but no variant, use the default button in the middle for the first variant.
- Remove the tooltip about the variant being able to be closed as a tooltip.

New word modal:
- Disable save button until the person type at least 2 chars in the word box

Multiple places that has the card press to edit (words, variant):
- Add the edit button back to the cards and no longer make the cards clickable, use the same edit icon from midia screen but add a button with the icon and the word edit in the right. put the button in the top left.

Memories:
- Remove duplicate dates.

Media:
- Correct the size of the search bar keep the same size and conform with words and variants screens, also add this style/gap as a rule in the design system definitions.

## Refined Prompt

See `prompts/2026-04-13_ux-improvements-part-2.md` (refined: true, 2026-04-13).

### Key Clarifications Applied During Refinement

1. "default button in the middle" → primary action button centered in empty state, opening AddVariantModal
2. "icon and the word edit in the right. put the button in the top left" → button at top-right of card, containing pencil icon + "Edit" label (icon left, text right)
3. "remove duplicate dates" → consecutive same-date items in timeline show date header once
4. "add this style/gap as a rule" → define a reusable spacing token in design system
