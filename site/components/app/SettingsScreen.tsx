"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { emailPrefs, invoices, keyUnlocks, settingsTabs, type SettingsTabId } from "@/content/app";
import { ApiError, api, type LicenseInfo, type LicenseStatus, type Me } from "@/lib/api";
import { timeAgo } from "@/lib/relativeTime";
import { useSession } from "@/lib/useSession";
import { useTheme } from "@/lib/useTheme";
import type { SettingsScene } from "@/lib/appState";
import { AppShell } from "./AppShell";
import styles from "./SettingsScreen.module.css";

/** `?state=` review mode maps onto the statuses the API actually returns. */
const sceneStatus: Record<SettingsScene, LicenseStatus | "none"> = {
  active: "active",
  pastdue: "past_due",
  canceling: "canceled",
  lapsed: "none",
};

const statusCopy: Record<
  LicenseStatus | "none",
  { label: string; danger: boolean; line: string }
> = {
  active: {
    label: "active",
    danger: false,
    line: "Renews automatically. Cancel any time — it runs to the end of the period you've paid for.",
  },
  past_due: {
    label: "past due",
    danger: true,
    line: "The last payment was declined. Your payment provider retries before the subscription ends.",
  },
  canceled: {
    label: "canceled",
    danger: true,
    line: "Canceled. Hosted AI is off; the CLI, your saved stacks and everything you've generated are unaffected.",
  },
  none: {
    label: "no subscription",
    danger: false,
    line: "You've never subscribed. Everything local works without one — Pro pays for the hosted model.",
  },
};

const statusAlert: Partial<Record<LicenseStatus | "none", { tag: string; text: string }>> = {
  past_due: {
    tag: "Action needed",
    text: "Update the card with your payment provider and chat comes back within a minute of the payment clearing.",
  },
  canceled: {
    tag: "Chat is off",
    text: "Resubscribing reactivates the same license key — you won't need to re-paste it anywhere.",
  },
};

export function SettingsScreen({
  tab,
  scene,
}: {
  tab: SettingsTabId;
  scene: SettingsScene | null;
}) {
  const { me } = useSession();
  const status: LicenseStatus | "none" = scene ? sceneStatus[scene] : (me?.status ?? "none");

  return (
    <AppShell
      title="Settings"
      marker={{
        text: tab === "usage" ? "Needs API" : "Live",
        tone: tab === "usage" ? "signal" : "muted",
      }}
    >
      <div className={styles.grid}>
        <nav className={styles.tabs} aria-label="Settings sections">
          {settingsTabs.map((t) => {
            const active = t.id === tab;
            const query = scene ? `&state=${scene}` : "";
            return (
              <Link
                key={t.id}
                href={`/settings?tab=${t.id}${query}`}
                className={active ? styles.tabActive : styles.tab}
                aria-current={active ? "page" : undefined}
              >
                <span>{t.label}</span>
                <span className={t.marker === "live" ? styles.tabMarkQuiet : styles.tabMark}>
                  {t.marker === "live"
                    ? "live"
                    : t.marker === "design-ahead"
                      ? "design-ahead"
                      : "needs api"}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.pane}>
          {tab === "account" && <AccountPane me={me} live={scene === null} />}
          {tab === "key" && <KeyPane live={scene === null} />}
          {tab === "billing" && <BillingPane status={status} />}
          {tab === "usage" && <UsagePane status={status} />}
          {tab === "prefs" && <PrefsPane />}
        </div>
      </div>
    </AppShell>
  );
}

/* -------------------------------------------------------------------------- */

function AccountPane({ me, live }: { me: Me | undefined; live: boolean }) {
  const router = useRouter();
  const { refresh } = useSession();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailPending, setEmailPending] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const email = me?.email ?? "…";

  async function saveName() {
    setBusy(true);
    setNotice(null);
    try {
      await api.updateDisplayName(name.trim() || null);
      await refresh();
      setEditingName(false);
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : "Could not save that name.");
    } finally {
      setBusy(false);
    }
  }

  async function submitEmailChange() {
    setBusy(true);
    setNotice(null);
    try {
      const { newEmail: pending } = await api.requestEmailChange(newEmail.trim());
      setEmailPending(pending);
      setChangingEmail(false);
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : "Could not start the email change.");
    } finally {
      setBusy(false);
    }
  }

  /**
   * The server refuses this while a subscription is active — deleting the row
   * would not stop the billing. The copy above says so, and the 409's hint is
   * surfaced verbatim if someone gets here anyway.
   */
  async function deleteAccount() {
    setBusy(true);
    setNotice(null);
    try {
      await api.deleteAccount(confirmEmail.trim());
      router.push("/");
    } catch (error) {
      setNotice(
        error instanceof ApiError ? (error.hint ?? error.message) : "Could not delete the account.",
      );
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className={styles.title}>Account</h1>
      <p className={styles.lead}>
        Email is the whole identity here. There&apos;s no password to change.
      </p>

      {notice && <div className={styles.cardNote}>{notice}</div>}

      <div className={styles.card}>
        <div className={styles.cardRowBordered}>
          <div>
            <div className={styles.eyebrow}>Email</div>
            <div className={styles.value}>{email}</div>
          </div>
          <button
            className={styles.outlineBtnRight}
            disabled={!live}
            onClick={() => setChangingEmail((v) => !v)}
          >
            {changingEmail ? "Cancel" : "Change email"}
          </button>
        </div>
        {changingEmail && (
          <div className={styles.cardRowBordered}>
            <input
              className={styles.confirmInput}
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="new@example.com"
              aria-label="New email address"
            />
            <button className={styles.outlineBtn} disabled={busy} onClick={submitEmailChange}>
              {busy ? "Sending…" : "Send confirmations"}
            </button>
          </div>
        )}
        {emailPending && (
          <div className={styles.cardRowBordered}>
            <span className={styles.prefNote}>
              Two links are on their way — one to {email} and one to {emailPending}. Nothing moves
              until both are clicked.
            </span>
          </div>
        )}
        <div className={styles.cardNote}>
          Changing it confirms twice — a link to the old address to approve, then one to the new
          address to finish. Until both are clicked, nothing moves.
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardRow}>
          <div>
            <div className={styles.eyebrow}>Display name</div>
            {editingName ? (
              <input
                className={styles.confirmInput}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ada"
                aria-label="Display name"
              />
            ) : (
              <div className={me?.displayName ? styles.value : styles.valueQuiet}>
                {me?.displayName || "Not set — optional"}
              </div>
            )}
          </div>
          {editingName ? (
            <button className={styles.outlineBtnRight} disabled={busy} onClick={saveName}>
              {busy ? "Saving…" : "Save"}
            </button>
          ) : (
            <button
              className={styles.outlineBtnRight}
              disabled={!live}
              onClick={() => {
                setName(me?.displayName ?? "");
                setEditingName(true);
              }}
            >
              {me?.displayName ? "Change name" : "Add a name"}
            </button>
          )}
        </div>
      </div>

      <div className={styles.cardDanger}>
        <div className={styles.cardPad}>
          <div className={styles.subheadDanger}>Delete account</div>
          <p className={styles.body}>
            Deletes your thread, your key and this account.{" "}
            <strong className={styles.strong}>
              Cancel your subscription first — the server refuses otherwise
            </strong>
            , because deleting here would not stop the billing.{" "}
            <strong className={styles.strong}>
              Projects you&apos;ve already generated are untouched
            </strong>{" "}
            — they&apos;re ordinary MIT-licensed files on your disk and never phoned home in the
            first place.
          </p>
        </div>
        <div className={styles.cardPadTop}>
          <button className={styles.dangerBtn} disabled={!live} onClick={() => setDeleting(true)}>
            Delete my account
          </button>
        </div>
        {deleting && (
          <div className={styles.confirm}>
            <div className={styles.confirmText}>
              Type <span className={styles.mono}>{email}</span> to confirm. This happens
              immediately — there&apos;s no grace period and no undo.
            </div>
            <div className={styles.confirmRow}>
              <input
                className={styles.confirmInput}
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={email}
                aria-label="Confirm your email"
              />
              <button
                className={styles.solidDangerBtn}
                disabled={busy || confirmEmail.trim() !== email}
                onClick={deleteAccount}
              >
                {busy ? "Deleting…" : "Delete"}
              </button>
              <button className={styles.cancelBtn} onClick={() => setDeleting(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function KeyPane({ live }: { live: boolean }) {
  const [license, setLicense] = useState<LicenseInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [rotated, setRotated] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    api
      .license()
      .then((info) => !cancelled && setLicense(info))
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(
          e instanceof ApiError && e.code === "NO_LICENSE"
            ? "This account has no license key. Subscribe to get one — every local command works without it."
            : "Could not load your license key.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [live]);

  // After a rotation the plaintext is in hand; before one it is only there if
  // the row was written under the current LICENSE_KEY_SECRET.
  const plain = rotated ?? license?.keyPlain;
  const shown = reveal && plain ? plain : (license?.keyMasked ?? "apb_live_••••••••");

  function copy() {
    if (!plain) return;
    navigator.clipboard?.writeText(plain).catch(() => {});
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  }

  async function rotate() {
    setBusy(true);
    try {
      const { key, keyMasked } = await api.rotateLicense();
      setRotated(key);
      setLicense((l) => (l ? { ...l, keyMasked, keyPlain: key, recoverable: true } : l));
      setReveal(true);
      setRotating(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not rotate the key.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className={styles.title}>License key</h1>
      <p className={styles.lead}>
        Signed in here, you don&apos;t need it — the web chat uses your session. The key is for
        machines: the CLI&apos;s <span className={styles.mono}>--idea</span> and the MCP server.
      </p>

      {error && <div className={styles.cardNote}>{error}</div>}

      <div className={styles.card}>
        <div className={styles.cardRow}>
          <span className={styles.keyValue}>{shown}</span>
          <div className={styles.keyActions}>
            <button
              className={styles.miniOutline}
              disabled={!plain}
              onClick={() => setReveal((v) => !v)}
            >
              {reveal ? "Hide" : "Reveal"}
            </button>
            <button className={styles.miniSolid} disabled={!plain} onClick={copy}>
              {copied ? "copied ✓" : "Copy"}
            </button>
          </div>
        </div>
        <div className={styles.cardNote}>
          {rotated
            ? "This is the new key. Paste it everywhere the old one was — the old key stopped working the moment this one was issued."
            : license && !license.recoverable
              ? "This key can't be shown: it predates encryption at rest, so the server only holds its hash. Rotate to get one you can see."
              : "Now that it lives here, we stop mailing the full key. Old emails still contain it — worth deleting them."}
        </div>
        {license?.lastUsedAt && (
          <div className={styles.cardRow}>
            <span className={styles.prefNote}>Last used {timeAgo(license.lastUsedAt)}</span>
          </div>
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.cardPad}>
          <div className={styles.eyebrow} style={{ marginBottom: 10 }}>
            What this key unlocks
          </div>
          <div className={styles.unlockList}>
            {keyUnlocks.map((u) => (
              <div key={u.text} className={styles.unlockRow}>
                <span className={u.on ? styles.unlockMark : styles.unlockMarkOff}>
                  {u.on ? "✔" : "—"}
                </span>
                <span className={u.on ? undefined : styles.unlockTextOff}>{u.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.card} style={{ marginBottom: 0 }}>
        <div className={styles.cardPad}>
          <div className={styles.subhead}>Rotate the key</div>
          <p className={styles.body}>
            Issues a new key and kills the old one on the spot.{" "}
            <strong className={styles.strong}>
              Every machine still using the old key stops working immediately
            </strong>{" "}
            — MCP in your editor, CI, other laptops. You&apos;ll need to paste the new one
            everywhere.
          </p>
        </div>
        <div className={styles.cardPadTop}>
          <button className={styles.outlineBtn} disabled={!live} onClick={() => setRotating(true)}>
            Rotate key
          </button>
        </div>
        {rotating && (
          <div className={styles.rotateConfirm}>
            <span className={styles.rotateText}>
              Rotate now? Two places need updating afterwards: your shell profile and the MCP
              command in each editor.
            </span>
            <button className={styles.solidSignalBtn} disabled={busy} onClick={rotate}>
              {busy ? "Rotating…" : "Rotate and show me the new key"}
            </button>
            <button className={styles.cancelBtn} onClick={() => setRotating(false)}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function BillingPane({ status }: { status: LicenseStatus | "none" }) {
  const copy = statusCopy[status];
  const alert = statusAlert[status];

  return (
    <div>
      <h1 className={styles.title}>Billing</h1>
      <p className={styles.lead}>
        Payment, tax and receipts are handled by the payment provider, not by us — which is also
        what appears on your card statement.
      </p>

      <div className={copy.danger ? styles.planCardAlert : styles.planCard}>
        <div className={styles.planTop}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className={styles.planName}>
              <span className={styles.planNameText}>
                {status === "none" ? "No subscription" : "Pro — monthly"}
              </span>
              <span className={copy.danger ? styles.planStatusDanger : styles.planStatus}>
                {copy.label}
              </span>
            </div>
            <div className={styles.planLine}>{copy.line}</div>
          </div>
          <div className={styles.planPrice}>
            <div className={styles.planAmount}>$15.00</div>
            <div className={styles.planVat}>+ VAT where it applies</div>
          </div>
        </div>

        {alert && (
          <div className={copy.danger ? styles.alertDanger : styles.alert}>
            <span className={copy.danger ? styles.alertTagDanger : styles.alertTag}>
              {alert.tag}
            </span>
            <span className={styles.alertText}>{alert.text}</span>
          </div>
        )}

        <div className={styles.cardRow}>
          <span className={styles.prefNote}>
            The status above is live. Card details, invoices and the portal link are not — there is
            no billing endpoint yet, only the webhook that keeps this status current.
          </span>
        </div>
        <div className={styles.fine}>
          We don&apos;t take card details ourselves and never see them.
        </div>
      </div>

      <div className={styles.card} style={{ marginBottom: 0 }}>
        <div className={styles.cardHead}>
          <span className={styles.eyebrow}>Invoices</span>
        </div>
        {invoices.map((inv) => (
          <div key={inv.date} className={styles.invoiceRow}>
            <span className={styles.invoiceDate}>{inv.date}</span>
            <span className={styles.invoiceAmount}>{inv.amount}</span>
            <span className={styles.invoiceStatus}>placeholder — needs api</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function UsagePane({ status }: { status: LicenseStatus | "none" }) {
  return (
    <div>
      <h1 className={styles.title}>Usage</h1>
      <p className={styles.lead}>
        Shown so you know where the ceiling is, not to sell you anything — there&apos;s no higher
        tier to move to, on purpose.
      </p>

      <div className={styles.usageCard}>
        <div className={styles.usageTop}>
          <span className={styles.usageLabel}>Messages today</span>
          <span className={styles.usageCount}>— / 200</span>
        </div>
        <div className={styles.meter}>
          <div className={styles.meterFill} style={{ width: "0%" }} />
        </div>
        <div className={styles.usageFoot}>
          <span>Web chat and MCP share this. Resets 00:00 UTC.</span>
          <span>{status === "none" ? "no subscription" : "count unavailable"}</span>
        </div>
      </div>

      <div className={styles.two}>
        <div className={styles.statCard}>
          <div className={styles.eyebrow}>Daily message cap</div>
          <div className={styles.statValue}>200</div>
          <div className={styles.statNote}>Per license key or session, across web and MCP.</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.eyebrow}>Hourly IP limit</div>
          <div className={styles.statValue}>20/hr</div>
          <div className={styles.statNote}>
            Per IP, not per key — a shared office network can hit this before you do.
          </div>
        </div>
      </div>

      <div className={styles.dashed}>
        <span className={styles.dashedTag}>Needs API</span>
        <span style={{ display: "block", marginTop: 6 }}>
          Both limits above are real and enforced today, but nothing reports your current count —
          the server only tells you when you hit it. This screen needs a usage endpoint before it
          can show a number.
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function PrefsPane() {
  const { theme, toggleTheme } = useTheme();
  const [prefs, setPrefs] = useState({ product: true, tips: false, security: true });

  return (
    <div>
      <h1 className={styles.title}>Preferences</h1>
      <p className={styles.lead}>Short list, and it should stay short.</p>

      <div className={styles.card}>
        <div className={styles.cardRow}>
          <div>
            <div className={styles.prefTitle}>Theme</div>
            <div className={styles.prefBody}>Follows the site-wide toggle in the nav.</div>
          </div>
          <div className={styles.themeOpts}>
            {(["light", "dark"] as const).map((opt) => (
              <button
                key={opt}
                className={theme === opt ? styles.themeOptActive : styles.themeOpt}
                onClick={() => {
                  if (theme !== opt) toggleTheme();
                }}
              >
                {opt}
              </button>
            ))}
            {/* No stored preference already means "follow the OS" — see themeBootstrapScript. */}
            <button className={styles.themeOpt}>system</button>
          </div>
        </div>
      </div>

      <div className={styles.card} style={{ marginBottom: 0 }}>
        <div className={styles.cardHead}>
          <span className={styles.eyebrow}>Email</span>
        </div>
        {emailPrefs.map((p) => {
          const on = prefs[p.key];
          return (
            <div key={p.key} className={styles.prefRow}>
              <div className={styles.prefCopy}>
                <div className={styles.prefName}>{p.title}</div>
                <div className={styles.prefNote}>{p.body}</div>
              </div>
              <button
                className={p.locked ? styles.toggleLocked : on ? styles.toggleOn : styles.toggle}
                aria-pressed={on}
                aria-label={p.title}
                disabled={p.locked}
                onClick={() => setPrefs((v) => ({ ...v, [p.key]: !on }))}
              >
                <span className={on ? styles.knobOn : styles.knob} />
              </button>
            </div>
          );
        })}
        <div className={styles.prefFine}>
          These toggles aren&apos;t stored anywhere yet. Security and billing emails can&apos;t be
          switched off in any case — they&apos;re the only way you&apos;d hear that a payment
          failed or a key was rotated.
        </div>
      </div>
    </div>
  );
}
