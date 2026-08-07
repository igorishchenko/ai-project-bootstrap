// Scaffolded by `ai-project-bootstrap implement authentication` (Supabase Auth).
// See implementation/authentication/plan.md for the steps this fills in.
//
// The one place that talks to `supabase.auth` — the hook and screens call
// this, never the SDK directly.

import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../services/supabase/client';

export async function signInWithPassword(email: string, password: string): Promise<Session> {
  // TODO (plan.md, step 3): supabase.auth.signInWithPassword({ email, password })
  // — throw the returned error, return data.session on success.
  throw new Error(
    `signInWithPassword not implemented yet (${email}, ${'*'.repeat(password.length)})`,
  );
}

export async function signUp(email: string, password: string): Promise<Session | null> {
  // TODO (plan.md, step 3): supabase.auth.signUp({ email, password }) — a null
  // session here is normal when email confirmation is required, not an error.
  throw new Error(`signUp not implemented yet (${email}, ${'*'.repeat(password.length)})`);
}

export async function signOut(): Promise<void> {
  // TODO (plan.md, step 3): supabase.auth.signOut(), then let the caller clear
  // any cached user-scoped state — see plan.md, step 8.
  throw new Error('signOut not implemented yet');
}

/** Subscribe once, at the top of the app — see useAuth.ts and plan.md step 4. */
export function subscribeToAuthChanges(onChange: (session: Session | null) => void): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => onChange(session));
  return () => subscription.unsubscribe();
}
