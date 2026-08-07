// Scaffolded by `ai-project-bootstrap implement authentication` (Supabase Auth).
// See implementation/authentication/plan.md, step 4.
//
// Subscribes to auth state once, here, so screens read from this instead of
// each holding their own (potentially stale) copy of the session.

import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import * as authClient from '../../features/auth/authClient';

export interface UseAuthResult {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthResult {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authClient.subscribeToAuthChanges((next) => {
      setSession(next);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setSession(await authClient.signInWithPassword(email, password));
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setSession(await authClient.signUp(email, password));
  }, []);

  const signOut = useCallback(async () => {
    await authClient.signOut();
    // TODO (plan.md, step 8): clear any other cached user-scoped state here
    // (queries, profile, entitlements) before the session itself is cleared.
    setSession(null);
  }, []);

  return { session, loading, signIn, signUp, signOut };
}
