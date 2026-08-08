import { describe, it, expect } from "vitest";
import { thresholds } from "./thresholds.js";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function task(overrides) {
  return {
    frequencyAmount: 1,
    frequencyUnit: "Week",
    completions: [],
    ...overrides,
  };
}

// Dates are exact to the millisecond, but fractional-day arithmetic
// (e.g. 1.4 days) hits floating-point rounding (1.4 * 86400000 comes out
// as 120959999.99999999, not 120960000). A day-level status check doesn't
// care, but an exact-equality test would be flaky. This checks "within a
// couple of seconds" instead of bit-for-bit equality.
function expectCloseTo(actual, expectedMs, label) {
  const diff = Math.abs(actual.getTime() - expectedMs);
  expect(diff, `${label}: off by ${diff}ms`).toBeLessThan(2000);
}

describe("thresholds — spec §3.4 worked examples (completion at midnight)", () => {
  // --- Every 1 day, all sensitivities (row 1) ---
  // Original spec table says "due - 1d (clamped)". The dev guide's
  // decision adds a half-interval cap specifically to fix this case, so
  // the correct current behaviour is due - 0.5d, not due - 1d.
  it.each(["Relaxed", "Balanced", "Strict"])(
    "daily task / %s: upcoming = due - 0.5d (half-interval cap), overdue = due + 3d (clamped)",
    (sensitivity) => {
      const t = task({
        frequencyAmount: 1,
        frequencyUnit: "Day",
        completions: [{ date: new Date("2026-01-01T00:00:00") }],
      });
      const r = thresholds(t, sensitivity);
      const due = r.dueDate.getTime();
      expectCloseTo(r.upcomingThreshold, due - 0.5 * ONE_DAY_MS, "upcoming");
      expectCloseTo(r.overdueThreshold, due + 3 * ONE_DAY_MS, "overdue");
    }
  );

  // --- Every 1 week (rows 2-4) ---
  const weeklyTask = task({
    frequencyAmount: 1,
    frequencyUnit: "Week",
    completions: [{ date: new Date("2026-01-01T00:00:00") }], // Thursday
  });

  it("weekly / Relaxed: upcoming = due - 1d (clamped), overdue = due + 7d", () => {
    const r = thresholds(weeklyTask, "Relaxed");
    const due = r.dueDate.getTime();
    expectCloseTo(r.upcomingThreshold, due - 1 * ONE_DAY_MS, "upcoming");
    expectCloseTo(r.overdueThreshold, due + 7 * ONE_DAY_MS, "overdue");
  });

  it("weekly / Balanced: upcoming = due - 1.4d, overdue = due + 3.5d", () => {
    const r = thresholds(weeklyTask, "Balanced");
    const due = r.dueDate.getTime();
    expectCloseTo(r.upcomingThreshold, due - 1.4 * ONE_DAY_MS, "upcoming");
    expectCloseTo(r.overdueThreshold, due + 3.5 * ONE_DAY_MS, "overdue");
  });

  it("weekly / Strict: upcoming = due - 2.1d, overdue = due + 3d (clamped)", () => {
    const r = thresholds(weeklyTask, "Strict");
    const due = r.dueDate.getTime();
    expectCloseTo(r.upcomingThreshold, due - 2.1 * ONE_DAY_MS, "upcoming");
    expectCloseTo(r.overdueThreshold, due + 3 * ONE_DAY_MS, "overdue");
  });

  // --- Every 1 month (rows 5-7) ---
  // April is chosen deliberately: it has exactly 30 days, so the interval
  // matches the spec table's "~30 d" approximation exactly rather than
  // needing its own rounding.
  const monthlyTask = task({
    frequencyAmount: 1,
    frequencyUnit: "Month",
    completions: [{ date: new Date("2026-04-01T00:00:00") }],
  });

  it("monthly (30d interval) / Relaxed: upcoming = due - 3d, overdue = due + 30d", () => {
    const r = thresholds(monthlyTask, "Relaxed");
    const due = r.dueDate.getTime();
    expectCloseTo(r.upcomingThreshold, due - 3 * ONE_DAY_MS, "upcoming");
    expectCloseTo(r.overdueThreshold, due + 30 * ONE_DAY_MS, "overdue");
  });

  it("monthly (30d interval) / Balanced: upcoming = due - 6d, overdue = due + 15d", () => {
    const r = thresholds(monthlyTask, "Balanced");
    const due = r.dueDate.getTime();
    expectCloseTo(r.upcomingThreshold, due - 6 * ONE_DAY_MS, "upcoming");
    expectCloseTo(r.overdueThreshold, due + 15 * ONE_DAY_MS, "overdue");
  });

  it("monthly (30d interval) / Strict: upcoming = due - 9d, overdue = due + 6d", () => {
    const r = thresholds(monthlyTask, "Strict");
    const due = r.dueDate.getTime();
    expectCloseTo(r.upcomingThreshold, due - 9 * ONE_DAY_MS, "upcoming");
    expectCloseTo(r.overdueThreshold, due + 6 * ONE_DAY_MS, "overdue");
  });

  // --- Every 1 year (rows 8-10) ---
  // 2026 is not a leap year, so Jan 1 2026 -> Jan 1 2027 is exactly 365
  // days, matching the spec table.
  const yearlyTask = task({
    frequencyAmount: 1,
    frequencyUnit: "Year",
    completions: [{ date: new Date("2026-01-01T00:00:00") }],
  });

  it("yearly / Relaxed: upcoming = due - 14d (clamped), overdue = due + 90d (clamped)", () => {
    const r = thresholds(yearlyTask, "Relaxed");
    const due = r.dueDate.getTime();
    expectCloseTo(r.upcomingThreshold, due - 14 * ONE_DAY_MS, "upcoming");
    expectCloseTo(r.overdueThreshold, due + 90 * ONE_DAY_MS, "overdue");
  });

  it("yearly / Balanced: upcoming = due - 14d (clamped), overdue = due + 90d (clamped)", () => {
    const r = thresholds(yearlyTask, "Balanced");
    const due = r.dueDate.getTime();
    expectCloseTo(r.upcomingThreshold, due - 14 * ONE_DAY_MS, "upcoming");
    expectCloseTo(r.overdueThreshold, due + 90 * ONE_DAY_MS, "overdue");
  });

  it("yearly / Strict: upcoming = due - 14d (clamped), overdue = due + 73d", () => {
    const r = thresholds(yearlyTask, "Strict");
    const due = r.dueDate.getTime();
    expectCloseTo(r.upcomingThreshold, due - 14 * ONE_DAY_MS, "upcoming");
    expectCloseTo(r.overdueThreshold, due + 73 * ONE_DAY_MS, "overdue");
  });
});

describe("thresholds — edge cases", () => {
  it("returns null when the task has no completions", () => {
    expect(thresholds(task({ completions: [] }), "Balanced")).toBeNull();
  });
});
