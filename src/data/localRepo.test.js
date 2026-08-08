import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// vite.config.js has no `test` block, so Vitest runs in the default `node`
// environment — no `localStorage` global. Rather than pull in jsdom for one
// storage object, hand-roll the tiny subset localRepo.js actually uses.
function createLocalStorageMock() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

// localRepo.js reads localStorage into module-level state at import time,
// exactly like fixtureRepo.js does with its fixtures — so each test needs a
// fresh module instance (simulating a real page reload) to isolate state.
async function freshRepo() {
  vi.resetModules();
  const { localRepo } = await import("./localRepo.js");
  return localRepo;
}

beforeEach(() => {
  globalThis.localStorage = createLocalStorageMock();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("localRepo — tasks", () => {
  it("round-trips a created task across a reload", async () => {
    const repo1 = await freshRepo();
    await repo1.createTask({
      name: "Water plants",
      emoji: "🌱",
      frequencyAmount: 3,
      frequencyUnit: "Day",
      completions: [],
    });

    const repo2 = await freshRepo();
    const tasks = await repo2.listTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({ name: "Water plants", emoji: "🌱", frequencyAmount: 3 });
  });

  it("revives completion dates as real Date instances after a reload", async () => {
    const repo1 = await freshRepo();
    const created = await repo1.createTask({
      name: "Take vitamins",
      frequencyAmount: 1,
      frequencyUnit: "Day",
      completions: [],
    });
    const when = new Date("2026-01-05T09:00:00.000Z");
    await repo1.addCompletion(created.id, when);

    const repo2 = await freshRepo();
    const [task] = await repo2.listTasks();
    expect(task.completions[0].date).toBeInstanceOf(Date);
    expect(task.completions[0].date.getTime()).toBe(when.getTime());
  });

  it("generates unique ids for tasks and completions", async () => {
    const repo = await freshRepo();
    const a = await repo.createTask({ name: "A", frequencyAmount: 1, frequencyUnit: "Day", completions: [] });
    const b = await repo.createTask({ name: "B", frequencyAmount: 1, frequencyUnit: "Day", completions: [] });
    const c1 = await repo.addCompletion(a.id, new Date());
    const c2 = await repo.addCompletion(a.id, new Date());

    const ids = [a.id, b.id, c1.id, c2.id];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("persists updates and deletes immediately (no debounce)", async () => {
    const repo1 = await freshRepo();
    const created = await repo1.createTask({ name: "Old name", frequencyAmount: 1, frequencyUnit: "Week", completions: [] });
    await repo1.updateTask(created.id, { name: "New name" });

    const repo2 = await freshRepo();
    expect((await repo2.listTasks())[0].name).toBe("New name");

    await repo2.deleteTask(created.id);
    const repo3 = await freshRepo();
    expect(await repo3.listTasks()).toHaveLength(0);
  });

  it("falls back to an empty list when stored JSON is corrupted", async () => {
    localStorage.setItem("taskTracker/tasks", "{not valid json");
    const repo = await freshRepo();
    await expect(repo.listTasks()).resolves.toEqual([]);
  });

  it("rejects with a catchable Error when the write fails (e.g. quota exceeded)", async () => {
    const repo = await freshRepo();
    localStorage.setItem = () => {
      throw new DOMException("quota exceeded", "QuotaExceededError");
    };

    await expect(
      repo.createTask({ name: "Too big", frequencyAmount: 1, frequencyUnit: "Day", completions: [] })
    ).rejects.toThrow(/storage/i);
  });
});

describe("localRepo — settings", () => {
  it("reflects a saved change immediately, but debounces the localStorage write by 300ms", async () => {
    vi.useFakeTimers();
    const repo = await freshRepo();
    const setItemSpy = vi.spyOn(localStorage, "setItem");

    await repo.saveSettings({ sensitivity: "Strict" });
    expect((await repo.getSettings()).sensitivity).toBe("Strict");
    expect(setItemSpy).not.toHaveBeenCalledWith("taskTracker/settings", expect.anything());

    await vi.advanceTimersByTimeAsync(300);
    expect(setItemSpy).toHaveBeenCalledWith("taskTracker/settings", expect.stringContaining("Strict"));
  });

  it("coalesces rapid saves into a single write with the final merged value", async () => {
    vi.useFakeTimers();
    const repo = await freshRepo();
    const setItemSpy = vi.spyOn(localStorage, "setItem");

    await repo.saveSettings({ sensitivity: "Strict" });
    await repo.saveSettings({ theme: "Dark" });

    await vi.advanceTimersByTimeAsync(300);
    const settingsWrites = setItemSpy.mock.calls.filter(([key]) => key === "taskTracker/settings");
    expect(settingsWrites).toHaveLength(1);
    const written = JSON.parse(settingsWrites[0][1]);
    expect(written.settings).toMatchObject({ sensitivity: "Strict", theme: "Dark" });
  });

  it("falls back to defaults when stored settings JSON is corrupted", async () => {
    localStorage.setItem("taskTracker/settings", "{not valid json");
    const repo = await freshRepo();
    const settings = await repo.getSettings();
    expect(settings.sensitivity).toBe("Balanced");
  });
});
