import { navigate } from "../router.js";
import CreditFooter from "./CreditFooter.jsx";
import appIcon from "../assets/app-icon.png";
import { STATUS_COLOR_VAR } from "./statusColors.js";

// Hand-authored, not computed from real dates — these exist purely to show
// a first-time visitor what a task card looks like and what kinds of
// recurring admin the app covers, so the strings must stay fixed regardless
// of when the page is viewed.
const SAMPLE_TASKS = [
  {
    emoji: "🧹",
    name: "Deep clean the kitchen",
    status: "overdue",
    statusText: "3 days overdue",
  },
  {
    emoji: "👋",
    name: "Catch up with Sam",
    status: "due",
    statusText: "Due today",
  },
  {
    emoji: "🦷",
    name: "Dentist checkup",
    status: "upcoming",
    statusText: "In 2 weeks",
  },
];

// Simple line icons (not emoji) so this strip doesn't visually compete
// with the colorful emoji on the sample task cards below it.
const FEATURES = [
  {
    label: "Track recurring tasks",
    icon: (
      <path d="M17 2.1 21 6l-4 3.9M3 11V9a4 4 0 0 1 4-4h14M7 21.9 3 18l4-3.9M21 13v2a4 4 0 0 1-4 4H3" />
    ),
  },
  {
    label: "Get notified when things are due",
    icon: (
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
    ),
  },
  {
    label: "Sync across devices",
    icon: (
      <path d="M6 8V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2M2 12h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8Z" />
    ),
  },
];

export default function LandingScreen() {
  return (
    <div className="app-shell landing-shell">
      <section className="landing-hero">
        <img src={appIcon} alt="" className="landing-hero-image" />
        <h1>offload</h1>
        <p className="landing-tagline">
          A simple way to keep on top of life&apos;s recurring admin.
        </p>
        <div className="landing-hero-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/tasks")}
          >
            Log in
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => navigate("/tasks?mode=signup")}
          >
            Sign up
          </button>
        </div>
      </section>

      <section className="section landing-features">
        {FEATURES.map((item) => (
          <div className="landing-feature" key={item.label}>
            <svg
              className="landing-feature-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {item.icon}
            </svg>
            <span className="landing-feature-label">{item.label}</span>
          </div>
        ))}
      </section>

      <section className="section">
        <div className="task-list" aria-hidden="true">
          {SAMPLE_TASKS.map((task) => (
            <div className="task-card landing-sample-card" key={task.name}>
              <div className="task-emoji">{task.emoji}</div>
              <div className="task-text">
                <div className="task-title-row">
                  <span
                    className="status-dot"
                    style={{ background: STATUS_COLOR_VAR[task.status] }}
                  />
                  <span className="task-name">{task.name}</span>
                </div>
                <div className="task-status-text">{task.statusText}</div>
              </div>
              <span className="complete-button" aria-hidden="true">
                ✓
              </span>
            </div>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <CreditFooter />
      </footer>
    </div>
  );
}
