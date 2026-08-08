import { describe, it, expect } from "vitest";
import { dueDate } from "./dueDate.js";

function task(overrides) {
  return {
    frequencyAmount: 1,
    frequencyUnit: "Week",
    completions: [],
    ...overrides,
  };
}

describe("dueDate", () => {
  it("returns null when there are no completions", () => {
    expect(dueDate(task({ completions: [] }))).toBeNull();
  });

  it("adds days for Day frequency", () => {
    const t = task({
      frequencyAmount: 3,
      frequencyUnit: "Day",
      completions: [{ date: new Date("2026-01-01T10:00:00") }],
    });
    expect(dueDate(t)).toEqual(new Date("2026-01-04T00:00:00"));
  });

  it("adds weeks (as 7x days) for Week frequency", () => {
    const t = task({
      frequencyAmount: 2,
      frequencyUnit: "Week",
      completions: [{ date: new Date("2026-01-01T10:00:00") }],
    });
    expect(dueDate(t)).toEqual(new Date("2026-01-15T00:00:00"));
  });

  it("uses calendar months, not 30-day blocks: Jan 31 + 1 month = Feb 28", () => {
    const t = task({
      frequencyAmount: 1,
      frequencyUnit: "Month",
      completions: [{ date: new Date("2026-01-31T10:00:00") }],
    });
    expect(dueDate(t)).toEqual(new Date("2026-02-28T00:00:00"));
  });

  it("uses calendar years, respecting leap years", () => {
    const t = task({
      frequencyAmount: 1,
      frequencyUnit: "Year",
      completions: [{ date: new Date("2024-02-29T10:00:00") }],
    });
    expect(dueDate(t)).toEqual(new Date("2025-02-28T00:00:00"));
  });

  it("normalises last-completed time-of-day to midnight", () => {
    const t = task({
      frequencyAmount: 1,
      frequencyUnit: "Day",
      completions: [{ date: new Date("2026-01-01T23:50:00") }],
    });
    // Due at midnight the day after, not 23:50 the day after
    expect(dueDate(t)).toEqual(new Date("2026-01-02T00:00:00"));
  });

  it("uses the most recent of multiple completions", () => {
    const t = task({
      frequencyAmount: 1,
      frequencyUnit: "Day",
      completions: [
        { date: new Date("2026-01-01T08:00:00") },
        { date: new Date("2026-01-05T08:00:00") }, // most recent
        { date: new Date("2026-01-03T08:00:00") },
      ],
    });
    expect(dueDate(t)).toEqual(new Date("2026-01-06T00:00:00"));
  });
});
