// Supabase-backed implementation of the repository contract (see
// repository.js). Same 8 methods as localRepo.js/fixtureRepo.js, so
// mutations.js and ui/ need no changes. Row-level security (auth.uid())
// does the per-user scoping — every insert relies on the `user_id`
// column's `default auth.uid()`, so this file never touches `user_id`
// directly.
import { supabase } from "./supabaseClient.js";
import { DEFAULT_SETTINGS } from "./defaultSettings.js";

function rowToTask(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    emoji: row.emoji,
    frequencyAmount: row.frequency_amount,
    frequencyUnit: row.frequency_unit,
    completions: (row.completions ?? []).map((c) => ({
      id: c.id,
      date: new Date(c.date),
    })),
  };
}

function must(error, message) {
  if (error) throw new Error(message, { cause: error });
}

export const supabaseRepo = {
  async listTasks() {
    const { data, error } = await supabase
      .from("tasks")
      .select("*, completions(id, date)")
      .order("created_at", { ascending: true });
    must(error, "Couldn't load tasks.");
    return data.map(rowToTask);
  },

  async createTask(task) {
    const { data: taskRow, error: taskError } = await supabase
      .from("tasks")
      .insert({
        name: task.name,
        category: task.category ?? "Home",
        emoji: task.emoji ?? "",
        frequency_amount: task.frequencyAmount,
        frequency_unit: task.frequencyUnit,
      })
      .select()
      .single();
    must(taskError, "Couldn't save the new task.");

    let completions = [];
    if (task.completions?.length) {
      const { data: completionRows, error: completionError } = await supabase
        .from("completions")
        .insert(
          task.completions.map((c) => ({
            task_id: taskRow.id,
            date: new Date(c.date).toISOString(),
          }))
        )
        .select();
      must(completionError, "Couldn't save the task's completion history.");
      completions = completionRows;
    }

    return rowToTask({ ...taskRow, completions });
  },

  async updateTask(id, patch) {
    const columns = {};
    if ("name" in patch) columns.name = patch.name;
    if ("emoji" in patch) columns.emoji = patch.emoji;
    if ("category" in patch) columns.category = patch.category;
    if ("frequencyAmount" in patch) columns.frequency_amount = patch.frequencyAmount;
    if ("frequencyUnit" in patch) columns.frequency_unit = patch.frequencyUnit;

    const { data, error } = await supabase
      .from("tasks")
      .update(columns)
      .eq("id", id)
      .select("*, completions(id, date)")
      .single();
    must(error, "Couldn't update the task.");
    return rowToTask(data);
  },

  async deleteTask(id) {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    must(error, "Couldn't delete the task.");
  },

  async addCompletion(taskId, date) {
    const { data, error } = await supabase
      .from("completions")
      .insert({ task_id: taskId, date: new Date(date).toISOString() })
      .select()
      .single();
    must(error, "Couldn't record the completion.");
    return { id: data.id, date: new Date(data.date) };
  },

  async removeCompletion(completionId) {
    const { error } = await supabase.from("completions").delete().eq("id", completionId);
    must(error, "Couldn't remove the completion.");
  },

  async getSettings() {
    const { data, error } = await supabase
      .from("settings")
      .select("data")
      .maybeSingle();
    must(error, "Couldn't load settings.");
    const saved = data?.data ?? {};
    return { ...DEFAULT_SETTINGS, ...saved, colours: { ...DEFAULT_SETTINGS.colours, ...saved.colours } };
  },

  async saveSettings(patch) {
    const current = await this.getSettings();
    const next = { ...current, ...patch };
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("settings")
      .upsert({ user_id: user.id, data: next, updated_at: new Date().toISOString() });
    must(error, "Couldn't save settings.");
    return next;
  },
};
