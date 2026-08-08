import { describe, it, expect } from "vitest";
import { status } from "./status.js";

function task(overrides) {
  return {
    frequencyAmount: 1,
    frequencyUnit: "Week",
    completions: [],
    ...overrides,
  };
}

describe("status", () => {
  it("is 'new' when there are no completions, regardless of now", () => {
    const t = task({ completions: [] });
    expect(status(t, "Balanced", new Date("2030-01-01"))).toBe("new");
  });

  // Weekly / Balanced: due = completion + 7d, upcoming starts due - 1.4d,
  // overdue starts due + 3.5d (from the thresholds table above).
  const t = task({
    frequencyAmount: 1,
    frequencyUnit: "Week",
    completions: [{ date: new Date("2026-01-01T00:00:00") }], // due 2026-01-08
  });

  it("is 'notDueYet' well before the upcoming threshold", () => {
    expect(status(t, "Balanced", new Date("2026-01-02T00:00:00"))).toBe(
      "notDueYet"
    );
  });

  it("is 'upcoming' between the upcoming threshold and the due date", () => {
    // upcoming threshold ~ 2026-01-06T14:24
    expect(status(t, "Balanced", new Date("2026-01-07T00:00:00"))).toBe(
      "upcoming"
    );
  });

  it("is 'due' exactly at the due date", () => {
    expect(status(t, "Balanced", new Date("2026-01-08T00:00:00"))).toBe(
      "due"
    );
  });

  it("is still 'due' shortly after the due date, before the overdue grace ends", () => {
    expect(status(t, "Balanced", new Date("2026-01-09T00:00:00"))).toBe(
      "due"
    );
  });

  it("is 'overdue' once the overdue threshold has passed", () => {
    // overdue threshold ~ 2026-01-11T12:00
    expect(status(t, "Balanced", new Date("2026-01-12T00:00:00"))).toBe(
      "overdue"
    );
  });
});
