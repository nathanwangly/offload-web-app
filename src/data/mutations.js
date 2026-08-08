// Explicit named mutation functions, routed through instead of inline
// repo calls scattered across components — so "recompute schedule" /
// duplicate-name checking / etc. each have exactly one place to live.

import { repo } from "./repository.js";

function normalizeName(name) {
  return name.trim().toLowerCase();
}

/**
 * Throws if `name` collides (case-insensitive, trimmed) with an existing
 * task, excluding `excludeId` (used when editing a task against itself).
 */
async function assertNameAvailable(name, excludeId) {
  const tasks = await repo.listTasks();
  const normalized = normalizeName(name);
  const collision = tasks.some(
    (t) => t.id !== excludeId && normalizeName(t.name) === normalized
  );
  if (collision) {
    throw new Error(`A task named "${name.trim()}" already exists.`);
  }
}

export async function completeTask(taskId, date = new Date()) {
  return repo.addCompletion(taskId, date);
}

export async function uncompleteTask(completionId) {
  return repo.removeCompletion(completionId);
}

/**
 * @param {{name: string, emoji?: string, frequencyAmount: number, frequencyUnit: string, lastCompleted?: Date|null}} input
 */
export async function createTask(input) {
  const name = input.name.trim();
  if (!name) throw new Error("Name is required.");
  await assertNameAvailable(name);

  const completions = input.lastCompleted ? [{ date: input.lastCompleted }] : [];
  return repo.createTask({
    name,
    emoji: input.emoji ?? "",
    frequencyAmount: input.frequencyAmount,
    frequencyUnit: input.frequencyUnit,
    completions,
  });
}

/**
 * Edit never touches completion history — only the task's own fields.
 * @param {string} id
 * @param {{name: string, emoji?: string, frequencyAmount: number, frequencyUnit: string}} input
 */
export async function editTask(id, input) {
  const name = input.name.trim();
  if (!name) throw new Error("Name is required.");
  await assertNameAvailable(name, id);

  return repo.updateTask(id, {
    name,
    emoji: input.emoji ?? "",
    frequencyAmount: input.frequencyAmount,
    frequencyUnit: input.frequencyUnit,
  });
}

export async function deleteTask(id) {
  return repo.deleteTask(id);
}
