// localStorage-backed implementation of the repository contract. Stage 3:
// swap this in for fixtureRepo.js (see repository.js) so data survives a
// reload. ui/ and data/mutations.js are untouched — they only ever import
// `repo` from repository.js.
//
// Every method is async, matching fixtureRepo.js, so the eventual Stage 5
// swap to supabaseRepo.js (a genuinely async network store) needs no call
// site changes.

const TASKS_KEY = "taskTracker/tasks";
const SETTINGS_KEY = "taskTracker/settings";
const SCHEMA_VERSION = 1;

function newId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function cloneTask(task) {
  return {
    ...task,
    completions: task.completions.map((c) => ({ ...c, date: new Date(c.date) })),
  };
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

// --- Serialization -----------------------------------------------------

function taskToJSON(task) {
  return {
    ...task,
    completions: task.completions.map((c) => ({ ...c, date: c.date.toISOString() })),
  };
}

function taskFromJSON(json) {
  return {
    ...json,
    completions: json.completions.map((c) => ({ ...c, date: new Date(c.date) })),
  };
}

// --- Load (once, at module init) ----------------------------------------

function loadTasks() {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (parsed.schemaVersion !== SCHEMA_VERSION || !Array.isArray(parsed.tasks)) {
      console.warn("taskTracker: unrecognised tasks blob, starting empty.");
      return [];
    }
    return parsed.tasks.map(taskFromJSON);
  } catch (err) {
    console.warn("taskTracker: failed to read stored tasks, starting empty.", err);
    return [];
  }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    if (parsed.schemaVersion !== SCHEMA_VERSION || !parsed.settings) {
      console.warn("taskTracker: unrecognised settings blob, using defaults.");
      return { ...DEFAULT_SETTINGS };
    }
    return { ...DEFAULT_SETTINGS, ...parsed.settings };
  } catch (err) {
    console.warn("taskTracker: failed to read stored settings, using defaults.", err);
    return { ...DEFAULT_SETTINGS };
  }
}

let tasks = loadTasks();
let settings = loadSettings();

// --- Persist --------------------------------------------------------------

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    throw new Error("Couldn't save changes locally: storage is full or unavailable.", {
      cause: err,
    });
  }
}

function persistTasks() {
  writeStorage(TASKS_KEY, { schemaVersion: SCHEMA_VERSION, tasks: tasks.map(taskToJSON) });
}

let settingsTimer = null;
function persistSettingsNow() {
  writeStorage(SETTINGS_KEY, { schemaVersion: SCHEMA_VERSION, settings });
}
function scheduleSettingsPersist() {
  clearTimeout(settingsTimer);
  settingsTimer = setTimeout(persistSettingsNow, 300);
}

// --- Repository -------------------------------------------------------

export const localRepo = {
  async listTasks() {
    return tasks.map(cloneTask);
  },

  async createTask(task) {
    const created = cloneTask({ id: newId("t"), category: "Home", emoji: "", completions: [], ...task });
    tasks.push(created);
    persistTasks();
    return cloneTask(created);
  },

  async updateTask(id, patch) {
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) throw new Error(`No task with id ${id}`);
    tasks[index] = cloneTask({ ...tasks[index], ...patch, id });
    persistTasks();
    return cloneTask(tasks[index]);
  },

  async deleteTask(id) {
    tasks = tasks.filter((t) => t.id !== id);
    persistTasks();
  },

  async addCompletion(taskId, date) {
    const t = tasks.find((t) => t.id === taskId);
    if (!t) throw new Error(`No task with id ${taskId}`);
    const record = { id: newId("c"), date: new Date(date) };
    t.completions.push(record);
    persistTasks();
    return { ...record };
  },

  async removeCompletion(completionId) {
    for (const t of tasks) {
      const before = t.completions.length;
      t.completions = t.completions.filter((c) => c.id !== completionId);
      if (t.completions.length !== before) {
        persistTasks();
        return;
      }
    }
  },

  async getSettings() {
    return { ...settings, colours: { ...settings.colours } };
  },

  async saveSettings(patch) {
    settings = { ...settings, ...patch };
    scheduleSettingsPersist();
    return { ...settings, colours: { ...settings.colours } };
  },
};
