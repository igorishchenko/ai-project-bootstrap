"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Mark, Wordmark } from "@/components/shared/Logo";
import { ApiError, api } from "@/lib/api";
import styles from "./AuthScreen.module.css";

type Outcome =
  | { kind: "working" }
  | { kind: "applied"; email?: string }
  | { kind: "awaiting"; side: "current" | "new" }
  | { kind: "failed"; message: string };

const failureCopy: Record<string, string> = {
  LINK_EXPIRED: "That confirmation link has expired. Start the email change again from Settings.",
  LINK_INVALID: "That confirmation link is not valid — it may already have been used.",
  EMAIL_TAKEN:
    "That address was claimed by another account before this change completed, so nothing was changed.",
};

export function ConfirmEmail({ token }: { token: string }) {
  const [outcome, setOutcome] = useState<Outcome>(
    token ? { kind: "working" } : { kind: "failed", message: failureCopy.LINK_INVALID },
  );
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;

    api
      .confirmEmailChange(token)
      .then((result) => {
        setOutcome(
          result.applied
            ? { kind: "applied", email: result.email }
            : { kind: "awaiting", side: result.awaiting ?? "new" },
        );
      })
      .catch((error: unknown) => {
        const code = error instanceof ApiError ? error.code : "LINK_INVALID";
        setOutcome({
          kind: "failed",
          message:
            code === "OFFLINE"
              ? "Could not reach the server. Open this link again in a moment."
              : (failureCopy[code] ?? failureCopy.LINK_INVALID),
        });
      });
  }, [token]);

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand}>
          <Mark size={24} strokeWidth={1.7} />
          <Wordmark size={13} />
        </Link>
      </header>

      <div className={styles.middle}>
        <div className={styles.panel}>
          <div className={styles.cardFlush}>
            <div className={styles.cardTop}>
              {outcome.kind === "working" && (
                <>
                  <h1 className={styles.titleSmall}>Confirming…</h1>
                  <p className={styles.leadTight}>One moment.</p>
                </>
              )}

              {outcome.kind === "applied" && (
                <>
                  <h1 className={styles.titleSmall}>Email changed</h1>
                  <p className={styles.leadTight}>
                    Both sides confirmed. Your account now signs in with{" "}
                    <span className={styles.sentTo}>{outcome.email}</span>.
                  </p>
                </>
              )}

              {outcome.kind === "awaiting" && (
                <>
                  <h1 className={styles.titleSmall}>One half done</h1>
                  <p className={styles.leadTight}>
                    Thanks — now open the link sent to your{" "}
                    {outcome.side === "new" ? "new" : "current"} address to finish. Nothing changes
                    until both are confirmed.
                  </p>
                </>
              )}

              {outcome.kind === "failed" && (
                <>
                  <h1 className={styles.titleSmall}>That link didn&apos;t work</h1>
                  <p className={styles.leadTight}>{outcome.message}</p>
                </>
              )}
            </div>

            {outcome.kind !== "working" && (
              <div className={styles.cardActions}>
                <Link href="/settings" className={styles.primaryBtn}>
                  Back to settings
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
