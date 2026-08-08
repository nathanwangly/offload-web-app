// Sensitivity factors from spec §3.2.
// upcomingFactor: how much of the interval is "lead time" before due.
// overdueFactor: multiplier on the interval that defines the overdue grace.
export const SENSITIVITY_FACTORS = {
  Relaxed: { upcomingFactor: 0.9, overdueFactor: 2.0 },
  Balanced: { upcomingFactor: 0.8, overdueFactor: 1.5 },
  Strict: { upcomingFactor: 0.7, overdueFactor: 1.2 },
};
