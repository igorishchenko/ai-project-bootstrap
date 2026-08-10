"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { ApiError, api, type Me } from "./api";

type SessionState =
  | { status: "loading"; me?: undefined }
  | { status: "ready"; me: Me }
  | { status: "signed-out"; me?: undefined }
  | { status: "offline"; me?: undefined };

type SessionValue = SessionState & {
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

/**
 * Holds the answer to `GET /v1/me` for the whole dashboard shell.
 *
 * A 401 here is the only signal the dashboard gets that a session expired —
 * the cookie is httpOnly and lives on the API's origin, so there is nothing to
 * inspect locally. Screens render their signed-out state rather than
 * redirecting from here, so an expired session doesn't throw away whatever the
 * user was in the middle of typing.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: "loading" });

  const load = useCallback(async () => {
    try {
      setState({ status: "ready", me: await api.me() });
    } catch (error) {
      if (error instanceof ApiError && error.code === "OFFLINE") {
        setState({ status: "offline" });
        return;
      }
      setState({ status: "signed-out" });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Subscribing to an external system — the API's session — rather than
    // deriving state, so the fetch belongs in an effect.
    api
      .me()
      .then((me) => !cancelled && setState({ status: "ready", me }))
      .catch((error: unknown) => {
        if (cancelled) return;
        const offline = error instanceof ApiError && error.code === "OFFLINE";
        setState({ status: offline ? "offline" : "signed-out" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.signOut();
    } catch {
      // The cookie is cleared server-side or it isn't; either way the local
      // view of the session is now signed out.
    }
    setState({ status: "signed-out" });
  }, []);

  return (
    <SessionContext.Provider value={{ ...state, refresh: load, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside <SessionProvider>");
  return value;
}

/**
 * Sends a signed-out visitor to the sign-in page once the session resolves.
 * Used by screens that have nothing to show without an account.
 */
export function useRequireSession(): SessionValue {
  const session = useSession();
  const router = useRouter();
  const signedOut = session.status === "signed-out";

  useEffect(() => {
    if (signedOut) router.replace("/login?state=session");
  }, [signedOut, router]);

  return session;
}
