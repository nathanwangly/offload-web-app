import { useState } from "react";
import { updatePassword } from "../auth/auth.js";

const MIN_PASSWORD_LENGTH = 6;

/**
 * Shown when the app lands on a Supabase password-recovery link (App.jsx
 * detects the "PASSWORD_RECOVERY" auth event). Sets a new password on the
 * already-established recovery session, then hands control back.
 */
export default function ResetPasswordScreen({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const canSubmit =
    password.length >= MIN_PASSWORD_LENGTH && password === confirm && !busy;

  async function handleSubmit() {
    setError("");
    setBusy(true);
    try {
      await updatePassword(password);
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="app-toolbar">
        <h1>Set a new password</h1>
      </div>

      <div className="form-field">
        <label htmlFor="reset-password">New password</label>
        <input
          id="reset-password"
          type="password"
          autoComplete="new-password"
          value={password}
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="form-field">
        <label htmlFor="reset-password-confirm">Confirm password</label>
        <input
          id="reset-password-confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && canSubmit && handleSubmit()}
        />
      </div>

      {confirm.length > 0 && password !== confirm && (
        <div className="field-error">Passwords don't match.</div>
      )}
      {error && <div className="field-error">{error}</div>}

      <div className="form-actions">
        <button type="button" className="primary-button" disabled={!canSubmit} onClick={handleSubmit}>
          {busy ? "Saving…" : "Save password"}
        </button>
      </div>
    </div>
  );
}
