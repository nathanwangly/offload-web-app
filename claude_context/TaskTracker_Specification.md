# Task Tracker — Functional & Technical Specification

**Purpose of this document:** a implementation-neutral description of the existing iOS app ("Task Tracker", SwiftUI + SwiftData), sufficient to rebuild it as a web app without reading the Swift source.

**Source files covered:** `TodoTaskModel.swift`, `UserSettingsModel.swift`, `TaskListViewModel.swift`, `EmojiViewModel.swift`, `TaskService.swift`, `NotificationManagerService.swift`, `TaskImportExportService.swift`, `HomeView.swift`, `TaskRowView.swift`, `DetailedTaskView.swift`, `AddTaskView.swift`, `SettingsView.swift`, `MainTabView.swift`.

**Not covered (not supplied):** app entry point / `@main`, `ModelContainer` configuration, colour asset definitions, `Color.ui` and `Color.buttonColour` extensions, `Bundle` extensions (`displayName`, `appVersion`, `releaseYear`), onboarding, widgets. See §12.

Throughout, ⚠️ marks behaviour that is arguably a defect or an inconsistency rather than an intentional design. These are called out so the port is a deliberate decision, not an accidental reproduction.

---

## 1. Product concept

The app tracks **when a task was last done**, not when it must be done. A task has a *recurrence interval* (e.g. "every 3 weeks"); the app derives a due date from the most recent completion and surfaces tasks that have reached or passed it.

Consequences of this framing that the port must preserve:

- There is no notion of "missed" or "skipped". A task is never permanently overdue — completing it resets the clock from that moment.
- Completion history is a first-class, editable record, not an audit log. Users can back-date completions and delete them.
- A task with **zero** completions is a distinct state (`new`), not an overdue task.

---

## 2. Data schema

### 2.1 `Task`

| Field | Type | Constraints / default | Notes |
|---|---|---|---|
| `id` | UUID | unique, generated | |
| `name` | String | **unique**, required, max 40 chars (UI-enforced) | See §2.4 on uniqueness. |
| `category` | String | default `"Home"` | ⚠️ Never displayed or edited anywhere in the UI. Only round-trips through import/export. Decide whether to keep. |
| `emoji` | String | model default `"🔧"`; UI default `""` | Exactly one emoji character, or empty. |
| `frequencyAmount` | Int | 1–365 (UI-enforced) | |
| `frequencyUnit` | String | one of `Day`, `Week`, `Month`, `Year` | Stored as a raw string, not an enum. |
| `completions` | `CompletionRecord[]` | cascade delete | Unordered in storage; sorted at read time. |

Derived (not stored):

- `lastCompletedDate` = `max(completions.date)`, or `null` when `completions` is empty.
- `dueDate` — see §3.1. `null` when there are no completions.

### 2.2 `CompletionRecord`

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | generated |
| `date` | Date | full timestamp, not date-only |
| `task` | FK → Task | inverse of `Task.completions`, cascade delete |

`date` stores a timestamp but is almost always **consumed at day granularity** (status thresholds compare exact timestamps, but display, gap calculation and due-date derivation all normalise to start-of-day). See §11.1 for the one place this leaks.

### 2.3 Settings (key–value, device-local)

Persisted individually under the keys below (iOS `UserDefaults`; web equivalent: `localStorage` or an IndexedDB settings row). Writes are **debounced by 300 ms** — every property change resets a timer and the whole settings blob is written once when changes stop.

| Key | Type | Default |
|---|---|---|
| `settings_sensitivity` | `Relaxed` \| `Balanced` \| `Strict` | `Balanced` |
| `settings_task_frequency` | `Day`\|`Week`\|`Month`\|`Year` | `Week` |
| `settings_theme` | `Light`\|`Dark`\|`System` | `System` |
| `settings_colour_overdue` | colour token | `appRed` |
| `settings_colour_due` | colour token | `appOrange` |
| `settings_colour_upcoming` | colour token | `appYellow` |
| `settings_colour_not_due_yet` | colour token | `appGrey` |
| `settings_notifications` | Bool | `true` |
| `settings_notify_overdue` | Bool | `true` |
| `settings_notify_due` | Bool | `true` |
| `settings_notify_upcoming` | Bool | `true` |
| `settings_notification_time` | Date (time-of-day used only) | 08:00 |

Colour tokens: `appRed`, `appOrange`, `appYellow`, `appGreen`, `appBlue`, `appCyan`, `appMint`, `appPurple`, `appGrey`. Display names are the obvious capitalised forms.

`Reset to defaults` deletes all twelve keys and re-seeds the in-memory values.

### 2.4 Uniqueness of `name`

Two enforcement layers, and they disagree:

1. **Storage-level:** `name` is declared unique.
2. **UI-level (Add/Edit):** case-**insensitive** comparison against all tasks, excluding the task being edited → blocks with a "Duplicate name" alert.
3. **Import:** case-**sensitive** membership test against existing names → silently skips.

⚠️ Importing "deep clean" when "Deep Clean" exists passes the import check but violates the storage constraint. Pick one rule (recommend: case-insensitive, trimmed, everywhere) and apply it in all three places.

⚠️ The Add/Edit save button is disabled only on `name.isEmpty` — a name of `"   "` is accepted.

---

## 3. Core logic

This section is the heart of the app. Everything else is presentation.

### 3.1 Due date

```
if completions is empty → dueDate = null

base = startOfDay(lastCompletedDate)            // local timezone

dueDate = switch frequencyUnit:
    "Day"   → base + frequencyAmount days
    "Week"  → base + (frequencyAmount * 7) days
    "Month" → base + frequencyAmount calendar months
    "Year"  → base + frequencyAmount calendar years
    default → base + frequencyAmount days
```

Two details that matter:

- **Start-of-day normalisation.** A task completed Monday at 23:50 with a weekly frequency is due at **00:00 the following Monday**, not 23:50. Due dates always land on midnight boundaries.
- **Calendar arithmetic for Month/Year**, not fixed 30/365-day offsets. Jan 31 + 1 month = Feb 28/29. A JS port using `date-fns` `addMonths` / Luxon `plus({months})` matches this; naive `+30*86400000` does not.

The iOS implementation memoises `dueDate` keyed on `(lastCompletedDate, frequencyAmount, frequencyUnit)`. This is a performance detail; a web port with reactive derived state does not need it, but must invalidate on the same three inputs.

### 3.2 Status thresholds

Let `interval = dueDate − lastCompletedDate` (in seconds).

⚠️ **Note this is not the nominal frequency.** Because `dueDate` is measured from *start of day* but `interval` subtracts the *exact* completion timestamp, `interval` = nominal period − time-of-day of completion. A weekly task completed at 18:00 has `interval` = 6.25 days, not 7. This shrinks both the upcoming lead and the overdue grace by up to 24 h depending on what time of day the user tapped the button. It is almost certainly unintended. **Recommendation: compute `interval` from `startOfDay(lastCompletedDate)` so it equals the nominal period.** Flagged as an open decision in §12.

```
upcomingLead  = clamp(interval × (1 − sensitivity.upcomingFactor),  min = 1 day,  max = 14 days)
overdueGrace  = clamp(interval × (sensitivity.overdueFactor − 1),   min = 3 days, max = 90 days)

upcomingThreshold = dueDate − upcomingLead
dueThreshold      = dueDate
overdueThreshold  = dueDate + overdueGrace
```

Sensitivity factors:

| Sensitivity | `upcomingFactor` | `overdueFactor` |
|---|---|---|
| Relaxed | 0.9 | 2.0 |
| Balanced | 0.8 | 1.5 |
| Strict | 0.7 | 1.2 |

### 3.3 Status resolution

Evaluated in this order against the current time:

```
if completions is empty        → new
if now ≥ overdueThreshold      → overdue
if now ≥ dueDate               → due
if now ≥ upcomingThreshold     → upcoming
otherwise                      → notDueYet
```

Five states: `overdue`, `due`, `upcoming`, `notDueYet`, `new`. `new` is always presented alongside `notDueYet` (same bucket, same colour) but produces different text and never generates notifications.

### 3.4 Worked examples

Assuming completion at midnight (so `interval` equals the nominal period), days before/after the due date:

| Frequency | Sensitivity | Upcoming starts | Overdue starts |
|---|---|---|---|
| Every 1 day | any | due − 1 d *(clamped)* | due + 3 d *(clamped)* |
| Every 1 week | Relaxed | due − 1 d *(clamped)* | due + 7 d |
| Every 1 week | Balanced | due − 1.4 d | due + 3.5 d |
| Every 1 week | Strict | due − 2.1 d | due + 3 d *(clamped)* |
| Every 1 month (~30 d) | Relaxed | due − 3 d | due + 30 d |
| Every 1 month | Balanced | due − 6 d | due + 15 d |
| Every 1 month | Strict | due − 9 d | due + 6 d |
| Every 1 year | Relaxed | due − 14 d *(clamped)* | due + 90 d *(clamped)* |
| Every 1 year | Balanced | due − 14 d *(clamped)* | due + 90 d *(clamped)* |
| Every 1 year | Strict | due − 14 d *(clamped)* | due + 73 d |

Observations worth being aware of before porting:

- ⚠️ For **daily** tasks the clamps swallow the sensitivity setting entirely — all three settings behave identically, and a daily task enters `upcoming` at the instant it is completed (lead = 1 day = the whole interval). The task effectively never sits in `notDueYet`.
- ⚠️ For **yearly** tasks, sensitivity only affects the overdue grace, and only for Strict.
- For weekly tasks, Strict has a *shorter* overdue grace than Balanced (3 d vs 3.5 d) but a *longer* upcoming lead (2.1 d vs 1.4 d) — which is the intended direction (strict = warn earlier, escalate sooner), it's just that the 3-day floor compresses the difference.

The sensitivity setting is meaningful mainly for weekly-to-monthly frequencies. If that is acceptable, keep it; if not, the clamps need re-tuning.

### 3.5 Status text

Shown as the secondary line on the task row and under the header in the detail view:

| Status | Text |
|---|---|
| `overdue`, `due`, `upcoming` | `Due {relative(dueDate)}` |
| `notDueYet` | `Last completed: {Capitalised relative(lastCompletedDate)}` |
| `new` | `Awaiting first completion` |

`relative(date)` — resolved against *today*, at day granularity:

```
same day as today          → "today"
yesterday                  → "yesterday"
tomorrow                   → "tomorrow"
more than 1 year in past   → "over a year ago"
otherwise                  → locale relative formatter, full style
                             e.g. "in 3 days", "2 weeks ago", "in 4 months"
```

The iOS relative formatter output ("in 3 days" / "3 days ago") should be reproduced with `Intl.RelativeTimeFormat` (`numeric: "auto"`, `style: "long"`) plus a unit-selection rule. Note the formatter is fed the **raw timestamp**, not the start-of-day, so its unit choice is sensitive to time of day (a due date 25 h away reads "in 1 day"; 23 h away reads "in 23 hours" — ⚠️ hours can appear in the string, which is inconsistent with the day-granular framing elsewhere).

### 3.6 Gap text (detail view history)

Between two consecutive completion records:

```
days = startOfDay(newer) − startOfDay(older), in whole days

days ≤ 0     → "Same day"
days ≥ 365   → "{days / 365} year gap"     // integer division
days ≥ 30    → "{days / 30} month gap"     // integer division
days ≥ 7     → "{days / 7} week gap"       // integer division
otherwise    → "{days} day gap"
```

⚠️ Integer division with fixed divisors: 400 days → "1 year gap"; 59 days → "1 month gap"; 13 days → "1 week gap". Deliberately coarse. Note also there is no singular/plural handling — 2 days renders "2 day gap".

---

## 4. Task list processing

Applied on every render of the home screen, in this order:

1. **Filter** — if search text is non-empty, keep tasks whose `name` contains it (case- and diacritic-insensitive substring match).
2. **Partition** — into four buckets by status. `new` is merged into the `notDueYet` bucket.
3. **Sort** — each bucket independently:
   - primary: `dueDate` ascending; `null` (i.e. `new` tasks) treated as **distant past**, so new tasks sort to the **top** of the "All other tasks" bucket;
   - secondary: `lastCompletedDate` ascending (oldest first), `null` → distant past;
   - tertiary: `name` ascending (ordinal string comparison, not locale-aware).

⚠️ A `sortKey` helper on the model maps a null `dueDate` to *distant future* — the opposite convention. It is unused; delete it rather than porting it.

---

## 5. UI specification

### 5.1 Shell

Two-tab layout: **Home** (house icon) and **Settings** (gear icon). Home is the default tab.

On first appearance the app instantiates the task service and **rebuilds every notification from scratch** (see §7.3).

Web equivalent: two routes (`/` and `/settings`) with a persistent bottom tab bar on mobile widths.

### 5.2 Home screen

- Title: **"Your Tasks"**.
- Toolbar: search toggle (magnifier) top-left; **+** top-right.
- Search is **not** always visible — tapping the magnifier reveals the search field with placeholder "Search tasks".
- Body: a single scrolling list containing, in order, any non-empty sections:

| Section header | Condition |
|---|---|
| `NEEDS ATTENTION (n)` | overdue bucket non-empty |
| `DUE (n)` | due bucket non-empty |
| `UPCOMING (n)` | upcoming bucket non-empty |
| `ALL OTHER TASKS` | notDueYet bucket non-empty — ⚠️ no count, unlike the other three |

Headers are uppercase, caption-size, semibold, secondary colour, and **scroll with the content** (they are ordinary rows, not sticky headers).

- Empty state, no search active: icon `checklist`, title "No tasks found", body "Add your first task by pressing the + button!"
- Empty state, search active: standard "no results for '{query}'" treatment.
- List transitions are animated (~0.6 s spring) whenever the task set changes, so a completed task visibly slides from one section to another.

### 5.3 Task row (card)

Layout, left to right:

1. Emoji, 32 pt fixed-width slot (empty slot preserved when no emoji, so titles stay aligned).
2. Text column:
   - Title row: a **6 pt filled dot** in the status colour, shown **only** for `overdue` / `due` / `upcoming`; then the task name (headline weight).
   - Secondary line: status text (§3.5), secondary colour.
3. Spacer.
4. Completion button: `checkmark.circle.dotted` outline icon, becomes a filled `checkmark.circle.fill` on tap.

Card styling: rounded rectangle, 12 pt radius, card background colour, subtle drop shadow (6% black, 2 pt blur, 1 pt y-offset), 12 pt vertical / 16 pt horizontal internal padding, 4 pt vertical gap between cards, 16 pt outer margins.

Interactions:

- **Tap card** → open detail sheet.
- **Long-press card** → context menu: *Edit* (pencil), *Delete* (trash, destructive).
- **Delete** → confirmation dialog, title "Delete task?", message "This action cannot be undone.", buttons Delete / Cancel.
- **Tap completion button** → see §5.3.1.

⚠️ The row receives `fontColour` and `buttonColour` parameters from the home screen (per-section colours) but **ignores them**, computing its own status colour internally and using fixed theme colours for text and the button. The parameters and the unused `deleteAction` property are dead; do not port them.

#### 5.3.1 Completion animation

Deliberate two-phase feedback:

1. On tap: icon swaps to filled, icon and title tint to blue, button disables. Spring animation (~0.4 s).
2. After a **600 ms delay**: the completion is recorded, which changes the task's status and therefore its section — the list animates the card moving to its new position (~0.5 s ease-in-out). Local state resets.

The delay exists so the user sees the confirmation *before* the row moves. Reproduce it; without it the card jumps away instantly and the interaction reads as a glitch.

Also fires on completion: a success haptic and iOS system sound `1407`. Web equivalents: `navigator.vibrate()` (Android only; unsupported on iOS Safari) and an audio element. Both optional — see §12.

### 5.4 Detail view (modal sheet)

Presented as a sheet with its own close button (✕, top-right, 44×44 hit area); no navigation bar.

**Header** — emoji + name (large rounded title, wraps to multiple lines), then a **status pill** and the status text.

Pill text and colour by status:

| Status | Pill label | Colour |
|---|---|---|
| `overdue` | NEEDS ATTENTION | overdue colour |
| `due` | READY | due colour |
| `upcoming` | UPCOMING | upcoming colour |
| `notDueYet` | ON TRACK | notDueYet colour |
| `new` | NEW | notDueYet colour |

⚠️ Pill labels do **not** match the home-screen section names for `due` ("READY" vs "DUE") or `notDueYet` ("ON TRACK" vs "All other tasks"). Deliberate or not, it is worth aligning.

Pill styling: uppercase, caption-size bold, capsule, background = colour at 12% opacity, text = full colour, 1 pt border at 20% opacity.

**Recent Activity** — a bordered group box:

- Header: "Recent Activity" with a clock icon; an **Edit / Done** toggle appears on the right only when at least one completion exists.
- Body: the **5 most recent** completions, newest first. Each row shows a check icon and the date formatted as e.g. *"Monday, Jan 5, 2026"* (full weekday, abbreviated month, day, year).
- Between consecutive rows: a short vertical connector line and the gap text (§3.6) in italic caption.
- In Edit mode, the check icon is replaced by a red minus button that deletes that completion immediately (**no confirmation**). ⚠️ Deleting the most recent completion silently changes the task's due date and status; deleting the last remaining one reverts the task to `new`. Consider whether an undo affordance is needed.
- Empty state: "No records found" with a calendar icon, 60 pt tall.

Only 5 records are ever shown and there is no "see all" — older history is retained in storage but unreachable in the UI. ⚠️ Worth deciding whether the web app should expose full history.

**Actions**

- Primary: a full-width **split button** in the accent colour, 14 pt radius, with a coloured drop shadow.
  - Left ~80%: "Completed today" with a filled check icon → records a completion at the current timestamp.
  - Thin white 30%-opacity divider.
  - Right 60 pt: calendar-plus icon → opens a date picker sheet (graphical/calendar style, half-height, **no future dates selectable**) with a "Done" button that records a completion on the chosen date.
- Secondary: full-width "Edit task" button with pencil icon, secondary background, 12 pt radius → opens the edit form as a nested sheet.

Both actions exit history-edit mode first.

⚠️ The back-dated completion uses the picked date with its time component from `Date()` at picker initialisation; since due dates normalise to start-of-day this is harmless, but the stored timestamp is not midnight. Normalising back-dated completions to noon or midnight would be cleaner.

⚠️ An unused `secondaryActionButton` helper remains in the file. Ignore.

### 5.5 Add / Edit form (modal sheet)

One form serves both modes. Toolbar: **Cancel** (left) and **Add** or **Update** (right, disabled while the name is empty).

| Section | Content | Shown when |
|---|---|---|
| Task name | Text field, placeholder "E.g., Deep clean". Hard-truncated at **40** characters. A `n/40` counter appears once the name reaches **30** characters. | always |
| Emoji (optional) | Text field, placeholder "Tap to add emoji - e.g., 🧹". Accepts exactly one emoji — see below. | always |
| Frequency | Stepper labelled `Every {n} {Unit}` (pluralised: "Every 1 Week" / "Every 2 Weeks"), range **1–365**; plus a menu picker for the unit (Day/Week/Month/Year). | always |
| Last completed (optional) | Defaults to **today**. Shows a date picker (no future dates) plus an ✕ to clear it. When cleared, shows a "Select date" button that sets it back to today. | **create only** |
| Delete Task | Destructive full-width button → confirmation dialog ("Delete task?" / "This action cannot be undone.") | **edit only** |

**Emoji input rule:** on every keystroke, if the last character entered is an emoji, replace the whole field with just that character and dismiss the keyboard; if the last character is anything else and the field is non-empty, clear the field. Net effect: exactly zero or one emoji, and no way to type text into the field. (An `EmojiViewModel` class duplicates this logic verbatim and is unused — do not port it.)

**On open (create mode only):** the frequency unit is seeded from the *Default frequency* setting and the amount reset to 1.

**Save behaviour:**

- Duplicate-name check first (case-insensitive, excluding self) → alert "A task with the name '{name}' already exists. Please choose a different name." and abort.
- **Edit:** updates `name`, `frequencyAmount`, `frequencyUnit`, `emoji`, then reschedules notifications. **Completion history is never touched** — which is why the "Last completed" field is hidden in edit mode. Back-dating an existing task requires the detail view.
- **Create:** creates the task; if a date is set, seeds it with a single completion on that date; if cleared, creates it with **no completions** (status `new`). Then schedules notifications.

⚠️ In create mode, `category` is never set, so it takes the model default `"Home"`, and `emoji` defaults to `""` rather than the model's `"🔧"`.

⚠️ The construction path creates a task with a default completion record and then immediately replaces the whole collection. Harmless in SwiftData but a code smell; build the record set once in the port.

⚠️ A `loadTaskData` method and a `hasCompletionHistory` flag are unused.

### 5.6 Settings screen

Grouped list, title "Settings". Rows marked → navigate to a sub-screen containing a single inline picker.

**General**
- Status timing → Relaxed / Balanced / Strict (this is the sensitivity setting, §3.2). Current value shown on the row.
- Default frequency → Day / Week / Month / Year.

**Appearance**
- App theme → Light / Dark / System.
- Status colours → sub-menu with three rows (Needs Attention, Due, Upcoming), each showing a colour swatch and name, each navigating to a nine-option colour picker. Footer: "Customise how your tasks are highlighted."
  - ⚠️ The `notDueYet` colour is stored and used but has **no UI to change it**. Either expose it or drop it to a constant.

**Notifications**
- Master toggle "Enable notifications".
- When on, three sub-toggles ("When tasks need attention", "When tasks are due", "When tasks are coming up") and a time-of-day picker ("Notify me at").
- Any change to a sub-toggle or the time triggers a full notification rebuild.
- Turning the master toggle **on** checks the OS permission status; if denied, the toggle snaps back off and an alert appears offering to open system settings.
- ⚠️ On screen appear and on every return to foreground, `notificationsEnabled` is **overwritten** from the OS permission status. The user's own preference is therefore not durable: if they turn notifications off in-app but the OS permission is still granted, the toggle silently flips back on next time the screen appears. This conflates *permission* with *preference*. **Recommend separating the two in the port.**

**Advanced** (collapsed disclosure group)
- *Import/export data* → "Import tasks" (file picker, JSON only) / "Export tasks" (generates file + share sheet).
- *Reset data* → "Reset all settings to defaults" (no confirmation ⚠️) / "Delete all tasks" (destructive, confirmation alert "Are you sure?" / "This will permanently remove all your tasks.").

**Support**
- "Report an issue" → opens a pre-filled email to `nathanwangly@gmail.com`, subject `Bug Report: {AppName}`, body containing app version, OS version, device model, date.
- Footer: `{AppName} v{version}` and `© {year} Nathan Wang-Ly`.

---

## 6. Theming

- Three themes: Light, Dark, System (follows OS preference). Web equivalent: `prefers-color-scheme` plus an override.
- Named colour tokens the port must define (values not in the supplied source): `appBackground`, `cardBackground`, and the nine status palette colours. Also `Color.ui.primaryText`, `Color.ui.secondaryText`, `Color.ui.buttonColour`, `Color.buttonColour`, and the app accent colour.
- Unknown colour token → falls back to black.

---

## 7. Notifications

### 7.1 What gets scheduled

For each task with at least one completion, up to **three** one-shot local notifications:

| Type | Fires on | Title | Body |
|---|---|---|---|
| `upcoming` | upcoming threshold date | `'{name}' is coming up soon` | `Due {relative(dueDate)}` |
| `due` | due date | `'{name}' is due` | `Due {relative(dueDate)}` |
| `overdue` | overdue threshold date | `Time to '{name}'?` | `Last completed: {relative}` |

Each is subject to its own settings toggle and the master toggle. Identifier: `{taskId}-{type}`.

### 7.2 Trigger time

Take the **calendar date** of the threshold, attach the **hour and minute** from the notification-time setting, and schedule for that moment. If the resulting moment is already in the past, **skip silently** — no notification is created.

Practical consequence: a task that becomes due at 00:00 today notifies at 08:00 today; but if the app is opened at 09:00 and rebuilds notifications, that one is dropped.

### 7.3 Lifecycle

- Rescheduled (cancel-then-recreate for that task) on: task creation, task edit, any completion added, any completion removed.
- **Full rebuild** (clear *all* pending and delivered notifications, then re-create for every task) on: app launch, any notification setting change, after an import.
- Notifications are cancelled when a task is deleted.
- ⚠️ iOS caps pending local notifications at **64**. With three per task, anything past ~21 tasks is silently dropped, and the eviction order is not controlled. Not visible in the code, but a real behavioural limit of the current app.

### 7.4 Web porting problem

This is the single hardest part of the port and needs an explicit decision. Browsers have no equivalent of "schedule a local notification for a specific future timestamp":

- The Notification API only fires while a page/service worker is alive.
- Web Push requires a server pushing at the right moment, plus VAPID keys and per-device subscriptions.
- The Notification Triggers API (`showTrigger`) is Chromium-only and not a stable standard.
- iOS Safari requires the site to be installed to the home screen before it will grant notification permission at all.

Realistic options: (a) drop notifications entirely for v1; (b) in-app-only "what's due" surfacing; (c) a backend that recomputes due dates and sends Web Push. Flagged in §12.

---

## 8. Import / export

### 8.1 Format

JSON, ISO-8601 dates, pretty-printed with sorted keys.

```json
{
  "schemaVersion": 1,
  "appVersion": "1.0",
  "exportDate": "2026-02-22T13:57:00Z",
  "tasks": [
    {
      "name": "Deep clean",
      "emoji": "🧹",
      "category": "Home",
      "frequencyAmount": 2,
      "frequencyUnit": "Week",
      "completionDates": ["2026-01-05T09:00:00Z", "2026-01-19T09:00:00Z"],
      "priority": 1
    }
  ]
}
```

`completionDates` is sorted ascending on export. `priority` is written as a constant `1` and **ignored on import** — it exists only as a demonstration of forward-compatible optional fields. Decide whether to keep it in the web format.

Export filename: `{AppName}_Export_YYYYMMDD_HHmm.json` (local time).

### 8.2 Import rules

1. Parse; failure → "The file format is invalid or corrupted."
2. If `schemaVersion` > current (1) → "This file uses schema version {n}. Please update your app to import it." Lower versions are accepted.
3. If `tasks` is empty → "No tasks found in the import file."
4. For each task: skip if the name already exists (case-**sensitive**, see §2.4); reject if the name is empty; otherwise create the task with all its completion records.
5. Result reported as `{imported, skipped, errors[]}`.
   - ⚠️ The UI only surfaces `"{n} tasks imported."` — the skipped count and per-task errors are collected and then discarded. Show them in the port.
6. After import, notifications are fully rebuilt.

Import is **additive and non-destructive** — there is no merge, replace or overwrite path.

---

## 9. Complete interaction inventory

| Action | Entry point | Effect |
|---|---|---|
| Create task | Home → + | New task, optional seed completion |
| Edit task | Row long-press → Edit; Detail → Edit task | Updates name/frequency/emoji only |
| Delete task | Row long-press → Delete; Edit form → Delete Task | Confirmed; cascades completions; cancels notifications |
| Complete now | Row check button; Detail → "Completed today" | Appends completion at current time |
| Complete on past date | Detail → calendar button | Appends completion on chosen date (≤ today) |
| Remove a completion | Detail → Recent Activity → Edit → minus | Immediate, unconfirmed |
| Search | Home → magnifier | Case-insensitive name substring filter |
| Change sensitivity / colours / theme / default frequency | Settings | Immediate, debounced persist |
| Configure notifications | Settings | Immediate rebuild |
| Export / Import | Settings → Advanced | JSON file |
| Reset settings / Delete all tasks | Settings → Advanced | Delete-all is confirmed; reset is not |

---

## 10. Dead code — do not port

| Item | Location |
|---|---|
| `EmojiViewModel` class | duplicate of the in-form emoji handler |
| `TodoTask.sortKey(sensitivity:)` | unused, and uses the opposite null-date convention to the actual sort |
| `TodoTask.recentCompletionDates(limit:)` | detail view does its own sorting |
| `TodoTask.startOfToday` | unused private property |
| `DetailedTaskView.secondaryActionButton` | unused helper |
| `AddTaskView.loadTaskData`, `hasCompletionHistory` | unused |
| `TaskRowView.fontColour`, `.buttonColour`, `.deleteAction` | passed in but never read |
| `View.hideKeyboard()` | unused extension |
| Duplicated `.padding(.top, 10)` | detail view action stack |

---

## 11. Behavioural quirks summary

These are the items most likely to cause "the web version behaves differently" bug reports if not consciously decided on.

1. **Time-of-day sensitivity of thresholds** (§3.2) — completing a task at 18:00 vs 06:00 changes when it turns upcoming/overdue by up to a day.
2. **Clamps override sensitivity** for daily and yearly tasks (§3.4).
3. **Daily tasks are permanently `upcoming`** and never sit in "All other tasks".
4. **`notificationsEnabled` is a permission mirror, not a preference** (§5.6).
5. **Case-sensitivity mismatch** between the duplicate-name check in the form and in import (§2.4).
6. **Only the 5 most recent completions are ever visible**, though all are stored.
7. **Completion deletion is unconfirmed and silently mutates due dates.**
8. **Relative text can render hours** ("in 23 hours") despite the day-granular model (§3.5).
9. **Gap text uses integer division with fixed 7/30/365 divisors** and no pluralisation (§3.6).
10. **Notification scheduling silently no-ops** when the computed trigger has already passed today (§7.2).

---

## 12. Open questions

These require your input; I have not assumed answers.

**Behaviour to preserve or fix**

1. The `interval` time-of-day quirk (§3.2 / §11.1) — replicate faithfully, or fix so `interval` equals the nominal frequency period?
2. The clamp values (1–14 day lead, 3–90 day grace) make sensitivity a no-op for daily and near-no-op for yearly tasks. Re-tune, or accept?
3. Should the notification *preference* be decoupled from browser permission state (§5.6)?
4. Should full completion history be viewable, and should completion deletion be confirmed / undoable?
5. Are the label inconsistencies ("Due" vs "READY", "All other tasks" vs "ON TRACK") intentional?

**Scope of the web app**

6. **Notifications** — which of the three options in §7.4? This materially determines whether the app needs a backend.
7. **Persistence and identity** — purely local (IndexedDB, one browser, no account), or server-backed with accounts and multi-device sync? The current app has no sync, so "local-only" is the faithful port, but it makes the export file the only backup mechanism.
8. **Timezone handling** — the iOS app implicitly uses the device's current timezone with no stored offset. If data ever syncs across devices or a server is involved, a task completed in Sydney and viewed in London will shift by a day. Store UTC timestamps and render in local time, or store an explicit timezone per record?
9. Is the app installable as a PWA, or a plain website? This affects both notifications and offline behaviour.

**Data**

10. `category` is stored, defaulted to `"Home"`, exported, and never shown. Was a categorisation feature planned? Keep the field, or drop it (which would break export compatibility)?
11. `priority` in the export DTO — keep as a forward-compat placeholder, or remove?
12. Must the web app's export format be **byte-compatible** with the iOS export, so users can migrate their data across? (Recommended, and it constrains answers to 10 and 11.)

**Assets not supplied**

13. Exact colour values for the nine palette colours, `appBackground`, `cardBackground`, and the text/button/accent tokens — needed for visual parity. Can you export the asset catalogue values, or should I approximate from iOS system colours?
14. Font choices — the iOS app uses the system font with a rounded design for the detail-view title only. Which web font stack should stand in?
