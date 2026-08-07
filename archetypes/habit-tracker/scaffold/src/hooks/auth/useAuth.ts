// Scaffolded by `ai-project-bootstrap --archetype habit-tracker`.
// See docs/starter-template.md.
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../services/supabase/client';

export interface UseAuthResult {
  /** `undefined` while the stored session is still loading — not the same as signed out. */
  session: Session | null | undefined;
  signedIn: boolean;
}

/**
 * Subscribes once, at the root — see App.tsx. Reading auth state anywhere
 * else via a fresh `getSession()` call risks acting on a stale session
 * between the moment it expires and the next refresh.
 */
export function useAuth(): UseAuthResult {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  return { session, signedIn: session != null };
}
