# Insights & Analytics

The Insights page in glide. provides administrators and project managers with a comprehensive overview of localization activity, user contributions, and the exact impact of AI automation on the translation workflow.

## 1. Project Overview

At the top of the Insights page, several high-level metrics are displayed to give a quick pulse check on the project's state:
- **Total Keys:** The total number of translation keys in the project.
- **Total Translations:** The total number of completed translations across all languages.
- **Missing Translations:** The number of translations that are still required (untranslated keys multiplied by target languages).
- **Total Languages:** The number of target languages supported in the project.

## 2. Automation Efficiency

A core feature of glide. is tracking the impact of AI on your localization workflow. This section visualizes the balance between manual effort and AI automation using four key metrics alongside an activity graph.

### Key Metrics
- **Time Saved:** The estimated total time saved by the team by utilizing AI instead of typing manually.
- **Automation Rate:** The percentage of total translations that were handled by AI versus manual input.
- **Efficiency Boost:** A multiplier (e.g., `1.4x`) indicating how much faster the team operates due to AI assistance.
- **AI Actions:** The raw count of translations completely handled by AI.

### How is Time Tracked?
glide. tracks the actual time a user spends manually translating a key:
- **Timer Start:** The timer starts ticking the moment a user begins typing in the translation input field (within the Translation Flashcard modal).
- **Idle Timeout:** If the user stops typing for more than 10 seconds, the timer automatically pauses to prevent skewed data (e.g., if a user goes to make a coffee).
- **Max Cap:** A single translation event is capped at a maximum of 120 seconds.
- **Save Event:** When the user clicks "Save" or uses shortcuts to save and proceed, the tracked `timeSpentMs` is sent to the backend alongside the translation.

### How are Metrics Calculated?
To provide a realistic metric of how much time AI saves the team, glide. calculates:
1. **Median Manual Speed:** The backend collects all `timeSpentMs` values from every *manual* translation. It calculates the **median** time it takes to manually translate a single string. (Median is used instead of Average to filter out extreme outliers).
2. **Time Saved:** `Time Saved = AI Action Count * Median Manual Speed`. This ensures that the metric is uniquely tailored to the actual typing speed and complexity of your specific project and team.
3. **Automation Rate:** `(AI Action Count / Total Translation Count) * 100`.
4. **Efficiency Boost:** `Total Translation Count / Manual Translation Count`. If the team manually translated 100 keys and AI translated 50 keys, the boost is `150 / 100 = 1.5x`.

### Automation Graph
The Automation Efficiency Graph visualizes the relationship between Manual and AI translations over a selected timeframe (e.g., Today, Last 7 Days, Last 30 Days).
- **Manual (White Line):** Represents translations entirely typed out by users.
- **AI Translated (Primary Color):** Represents translations generated and approved via AI suggestions or bulk translation tools.
- The graph dynamically adapts its styling to the selected Nuxt UI primary color of your glide. theme.

## 4. Leaderboard

The Leaderboard ranks users based on their overall activity within the system over the selected timeframe.

### Tracked Metrics
- **Rank:** Visual indicator of the most active contributors.
- **User:** The avatar and username of the contributor.
- **Translations:** The number of translations the user has updated or submitted.
- **Average Speed:** The user's personal median manual translation speed (e.g., "4.2s per key").
- **Activity Breakdown:** A detailed count of specific actions taken:
  - Keys Created
  - Labels Created
  - Languages Added
- **Top Languages:** The languages this user translates into most frequently (visualized with flag icons).
- **Last Activity:** The exact date and time of the user's most recent tracked action.

### Sorting & Filtering
Administrators can filter all Insights data, including the Automation Graph and Leaderboard, by specific timeframes (e.g., All time, Today, 7 Days, 30 Days, 1 Year). When selecting "Today", the graphs group activity by hours; for larger timeframes, activity is grouped by days.
