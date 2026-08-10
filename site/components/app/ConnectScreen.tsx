"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  dotenvSnippet,
  licenseKey as fixtureKey,
  licenseKeyMasked as fixtureKeyMasked,
  mcpCommand,
  mcpFaults,
  mcpTools,
  shellProfileSnippet,
} from "@/content/app";
import { ApiError, api, apiUrl, type LicenseInfo } from "@/lib/api";
import { timeAgo } from "@/lib/relativeTime";
import type { ConnectScene } from "@/lib/appState";
import { AppShell } from "./AppShell";
import styles from "./ConnectScreen.module.css";

/** Fixtures for `?state=` review mode, matching `GET /v1/license`. */
const fixtureLicense: Record<ConnectScene, LicenseInfo> = {
  ok: {
    keyPlain: fixtureKey,
    keyMasked: fixtureKeyMasked,
    recoverable: true,
    status: "active",
    lastUsedAt: new Date(Date.now() - 4 * 60_000).toISOString(),
  },
  stale: {
    keyPlain: fixtureKey,
    keyMasked: fixtureKeyMasked,
    recoverable: true,
    status: "active",
    lastUsedAt: new Date(Date.now() - 6 * 86_400_000).toISOString(),
  },
  never: { keyPlain: fixtureKey, keyMasked: fixtureKeyMasked, recoverable: true, status: "active" },
  lapsed: {
    keyPlain: fixtureKey,
    keyMasked: fixtureKeyMasked,
    recoverable: true,
    status: "canceled",
  },
};

/**
 * `lastUsedAt` is bumped every time a bearer key authenticates, so this line
 * is a real signal that an editor is talking to the server — not a guess.
 */
function connectionStatus(license: LicenseInfo | null): { dot: string; text: string } {
  if (!license) return { dot: "var(--line)", text: "No license key on this account yet" };
  if (license.status !== "active") {
    return {
      dot: "var(--danger)",
      text: "Server is refusing this key — chat and MCP are off until billing is sorted",
    };
  }
  if (!license.lastUsedAt) {
    return { dot: "var(--line)", text: "Never connected from an editor yet" };
  }
  const ago = timeAgo(license.lastUsedAt);
  const stale = Date.now() - new Date(license.lastUsedAt).getTime() > 86_400_000;
  return {
    dot: stale ? "var(--faint)" : "var(--signal)",
    text: stale ? `Last used ${ago}` : `Connected — last used ${ago}`,
  };
}

const faultCodeClass = {
  danger: styles.faultCodeDanger,
  signal: styles.faultCodeSignal,
  faint: styles.faultCodeFaint,
};

export function ConnectScreen({ scene }: { scene: ConnectScene | null }) {
  const live = scene === null;
  const [reveal, setReveal] = useState(false);
  const [tab, setTab] = useState<"profile" | "env">("profile");
  const [copied, setCopied] = useState("");
  const [license, setLicense] = useState<LicenseInfo | null>(live ? null : fixtureLicense[scene]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    api
      .license()
      .then((info) => !cancelled && setLicense(info))
      .catch((error: unknown) => {
        if (cancelled) return;
        const code = error instanceof ApiError ? error.code : "INTERNAL_ERROR";
        setLoadError(
          code === "NO_LICENSE"
            ? "This account has no license key — subscribe to get one. Every local command works without it."
            : code === "UNAUTHENTICATED"
              ? "Your session expired. Sign in again to see your key."
              : "Could not load your license key.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [live]);

  const copy = useCallback((text: string, id: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(id);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(""), 1600);
  }, []);

  // Masking is presentational only — copying always yields the working key.
  // `keyPlain` is absent when the row predates encryption-at-rest, in which
  // case there is no real key to copy and Rotate is the only way to see one.
  const realKey = license?.keyPlain ?? "";
  const masked = license?.keyMasked ?? "apb_live_••••••••";
  const shownKey = reveal && realKey ? realKey : masked;
  const copyKey = realKey || masked;
  const envShown = tab === "profile" ? shellProfileSnippet(shownKey) : dotenvSnippet(shownKey);
  const envReal = tab === "profile" ? shellProfileSnippet(copyKey) : dotenvSnippet(copyKey);
  const status = connectionStatus(license);
  const host = new URL(apiUrl()).host;

  return (
    <AppShell title="Connect your editor" marker={{ text: "Live", tone: "muted" }}>
      <div className={styles.page}>
        <h1 className={styles.title}>One conversation, two places</h1>
        <p className={styles.lead}>
          Ask here, keep going in Claude Code. It&apos;s the same thread on the same server — not a
          copy, not a sync. Add it once with the command below.
        </p>

        <div className={styles.cardPadded}>
          <div className={styles.flow}>
            <div className={styles.flowPane}>
              <div className={styles.flowPaneHead}>This site</div>
              <div className={styles.flowChat}>
                <div className={styles.flowUser}>Cheapest stack with auth and payments?</div>
                <div className={styles.flowAssistant}>
                  Supabase covers both, one bill instead of two…
                </div>
              </div>
            </div>

            <div className={styles.flowMid}>
              <svg width="72" height="46" viewBox="0 0 72 46" fill="none" aria-hidden="true">
                <path
                  className={styles.flowDash}
                  d="M4 15h64"
                  stroke="var(--accent)"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <path
                  className={styles.flowDash}
                  d="M68 31H4"
                  stroke="var(--signal)"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <path
                  d="M63 11l5 4-5 4"
                  stroke="var(--accent)"
                  strokeWidth="1.6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 27l-5 4 5 4"
                  stroke="var(--signal)"
                  strokeWidth="1.6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className={styles.flowMidLabel}>
                one Postgres
                <br />
                thread
              </span>
            </div>

            <div className={styles.flowPane}>
              <div className={styles.flowPaneHead}>Claude Code</div>
              <pre className={styles.preSmall}>
                <span style={{ color: "var(--term-prompt)" }}>&gt;</span>{" "}
                <span style={{ color: "var(--term-blue)" }}>ai-project-bootstrap</span> chat{"\n"}
                <span style={{ color: "var(--term-green)" }}>✓</span> picking up where you left off
                {"\n"}…so Supabase, unless you need{"\n"}SOC 2 on day one.
              </pre>
            </div>
          </div>
          <p className={styles.flowNote}>
            Messages sent over MCP show up in the web thread and the other way round. There&apos;s a
            test in the backend that proves exactly this.
          </p>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>Add the MCP server</span>
            <span className={styles.tagQuiet}>one time</span>
            <button
              className={styles.revealBtn}
              onClick={() => setReveal((v) => !v)}
              disabled={!license?.recoverable}
              title={
                license?.recoverable === false
                  ? "This key predates encryption-at-rest — rotate it to see one"
                  : undefined
              }
            >
              {reveal ? "Hide key" : "Reveal key"}
            </button>
          </div>
          <pre className={styles.pre}>{mcpCommand(shownKey, host)}</pre>
          <div className={styles.cardFoot}>
            <button
              className={styles.solidBtn}
              onClick={() => copy(mcpCommand(copyKey, host), "mcp")}
            >
              {copied === "mcp" ? "copied ✓" : "copy command"}
            </button>
            <span className={styles.hint}>
              Copies with your real key even while it&apos;s masked here.
            </span>
          </div>
          <div className={styles.status}>
            <div className={styles.statusInner}>
              <span className={styles.statusDot} style={{ background: status.dot }} />
              <span className={styles.statusText}>{loadError ?? status.text}</span>
              {license?.createdAt && (
                <span className={styles.statusNote}>
                  key issued {new Date(license.createdAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className={styles.two}>
          <div className={styles.tile}>
            <div className={styles.tileTitle}>What the assistant gets</div>
            <div className={styles.toolList}>
              {mcpTools.map((t, i) => (
                <div key={i} className={styles.toolRow}>
                  <span className={t.tone === "accent" ? styles.toolTagAccent : styles.toolTag}>
                    {t.tag}
                  </span>
                  <span className={styles.toolText}>{t.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.tile}>
            <div className={styles.tileTitle}>Other editors</div>
            <p className={styles.tileBody}>
              Any MCP client that speaks Streamable HTTP can point at the same URL with the same
              header. Cursor, Cline, Continue and Zed all do — the command differs, the endpoint
              doesn&apos;t.
            </p>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>
              The CLI&apos;s key, for <span className={styles.mono}>--idea</span>
            </span>
            <span className={styles.hint} style={{ marginLeft: "auto" }}>
              Only these three things need it: <span className={styles.mono}>--idea</span>, MCP, and
              the CLI&apos;s chat
            </span>
          </div>
          <div className={styles.tabs}>
            <button
              className={tab === "profile" ? styles.tabActive : styles.tab}
              onClick={() => setTab("profile")}
            >
              shell profile
            </button>
            <button
              className={tab === "env" ? styles.tabActive : styles.tab}
              onClick={() => setTab("env")}
            >
              .env
            </button>
          </div>
          <pre className={styles.pre}>{envShown}</pre>
          <div className={styles.cardFoot}>
            <button className={styles.outlineBtn} onClick={() => copy(envReal, "env")}>
              {copied === "env" ? "copied ✓" : "copy line"}
            </button>
            <span className={styles.hint}>
              {tab === "profile"
                ? "Reload the shell after adding it, or the CLI won't see it."
                : "Add .env to .gitignore. The key is a live credential."}
            </span>
          </div>
        </div>

        <div className={styles.card} style={{ marginBottom: 0 }}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>When it doesn&apos;t work</span>
          </div>
          {mcpFaults.map((f) => (
            <div key={f.code + f.title} className={styles.fault}>
              <span className={faultCodeClass[f.tone]}>{f.code}</span>
              <div className={styles.faultBody}>
                <div className={styles.faultTitle}>{f.title}</div>
                <div className={styles.faultText}>{f.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
