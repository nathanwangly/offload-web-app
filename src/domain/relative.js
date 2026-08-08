import { startOfDay, differenceInCalendarDays } from "date-fns";
import { getLastCompletedDate } from "./taskHelpers.js";
import { dueDate } from "./dueDate.js";

const rtf = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
  style: "long",
});

// Standard MDN "auto unit" division table for Intl.RelativeTimeFormat:
// walks up from seconds to years, picking the first unit where the
// remaining magnitude is under that unit's threshold.
const DIVISIONS = [
  { amount: 60, unit: "seconds" },
  { amount: 60, unit: "minutes" },
  { amount: 24, unit: "hours" },
  { amount: 7, unit: "days" },
  { amount: 4.34524, unit: "weeks" },
  { amount: 12, unit: "months" },
  { amount: Number.POSITIVE_INFINITY, unit: "years" },
];

// This is fed the RAW timestamp difference, not a start-of-day difference,
// which is why a due date 25h away reads "in 1 day" but 23h away reads
// "in 23 hours" (spec §3.5, flagged as a quirk — ⚠️ item 8 in §11). The
// dev guide's decisions table doesn't address this one, so it's kept
// faithful to the original spec rather than "fixed".
function formatAuto(date, now) {
  let durationSec = (date.getTime() - now.getTime()) / 1000;
  for (const division of DIVISIONS) {
    if (Math.abs(durationSec) < division.amount) {
      return rtf.format(Math.round(durationSec), division.unit);
    }
    durationSec /= division.amount;
  }
}

/**
 * Formats a date relative to `now` (spec §3.5).
 * Day-granular special cases first, then falls through to the
 * Intl.RelativeTimeFormat auto-unit formatter for everything else.
 *
 * @param {Date} date
 * @param {Date} now
 * @returns {string} e.g. "today", "yesterday", "in 3 days", "2 weeks ago"
 */
export function relative(date, now) {
  const dayDiff = differenceInCalendarDays(startOfDay(date), startOfDay(now));

  if (dayDiff === 0) return "today";
  if (dayDiff === -1) return "yesterday";
  if (dayDiff === 1) return "tomorrow";
  if (dayDiff < -365) return "over a year ago";

  return formatAuto(date, now);
}

function capitalize(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * The secondary line of text shown on the task row and detail view
 * (spec §3.5's table). Takes the already-resolved status rather than
 * recomputing it, since callers (partitionAndSort, the row component)
 * will already have it.
 *
 * @param {Object} task
 * @param {"new"|"overdue"|"due"|"upcoming"|"notDueYet"} currentStatus
 * @param {Date} now
 * @returns {string}
 */
export function statusText(task, currentStatus, now) {
  if (currentStatus === "new") return "Awaiting first completion";

  if (currentStatus === "notDueYet") {
    const last = getLastCompletedDate(task);
    return `Last completed: ${capitalize(relative(last, now))}`;
  }

  // overdue / due / upcoming all show "Due {relative(dueDate)}".
  // dueDate itself doesn't depend on sensitivity, only the thresholds do,
  // so we go straight to dueDate() rather than through thresholds().
  return `Due ${relative(dueDate(task), now)}`;
}
