"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { archivedThreads, chatHistory, chatStarters, type ChatMessage } from "@/content/app";
import { ApiError, api, type Proposal } from "@/lib/api";
import { catalogue } from "@/lib/catalogue";
import { parseMarkdown, type Block } from "@/lib/markdown";
import { configJsonFor, costBucketsFor, runCommand } from "@/lib/proposalCosts";
import { useSession } from "@/lib/useSession";
import type { ChatScene } from "@/lib/appState";
import { AppShell } from "./AppShell";
import { CostBuckets } from "./CostBuckets";
import styles from "./ChatScreen.module.css";

/** Which blocking banner, if any, is showing. */
type ErrKind = "422" | "429" | "402" | "offline" | null;

const skeletons = [
  { align: "flex-end", width: "56%", height: 44 },
  { align: "flex-start", width: "88%", height: 96 },
  { align: "flex-end", width: "42%", height: 44 },
  { align: "flex-start", width: "76%", height: 72 },
] as const;

function fixtureMessages(scene: ChatScene): ChatMessage[] {
  if (scene === "empty" || scene === "loading" || scene === "unsub") return [];
  if (scene === "streaming" || scene === "e422") return chatHistory.slice(0, 1);
  return chatHistory.slice();
}

function fixtureErr(scene: ChatScene): ErrKind {
  if (scene === "e422") return "422";
  if (scene === "e429") return "429";
  if (scene === "e402") return "402";
  if (scene === "offline") return "offline";
  return null;
}

export function ChatScreen({ scene, initialDraft }: { scene: ChatScene | null; initialDraft?: string }) {
  // `?state=` is review mode: fixtures, no network. Without it the screen is live.
  const live = scene === null;
  const { me, refresh } = useSession();
  const [subscribing, setSubscribing] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    live ? [] : fixtureMessages(scene),
  );
  const [loading, setLoading] = useState(live || scene === "loading");
  const [err, setErr] = useState<ErrKind>(() => (live ? null : fixtureErr(scene)));
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState(
    initialDraft ?? (scene === "unsub" ? chatStarters[0] : ""),
  );
  const [thinking, setThinking] = useState(false);
  const [panel, setPanel] = useState<Proposal | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [copied, setCopied] = useState("");
  /** Kept so the 422 retry can resend exactly what failed. */
  const lastSent = useRef("");

  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const copy = useCallback((text: string, id: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(id);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(""), 1600);
  }, []);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  // Load the open thread. One per account, shared with MCP — so what Claude
  // Code added shows up here without any syncing.
  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    api
      .getChat()
      .then(({ messages: loaded }) => {
        if (cancelled) return;
        setMessages(
          loaded.map((m) => ({ role: m.role, content: m.content, proposal: m.proposal })),
        );
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setErr(errKindFor(error));
        if (error instanceof ApiError && error.status === 429) {
          setRateLimitMessage(error.message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [live]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setPanel(null);
      setDrawerOpen(false);
      setResetOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    function onClick(e: MouseEvent) {
      if (!drawerRef.current?.contains(e.target as Node)) setDrawerOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [drawerOpen]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, thinking]);

  function errKindFor(error: unknown): ErrKind {
    if (!(error instanceof ApiError)) return "422";
    if (error.code === "OFFLINE") return "offline";
    if (error.status === 402) return "402";
    if (error.status === 429) return "429";
    return "422";
  }

  /**
   * `POST /v1/chat` returns the whole reply — there is no SSE endpoint, so
   * there is no partial state to render and nothing to stop. The thinking
   * indicator covers the wait instead.
   */
  async function deliver(text: string) {
    lastSent.current = text;
    setThinking(true);
    setErr(null);
    try {
      const { reply, proposal } = await api.sendChat(text);
      setMessages((m) => [...m, { role: "assistant", content: reply, proposal }]);
    } catch (error) {
      setErr(errKindFor(error));
      if (error instanceof ApiError && error.status === 429) setRateLimitMessage(error.message);
    } finally {
      setThinking(false);
    }
  }

  const blocked = !draft.trim() || thinking || !live || err === "429" || err === "402";

  function send() {
    if (blocked) return;
    const text = draft.trim();
    setMessages((m) => [...m, { role: "user", content: text }]);
    setDraft("");
    void deliver(text);
  }

  function retry() {
    setErr(null);
    // The user turn is already in the thread server-side; only the reply failed.
    void deliver(lastSent.current);
  }

  async function doReset() {
    setResetOpen(false);
    setPanel(null);
    if (live) {
      try {
        await api.resetChat();
      } catch (error) {
        setErr(errKindFor(error));
        return;
      }
    }
    setMessages([]);
    setErr(null);
  }

  /**
   * There is no checkout yet, so locally this calls the backend's dev-only
   * activation route and the paywall lifts in place. Against a deployed API
   * that route does not exist, the call 404s, and we fall through to the real
   * pricing page — so this one button is correct in both environments without
   * the frontend needing to know which it is talking to.
   */
  async function subscribe() {
    setSubscribing(true);
    try {
      await api.devActivate();
      await refresh();
      setErr(null);
    } catch {
      window.location.href = "/pricing";
    } finally {
      setSubscribing(false);
    }
  }

  const isEmpty = messages.length === 0 && !loading;
  /**
   * Chat's 402 is deliberately ambiguous — the API will not tell an
   * unauthenticated caller whether the key is unknown or the subscription
   * lapsed. Signed in, we can say which, so the banner is chosen from
   * `GET /v1/me` rather than guessed from the status code.
   */
  const neverSubscribed = live ? me?.plan === "free" || me?.status === "none" : scene === "unsub";
  const showPaywall = err === "402" ? neverSubscribed : scene === "unsub";
  const showPastDue = err === "402" && !neverSubscribed;

  const dotClass =
    err === "offline"
      ? styles.dotQuiet
      : err === "402" || showPaywall
        ? styles.dotDanger
        : styles.dot;

  const placeholder =
    err === "429"
      ? "Paused until the daily limit resets"
      : err === "402"
        ? "Chat is off while your subscription is unresolved"
        : "Describe the project, or push back on the last answer…";

  return (
    <AppShell title="Chat" marker={{ text: "Live", tone: "muted" }} fill>
      <div className={styles.layout}>
        <div className={styles.col}>
          <div className={styles.toolbar}>
            <span className={dotClass} />
            <span className={styles.threadLabel}>
              {loading
                ? "loading thread…"
                : isEmpty
                  ? "new thread"
                  : `${messages.length} messages · one thread per account`}
            </span>
            <div className={styles.toolbarRight} ref={drawerRef}>
              <button className={styles.ghostBtn} onClick={() => setDrawerOpen((v) => !v)}>
                Past threads
              </button>
              <button className={styles.ghostBtn} onClick={() => setResetOpen(true)}>
                New chat
              </button>
              {drawerOpen && (
                <div className={styles.drawer}>
                  <div className={styles.drawerHead}>
                    <span className={styles.eyebrow}>Past threads</span>
                    <span className={styles.tagSignal} style={{ marginLeft: "auto" }}>
                      Needs API
                    </span>
                  </div>
                  {archivedThreads.map((a) => (
                    <div key={a.title} className={styles.drawerRow}>
                      <div className={styles.drawerTitle}>{a.title}</div>
                      <div className={styles.drawerMeta}>{a.meta}</div>
                    </div>
                  ))}
                  <div className={styles.drawerFoot}>
                    Placeholder rows. `/v1/chat/reset` archives a thread but nothing lists or
                    reopens archived ones yet, so this cannot show your real history.
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={styles.scroll} ref={scrollRef}>
            <div className={panel ? styles.threadNarrow : styles.thread}>
              {loading && (
                <div className={styles.skelWrap}>
                  {skeletons.map((k, i) => (
                    <div
                      key={i}
                      className={styles.skelRow}
                      style={{ alignSelf: k.align, width: k.width }}
                    >
                      <div className={styles.skelBar} />
                      <div className={styles.skelBody} style={{ height: k.height }} />
                    </div>
                  ))}
                  <div className={styles.skelNote}>Loading your thread…</div>
                </div>
              )}

              {isEmpty && (
                <div className={styles.empty}>
                  <div className={styles.emptyTitle}>
                    {showPaywall
                      ? "Ask anything — sending needs a subscription"
                      : "What are you building?"}
                  </div>
                  <p className={styles.emptyBody}>
                    {showPaywall
                      ? "You can type and look around. The reply is the part that costs money, so that's the part behind Pro."
                      : `Describe the project in a sentence. It knows all ${catalogue.counts.modules} modules and ${catalogue.counts.categories} categories, argues about tradeoffs, and ends with a config you can run.`}
                  </p>
                  <div className={styles.starters}>
                    {chatStarters.map((t, i) => (
                      <button key={t} className={styles.starter} onClick={() => setDraft(t)}>
                        <span className={styles.starterNum}>{`0${i + 1}`}</span>
                        <span style={{ textWrap: "pretty" }}>{t}</span>
                      </button>
                    ))}
                  </div>
                  <div className={styles.emptyMeta}>
                    <span>Enter sends · Shift+Enter newline</span>
                    <span>200 messages a day</span>
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <Message
                  key={i}
                  message={m}
                  index={i}
                  copied={copied}
                  onCopy={copy}
                  panelOpen={panel !== null}
                  onOpenPanel={() => m.proposal && setPanel(m.proposal)}
                />
              ))}

              {thinking && (
                <div className={styles.thinking}>
                  <span className={styles.thinkingDots}>
                    <span className={styles.thinkingDot} />
                    <span className={styles.thinkingDot} style={{ animationDelay: "0.18s" }} />
                    <span className={styles.thinkingDot} style={{ animationDelay: "0.36s" }} />
                  </span>
                  <span>Reading the catalogue…</span>
                </div>
              )}

              {err === "422" && (
                <div className={styles.errCard}>
                  <div className={styles.errTitle}>The model didn&apos;t answer</div>
                  <div className={styles.errBody}>
                    Request failed on the way through (422). Nothing was lost — your message is
                    still in the thread.
                  </div>
                  <div className={styles.errActions}>
                    <button className={styles.solidBtn} onClick={retry} disabled={!live}>
                      Send it again
                    </button>
                    <button className={styles.quietBtn} onClick={() => setErr(null)}>
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {err === "offline" && (
                <div className={styles.offlineCard}>
                  <div className={styles.offlineTitle}>No connection</div>
                  <div className={styles.offlineBody}>
                    Chat needs the network — it runs on our API budget, not your machine. The CLI
                    itself keeps working offline.
                  </div>
                </div>
              )}
            </div>
          </div>

          {err === "429" && (
            <div className={styles.bannerLimit}>
              <span className={styles.bannerTag}>Rate limited</span>
              <span className={styles.bannerText}>
                {rateLimitMessage ??
                  "200 messages a day, and today's are spent."}{" "}
                The thread stays where it is.
              </span>
              <Link href="/settings?tab=usage" className={styles.bannerLink}>
                See usage
              </Link>
            </div>
          )}

          {showPastDue && (
            <div className={styles.bannerPaused}>
              <span className={styles.bannerTagDanger}>Chat paused</span>
              <span className={styles.bannerText}>
                Your subscription isn&apos;t currently active, so hosted AI is off. Everything
                local keeps working, and your saved stacks are untouched.
              </span>
              <Link href="/settings?tab=billing" className={styles.bannerLink}>
                Fix payment
              </Link>
            </div>
          )}

          {showPaywall && (
            <div className={styles.unsubBar}>
              <div className={styles.unsubInner}>
                <div className={styles.unsubCopy}>
                  <div className={styles.unsubTitle}>Sending needs Pro</div>
                  <div className={styles.unsubBody}>
                    Every reply spends real API money, so there&apos;s no free tier of this one —
                    $15/month, cancel any time. The CLI stays free either way.
                  </div>
                </div>
                <button
                  className={styles.unsubCta}
                  data-lift
                  disabled={subscribing}
                  onClick={subscribe}
                >
                  {subscribing ? "Activating…" : "Subscribe — $15/mo"}
                </button>
              </div>
            </div>
          )}

          <div className={styles.composer}>
            <div className={styles.composerInner}>
              <div className={styles.composerBox}>
                <textarea
                  className={styles.textarea}
                  value={draft}
                  rows={2}
                  placeholder={placeholder}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                />
                <button className={styles.sendBtn} onClick={send} disabled={blocked}>
                  {showPaywall ? "Subscribe to send" : thinking ? "Sending…" : "Send"}
                </button>
              </div>
              <div className={styles.composerFoot}>
                <span>Enter sends · Shift+Enter newline</span>
                <span>200 messages a day, shared with MCP</span>
              </div>
            </div>
          </div>

          {resetOpen && (
            <div className={styles.scrim} onClick={() => setResetOpen(false)}>
              <div
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
              >
                <div className={styles.modalTitle}>Start a new chat?</div>
                <p className={styles.modalBody}>
                  This thread gets archived and a fresh one opens. You keep one active conversation
                  at a time.
                </p>
                <p className={styles.modalNote}>
                  Archived threads will be listed under <em>Past threads</em>, read-only — that
                  listing isn&apos;t built yet, so for now archiving puts this conversation out of
                  reach.
                </p>
                <div className={styles.modalActions}>
                  <button className={styles.modalCancel} onClick={() => setResetOpen(false)}>
                    Keep this thread
                  </button>
                  <button className={styles.modalConfirm} onClick={doReset}>
                    Archive and start new
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {panel && (
          <ProposalPanel
            proposal={panel}
            copied={copied}
            onCopy={copy}
            onClose={() => setPanel(null)}
          />
        )}
      </div>
    </AppShell>
  );
}

/* -------------------------------------------------------------------------- */

function ProposalPanel({
  proposal,
  copied,
  onCopy,
  onClose,
}: {
  proposal: Proposal;
  copied: string;
  onCopy: (text: string, id: string) => void;
  onClose: () => void;
}) {
  const { preset, suggestedName } = proposal;
  const rows = Object.entries(preset.choices).map(([cat, value]) => ({
    cat,
    mod: Array.isArray(value) ? value.join(", ") : value,
  }));
  const projectName = suggestedName ?? preset.id;
  const configJson = configJsonFor(projectName, preset.choices);

  return (
    <aside className={styles.panel}>
      <div className={styles.panelHead}>
        <span className={styles.panelEyebrow}>Proposed stack</span>
        <span className={styles.panelTag}>validated</span>
        <button
          className={styles.panelClose}
          onClick={onClose}
          title="Close (Esc)"
          aria-label="Close proposed stack"
        >
          ✕
        </button>
      </div>
      <div className={styles.panelScroll}>
        <div className={styles.panelIntro}>
          <div className={styles.panelName}>{preset.name}</div>
          <p className={styles.panelDesc}>{preset.description}</p>
          {suggestedName && (
            <div className={styles.panelSuggested}>suggested name: {suggestedName}</div>
          )}
        </div>

        <div className={styles.panelSectionLabel}>
          Selection · {rows.length} of {catalogue.counts.categories} categories
        </div>
        <div>
          {rows.map((r) => (
            <div key={r.cat} className={styles.selectionRow}>
              <span className={styles.selectionCat}>{r.cat}</span>
              <span className={styles.selectionMod}>{r.mod}</span>
            </div>
          ))}
        </div>

        <div className={styles.panelCosts}>
          <div className={styles.eyebrow} style={{ marginBottom: 9 }}>
            Running cost
          </div>
          <CostBuckets
            buckets={costBucketsFor(preset.choices)}
            foot="Three buckets, never one total: a missing price isn't $0, and usage-based services have no honest flat figure. Prices come from the local catalogue, not the model."
          />
        </div>

        <div className={styles.panelActions}>
          <button className={styles.panelPrimary} onClick={() => onCopy(configJson, "json")}>
            {copied === "json" ? "copied ✓" : "copy ai-project.config.json"}
          </button>
          <button className={styles.panelSecondary} onClick={() => onCopy(runCommand, "cmd")}>
            {copied === "cmd" ? "copied ✓" : "copy the --config command"}
          </button>
          <button className={styles.panelSave} disabled>
            <span>Save to my stacks</span>
            <span className={styles.panelSaveTag}>Needs API</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

function Message({
  message,
  index,
  copied,
  onCopy,
  panelOpen,
  onOpenPanel,
}: {
  message: ChatMessage;
  index: number;
  copied: string;
  onCopy: (text: string, id: string) => void;
  panelOpen: boolean;
  onOpenPanel: () => void;
}) {
  const isUser = message.role === "user";
  const blocks = parseMarkdown(message.content);
  const proposal = message.proposal;

  return (
    <div className={isUser ? styles.msgUser : styles.msgAssistant}>
      <div className={styles.who}>{isUser ? "you" : "assistant"}</div>
      <div className={isUser ? styles.bubbleUser : styles.blocks}>
        {blocks.map((b, i) => (
          <BlockView key={i} block={b} id={`cb${index}-${i}`} copied={copied} onCopy={onCopy} />
        ))}
      </div>
      {proposal && (
        <button className={styles.proposalBtn} onClick={onOpenPanel}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 7l8-4 8 4-8 4-8-4Zm0 5 8 4 8-4M4 17l8 4 8-4" />
          </svg>
          <span>
            <span className={styles.proposalName}>{proposal.preset.name}</span>
            <span className={styles.proposalMeta}>
              {Object.keys(proposal.preset.choices).length} categories · validated · costs split
              three ways
            </span>
          </span>
          <span className={styles.proposalCta}>{panelOpen ? "open" : "view →"}</span>
        </button>
      )}
    </div>
  );
}

function BlockView({
  block,
  id,
  copied,
  onCopy,
}: {
  block: Block;
  id: string;
  copied: string;
  onCopy: (text: string, id: string) => void;
}) {
  if (block.type === "code") {
    return (
      <div className={styles.codeBlock}>
        <div className={styles.codeHead}>
          <span className={styles.codeLang}>{block.lang}</span>
          <button className={styles.copyBtn} onClick={() => onCopy(block.text, id)}>
            {copied === id ? "copied ✓" : "copy"}
          </button>
        </div>
        <pre className={styles.pre}>{block.text}</pre>
      </div>
    );
  }

  return (
    <div className={styles.textBlock}>
      {block.lines.map((line, i) => {
        const parts = line.parts.map((p, j) =>
          p.kind === "code" ? (
            <span key={j} className={styles.codeSpan}>
              {p.text}
            </span>
          ) : p.kind === "strong" ? (
            <span key={j} className={styles.strong}>
              {p.text}
            </span>
          ) : (
            <span key={j}>{p.text}</span>
          ),
        );

        if (line.kind === "heading") {
          return (
            <div key={i} className={styles.heading}>
              {parts}
            </div>
          );
        }
        if (line.kind === "bullet") {
          return (
            <div key={i} className={styles.bullet}>
              <span className={styles.bulletMarker} aria-hidden="true">
                —
              </span>
              {parts}
            </div>
          );
        }
        return (
          <div key={i} className={styles.paragraph}>
            {parts}
          </div>
        );
      })}
    </div>
  );
}
