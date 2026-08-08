import { startOfDay, differenceInCalendarDays } from "date-fns";
import { dueDate } from "./dueDate.js";
import { getLastCompletedDate, clamp } from "./taskHelpers.js";
import { SENSITIVITY_FACTORS } from "./sensitivityConfig.js";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Calculates the upcoming/due/overdue thresholds for a task (spec §3.2).
 *
 * Two deliberate departures from the original iOS spec, per the dev
 * guide's "Decisions already made" table:
 *
 * 1. `interval` quirk fix: the original app computed `interval` from the
 *    exact completion timestamp, so completing a task at 18:00 vs 06:00
 *    changed its thresholds by hours. Here `interval` is always the due
 *    date minus the start-of-day of the last completion — which is just
 *    the nominal frequency period (e.g. exactly 7 days for a weekly task),
 *    regardless of what time the task was completed.
 *
 * 2. Upcoming-lead half-interval cap: the original 1–14 day clamp meant a
 *    daily task's upcoming lead was always forced up to a full day — the
 *    whole interval — so daily tasks were "upcoming" the instant they were
 *    completed. Here, after the normal clamp, the lead is additionally
 *    capped at half the interval. This is applied AFTER the 1-day floor,
 *    so it can override that floor for short intervals. The dev guide
 *    doesn't spell out the exact ordering, so this is my interpretation —
 *    worth sanity-checking against what you actually want daily tasks to
 *    feel like.
 *
 * @param {Object} task
 * @param {"Relaxed"|"Balanced"|"Strict"} sensitivity
 * @returns {{dueDate: Date, upcomingThreshold: Date, dueThreshold: Date, overdueThreshold: Date}|null}
 *   null if the task has no completions (dueDate is undefined in that case)
 */
export function thresholds(task, sensitivity) {
  const due = dueDate(task);
  if (!due) return null;

  const base = startOfDay(getLastCompletedDate(task));
  // Use calendar-day difference, not raw ms subtraction: `due` and `base`
  // are both real epoch instants, so a DST transition between them would
  // otherwise smuggle in a spurious extra/missing hour, corrupting the
  // "nominal period regardless of time-of-day" guarantee described above.
  const intervalMs = differenceInCalendarDays(due, base) * ONE_DAY_MS;

  const factors = SENSITIVITY_FACTORS[sensitivity];

  let upcomingLeadMs = intervalMs * (1 - factors.upcomingFactor);
  upcomingLeadMs = clamp(upcomingLeadMs, ONE_DAY_MS, 14 * ONE_DAY_MS);
  upcomingLeadMs = Math.min(upcomingLeadMs, intervalMs / 2); // half-interval cap, applied last

  let overdueGraceMs = intervalMs * (factors.overdueFactor - 1);
  overdueGraceMs = clamp(overdueGraceMs, 3 * ONE_DAY_MS, 90 * ONE_DAY_MS);

  return {
    dueDate: due,
    upcomingThreshold: new Date(due.getTime() - upcomingLeadMs),
    dueThreshold: due,
    overdueThreshold: new Date(due.getTime() + overdueGraceMs),
  };
}
