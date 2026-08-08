import { startOfDay, addDays, addMonths, addYears } from "date-fns";
import { hasCompletions, getLastCompletedDate } from "./taskHelpers.js";

/**
 * Calculates a task's due date (spec §3.1).
 *
 * Two things this deliberately gets right:
 * - Normalises the last-completed timestamp to start-of-day first, so due
 *   dates always land on midnight boundaries regardless of what time the
 *   task was completed.
 * - Uses calendar arithmetic (date-fns addMonths/addYears) for Month/Year
 *   frequencies, not a fixed 30/365-day offset. Jan 31 + 1 month = Feb 28.
 *
 * @param {Object} task - { frequencyAmount, frequencyUnit, completions }
 * @returns {Date|null} null if the task has no completions yet
 */
export function dueDate(task) {
  if (!hasCompletions(task)) return null;

  const base = startOfDay(getLastCompletedDate(task));
  const amount = task.frequencyAmount;

  switch (task.frequencyUnit) {
    case "Day":
      return addDays(base, amount);
    case "Week":
      return addDays(base, amount * 7);
    case "Month":
      return addMonths(base, amount);
    case "Year":
      return addYears(base, amount);
    default:
      // Spec §3.1: unrecognised unit falls back to treating amount as days.
      return addDays(base, amount);
  }
}
