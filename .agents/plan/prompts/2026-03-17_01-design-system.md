# Prompt — 2026-03-17_01-design-system

## Original Prompt

/plan We need to create a Design system for the app, using a librery of components, rules, guidelines for consistent design with component library with reusable components like buttons, forms, cards, navigation patterns, effects cosistent between screens, menus, breadcrumbs, etc. With adaptive Design, Touch Target. Thinking on a good conversion rate, task sucess rate, retention and time to complete the task. Think about the persona that you use, mostly parents especially mothers of a small toddler, so she is stress already, which means that the app needs to look and feel pleasant, calm, and made with care for her to use. I really like the colours and pastel color tones that we already have, but we need to be consistent, the buttons instead of generic emojis needs to be unique for our visual identity, making a great contrast with our background, cute and easy to use. Create: 1- An ui change plan to apply this Design System 2- give me 2 mock options. 3- create an way to implement those components where I can add and select variants of all the Design System in a easy way via config settings (on code package.json or other internal config file, not for the end user). 4- plan 2 variants for Design System for the app

## Refined Prompt

### 1. Prompt Analysis
- **Intent:** Plan a full design system for Palavrinhas — covering tokens, component library, visual identity, and a developer-facing theme-switching mechanism — with two mockable variants and a concrete UI change plan.
- **Weaknesses or ambiguities:**
  - "library of components" — unclear if this means a new custom library, wrapping existing `UIComponents.tsx`, or adopting an external RN component library
  - "menus, breadcrumbs" — these patterns don't exist in the current app (tab navigation, no breadcrumbs); unclear if they should be added or if this is aspirational
  - "2 mock options" — format unspecified
  - "config settings (on code package.json or other internal config file)" — ambiguous mechanism
  - "effects consistent between screens" — undefined: animations? shadows? blur? haptics?
  - "unique buttons instead of generic emojis" — unclear if this means replacing emoji with custom icons (SVG), or redesigning button shape/color/style
  - "2 variants for Design System" — no differentiation criteria given
  - "adaptive Design, Touch Target" — no minimum touch target size specified
  - No mention of dark mode intent
  - "conversion rate, task success rate, retention" — no baseline metrics or measurement method

- **Missing constraints or context:**
  - The app's current component inventory (`UIComponents.tsx`, `theme.ts`) should be the starting point
  - Android-primary target affects touch target rules, shadow rendering, and font rendering
  - Expo SDK 55 / React Native 0.83.2 constraints
  - No mention of typography system
  - No mention of spacing/layout grid
  - Accessibility baseline not specified

### 2. Edge Cases
- Existing screens have hardcoded colors from `theme.ts` — switching variants requires all color references go through the theme object
- `CATEGORY_COLORS` and `CATEGORY_EMOJIS` are part of visual identity; variants must address them
- Settings screen lets users pick categories with colors — variant switching must not break user-visible color semantics
- Two design system variants must remain consistent in structure (same token names, different values)

### 3. Suggested Improvements
- Specify the component audit scope: start from `UIComponents.tsx` and `theme.ts`
- Define "mock options" format: markdown tables + color swatches + component descriptions
- Name the two variants with differentiating intent
- Define the variant config mechanism precisely: a TypeScript file
- Set touch target minimum: 48x48dp (Android Material baseline)
- Specify icon strategy for buttons
- Scope out breadcrumbs/menus
- Add typography and spacing tokens to the design system scope

### 4. Clarifying Questions
1. Should the two design system variants differ in palette only or also in shape language?
2. Icon strategy: custom SVG icons or `@expo/vector-icons`?
3. Mock format: markdown description tables or visual artifact?
4. Is dark mode in scope?
5. Variant switching: one constant change or env var?

### 5. Refined Prompt
(See the full refined prompt in the plan document at `.agents/plan/ui-changes/2026-03-17_01-design-system.md`)
