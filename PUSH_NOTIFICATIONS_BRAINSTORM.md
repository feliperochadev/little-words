# Push Notification Strategy & Brainstorming

This document outlines the strategy for implementing local push notifications in Palavrinhas to improve retention, engagement, and data safety.

## Technical Strategy: "The Reset Sequence"

Since Palavrinhas is a **local-first app**, these are **Local Notifications** scheduled by the app itself, not a remote server. This respects privacy and works offline.

To handle inactivity without a backend:
1.  **On App Open:** Cancel **ALL** pending inactivity notifications.
2.  **On App Close/Background:** Schedule the entire "safety net" sequence (e.g., the 3, 9, and 21-day reminders) all at once.
    *   *If they don't return:* The notifications fire in sequence, then stop (because no new ones are ever scheduled).
    *   *If they do return:* The sequence is wiped and restarts.

---

## Polished Notification Categories

### 1. The "Gentle Nudge" (Retention)
**Logic:** Schedule at `Date.now() + 3 days`, `+ 7 days`, and `+ 15 days`.
**Goal:** Remind parents to log small moments before they forget.

*   **(Day 3):** "Has {{childName}} made any new sounds today? 🗣️ Capture them before you forget!"
*   **(Day 7):** "It's been a quiet week! Did {{childName}} discover a new word? Record it now. 📝"
*   **(Day 15 - Last Try):** "Don't let the memories fade! Add {{childName}}'s latest words to their timeline. ✨"

### 2. The "Weekly Win" (Reward)
**Logic:** Schedule for next Sunday at 12:00 PM. *Only schedule if `words_added_this_week > 0`.*
**Goal:** Positive reinforcement.

*   **Copy:** "Wow! {{childName}} learned {{count}} new words this week! See the list. 🌟"
*   **Variant (if 0 words):** *Don't send.* (Better to stay silent than to highlight a lack of progress).

### 3. The "Monthly Recap" (Milestone)
**Logic:** Schedule for last day of month at 7:00 PM.
**Goal:** High-level progress tracking.

*   **Copy:** "Bye bye, {{month}}! 👋 {{childName}} added {{count}} words to their vocabulary this month. Tap to see the growth chart!"

### 4. The "Nostalgia Trip" (Emotional Hook)
**Logic:** Trigger on the 1-month, 3-months, 6-months, 1-year anniversary of a specific word or recording.
**Why:** Parents love "On this day" memories. It usually guarantees an app open.

*   **Copy 1:** "Can you believe it? {{childName}} said '{{word}}' for the first time 1 month ago today! 😍"
*   **Copy 2:** "Flashback! 🕰️ Listen to how {{childName}} said '{{word}}' last year." (If audio exists).

### 5. The "Milestone Celebration" (Gamification)
**Logic:** Trigger immediately (or next morning) when hitting a count (1, 10, 50, 100 words).
**Why:** Validates the effort of data entry.

*   **Copy 1:** "Hooray! 🎉 That was {{childName}}'s 50th word! The dictionary is growing fast!"
*   **Copy 2:** "First Word Alert! 🚨 You've started {{childName}}'s journey. Keep it up!"

### 6. The "Feature Discovery" (Education)
**Logic:** If `word_count > 5` BUT `asset_count == 0` (User uses text but hasn't found media features).
**Why:** Increases investment in the app (media is harder to "leave" than text).

*   **Copy:** "Did you know? You can record audio or add photos to {{childName}}'s words. Try it on your next entry! 📸 🎤"

### 7. The "Category Explorer" (Prompt)
**Logic:** If no words added in 7 days, pick a random unused category (e.g., Animals, Food).
**Why:** Sometimes parents don't know *what* to log.

*   **Copy 1:** "Does {{childName}} make any Animal sounds? 🐮🐷 Add 'Moo' or 'Ba' as words!"
*   **Copy 2:** "Yummy! 🍎 Can {{childName}} name any of their favorite foods yet?"

### 8. The "Backup Reminder" (Utility/Trust)
**Logic:** If `last_backup_date > 30 days` (or never).
**Why:** Critical for a local-first app. If they lose their phone, they lose the data. They will thank you for this.

*   **Copy:** "Keep {{childName}}'s memories safe! 🛡️ It's been a while since your last backup. Tap to save a ZIP now."

---

## Implementation Summary Table

| Notification Type | Trigger / Logic | Cancel Condition | Importance | Action |
| :--- | :--- | :--- | :--- |
| **Gentle Nudge** | Inactivity (3, 7, 15 days) | App Open | High (Retention) | Go to add new word modal |
| **Weekly Win** | Sunday Noon (if data added) | App Open (Reschedule) | Medium (Reward) | Go to Progress screen |
| **Monthly Recap** | End of Month (if data added) | App Open (Reschedule) | Medium (Reward) | Go to Progress screen |
| **Nostalgia** | 1 month/3 months/6 months/year after `created_at` | - | High (Engagement) | Go to timeline on memories screen (To be implemented, for now just to go home page)|
| **Backup** | 30 days since last backup | Backup Completed | High (Utility) | Go to settings scrolling to export section |
