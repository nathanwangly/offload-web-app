import { hasCompletions } from "./taskHelpers.js";
import { thresholds } from "./thresholds.js";

/**
 * Resolves a task's status against `now` (spec §3.3).
 * Order matters: checked most-urgent-first, each check falling through
 * to the next if it doesn't match.
 *
 * @param {Object} task
 * @param {"Relaxed"|"Balanced"|"Strict"} sensitivity
 * @param {Date} now - always passed in explicitly, never `new Date()`
 *   inside this function, so tests can simulate any point in time.
 * @returns {"new"|"overdue"|"due"|"upcoming"|"notDueYet"}
 */
export function status(task, sensitivity, now) {
  if (!hasCompletions(task)) return "new";

  const t = thresholds(task, sensitivity);

  if (now >= t.overdueThreshold) return "overdue";
  if (now >= t.dueDate) return "due";
  if (now >= t.upcomingThreshold) return "upcoming";
  return "notDueYet";
}
