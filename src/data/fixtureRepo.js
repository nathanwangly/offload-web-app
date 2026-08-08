// In-memory implementation of the repository contract, seeded from
// fixtures.js. Nothing persists across a reload — that's Stage 3's job
// (swap this file for localRepo.js; ui/ never needs to change).
//
// Every method is async even though the store is synchronous, per the dev
// guide, so later swaps (localStorage, Supabase) don't change call sites.

import { FIXTURE_TASKS } from "./fixtures.js";

function cloneTask(task) {
  return {
    ...task,
    completions: task.completions.map((c) => ({ ...c, date: new Date(c.date) })),
  };
}

let tasks = FIXTURE_TASKS.map(cloneTask);

let nextId = 1000;
function newId(prefix) {
  return `${prefix}-${nextId++}`;
}

const DEFAULT_SETTINGS = {
  sensitivity: "Balanced",
  defaultFrequencyUnit: "Week",
  theme: "System",
  colours: {
    overdue: "appRed",
    due: "appOrange",
    upcoming: "appYellow",
    notDueYet: "appGrey",
  },
  // Notification-readiness fields (schema exists, no UI/wiring yet — that's
  // Stage 6). Kept here so nothing has to be retrofitted into the shape later.
  notificationsEnabled: false,
  notifyOverdue: true,
  notifyDue: true,
  notifyUpcoming: true,
  notifyTime: "08:00",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

let settings = { ...DEFAULT_SETTINGS };

export const fixtureRepo = {
  async listTasks() {
    return tasks.map(cloneTask);
  },

  async createTask(task) {
    const created = cloneTask({ id: newId("t"), category: "Home", emoji: "", completions: [], ...task });
    tasks.push(created);
    return cloneTask(created);
  },

  async updateTask(id, patch) {
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) throw new Error(`No task with id ${id}`);
    tasks[index] = cloneTask({ ...tasks[index], ...patch, id });
    return cloneTask(tasks[index]);
  },

  async deleteTask(id) {
    tasks = tasks.filter((t) => t.id !== id);
  },

  async addCompletion(taskId, date) {
    const t = tasks.find((t) => t.id === taskId);
    if (!t) throw new Error(`No task with id ${taskId}`);
    const record = { id: newId("c"), date: new Date(date) };
    t.completions.push(record);
    return { ...record };
  },

  async removeCompletion(completionId) {
    for (const t of tasks) {
      const before = t.completions.length;
      t.completions = t.completions.filter((c) => c.id !== completionId);
      if (t.completions.length !== before) return;
    }
  },

  async getSettings() {
    return { ...settings, colours: { ...settings.colours } };
  },

  async saveSettings(patch) {
    settings = { ...settings, ...patch };
    return { ...settings, colours: { ...settings.colours } };
  },
};
