import { useEffect, useState } from "react";
import HomeScreen from "./ui/HomeScreen.jsx";
import LoginScreen from "./ui/LoginScreen.jsx";
import ResetPasswordScreen from "./ui/ResetPasswordScreen.jsx";
import LandingScreen from "./ui/LandingScreen.jsx";
import { getSession, onAuthStateChange } from "./auth/auth.js";
import { migrateLocalToSupabaseIfNeeded } from "./data/migrateLocalToSupabase.js";
import { useRoute, replace } from "./router.js";
import "./App.css";

function App() {
  // undefined = still checking, null = signed out, session object = signed in
  const [session, setSession] = useState(undefined);
  // True while the app is showing the "set new password" screen reached via
  // a password-reset email link, rather than the normal signed-in state.
  const [recovering, setRecovering] = useState(false);
  const pathname = useRoute();
  const signedIn = Boolean(session);

  // Signed-in visitors landing on "/" are bounced straight to the task
  // list — "/" is a marketing-only route once you're already signed in.
  useEffect(() => {
    if (signedIn && pathname !== "/tasks") {
      replace("/tasks");
    }
  }, [signedIn, pathname]);

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
    // Signed-out visitors always see the landing page, regardless of the
    // exact path — "/tasks" is gated behind sign-in via LoginScreen.
    if (pathname === "/tasks") {
      const initialMode =
        new URLSearchParams(window.location.search).get("mode") === "signup"
          ? "signup"
          : "signin";
      return <LoginScreen initialMode={initialMode} />;
    }
    return <LandingScreen />;
  }

  return <HomeScreen />;
}

export default App;
