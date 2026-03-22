# Progress Analytics Screen — Implementation Specification

**Created:** 2026-03-22
**Status:** Refined Specification
**Related:** `app/(tabs)/home.tsx`, new `app/(tabs)/progress.tsx`

---

## Overview

Refactor the dashboard to create a dedicated progress screen for detailed analytics, move complex charts from home, and simplify the home screen layout with improved stat card formatting.

---

## Changes to Home Screen (`app/(tabs)/home.tsx`)

### 1. Refactor Stat Cards Layout

**Current layout:** Icon on top, label text below, number below that

**New layout:**
- Icon + label text on same horizontal line (aligned top-left)
- Numeric value on line below, aligned right
- Maintains visual hierarchy while reducing vertical space

**Affected components:** All 5 StatCard components:
- Total Words
- Total Variants
- Words Today
- Words This Week
- Words This Month

**Visual mockup:**
```
┌─────────────────────────┐
│ 📝 Total Words      42  │
│                         │
├─────────────────────────┤
│ 💬 Variants        128  │
│                         │
└─────────────────────────┘
```

### 2. Remove Chart Sections

Delete the following sections from home screen:
- **Monthly progress bar chart** (last 6 months visualization)
- **Category breakdown section** (emoji + category counts + progress bars)
- **Recent words cloud** (word chips)

### 3. Add Navigation Button

**Location:** Directly below the stat cards grid

**Button text:** "See the Progress"

**Action:** Navigate to `/progress` screen

**Styling:**
- Use primary color
- Match existing button patterns in the app
- Full width or appropriate width TBD with design

---

## Create Progress Screen (`app/(tabs)/progress.tsx`)

### File Structure

- **Path:** `app/(tabs)/progress.tsx`
- **Tab visibility:** Hidden from tab bar (use `href: null` in _layout.tsx, like Settings and Media screens)
- **Accessibility:** Via "See the Progress" button on home screen
- **Navigation:** Back button returns to home screen

### Screen Icon

Use Ionicons: `trending-up-outline` (size 24, color: primary)

### Content (Top to Bottom)

#### 1. Monthly Progress Chart
Moved from home — last 6 months bar chart showing word count per month

#### 2. Category Breakdown Section
Moved from home — categories with emoji, count, and progress bars

#### 3. Recent Words Section
Moved from home — word chips displayed in cloud layout

#### 4. Coming Soon Placeholder Section

```
Title:    📊 More Detailed Metrics Coming Soon
Subtitle: Percentile rankings, vocabulary milestones,
          pronunciation accuracy, and speaking milestones
          will be available in a future update.
```

**Styling:**
- Text color: `colors.textMuted` or gray (#999)
- Font style: Italic
- Opacity: 0.7–0.8
- Font size: 14–16px
- Centered alignment
- Wrapped in a Card or light container
- Icon emoji or Ionicons disabled icon

---

## Navigation Flow

1. **Home Screen:** User taps "See the Progress" button
2. **Progress Screen:** Displays all three moved sections + placeholder
3. **Back:** Returns to home screen (standard back button or gesture)

**Alternative:** If MoreTabButton supports second-level navigation, progress could also be accessible from:
- More tab popup → "Progress" option
- *Confirm with designer which approach to use*

---

## i18n Keys Required

Add to `src/i18n/en-US.ts` and `src/i18n/pt-BR.ts`:

```typescript
dashboard: {
  // ...existing keys...
  seeProgress: "See the Progress",           // Button text on home
  comingSoonTitle: "More Detailed Metrics Coming Soon",
  comingSoonDesc: "Percentile rankings, vocabulary milestones, pronunciation accuracy, and speaking milestones will be available in a future update.",
}
```

**Portuguese (pt-BR) equivalents:**
- `seeProgress`: "Ver o Progresso"
- `comingSoonTitle`: "Métricas Mais Detalhadas em Breve"
- `comingSoonDesc`: "Rankings de percentil, marcos de vocabulário, precisão de pronúncia e marcos de fala estarão disponíveis em uma atualização futura."

---

## Component Changes

### StatCard Refactor

**File:** `src/components/UIComponents.tsx`

**Change:** Update StatCard to support new layout (icon + label on one line, value below)

**Considerations:**
- Backward compatible? (i.e., keep old props optional)
- Or create new variant component?
- Confirm with code review

### No New Components Required

- Monthly progress chart: Reuse existing code
- Category breakdown: Reuse existing code
- Recent words: Reuse existing code
- Coming soon section: Simple Card + Text

---

## Testing Requirements

### Unit Tests

- **StatCard layout:** Verify icon and label render on same line
- **StatCard value:** Verify number renders on line below
- **Navigation button:** Verify "See the Progress" button renders and navigates to `/progress`

### Integration Tests

- **Progress screen:** Renders all three moved sections (charts, categories, recent words)
- **Placeholder section:** Renders coming soon text with correct styling
- **Data sync:** Stats refresh correctly when navigating back to home

### E2E Tests (Maestro)

- Home → Progress → Home navigation cycle works
- Progress screen displays all content without layout shifts
- Charts render with data (if data exists) or graceful empty state

### Edge Cases

- **Empty data:** What if no monthly progress, categories, or recent words? Graceful empty states needed.
- **Large datasets:** Monthly progress with 24+ months — scrollable horizontally or paginate?
- **Orientation changes:** Layout responsive on landscape/portrait
- **Delete while on progress:** Auto-refresh stats if user deletes a word

---

## Performance Considerations

- Moving charts to separate screen may improve home screen initial load time
- Consider memoizing chart components if they're expensive to render
- Lazy-load progress screen components if needed

---

## Design Notes

- **Color consistency:** Use theme colors throughout
- **Spacing:** Maintain 20px padding on home, consistent with existing cards
- **Typography:** Match existing dashboard text styles
- **Animations:** Preserve any existing transitions/animations from home screen

---

## Implementation Checklist

- [ ] Refactor StatCard layout in UIComponents.tsx
- [ ] Add "See the Progress" button to home.tsx
- [ ] Remove three chart sections from home.tsx
- [ ] Create progress.tsx screen with moved content
- [ ] Add progress to tab navigator (hidden from bar)
- [ ] Add i18n keys (en-US and pt-BR)
- [ ] Update tests
- [ ] Visual review with design
- [ ] Manual QA on Android and iOS (if available)
- [ ] Merge to main via PR

---

## Acceptance Criteria

✅ Home screen loads faster (three heavy sections moved)
✅ StatCard layout refactored as specified
✅ Progress screen accessible via "See the Progress" button
✅ All three moved sections display correctly on progress screen
✅ Coming soon placeholder visible and properly styled
✅ Navigation (home ↔ progress) works seamlessly
✅ All tests pass (unit, integration, E2E)
✅ i18n keys added for both en-US and pt-BR
✅ No regressions in existing functionality

---

**Questions or clarifications?** Refer to the analysis sections above or reach out to the team.
