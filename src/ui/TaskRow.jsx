import { statusText } from "../domain/relative.js";
import { STATUS_COLOR_VAR } from "./statusColors.js";

const DOT_STATUSES = new Set(["overdue", "due", "upcoming"]);

/**
 * A single task card. MVP version: no two-phase completion animation yet
 * (that's a later pass) — tapping the checkmark completes immediately.
 */
export default function TaskRow({ task, status, now, onComplete, onEdit }) {
  const text = statusText(task, status, now);

  return (
    <div className="task-card" onClick={() => onEdit(task)} role="button" tabIndex={0}>
      <div className="task-emoji">{task.emoji || ""}</div>
      <div className="task-text">
        <div className="task-title-row">
          {DOT_STATUSES.has(status) && (
            <span
              className="status-dot"
              style={{ background: STATUS_COLOR_VAR[status] }}
            />
          )}
          <span className="task-name">{task.name}</span>
        </div>
        <div className="task-status-text">{text}</div>
      </div>
      <button
        type="button"
        className="complete-button"
        onClick={(e) => {
          e.stopPropagation();
          onComplete(task);
        }}
        aria-label={`Mark "${task.name}" complete`}
      >
        ✓
      </button>
    </div>
  );
}
