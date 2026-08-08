import { useEffect, useState } from "react";

// Minimal path-based router. The app only ever needs two real routes
// ("/" and "/tasks"), so this avoids pulling in a routing library —
// just enough to read/update the URL and re-render on change.

const listeners = new Set();

function notify() {
  for (const listener of listeners) listener(window.location.pathname);
}

/** Push a new path onto the history stack and notify subscribers. */
export function navigate(path) {
  if (window.location.pathname === path) return;
  window.history.pushState(null, "", path);
  notify();
}

/** Replace the current history entry (no back-button stop) and notify. */
export function replace(path) {
  if (window.location.pathname === path) return;
  window.history.replaceState(null, "", path);
  notify();
}

/** Hook: current pathname, updated on navigate/replace/back/forward. */
export function useRoute() {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    listeners.add(setPathname);
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => {
      listeners.delete(setPathname);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return pathname;
}
