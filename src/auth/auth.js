// Thin wrapper around supabase.auth: email/password + Google OAuth, plus
// password-reset. No magic links, no OTP codes.
import { supabase } from "../data/supabaseClient.js";

export async function signUpWithPassword(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message, { cause: error });
  // `data.session` is null here if the project requires email confirmation
  // before a session is issued — caller must handle that case.
  return data.session;
}

export async function signInWithPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message, { cause: error });
  return data.session;
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  if (error) throw new Error(error.message, { cause: error });
  // Browser is redirected to Google; nothing more happens on this page.
}

export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  if (error) throw new Error(error.message, { cause: error });
}

export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message, { cause: error });
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message, { cause: error });
}

export async function getSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * @param {(event: string, session: import('@supabase/supabase-js').Session | null) => void} callback
 * `event` is notably "SIGNED_IN" or "PASSWORD_RECOVERY" (landed via a reset
 * link) — callers that care about the difference should check it.
 */
export function onAuthStateChange(callback) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => callback(event, session));
  return () => subscription.unsubscribe();
}
