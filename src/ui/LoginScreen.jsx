import { useState } from "react";
import {
  signInWithPassword,
  signUpWithPassword,
  signInWithGoogle,
  sendPasswordReset,
} from "../auth/auth.js";

const MIN_PASSWORD_LENGTH = 6;

/**
 * Email/password sign in + sign up, Google OAuth, and a "forgot password"
 * step. Successful password/Google sign-in resolves via App.jsx's
 * onAuthStateChange subscription — this component doesn't need to report
 * back directly.
 */
export default function LoginScreen() {
  // "signin" | "signup" | "forgot" | "forgot-sent" | "confirm-email-sent"
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const trimmedEmail = email.trim();
  const isSignUp = mode === "signup";
  const canSubmit =
    trimmedEmail.length > 0 && password.length >= MIN_PASSWORD_LENGTH && !busy;

  function switchMode(next) {
    setMode(next);
    setError("");
    setPassword("");
  }

  async function handleSubmit() {
    setError("");
    setBusy(true);
    try {
      if (isSignUp) {
        const session = await signUpWithPassword(trimmedEmail, password);
        if (!session) setMode("confirm-email-sent");
      } else {
        await signInWithPassword(trimmedEmail, password);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  async function handleForgotSubmit() {
    setError("");
    setBusy(true);
    try {
      await sendPasswordReset(trimmedEmail);
      setMode("forgot-sent");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (mode === "confirm-email-sent") {
    return (
      <div className="app-shell">
        <div className="app-toolbar">
          <h1>Check your email</h1>
        </div>
        <p>
          We sent a confirmation link to <strong>{trimmedEmail}</strong>. Click it,
          then come back and sign in.
        </p>
        <div className="form-actions">
          <button type="button" className="primary-button" onClick={() => switchMode("signin")}>
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  if (mode === "forgot-sent") {
    return (
      <div className="app-shell">
        <div className="app-toolbar">
          <h1>Check your email</h1>
        </div>
        <p>
          If an account exists for <strong>{trimmedEmail}</strong>, we sent a
          password reset link.
        </p>
        <div className="form-actions">
          <button type="button" className="primary-button" onClick={() => switchMode("signin")}>
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  if (mode === "forgot") {
    return (
      <div className="app-shell">
        <div className="app-toolbar">
          <h1>Reset password</h1>
        </div>
        <div className="form-field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            placeholder="you@example.com"
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && trimmedEmail && handleForgotSubmit()}
          />
        </div>
        {error && <div className="field-error">{error}</div>}
        <div className="form-actions">
          <button type="button" className="secondary-button" onClick={() => switchMode("signin")}>
            Cancel
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={!trimmedEmail || busy}
            onClick={handleForgotSubmit}
          >
            {busy ? "Sending…" : "Send reset link"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="app-toolbar">
        <h1>{isSignUp ? "Create account" : "Sign in"}</h1>
      </div>

      <div className="form-field">
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          placeholder="you@example.com"
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="form-field">
        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          value={password}
          placeholder={isSignUp ? `At least ${MIN_PASSWORD_LENGTH} characters` : ""}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && canSubmit && handleSubmit()}
        />
      </div>

      {!isSignUp && (
        <div className="form-field">
          <button type="button" className="secondary-button" onClick={() => switchMode("forgot")}>
            Forgot password?
          </button>
        </div>
      )}

      {error && <div className="field-error">{error}</div>}

      <div className="form-actions">
        <button type="button" className="primary-button" disabled={!canSubmit} onClick={handleSubmit}>
          {busy ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
        </button>
      </div>

      <div className="section-header">OR</div>

      <div className="form-actions">
        <button type="button" className="secondary-button" disabled={busy} onClick={handleGoogle}>
          Continue with Google
        </button>
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => switchMode(isSignUp ? "signin" : "signup")}
        >
          {isSignUp ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>
      </div>
    </div>
  );
}
