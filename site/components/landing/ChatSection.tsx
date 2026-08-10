"use client";

import Link from "next/link";
import { useChatSequence } from "@/lib/useChatSequence";
import { useReveal } from "@/lib/useReveal";
import { chatFacts, chatMessages } from "@/content/landing";
import section from "@/styles/section.module.css";
import styles from "./ChatSection.module.css";

export function ChatSection() {
  // The transcript only starts once the window itself is on screen, not on
  // mount — otherwise the loop has already run through by the time you scroll
  // down to it. The ref goes on the window rather than the <section> so the
  // trigger tracks the thing you actually watch.
  const { ref: windowRef, revealed } = useReveal<HTMLDivElement>();
  const { visibleCount, typing } = useChatSequence(chatMessages, revealed);
  const visible = chatMessages.slice(0, visibleCount);

  return (
    <section id="chat" className={section.section}>
      <div className={section.container}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <span className={section.eyebrow} style={{ margin: 0 }}>
            Pro · coming next
          </span>
          <span
            style={{
              fontFamily: "var(--font-plex-mono), monospace",
              fontSize: 11,
              border: "1px solid var(--line)",
              borderRadius: 999,
              padding: "2px 10px",
              color: "var(--muted)",
            }}
          >
            included in the subscription
          </span>
        </div>
        <h2 className={section.h2} style={{ maxWidth: "22ch" }}>
          Keep talking after the first proposal
        </h2>
        <p className={section.lead} style={{ maxWidth: "66ch" }}>
          --idea is one question and one answer. Chat is the same service with the conversation
          left open — argue with the stack, ask what a module actually costs, and take the
          command when you&apos;re happy. On this site and inside Claude Code over MCP, on the
          same subscription as --idea.
        </p>

        <div className={styles.grid}>
          <div className={styles.factsCol}>
            {chatFacts.map((f) => (
              <div key={f.title} className={styles.factCard}>
                <div className={styles.factTitle}>{f.title}</div>
                <p className={styles.factBody}>{f.body}</p>
              </div>
            ))}
            <div className={styles.ctaRow}>
              <Link href="/register" className={styles.ctaPrimary} data-lift="">
                Create an account
              </Link>
              <Link href="/login" className={styles.ctaSecondary}>
                or log in →
              </Link>
            </div>
          </div>

          <div ref={windowRef} className={styles.window}>
            <div className={styles.titleBar}>
              <span className={styles.titleDot} />
              <span className={styles.titleLabel}>stack chat — signed in as you@example.com</span>
            </div>
            <div className={styles.messages}>
              {visible.map((m, i) => (
                <div key={i} className={m.role === "user" ? styles.msgUser : styles.msgBot}>
                  {m.text}
                </div>
              ))}
              {typing && (
                <div className={styles.typing}>
                  <span className={styles.typingDot} />
                  <span className={styles.typingDot} style={{ animationDelay: "0.16s" }} />
                  <span className={styles.typingDot} style={{ animationDelay: "0.32s" }} />
                </div>
              )}
            </div>
            <div className={styles.composer}>
              <div className={styles.composerInput}>Ask about the stack…</div>
              <span className={styles.composerHint}>↵</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
