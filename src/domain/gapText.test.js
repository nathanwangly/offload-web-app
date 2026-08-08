import { describe, it, expect } from "vitest";
import { gapText } from "./gapText.js";

describe("gapText", () => {
  it("returns 'Same day' for identical dates", () => {
    const d = new Date("2026-01-05T10:00:00");
    expect(gapText(d, d)).toBe("Same day");
  });

  it("returns 'Same day' when newer is before older (defensive)", () => {
    const older = new Date("2026-01-05");
    const newer = new Date("2026-01-01");
    expect(gapText(older, newer)).toBe("Same day");
  });

  it("returns plain day count under a week", () => {
    const older = new Date("2026-01-01");
    const newer = new Date("2026-01-04");
    expect(gapText(older, newer)).toBe("3 day gap");
  });

  it("does not pluralise '1 day gap' specially (spec: no plural handling)", () => {
    const older = new Date("2026-01-01");
    const newer = new Date("2026-01-03");
    expect(gapText(older, newer)).toBe("2 day gap");
  });

  it("uses integer division for weeks: 13 days -> 1 week gap", () => {
    const older = new Date("2026-01-01");
    const newer = new Date("2026-01-14"); // 13 days later
    expect(gapText(older, newer)).toBe("1 week gap");
  });

  it("uses integer division for months: 59 days -> 1 month gap", () => {
    const older = new Date("2026-01-01");
    const newer = new Date("2026-03-01"); // 59 days later
    expect(gapText(older, newer)).toBe("1 month gap");
  });

  it("uses integer division for years: 400 days -> 1 year gap", () => {
    const older = new Date("2025-01-01");
    const newer = new Date("2026-02-05"); // 400 days later
    expect(gapText(older, newer)).toBe("1 year gap");
  });

  it("normalises to start-of-day, ignoring time-of-day", () => {
    const older = new Date("2026-01-01T23:50:00");
    const newer = new Date("2026-01-02T00:05:00");
    // Only 15 minutes apart, but crosses a midnight boundary -> 1 day gap
    expect(gapText(older, newer)).toBe("1 day gap");
  });
});
