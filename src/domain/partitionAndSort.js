import { status } from "./status.js";
import { getLastCompletedDate } from "./taskHelpers.js";
import { dueDate } from "./dueDate.js";

// Used for the null-date sort convention: a null dueDate/lastCompletedDate
// sorts as if it happened at the dawn of time, so "new" tasks float to the
// top of their bucket (spec §4, and explicitly NOT the opposite convention
// the unused/dead `sortKey` helper used — see spec §10).
//
// Deliberately a large finite number, not -Infinity: two null dates would
// otherwise compute -Infinity - (-Infinity) = NaN, which silently breaks
// the comparator (Array.sort's behaviour on a NaN result is unreliable)
// and falls through without applying the next tiebreaker.
const DISTANT_PAST = Number.MIN_SAFE_INTEGER;

function stripDiacritics(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeForSearch(str) {
  return stripDiacritics(str).toLowerCase();
}

function matchesSearch(task, searchText) {
  if (!searchText) return true;
  return normalizeForSearch(task.name).includes(
    normalizeForSearch(searchText)
  );
}

function sortValue(date) {
  return date ? date.getTime() : DISTANT_PAST;
}

function compareTasks(a, b) {
  const dueDiff = sortValue(dueDate(a)) - sortValue(dueDate(b));
  if (dueDiff !== 0) return dueDiff;

  const lastCompletedDiff =
    sortValue(getLastCompletedDate(a)) - sortValue(getLastCompletedDate(b));
  if (lastCompletedDiff !== 0) return lastCompletedDiff;

  // Ordinal (code-point) comparison, not locale-aware, per spec.
  if (a.name < b.name) return -1;
  if (a.name > b.name) return 1;
  return 0;
}

/**
 * Filters, buckets and sorts tasks for the home screen (spec §4).
 *
 * @param {Object[]} tasks
 * @param {string} searchText
 * @param {"Relaxed"|"Balanced"|"Strict"} sensitivity
 * @param {Date} now
 * @returns {{overdue: Object[], due: Object[], upcoming: Object[], notDueYet: Object[]}}
 *   `notDueYet` includes both the spec's `notDueYet` and `new` tasks —
 *   they share a bucket and colour, even though their status text differs.
 */
export function partitionAndSort(tasks, searchText, sensitivity, now) {
  const buckets = { overdue: [], due: [], upcoming: [], notDueYet: [] };

  for (const task of tasks) {
    if (!matchesSearch(task, searchText)) continue;

    const s = status(task, sensitivity, now);
    const bucketKey = s === "new" ? "notDueYet" : s;
    buckets[bucketKey].push(task);
  }

  for (const key of Object.keys(buckets)) {
    buckets[key].sort(compareTasks);
  }

  return buckets;
}
