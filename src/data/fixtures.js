// Fixture tasks for Stage 2 (UI on fixtures). ~12 tasks covering every edge
// case called out in the dev guide: one of each of the five statuses, one
// daily, one yearly, one with 20 completions, one 40-char name, one with no
// emoji, and one whose name is a substring of another (for search).
//
// Dates are chosen relative to "today" so the fixtures keep making sense
// whenever the app is actually opened, rather than being pinned to one
// hard-coded date that drifts stale.

function daysAgo(n) {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

function monthsAgo(n) {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  d.setMonth(d.getMonth() - n);
  return d;
}

let nextId = 1;
function id(prefix) {
  return `${prefix}-${nextId++}`;
}

function completion(date) {
  return { id: id("c"), date };
}

function task(overrides) {
  return {
    id: id("t"),
    category: "Home",
    emoji: "",
    completions: [],
    ...overrides,
  };
}

// 20 roughly-weekly completions going back ~5 months, for the
// full-history / gap-text / scroll edge case.
const trashCompletions = Array.from({ length: 20 }, (_, i) =>
  completion(daysAgo(7 * (20 - i)))
);

export const FIXTURE_TASKS = [
  // 1. Overdue — monthly, completed ~45 days ago.
  task({
    name: "Clean gutters",
    emoji: "🏠",
    frequencyAmount: 1,
    frequencyUnit: "Month",
    completions: [completion(daysAgo(45))],
  }),

  // 2. Due — every 3 days, completed ~3 days ago.
  task({
    name: "Water plants",
    emoji: "🌱",
    frequencyAmount: 3,
    frequencyUnit: "Day",
    completions: [completion(daysAgo(3))],
  }),

  // 3. Upcoming — weekly, completed ~5.5 days ago.
  task({
    name: "Change bedsheets",
    emoji: "🛏️",
    frequencyAmount: 1,
    frequencyUnit: "Week",
    completions: [completion(daysAgo(6))],
  }),

  // 4. Not due yet — weekly, completed yesterday.
  task({
    name: "Vacuum living room",
    emoji: "🧹",
    frequencyAmount: 1,
    frequencyUnit: "Week",
    completions: [completion(daysAgo(1))],
  }),

  // 5. New — zero completions.
  task({
    name: "Learn guitar",
    emoji: "🎸",
    frequencyAmount: 1,
    frequencyUnit: "Week",
    completions: [],
  }),

  // 6. Daily — completed today (exercises the half-interval upcoming cap).
  task({
    name: "Take vitamins",
    emoji: "💊",
    frequencyAmount: 1,
    frequencyUnit: "Day",
    completions: [completion(daysAgo(0))],
  }),

  // 7. Yearly — completed ~11 months ago.
  task({
    name: "Renew passport",
    emoji: "🛂",
    frequencyAmount: 1,
    frequencyUnit: "Year",
    completions: [completion(monthsAgo(11))],
  }),

  // 8. 20 completions — weekly, ~5 months of history.
  task({
    name: "Take out trash",
    emoji: "🗑️",
    frequencyAmount: 1,
    frequencyUnit: "Week",
    completions: trashCompletions,
  }),

  // 9. 40-char name.
  task({
    name: "Deep clean the entire kitchen and pantry",
    emoji: "🍽️",
    frequencyAmount: 2,
    frequencyUnit: "Month",
    completions: [completion(daysAgo(20))],
  }),

  // 10. No emoji — tests the empty emoji slot.
  task({
    name: "Pay rent",
    emoji: "",
    frequencyAmount: 1,
    frequencyUnit: "Month",
    completions: [completion(daysAgo(10))],
  }),

  // 11-12. Substring name pair, for search.
  task({
    name: "Clean",
    emoji: "🧽",
    frequencyAmount: 2,
    frequencyUnit: "Week",
    completions: [completion(daysAgo(4))],
  }),
  task({
    name: "Clean bathroom",
    emoji: "🚿",
    frequencyAmount: 1,
    frequencyUnit: "Week",
    completions: [completion(daysAgo(2))],
  }),

  // 13. One more everyday task, rounds the list out.
  task({
    name: "Feed cat",
    emoji: "🐱",
    frequencyAmount: 1,
    frequencyUnit: "Day",
    completions: [completion(daysAgo(0)), completion(daysAgo(1))],
  }),
];
