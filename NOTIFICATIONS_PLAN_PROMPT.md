---
refined: true
refined_at: 2026-03-24 11:35:00 UTC
refined_by: Gemini
---

# Architecture Plan: Local Push Notification System

**Objective:**
Design a local-first, offline-capable push notification system for Palavrinhas using `expo-notifications`. The system must increase user retention and engagement without relying on a remote server, adhering to the "Reset Sequence" strategy.

**Core Strategy: "The Reset Sequence"**
- **Foreground:** Cancel all pending "inactivity" or "retention" notifications immediately upon app open.
- **Background/Quit:** Batch schedule the future retention sequence (Day 3, 7, 15) to create a "safety net" that only fires if the user *doesn't* return.

**Notification Categories & Logic:**
Implement the following 8 types defined in the brainstorming phase:
1.  **Gentle Nudge:** Inactivity triggers (3, 7, 15 days). Action: Deep link to "Add Word" modal.
2.  **Weekly Win:** Sundays at noon if `words_added_this_week > 0`. Action: Deep link to `/(tabs)/progress`.
3.  **Monthly Recap:** Last day of month. Action: Deep link to `/(tabs)/progress`.
4.  **Nostalgia Trip:** Anniversaries (1mo, 1yr) of specific words. Action: Deep link to Home for now, we'll implement a memories screen as a next task.
5.  **Milestone Celebration:** Immediate trigger on Nth word count (1, 10, 30, 50, 100, 200, 500, 1000).
6.  **Feature Discovery:** If `word_count > 5` AND `asset_count == 0`.
7.  **Category Explorer:** Random category prompt if inactive > 7 days.
8.  **Backup Reminder:** If `last_backup_date > 30 days`. Action: Deep link to `/(tabs)/more` (Settings) if possible scroll to export section.

**Technical Requirements:**
1.  **Library:** `expo-notifications`.
2.  **Permissions:** Design a "priming" UI flow to request permissions contextually (e.g., after the first word is added), supporting Android 13+ runtime permissions.
3.  **Deep Linking:** Define how `expo-router` will handle incoming notification responses, specifically routing to:
    - Tab screens (`Progress`, `Settings`, `Home`).
    - Modals (`AddWordModal`).
4.  **State Tracking:** Define where to store internal tracking state (e.g., `last_backup_date`, `milestones_reached`) to prevent duplicate alerts.
5.  **User Preferences:** Add a Settings section to toggle notifications on/off.

**Deliverables:**
- **Design Document:** `design/YYYY-MM-DD_NN-local-notifications.md` covering the architecture, scheduling logic, and deep link routing map.
- **Implementation Plan:** Step-by-step breakdown.
