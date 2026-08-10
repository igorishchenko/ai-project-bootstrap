"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { Mark, Wordmark } from "@/components/shared/Logo";
import { Hatch } from "@/components/shared/Hatch";
import type { AuthScene } from "@/lib/appState";
import { useTheme } from "@/lib/useTheme";
import { ApiError, api } from "@/lib/api";
import { authCollectRows, proFeatures } from "@/content/app";
import styles from "./AuthScreen.module.css";

const collectTagClass = {
  ink: styles.collectTag,
  muted: styles.collectTagMuted,
  faint: styles.collectTagFaint,
};

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function AuthScreen({ scene: initialScene }: { scene: AuthScene }) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [scene, setScene] = useState<AuthScene>(initialScene);
  const [email, setEmail] = useState("");
  const [ideaText, setIdeaText] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [resent, setResent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const resendTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // `initialScene` only changes on navigation, and the pages key on it — so
  // this component remounts rather than syncing the prop into state.
  useEffect(() => () => clearTimeout(resendTimer.current), []);

  const isSignup = scene === "signup";

  /**
   * `POST /v1/auth/request-link` answers 204 whether or not the address has an
   * account — that is the point, so there is nothing to branch on. Requesting
   * a link *is* signing up, which is why sign-in and sign-up post to the same
   * endpoint and land on the same interstitial.
   */
  async function submit() {
    if (!EMAIL.test(email.trim())) {
      setEmailError(true);
      return;
    }
    setSubmitting(true);
    setEmailError(false);
    setSendError(null);
    try {
      await api.requestLink(email.trim());
      setScene("sent");
    } catch (error) {
      setSendError(
        error instanceof ApiError && error.code === "OFFLINE"
          ? "Could not reach the server. Check your connection and try again."
          : "Something went wrong sending the link. Try again in a moment.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  /** The server enforces a 60-second cooldown; the button mirrors it. */
  async function resend() {
    if (resent) return;
    setResent(true);
    try {
      await api.requestLink(email.trim());
    } catch {
      // Silent by design — the endpoint never reports whether it sent.
    }
    resendTimer.current = setTimeout(() => setResent(false), 60_000);
  }

  /**
   * The display name is the only thing here the API can store — the "what are
   * you building?" answer has nowhere to go until chat can be seeded with a
   * first message, so it is carried to the composer in the URL instead.
   */
  async function finishOnboarding() {
    const name = displayName.trim();
    if (name) {
      try {
        await api.updateDisplayName(name);
      } catch {
        // A missing display name is not worth blocking the way into chat.
      }
    }
    const idea = ideaText.trim();
    router.push(idea ? `/chat?draft=${encodeURIComponent(idea)}` : "/chat");
  }

  function backToForm() {
    setSubmitting(false);
    setResent(false);
    setScene("signin");
  }

  return (
    <div className={styles.page}>
      <Hatch />

      <header className={styles.topbar}>
        <Link href="/" className={styles.brand}>
          <Mark size={24} strokeWidth={1.7} />
          <Wordmark size={13} />
        </Link>
        <div className={styles.topRight}>
          <Link href="/pricing" className={`${styles.topLink} ${styles.hideSm}`}>
            Pricing
          </Link>
          <button onClick={toggleTheme} className={styles.themeBtn} aria-label="Toggle theme">
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </header>

      <div className={styles.middle}>
        <div className={styles.panel} key={scene}>
          {(scene === "signin" || scene === "signup") && (
            <div>
              <h1 className={styles.title}>{isSignup ? "Create your account" : "Sign in"}</h1>
              <p className={styles.lead}>
                {isSignup
                  ? "Email only. The license key already arrives by email, so email is the channel we already trust — a password would just be a second, weaker secret guarding the same thing."
                  : "Enter the email you used when you subscribed. We'll send a link — no password to remember or reset."}
              </p>

              <div className={styles.card}>
                <label htmlFor="email" className={styles.label}>
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className={styles.input}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submit();
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  spellCheck={false}
                />
                {emailError && (
                  <div className={styles.error}>That doesn&apos;t look like an email address.</div>
                )}
                {sendError && <div className={styles.error}>{sendError}</div>}
                <button className={styles.submit} onClick={submit}>
                  {submitting && (
                    <svg
                      className={styles.spinner}
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      aria-hidden="true"
                    >
                      <path d="M12 3a9 9 0 1 0 9 9" strokeLinecap="round" />
                    </svg>
                  )}
                  <span>
                    {submitting
                      ? "Sending…"
                      : isSignup
                        ? "Send me a sign-up link"
                        : "Send me a sign-in link"}
                  </span>
                </button>
                <p className={styles.fine}>
                  No password. We send a link that signs you in for 30 days.
                </p>
              </div>

              <div className={styles.switchRow}>
                <span>{isSignup ? "Already have an account?" : "First time here?"}</span>
                <button
                  className={styles.switchLink}
                  onClick={() => {
                    setEmailError(false);
                    router.push(isSignup ? "/login" : "/register");
                  }}
                >
                  {isSignup ? "Sign in" : "Create an account"}
                </button>
              </div>

              <div className={styles.collect}>
                <div className={styles.collectLabel}>What we ask for</div>
                <div className={styles.collectList}>
                  {authCollectRows.map((c) => (
                    <div key={c.tag} className={styles.collectRow}>
                      <span className={collectTagClass[c.tone]}>{c.tag}</span>
                      <span className={styles.collectText}>{c.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {scene === "sent" && (
            <div className={styles.cardFlush}>
              <div className={styles.cardTop}>
                <div className={styles.badge}>
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 7.5 12 13l9-5.5M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
                  </svg>
                </div>
                <h1 className={styles.titleSmall}>Check your email</h1>
                <p className={styles.leadTight}>
                  A sign-in link is on its way to{" "}
                  <span className={styles.sentTo}>{email.trim() || "ada@lovelace.dev"}</span>. It
                  works once, and expires in 15 minutes.
                </p>
              </div>
              <div className={styles.cardActions}>
                <button className={styles.outlineBtn} disabled={resent} onClick={resend}>
                  {resent ? "Sent again — wait 60s to retry" : "Resend the link"}
                </button>
                <button className={styles.textBtn} onClick={backToForm}>
                  Use a different address
                </button>
              </div>
              <div className={styles.cardNote}>
                Nothing arrived? Check spam, and check the address above for typos — we won&apos;t
                tell you whether an account exists, so a wrong address fails silently.
              </div>
            </div>
          )}

          {(scene === "expired" || scene === "used") && (
            <div className={styles.cardFlush}>
              <div className={styles.cardTop}>
                <div className={styles.badgeDanger}>
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--danger)"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 8v5m0 3.5h.01M12 3l9 16H3l9-16Z" />
                  </svg>
                </div>
                <h1 className={styles.titleSmall}>
                  {scene === "used"
                    ? "That link has already been used"
                    : "That link has expired"}
                </h1>
                <p className={styles.leadTight}>
                  {scene === "used"
                    ? "Sign-in links work exactly once, so an old email in your inbox won't get you in. Ask for a fresh one — it takes a few seconds."
                    : "Links last 15 minutes, which is short on purpose: an email sitting in an inbox shouldn't be a permanent key to your account."}
                </p>
              </div>
              <div className={styles.cardActions}>
                <button className={styles.primaryBtn} onClick={backToForm}>
                  Send a new link
                </button>
              </div>
            </div>
          )}

          {scene === "session" && (
            <div className={styles.cardFlush}>
              <div className={styles.cardTop}>
                <h1 className={styles.titleSmall}>You&apos;ve been signed out</h1>
                <p className={styles.lead} style={{ marginBottom: 14 }}>
                  Sessions last 30 days and this one ran out mid-thought. Sign in again and the chat
                  picks up exactly where it was — the thread lives on the server, not in this tab.
                </p>
                <div className={styles.inset}>
                  Your unsent message is kept in this tab until you sign back in.
                </div>
              </div>
              <div className={styles.cardActions}>
                <button className={styles.primaryBtn} onClick={backToForm}>
                  Sign in again
                </button>
              </div>
            </div>
          )}

          {scene === "onboard" && (
            <div>
              <h1 className={styles.titleMedium}>What are you building?</h1>
              <p className={styles.lead}>
                One sentence is enough. It becomes the first message in your chat, so you don&apos;t
                land on an empty box. Skip it and nothing is lost.
              </p>
              <div className={styles.card}>
                <input
                  className={styles.input}
                  value={ideaText}
                  onChange={(e) => setIdeaText(e.target.value)}
                  placeholder="A habit tracker with sign-in and paid reminders"
                  aria-label="What are you building?"
                />
                <div style={{ marginTop: 14 }}>
                  <label htmlFor="dname" className={styles.label}>
                    Display name — optional
                  </label>
                  <input
                    id="dname"
                    className={styles.input}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ada"
                  />
                </div>
                <div className={styles.onboardActions}>
                  <button className={styles.primaryBtn} onClick={finishOnboarding} data-lift>
                    Start the chat
                  </button>
                  <Link href="/chat" className={styles.skip}>
                    Skip
                  </Link>
                </div>
              </div>
            </div>
          )}

          {scene === "nosub" && (
            <div>
              <h1 className={styles.titleMedium}>You&apos;re in. Chat needs Pro.</h1>
              <p className={styles.lead} style={{ marginBottom: 20 }}>
                The CLI is free and stays free — nothing you&apos;ve generated depends on this. Pro
                pays for the hosted model: <span className={styles.mono}>--idea</span>, web chat,
                and the editor assistant.
              </p>
              <div className={styles.cardFlush}>
                <div className={styles.priceRow}>
                  <span className={styles.price}>$15</span>
                  <span className={styles.priceUnit}>/month, or $149/year</span>
                  <span className={styles.priceVat}>+ VAT where it applies</span>
                </div>
                <div className={styles.featureList}>
                  {proFeatures.map((f) => (
                    <div key={f} className={styles.featureRow}>
                      <span className={styles.featureMark}>✔</span>
                      <span className={styles.featureText}>{f}</span>
                    </div>
                  ))}
                </div>
                <div className={styles.subscribeWrap}>
                  <button className={styles.subscribe}>Subscribe — checkout opens here</button>
                  <p className={styles.paddleNote}>
                    Paddle handles the payment and the tax, and{" "}
                    <strong className={styles.paddleStrong}>
                      &quot;Paddle&quot; is what shows on your card statement
                    </strong>
                    . Cancel any time from Billing.
                  </p>
                </div>
              </div>
              <div className={styles.afterCard}>
                Not now? <Link href="/chat">Look around the dashboard</Link> — everything except
                sending a message works.
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
