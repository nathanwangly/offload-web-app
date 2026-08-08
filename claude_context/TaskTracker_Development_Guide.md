# Task Tracker — Web Port Development Guide

A high-level reference for building the web version of the iOS Task Tracker app.
Read alongside `TaskTracker_Specification.md`, which is the detailed functional spec.

**Stack:** Vite + React (plain SPA, no Next.js), JavaScript, `date-fns`, Vitest,
Vercel (hosting), Supabase (backend, added later).
**Constraint:** everything must fit within free tiers.

---

## Guiding principles

Four rules that shape every decision. When in doubt, return to these.

1. **Logic before UI, UI before storage.** The status/due-date maths (§3 of the
   spec) is where the real risk lives and it's invisible in testing. Build and
   test it first, with no interface. Then build the UI on fake data. Add real
   storage last.

2. **Put a seam between the app and its storage on day one.** All data access
   goes through one `repository` module with an **async** interface. "Fixtures →
   localStorage → Supabase" then becomes three implementations of one contract,
   and no UI code changes when you swap them.

3. **`domain/` is pure and portable.** No DOM, no React, no browser APIs, no
   imports from other folders. This lets the same files run later inside a
   Supabase Edge Function (Deno), guaranteeing the server and client compute due
   dates identically. If a function can't be tested without a browser, it's in
   the wrong folder.

4. **`now` is always a parameter, never `new Date()` called inside a function.**
   Otherwise you can't test "what does this look like in three weeks" without
   mocking the system clock — and so you won't test it.

---

## Folder structure

```
src/
  domain/    pure functions — no DOM, no React, imports nothing from ui/ or data/
  data/      repository interface + implementations (fixture, local, supabase)
  ui/        components and screens
  styles/    colour tokens (CSS custom properties), theme
```

The dependency rule: `ui/` imports from `data/` and `domain/`; `data/` imports
from `domain/`; `domain/` imports from nothing internal.

---

## The repository contract

Defined once, in `data/repository.js`. Every method is async (returns a Promise)
even when the underlying store is synchronous — this is what makes the Supabase
swap cheap later.

```js
export const repo = {
  async listTasks() {},
  async createTask(task) {},
  async updateTask(id, patch) {},
  async deleteTask(id) {},
  async addCompletion(taskId, date) {},
  async removeCompletion(completionId) {},
  async getSettings() {},
  async saveSettings(settings) {},
};
```

Implementations behind it, introduced one stage at a time:
`fixtureRepo.js` → `localRepo.js` → `supabaseRepo.js`. The UI imports `repo` and
never knows which is live.

---

## The stages

Stages 0–4 produce a finished, shippable, local-only app. Stages 5–6 are additive
and don't require rewriting what came before.

| # | Stage | Done when |
|---|---|---|
| 0 | Scaffold + deploy pipeline | A blank page is live on Vercel and a commit auto-deploys |
| 1 | Domain logic + tests | The spec's §3.4 worked-example table passes as tests |
| 2 | UI on fixtures (+ PWA manifest) | App is fully clickable; nothing persists on reload |
| 3 | Local persistence | Reload keeps your data |
| 4 | Import / export | An iOS export file imports cleanly |
| 5 | Supabase auth + sync | Data survives across devices and browsers |
| 6 | Web Push notifications | Optional v2; groundwork already laid |

### Stage 0 — Scaffold

Get the deployment pipeline working while there's nothing to break. Scaffold with
Vite, push to Git, connect the repo to Vercel, confirm auto-deploy. Add `vitest`,
`date-fns`, Prettier. Create the empty `domain/ data/ ui/ styles/` folders.

### Stage 1 — Domain logic (the important stage)

Pure functions with tests, no UI:

- `dueDate(task)` — §3.1 (calendar arithmetic: use `date-fns addMonths`, not
  millisecond maths, so Jan 31 + 1 month = Feb 28)
- `thresholds(task, sensitivity)` — §3.2
- `status(task, sensitivity, now)` — §3.3
- `relative(date, now)`, `statusText(task, now)` — §3.5
- `gapText(older, newer)` — §3.6
- `partitionAndSort(tasks, searchText, sensitivity, now)` — §4

Transcribe the spec's §3.4 table directly into tests. That table is the
executable definition of correct. ~300 lines of code, ~300 of tests; de-risks the
whole project.

### Stage 2 — UI on fixtures

Write `fixtures.js` with ~12 tasks covering every edge: one of each of the five
statuses, one daily, one yearly, one with 20 completions, one 40-char name, one
with no emoji, one whose name is a substring of another (for search).

Build screens in this order (each usable before the next exists):
Home list → task row + two-phase completion animation → detail sheet →
add/edit form → settings.

Also in this stage:
- Colour palette as CSS custom properties; theme via `data-theme` on `<html>`.
- Mobile-first, ~400px centred column.
- **PWA manifest** (`vite-plugin-pwa`, no-op service worker) — done now, not in
  Stage 6, because it enables home-screen install (which exempts you from Safari
  storage eviction) and is the precondition for notifications later.
- Framer Motion for the section-to-section card slide.

### Stage 3 — Local persistence

Swap `fixtureRepo` for `localRepo` on **localStorage** (not IndexedDB — the data
is tiny, IndexedDB only adds async complexity). Keep the 300 ms settings debounce.
End state: a genuinely usable app deployed on Vercel, no backend.

### Stage 4 — Import / export

Do this before Supabase — it's your migration path off iOS and your only backup
until accounts exist. Format is fully specified in §8. Fix the case-sensitivity
mismatch (§2.4) and actually surface skipped/error counts here.

### Stage 5 — Supabase

Two tables (`tasks`, `completions`), each with `user_id` and row-level security
restricting rows to `auth.uid()`. Auth via magic links (no passwords). Store times
as `timestamptz` (UTC), render in local time. Swap `localRepo` for `supabaseRepo`;
UI untouched.

### Stage 6 — Web Push (optional)

Needs: PWA install, real service worker, VAPID keys, `push_subscriptions` table,
a Supabase Edge Function recomputing thresholds, `pg_cron` running hourly. Cheap
only because Stages 1–2 laid the groundwork. Default alternative: the home screen
simply *is* the prioritised "what's due" list — most of the value, little of the
cost.

---

## Decisions already made

Settled defaults from the spec's open questions — proceed on these unless a reason
to revisit emerges.

| Spec § | Question | Decision |
|---|---|---|
| 3.2 | `interval` time-of-day quirk | **Fix** — compute from `startOfDay(lastCompleted)` so behaviour is deterministic and the §3.4 table holds |
| 3.4 | Clamp values | Keep, but cap upcoming lead at half the interval — fixes "daily tasks permanently upcoming" without re-tuning |
| 5.6 | Notification pref vs permission | **Decouple** — store preference separately; permission only gates effect |
| 5.4 | Full history / delete confirm | Show full history; replace confirm dialog with an undo toast |
| 5.4 | Label inconsistencies | **Align** — "DUE" and "ON TRACK" everywhere |
| 2.4 | Name uniqueness | Case-insensitive, trimmed, **everywhere** (form + import + storage) |
| 12.10 | `category` field | Keep in storage + export for round-trip; no UI |
| 12.11 | `priority` field | Keep constant `1` in export for byte-compatibility |
| 12.12 | Export byte-compatibility | **Yes** — cheap now, it's the iOS migration path |
| 12.13 | Colour values | Approximate from iOS system colours; exact hex droppable later without logic changes |
| 12.14 | Font | System font stack (`-apple-system, …`) |

---

## Notification-readiness checklist

Even though notifications are out of scope for v1, these keep the door open at
near-zero cost. Do them in the stage noted.

- [ ] **Domain logic stays Deno-portable** (no browser/React imports) — Stage 1
- [ ] **Capture IANA timezone** into settings at first run
      (`Intl.DateTimeFormat().resolvedOptions().timeZone`) — Stage 2/3
- [ ] **PWA manifest** added — Stage 2
- [ ] **Notification settings fields in the schema** (`notificationsEnabled`,
      `notifyOverdue`, `notifyDue`, `notifyUpcoming`, `notifyTime`), no UI yet —
      Stage 2/3
- [ ] **Mutations routed through explicit functions** (one `completeTask()`, not
      five inline handlers) so "recompute schedule" has one place to hang off —
      throughout

---

## Free-tier watch points

Surface these before they bite:

- **Supabase free tier** pauses a project after ~1 week of inactivity — relevant
  for a low-frequency app; first request after a pause is slow.
- **Safari (iOS) evicts script-writable storage** after 7 days of no visits for
  non-installed sites. This is *the* reason to ship the PWA manifest early and
  the strongest argument for eventually moving data to Supabase.
- **`pg_cron` / Edge Functions** exist on the free tier but with limits — only
  relevant at Stage 6.

---

## Suggested working order per stage

1. Read the relevant spec section(s) in full.
2. Write the smallest thing that could work.
3. For `domain/`, write the test *from the spec table* before or alongside the code.
4. Deploy after every stage — a broken deploy is easiest to diagnose when little
   has changed since the last good one.
5. Commit in small, described steps.
