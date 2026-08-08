import { useEffect, useRef, useState } from "react";
import { navigate } from "../router.js";
import { signOut } from "../auth/auth.js";
import CreditFooter from "./CreditFooter.jsx";

/** Left slide-out drawer: navigation + account actions. */
export default function Menu({ open, onClose }) {
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const dialogFocusRef = useRef(null);

  function handleNavigateHome() {
    navigate("/");
    onClose();
  }

  function handleSignOutClick() {
    onClose();
    setConfirmingSignOut(true);
  }

  useEffect(() => {
    if (confirmingSignOut) {
      dialogFocusRef.current?.focus();
    }
  }, [confirmingSignOut]);

  return (
    <>
      <div
        className={`menu-backdrop ${open ? "open" : ""}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <nav className={`menu-drawer ${open ? "open" : ""}`} aria-label="Main menu">
        <div className="menu-links">
          <button type="button" className="menu-link" onClick={handleNavigateHome}>
            Home
          </button>
        </div>

        <div className="menu-bottom">
          <button
            type="button"
            className="menu-link menu-sign-out"
            onClick={handleSignOutClick}
          >
            Sign out
          </button>
          <CreditFooter />
        </div>
      </nav>

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
                ref={dialogFocusRef}
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
    </>
  );
}
