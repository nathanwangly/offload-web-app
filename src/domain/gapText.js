import { startOfDay, differenceInCalendarDays } from "date-fns";

/**
 * Describes the gap between two completion dates, for the detail view's
 * history list (spec §3.6).
 *
 * Deliberately coarse: uses integer division with fixed 7/30/365 day
 * divisors, and has no singular/plural handling ("2 day gap" is correct
 * per spec, not a bug). This is transcribed faithfully from the spec.
 *
 * @param {Date} older - the earlier completion date
 * @param {Date} newer - the later completion date
 * @returns {string}
 */
export function gapText(older, newer) {
  const days = differenceInCalendarDays(startOfDay(newer), startOfDay(older));

  if (days <= 0) return "Same day";
  if (days >= 365) return `${Math.floor(days / 365)} year gap`;
  if (days >= 30) return `${Math.floor(days / 30)} month gap`;
  if (days >= 7) return `${Math.floor(days / 7)} week gap`;
  return `${days} day gap`;
}
