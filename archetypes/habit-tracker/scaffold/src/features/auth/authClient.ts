// Scaffolded by `ai-project-bootstrap --archetype habit-tracker`.
// See docs/starter-template.md.
import { supabase } from '../../services/supabase/client';

/**
 * Magic-link sign-in — no password to store or reset. Supabase emails a
 * link; opening it on the device that requested it signs the user in.
 *
 * TODO: without `emailRedirectTo`, Supabase falls back to its own confirm
 * page rather than deep-linking back into the app. Configure a deep link
 * scheme in app.json and pass `emailRedirectTo` here before shipping —
 * otherwise a user who taps the link on their phone lands in a browser,
 * not back in the app.
 */
export async function sendMagicLink(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
