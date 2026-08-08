import { useEffect, useState } from "react";
import HomeScreen from "./ui/HomeScreen.jsx";
import LoginScreen from "./ui/LoginScreen.jsx";
import ResetPasswordScreen from "./ui/ResetPasswordScreen.jsx";
import { getSession, onAuthStateChange } from "./auth/auth.js";
import { migrateLocalToSupabaseIfNeeded } from "./data/migrateLocalToSupabase.js";
import "./App.css";

function App() {
  // undefined = still checking, null = signed out, session object = signed in
  const [session, setSession] = useState(undefined);
  // True while the app is showing the "set new password" screen reached via
  // a password-reset email link, rather than the normal signed-in state.
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    getSession().then(setSession);
    return onAuthStateChange(async (event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecovering(true);
        setSession(nextSession);
        return;
      }
      if (event === "SIGNED_IN") {
        await migrateLocalToSupabaseIfNeeded();
      }
      setSession(nextSession);
    });
  }, []);

  if (session === undefined) {
    return (
      <div className="app-shell">
        <div className="empty-state">Loading…</div>
      </div>
    );
  }

  if (recovering) {
    return <ResetPasswordScreen onDone={() => setRecovering(false)} />;
  }

  if (!session) {
    return <LoginScreen />;
  }

  return <HomeScreen />;
}

export default App;
