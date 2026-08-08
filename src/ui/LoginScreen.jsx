import { useState } from "react";
import {
  signInWithPassword,
  signUpWithPassword,
  signInWithGoogle,
  sendPasswordReset,
} from "../auth/auth.js";
import { navigate } from "../router.js";

const MIN_PASSWORD_LENGTH = 6;

/**
 * Email/password sign in + sign up, Google OAuth, and a "forgot password"
 * step. Successful password/Google sign-in resolves via App.jsx's
 * onAuthStateChange subscription — this component doesn't need to report
 * back directly.
 */
export default function LoginScreen({ initialMode = "signin" }) {
  // "signin" | "signup" | "forgot" | "forgot-sent" | "confirm-email-sent"
  const [mode, setMode] = useState(initialMode);
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
          <div className="app-toolbar-start">
            <BackButton />
            <h1>Check your email</h1>
          </div>
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
          <div className="app-toolbar-start">
            <BackButton />
            <h1>Check your email</h1>
          </div>
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
          <div className="app-toolbar-start">
            <BackButton />
            <h1>Reset password</h1>
          </div>
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
        <div className="app-toolbar-start">
          <BackButton />
          <h1>{isSignUp ? "Create account" : "Sign in"}</h1>
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="google-button" disabled={busy} onClick={handleGoogle}>
          <GoogleLogo />
          Continue with Google
        </button>
      </div>

      <div className="divider">
        <span>OR</span>
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
          <button type="button" className="text-button forgot-password-button" onClick={() => switchMode("forgot")}>
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

function BackButton() {
  return (
    <button
      type="button"
      className="icon-button"
      onClick={() => navigate("/")}
      aria-label="Back to home"
    >
      ‹
    </button>
  );
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.87 2.7-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.16.29-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  );
}
