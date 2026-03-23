# Design: Progress Analytics Screen

**Date:** 2026-03-22
**Status:** Draft
**Author:** Claude
**Related ADR:** N/A
**Spec:** `PROGRESS_SCREEN_SPEC.md`

---

## Problem Statement

The home screen is cluttered with five stat cards, a monthly progress bar chart, a category breakdown section, and a recent words cloud. This creates excessive scrolling and slow initial render. Users need a clean home screen with quick glanceable stats while still having access to detailed analytics.

## Goals

- Simplify the home screen to profile + compact stat cards + navigation CTA
- Create a dedicated progress screen for detailed analytics (charts, categories, recent words)
- Refactor StatCard to a more compact horizontal layout
- Add a "coming soon" section as a forward-looking placeholder for future metrics

## Non-Goals

- No new database queries or data models — reuse `useDashboardStats()` entirely
- No new dependencies — reuse existing `Card`, `Button`, Ionicons
- No changes to the More tab popup navigation (progress is accessed from home only)
- No horizontal pagination for monthly progress (keep the existing last-6-months slice)

---

## Design

### Overview

The change extracts three visual sections (monthly progress, category breakdown, recent words) from `home.tsx` into a new `progress.tsx` screen, adds a navigation button to link them, and refactors StatCard for a more compact horizontal layout.

### Component / Module Breakdown

| Component | Responsibility | File(s) |
|-----------|---------------|---------|
| `StatCard` (refactored) | Compact horizontal stat display | `src/components/UIComponents.tsx` |
| `DashboardScreen` (simplified) | Profile + stats + "See Progress" CTA | `app/(tabs)/home.tsx` |
| `ProgressScreen` (new) | Charts + categories + recent words + coming soon | `app/(tabs)/progress.tsx` |
| `TabLayout` (updated) | Register hidden progress tab | `app/(tabs)/_layout.tsx` |
| i18n catalogues (updated) | 3 new keys per locale | `src/i18n/en-US.ts`, `src/i18n/pt-BR.ts` |

### Data Flow

```
User taps "See the Progress" on Home
  → router.push('/(tabs)/progress')
  → ProgressScreen mounts
  → useDashboardStats() returns cached TQ data (or refetches if stale)
  → Monthly chart, category breakdown, recent words render
  → Coming soon placeholder renders (static)
```

The progress screen reuses the exact same `useDashboardStats()` hook. Since TQ has a 30s stale time and the home screen already fetches on focus, the data will typically be warm when the user navigates to progress.

```
User pulls-to-refresh on Progress screen
  → RefreshControl triggers refetch()
  → All sections update with fresh data
```

### Detailed Changes

#### 1. StatCard Refactor (`src/components/UIComponents.tsx`)

**Current layout** (vertical, centered):
```
  ┌──────────────┐
  │   [icon bg]  │
  │     42       │
  │  Total words │
  └──────────────┘
```

**New layout** (compact horizontal):
```
  ┌──────────────────────────┐
  │  [icon] Total words   42 │
  └──────────────────────────┘
```

Implementation:
- Change `statStyles.card` from `alignItems: 'center'` to `flexDirection: 'row'`, `alignItems: 'center'`
- Icon background shrinks: 48x48 → 36x36, icon size 22 → 18
- Label goes next to icon (flex: 1), left-aligned
- Value sits on the right, right-aligned
- Remove `marginBottom` from icon background
- Value font size: 28 → 24
- Remove the separate label line below value

**Props remain identical** — no API change for callers.

#### 2. Home Screen Simplification (`app/(tabs)/home.tsx`)

**Remove:**
- Monthly progress chart block (lines 128–152)
- Category breakdown block (lines 154–179)
- Recent words block (lines 181–202)
- Related styles: `chartCard`, `barChart`, `barItem`, `barWrapper`, `bar`, `barLabel`, `barValue`, `categoryRow`, `catEmoji`, `catInfo`, `catHeader`, `catName`, `catCount`, `progressBg`, `progressFill`, `wordCloud`, `wordChip`, `wordChipText`
- `visibleCategoryCounts` computed variable
- `MONTH_KEYS` array and `formatMonth` function (move to `dashboardHelpers.ts`)

**Add:**
- "See the Progress" button after the stats grid, when `stats?.totalWords > 0`:
```tsx
<TouchableOpacity
  style={[styles.seeProgressBtn, { backgroundColor: colors.primary }]}
  onPress={() => router.push('/(tabs)/progress')}
  testID="home-see-progress-btn"
>
  <Ionicons name="trending-up-outline" size={18} color={colors.textOnPrimary} />
  <Text style={[styles.seeProgressText, { color: colors.textOnPrimary }]}>
    {t('dashboard.seeProgress')}
  </Text>
</TouchableOpacity>
```

#### 3. Progress Screen (`app/(tabs)/progress.tsx`)

**Structure:**
```tsx
export default function ProgressScreen() {
  // useDashboardStats(), useI18n(), useTheme(), useCategoryName()
  // Same refresh pattern as home (RefreshControl)

  return (
    <SafeAreaView>
      <ScrollView refreshControl={...}>
        <ScreenHeader title="Progress" icon="trending-up-outline" />

        {/* Monthly Progress — moved from home */}
        {stats?.monthlyProgress.length > 0 && <MonthlyProgressCard />}

        {/* Category Breakdown — moved from home */}
        {visibleCategoryCounts.length > 0 && <CategoryBreakdownCard />}

        {/* Recent Words — moved from home */}
        {stats?.recentWords.length > 0 && <RecentWordsCard />}

        {/* Coming Soon placeholder */}
        <ComingSoonCard />
      </ScrollView>
    </SafeAreaView>
  );
}
```

The three moved sections retain their exact JSX structure, testIDs, and styles — they're a direct cut-paste from `home.tsx`. The helper function `formatMonth` moves to `src/utils/dashboardHelpers.ts` (shared between screens if needed; currently only progress uses it).

**Coming Soon section:**
```tsx
<Card testID="progress-coming-soon">
  <View style={styles.comingSoonRow}>
    <Ionicons name="analytics-outline" size={20} color={colors.textMuted} />
    <Text style={[styles.comingSoonTitle, { color: colors.textMuted }]}>
      {t('dashboard.comingSoonTitle')}
    </Text>
  </View>
  <Text style={[styles.comingSoonDesc, { color: colors.textMuted }]}>
    {t('dashboard.comingSoonDesc')}
  </Text>
</Card>
```

Styling: italic text, opacity 0.7, centered, 14px font size.

#### 4. Tab Registration (`app/(tabs)/_layout.tsx`)

Add one line after the settings hidden tab:

```tsx
<Tabs.Screen name="progress" options={{ href: null }} />
```

#### 5. i18n Keys

**en-US.ts** — add to `dashboard`:
```typescript
seeProgress: 'See the Progress',
comingSoonTitle: 'More Detailed Metrics Coming Soon',
comingSoonDesc: 'Percentile rankings, vocabulary milestones, pronunciation accuracy, and speaking milestones will be available in a future update.',
```

**pt-BR.ts** — add to `dashboard`:
```typescript
seeProgress: 'Ver o Progresso',
comingSoonTitle: 'Métricas Mais Detalhadas em Breve',
comingSoonDesc: 'Rankings de percentil, marcos de vocabulário, precisão de pronúncia e marcos de fala estarão disponíveis em uma atualização futura.',
```

#### 6. Move `formatMonth` to shared utility

Move `MONTH_KEYS` and `formatMonth` from `home.tsx` to `src/utils/dashboardHelpers.ts`. The function takes `(monthStr, showYear, t)` and returns the formatted label. Only `progress.tsx` needs it after home simplification, but placing it in the shared helper keeps it testable and reusable.

### Error Handling

- **Empty data:** Progress screen renders gracefully with none of the three sections visible (all are guarded by `length > 0`). Coming soon section always renders.
- **Stats loading:** Show a loading indicator or empty state while `useDashboardStats` is fetching.
- **Navigation:** If user navigates to progress directly (deep link), `useDashboardStats` will fetch fresh data.

---

## Alternatives Considered

1. **Keep charts on home behind a collapsible/expandable section** — Discarded because it adds UI complexity without reducing render cost, and the spec explicitly calls for a separate screen.

2. **Use a stack navigator instead of hidden tab** — Discarded because the existing pattern (media, settings) already uses hidden tabs successfully. Consistency wins.

3. **Create separate smaller components for each chart section** — Could be done, but the sections are relatively self-contained already. Extracting them into dedicated component files is a future refactor if the progress screen grows.

---

## Open Questions

All questions from the spec are resolved:

- [x] **StatCard backward compatibility?** → No API change needed; all 5 call sites use the same props. The layout change is internal.
- [x] **Navigation approach?** → Button on home, hidden tab. No More-tab popup entry needed per spec ("Confirm with designer" resolved — button-only access).
- [x] **formatMonth shared?** → Yes, moved to dashboardHelpers.

---

## File Impact Summary

| File | Action | Change |
|------|--------|--------|
| `src/components/UIComponents.tsx` | Modify | StatCard layout: vertical → horizontal |
| `app/(tabs)/home.tsx` | Modify | Remove 3 sections, add "See Progress" button, remove unused styles |
| `app/(tabs)/progress.tsx` | Create | New screen with moved sections + coming soon |
| `app/(tabs)/_layout.tsx` | Modify | Add hidden progress tab |
| `src/i18n/en-US.ts` | Modify | 3 new dashboard keys |
| `src/i18n/pt-BR.ts` | Modify | 3 new dashboard keys |
| `src/utils/dashboardHelpers.ts` | Modify | Add `formatMonth` helper |
| `__tests__/screens/home.test.tsx` | Modify | Remove chart/category/word tests, add "See Progress" test |
| `__tests__/screens/progress.test.tsx` | Create | Full test suite for progress screen |
| `__tests__/integration/UIComponents.test.tsx` | Modify | Update StatCard layout assertions |
| `__tests__/unit/dashboardHelpers.test.ts` | Modify | Add `formatMonth` tests |

**Total files:** 11 (7 modified, 2 created, 2 test updates)

---

## Acceptance Criteria

- [x] Home screen shows only: header, profile, stat cards (compact layout), "See the Progress" button, empty state (when no data)
- [x] "See the Progress" button navigates to `/(tabs)/progress`
- [x] Progress screen renders monthly chart, category breakdown, recent words, coming soon placeholder
- [x] StatCard displays icon + label horizontally with value right-aligned
- [x] Progress screen has pull-to-refresh with `useDashboardStats` refetch
- [x] Coming soon section renders with muted/italic styling
- [x] i18n keys `seeProgress`, `comingSoonTitle`, `comingSoonDesc` in en-US and pt-BR
- [x] All existing tests updated; new progress screen tests pass
- [x] `npm run ci` passes (lint, typecheck, tests, semgrep)
- [x] No new dependencies introduced
