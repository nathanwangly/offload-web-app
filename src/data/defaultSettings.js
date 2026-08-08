// Shared between localRepo.js and supabaseRepo.js so both fall back to the
// same shape when nothing has been saved yet.
export const DEFAULT_SETTINGS = {
  sensitivity: "Balanced",
  defaultFrequencyUnit: "Week",
  theme: "System",
  colours: {
    overdue: "appRed",
    due: "appOrange",
    upcoming: "appYellow",
    notDueYet: "appGrey",
  },
  // Notification-readiness fields (schema exists, no UI/wiring yet — that's
  // Stage 6). Kept here so nothing has to be retrofitted into the shape later.
  notificationsEnabled: false,
  notifyOverdue: true,
  notifyDue: true,
  notifyUpcoming: true,
  notifyTime: "08:00",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};
