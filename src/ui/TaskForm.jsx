import { useState } from "react";
import { createTask, editTask, deleteTask } from "../data/mutations.js";

const FREQUENCY_UNITS = ["Day", "Week", "Month", "Year"];
const EMOJI_RE = /\p{Extended_Pictographic}/u;

function todayInputValue() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

// Spec §5.5: on every keystroke, if the last character typed is an emoji,
// replace the whole field with just that character; otherwise, if the
// field is non-empty, clear it. Net effect: zero or one emoji, never text.
function nextEmojiValue(raw) {
  if (!raw) return "";
  const lastChar = [...raw].at(-1);
  if (EMOJI_RE.test(lastChar)) return lastChar;
  return "";
}

/**
 * One form for both create and edit, per spec §5.5.
 * MVP note: no undo-toast wiring yet for delete — this uses a plain confirm.
 */
export default function TaskForm({ mode, task, onDone, onCancel }) {
  const isEdit = mode === "edit";

  const [name, setName] = useState(task?.name ?? "");
  const [emoji, setEmoji] = useState(task?.emoji ?? "");
  const [frequencyAmount, setFrequencyAmount] = useState(
    task?.frequencyAmount ?? 1
  );
  const [frequencyUnit, setFrequencyUnit] = useState(
    task?.frequencyUnit ?? "Week"
  );
  const [lastCompleted, setLastCompleted] = useState(todayInputValue());
  const [lastCompletedCleared, setLastCompletedCleared] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const trimmedName = name.trim();
  const canSave = trimmedName.length > 0 && !saving;

  async function handleSave() {
    setError("");
    setSaving(true);
    try {
      const input = {
        name,
        emoji,
        frequencyAmount: Number(frequencyAmount),
        frequencyUnit,
      };
      if (isEdit) {
        await editTask(task.id, input);
      } else {
        await createTask({
          ...input,
          lastCompleted: lastCompletedCleared ? null : new Date(lastCompleted),
        });
      }
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete task? This action cannot be undone.")) return;
    await deleteTask(task.id);
    onDone();
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? "Edit task" : "Add task"}</h2>
          <button type="button" className="icon-button" onClick={onCancel} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="form-field">
          <label htmlFor="task-name">Task name</label>
          <input
            id="task-name"
            type="text"
            value={name}
            maxLength={40}
            placeholder="E.g., Deep clean"
            onChange={(e) => setName(e.target.value.slice(0, 40))}
          />
          {name.length >= 30 && (
            <div className="field-hint">{name.length}/40</div>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="task-emoji">Emoji (optional)</label>
          <input
            id="task-emoji"
            type="text"
            value={emoji}
            placeholder="Tap to add emoji — e.g. 🧹"
            onChange={(e) => setEmoji(nextEmojiValue(e.target.value))}
          />
        </div>

        <div className="form-field">
          <label htmlFor="task-frequency-amount">
            Every {frequencyAmount} {frequencyUnit}
            {Number(frequencyAmount) === 1 ? "" : "s"}
          </label>
          <div className="frequency-row">
            <input
              id="task-frequency-amount"
              type="number"
              min={1}
              max={365}
              value={frequencyAmount}
              onChange={(e) =>
                setFrequencyAmount(
                  Math.min(365, Math.max(1, Number(e.target.value) || 1))
                )
              }
            />
            <select
              value={frequencyUnit}
              onChange={(e) => setFrequencyUnit(e.target.value)}
            >
              {FREQUENCY_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!isEdit && (
          <div className="form-field">
            <label htmlFor="task-last-completed">Last completed (optional)</label>
            {lastCompletedCleared ? (
              <button
                type="button"
                className="secondary-button"
                onClick={() => setLastCompletedCleared(false)}
              >
                Select date
              </button>
            ) : (
              <input
                id="task-last-completed"
                type="date"
                value={lastCompleted}
                max={todayInputValue()}
                onChange={(e) => setLastCompleted(e.target.value)}
              />
            )}
            {!lastCompletedCleared && (
              <div className="field-hint">
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setLastCompletedCleared(true)}
                >
                  Clear (create as "new")
                </button>
              </div>
            )}
          </div>
        )}

        {error && <div className="field-error">{error}</div>}

        <div className="form-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={!canSave}
            onClick={handleSave}
          >
            {isEdit ? "Update" : "Add"}
          </button>
        </div>

        {isEdit && (
          <div className="form-actions">
            <button
              type="button"
              className="secondary-button destructive-button"
              onClick={handleDelete}
            >
              Delete Task
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
