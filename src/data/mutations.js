// Explicit named mutation functions, routed through instead of inline
// repo calls scattered across components — so "recompute schedule" /
// duplicate-name checking / etc. each have exactly one place to live.

import { differenceInCalendarDays } from "date-fns";
import { repo } from "./repository.js";
import { getLastCompletion } from "../domain/taskHelpers.js";

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
 * Edits the task's own fields only — never touches completion history.
 * Callers that also need to change the last-completed date (the edit form
 * does) call updateLastCompleted() separately.
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

/**
 * Updates a task's most recent completion date, for the edit form's
 * "last completed" field. Doesn't touch any earlier completion history —
 * only ever adds, replaces, or removes the single latest record.
 *
 * @param {object} task - the full task, including its `completions` array
 *   (as returned by repo.listTasks()/repo.createTask() etc.)
 * @param {Date|null} date - the new last-completed date, or null to clear it
 */
export async function updateLastCompleted(task, date) {
  const current = getLastCompletion(task);
  const unchanged =
    current && date && differenceInCalendarDays(date, current.date) === 0;
  if (unchanged) return;

  if (current) await repo.removeCompletion(current.id);
  if (date) await repo.addCompletion(task.id, date);
}
