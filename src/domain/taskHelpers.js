// Small helpers shared by the other domain files.
// Kept separate so dueDate.js, thresholds.js, status.js etc. don't each
// re-implement "does this task have any completions" slightly differently.

/**
 * A task has a `completions` array of { id, date } records.
 * `date` is expected to be a JS Date object (the data layer is responsible
 * for parsing stored strings into Dates before calling into domain/).
 */

export function hasCompletions(task) {
  return Array.isArray(task.completions) && task.completions.length > 0;
}

/**
 * Returns the most recent completion date, or null if there are none.
 * This is the `lastCompletedDate` referred to throughout the spec.
 */
export function getLastCompletedDate(task) {
  if (!hasCompletions(task)) return null;
  return task.completions.reduce(
    (latest, c) => (c.date.getTime() > latest.getTime() ? c.date : latest),
    task.completions[0].date
  );
}

/**
 * Clamp a numeric value between min and max (inclusive).
 * Used by thresholds.js to enforce the 1–14 day / 3–90 day bounds from §3.2.
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
