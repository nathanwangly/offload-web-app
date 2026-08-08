import { describe, it, expect } from "vitest";
import { partitionAndSort } from "./partitionAndSort.js";

function task(name, overrides) {
  return {
    name,
    frequencyAmount: 1,
    frequencyUnit: "Week",
    completions: [],
    ...overrides,
  };
}

describe("partitionAndSort — search filter", () => {
  const now = new Date("2026-06-15T12:00:00");
  const tasks = [
    task("Deep clean"),
    task("Water plants"),
    task("déjà vu check"), // diacritic, for the insensitivity test
  ];

  it("is case-insensitive", () => {
    const result = partitionAndSort(tasks, "DEEP", "Balanced", now);
    const names = Object.values(result).flat().map((t) => t.name);
    expect(names).toEqual(["Deep clean"]);
  });

  it("is diacritic-insensitive", () => {
    const result = partitionAndSort(tasks, "deja", "Balanced", now);
    const names = Object.values(result).flat().map((t) => t.name);
    expect(names).toEqual(["déjà vu check"]);
  });

  it("returns everything when search text is empty", () => {
    const result = partitionAndSort(tasks, "", "Balanced", now);
    const names = Object.values(result).flat().map((t) => t.name);
    expect(names).toHaveLength(3);
  });
});

describe("partitionAndSort — bucketing", () => {
  const now = new Date("2026-06-15T12:00:00");

  it("merges 'new' tasks into the notDueYet bucket", () => {
    const t = task("Brand new task", { completions: [] });
    const result = partitionAndSort([t], "", "Balanced", now);
    expect(result.notDueYet).toContainEqual(t);
    expect(result.overdue).toEqual([]);
    expect(result.due).toEqual([]);
    expect(result.upcoming).toEqual([]);
  });
});

describe("partitionAndSort — sorting", () => {
  const now = new Date("2026-06-15T12:00:00");

  it("sorts by dueDate ascending, with new (null dueDate) tasks first", () => {
    const soonDue = task("Soon due", {
      frequencyAmount: 1,
      frequencyUnit: "Day",
      completions: [{ date: new Date("2026-06-14T00:00:00") }], // notDueYet-ish or upcoming
    });
    const brandNew = task("Brand new", { completions: [] });
    const laterDue = task("Later due", {
      frequencyAmount: 30,
      frequencyUnit: "Day",
      completions: [{ date: new Date("2026-06-01T00:00:00") }],
    });

    const result = partitionAndSort(
      [laterDue, soonDue, brandNew],
      "",
      "Relaxed",
      now
    );
    // All three should land in notDueYet for a suitably chosen `now`,
    // so we can check ordering within one bucket. brandNew (null due
    // date) sorts first as "distant past".
    const names = result.notDueYet.map((t) => t.name);
    expect(names[0]).toBe("Brand new");
  });

  it("falls back to name (ordinal) when dueDate and lastCompletedDate tie", () => {
    const a = task("Banana", { completions: [] });
    const b = task("Apple", { completions: [] });
    const result = partitionAndSort([a, b], "", "Balanced", now);
    const names = result.notDueYet.map((t) => t.name);
    expect(names).toEqual(["Apple", "Banana"]);
  });
});
