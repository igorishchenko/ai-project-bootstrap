"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, api } from "@/lib/api";
import { AuthScreen } from "./AuthScreen";
import type { AuthScene } from "@/lib/appState";
import styles from "./AuthScreen.module.css";

/**
 * `LINK_EXPIRED` and `LINK_CONSUMED` are distinct on purpose — the backend
 * keeps consumed tokens rather than deleting them precisely so this screen can
 * tell the two apart, and the design draws a different message for each.
 */
const sceneForCode: Record<string, AuthScene> = {
  LINK_EXPIRED: "expired",
  LINK_CONSUMED: "used",
  LINK_INVALID: "expired",
  INVALID_CONFIG: "expired",
};

export function VerifyLink({ token }: { token: string }) {
  const router = useRouter();
  const [failure, setFailure] = useState<AuthScene | null>(token ? null : "expired");
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;

    api
      .verifyLink(token)
      .then(({ user }) => {
        // A brand-new account has no display name yet, so it gets the
        // post-signup screen; a returning user goes straight to the thread
        // they left, which is the whole point of signing in.
        router.replace(user?.displayName ? "/chat" : "/register?state=onboard");
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.code === "OFFLINE") {
          setFailure("session");
          return;
        }
        const code = error instanceof ApiError ? error.code : "LINK_INVALID";
        setFailure(sceneForCode[code] ?? "expired");
      });
  }, [token, router]);

  if (failure) return <AuthScreen scene={failure} />;

  return (
    <div className={styles.page}>
      <div className={styles.middle}>
        <div className={styles.panel} style={{ textAlign: "center" }}>
          <h1 className={styles.titleSmall}>Signing you in…</h1>
          <p className={styles.leadTight}>One moment — checking that link.</p>
        </div>
      </div>
    </div>
  );
}
