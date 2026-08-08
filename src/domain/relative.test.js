import { describe, it, expect } from "vitest";
import { relative, statusText } from "./relative.js";

describe("relative", () => {
  const now = new Date("2026-06-15T12:00:00");

  it("returns 'today' for the same calendar day", () => {
    expect(relative(new Date("2026-06-15T23:00:00"), now)).toBe("today");
  });

  it("returns 'yesterday'", () => {
    expect(relative(new Date("2026-06-14T08:00:00"), now)).toBe("yesterday");
  });

  it("returns 'tomorrow'", () => {
    expect(relative(new Date("2026-06-16T08:00:00"), now)).toBe("tomorrow");
  });

  it("returns 'over a year ago' for anything more than 365 days in the past", () => {
    expect(relative(new Date("2024-01-01T12:00:00"), now)).toBe(
      "over a year ago"
    );
  });

  it("falls through to Intl auto-unit formatting for other dates", () => {
    // 3 calendar days ahead, well past the "today/tomorrow" special cases
    const threeDaysAhead = new Date("2026-06-18T12:00:00");
    expect(relative(threeDaysAhead, now)).toBe("in 3 days");
  });

  it("is sensitive to time-of-day, not just calendar day (documents a known quirk)", () => {
    // 25 hours away -> reads "in 1 day"
    const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    expect(relative(in25h, now)).toBe("tomorrow"); // still same/next calendar day special-case

    // Use a date far enough that special-casing doesn't apply, to see the
    // raw-timestamp sensitivity of the auto-unit formatter directly.
    const weekAnd1h = new Date(now.getTime() + (7 * 24 + 1) * 60 * 60 * 1000);
    const weekMinus1h = new Date(
      now.getTime() + (7 * 24 - 1) * 60 * 60 * 1000
    );
    expect(relative(weekAnd1h, now)).toBe("next week");
    expect(relative(weekMinus1h, now)).toBe("in 7 days");
  });
});

describe("statusText", () => {
  const now = new Date("2026-06-15T12:00:00");

  it("shows the awaiting-first-completion text for 'new'", () => {
    const t = { completions: [] };
    expect(statusText(t, "new", now)).toBe("Awaiting first completion");
  });

  it("shows capitalised 'Last completed: ...' for 'notDueYet'", () => {
    const t = {
      completions: [{ date: new Date("2026-06-14T09:00:00") }],
    };
    expect(statusText(t, "notDueYet", now)).toBe("Last completed: Yesterday");
  });

  it("shows 'Due ...' for overdue/due/upcoming", () => {
    const t = {
      frequencyAmount: 1,
      frequencyUnit: "Day",
      completions: [{ date: new Date("2026-06-14T09:00:00") }], // due 2026-06-15 00:00
    };
    expect(statusText(t, "due", now)).toBe("Due today");
  });
});
