// Presentation-only status -> colour mapping. Pure display, no now-dependence
// or business logic, so it lives in ui/ rather than domain/.
export const STATUS_COLOR_VAR = {
  overdue: "var(--status-overdue)",
  due: "var(--status-due)",
  upcoming: "var(--status-upcoming)",
  notDueYet: "var(--status-not-due-yet)",
  new: "var(--status-not-due-yet)",
};
