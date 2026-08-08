import { useEffect, useState, useCallback } from "react";
import { repo } from "../data/repository.js";
import { completeTask } from "../data/mutations.js";
import { partitionAndSort } from "../domain/partitionAndSort.js";
import { status as resolveStatus } from "../domain/status.js";
import { signOut } from "../auth/auth.js";
import TaskRow from "./TaskRow.jsx";
import TaskForm from "./TaskForm.jsx";

const SECTIONS = [
  { key: "overdue", label: (n) => `NEEDS ATTENTION (${n})` },
  { key: "due", label: (n) => `DUE (${n})` },
  { key: "upcoming", label: (n) => `UPCOMING (${n})` },
  { key: "notDueYet", label: () => "ALL OTHER TASKS" },
];

export default function HomeScreen() {
  const [tasks, setTasks] = useState(null);
  const [settings, setSettings] = useState(null);
  const [searchText, setSearchText] = useState("");
  // null = closed, "new" = add form, a task object = edit form
  const [formTarget, setFormTarget] = useState(null);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  const load = useCallback(async () => {
    const [t, s] = await Promise.all([repo.listTasks(), repo.getSettings()]);
    setTasks(t);
    setSettings(s);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [t, s] = await Promise.all([repo.listTasks(), repo.getSettings()]);
      if (!cancelled) {
        setTasks(t);
        setSettings(s);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleComplete(task) {
    await completeTask(task.id);
    await load();
  }

  function closeForm() {
    setFormTarget(null);
  }

  async function handleFormDone() {
    closeForm();
    await load();
  }

  if (!tasks || !settings) {
    return (
      <div className="app-shell">
        <div className="empty-state">Loading…</div>
      </div>
    );
  }

  const now = new Date();
  const buckets = partitionAndSort(tasks, searchText, settings.sensitivity, now);
  const hasAnyTasks = tasks.length > 0;
  const hasAnyResults = Object.values(buckets).some((b) => b.length > 0);

  return (
    <div className="app-shell">
      <div className="app-toolbar">
        <h1>Your Tasks</h1>
        <button
          type="button"
          className="icon-button"
          onClick={() => setFormTarget("new")}
          aria-label="Add task"
        >
          +
        </button>
      </div>

      <div className="form-field">
        <input
          type="text"
          placeholder="Search tasks"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      {!hasAnyResults && (
        <div className="empty-state">
          {hasAnyTasks ? (
            <>
              <h2>No results</h2>
              <p>No tasks match &quot;{searchText}&quot;.</p>
            </>
          ) : (
            <>
              <h2>No tasks found</h2>
              <p>Add your first task by pressing the + button!</p>
            </>
          )}
        </div>
      )}

      {SECTIONS.map(({ key, label }) => {
        const bucketTasks = buckets[key];
        if (bucketTasks.length === 0) return null;
        return (
          <div className="section" key={key}>
            <div className="section-header">{label(bucketTasks.length)}</div>
            <div className="task-list">
              {bucketTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  status={resolveStatus(task, settings.sensitivity, now)}
                  now={now}
                  onComplete={handleComplete}
                  onEdit={setFormTarget}
                />
              ))}
            </div>
          </div>
        );
      })}

      {formTarget === "new" && (
        <TaskForm mode="create" onDone={handleFormDone} onCancel={closeForm} />
      )}
      {formTarget && formTarget !== "new" && (
        <TaskForm
          mode="edit"
          task={formTarget}
          onDone={handleFormDone}
          onCancel={closeForm}
        />
      )}

      <div className="sign-out-section">
        <button
          type="button"
          className="sign-out-button"
          onClick={() => setConfirmingSignOut(true)}
        >
          Sign out
        </button>
      </div>

      {confirmingSignOut && (
        <div className="modal-backdrop" onClick={() => setConfirmingSignOut(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Sign out?</h2>
            </div>
            <p>You&apos;ll need to sign back in to see your tasks.</p>
            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setConfirmingSignOut(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => signOut()}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
