"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  costBuckets,
  proposalSelection,
  savedStacks,
  stackConfigJson,
  stackDetailMeta,
  stackRunCommand,
} from "@/content/app";
import type { StacksScene } from "@/lib/appState";
import { AppShell } from "./AppShell";
import { CostBuckets } from "./CostBuckets";
import styles from "./StacksScreen.module.css";

const marker = { text: "Needs API", tone: "signal" } as const;

function useCopyKeyed() {
  const [copied, setCopied] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = useCallback((text: string, id: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(id);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(""), 1600);
  }, []);
  return { copied, copy };
}

export function StacksListScreen({ scene }: { scene: StacksScene }) {
  const hasStacks = scene !== "empty";

  return (
    <AppShell title="Saved stacks" marker={marker}>
      <div className={styles.page}>
        <div className={styles.head}>
          <div>
            <h1 className={styles.title}>Saved stacks</h1>
            <p className={styles.lead}>
              Selections only — a project name and a list of modules. No code, nothing read off your
              machine. The CLI still generates locally and still never phones home.
            </p>
          </div>
          <Link href="/catalogue" className={styles.headCta} data-lift>
            Build one by hand
          </Link>
        </div>

        {hasStacks ? (
          <div className={styles.cards}>
            {savedStacks.map((st) => (
              <Link
                key={st.slug}
                href={`/stacks/${st.slug}`}
                className={styles.stackCard}
                data-lift
              >
                <div className={styles.stackTop}>
                  <div className={styles.stackNameRow}>
                    <span className={styles.stackName}>{st.name}</span>
                    <span className={styles.stackSource}>{st.source}</span>
                  </div>
                  <div className={styles.stackSummary}>{st.summary}</div>
                </div>
                <div className={styles.stackFoot}>
                  <span className={styles.stackDate}>{st.date}</span>
                  <span className={styles.stackCost}>{st.cost}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>Nothing saved yet</div>
            <p className={styles.emptyBody}>
              Two ways in: let chat propose a stack and press <em>Save to my stacks</em>, or pick
              the modules yourself in the builder.
            </p>
            <div className={styles.emptyActions}>
              <Link href="/chat" className={styles.emptyPrimary} data-lift>
                Ask chat for one
              </Link>
              <Link href="/catalogue" className={styles.emptySecondary} data-lift>
                Build one by hand
              </Link>
            </div>
          </div>
        )}

        {scene === "lapsed" && (
          <div className={styles.lapsed}>
            <span className={styles.lapsedTag}>Subscription ended</span>
            <span className={styles.lapsedText}>
              Your stacks stay here and stay usable — copy them, download them, run them. Only chat
              and <code>--idea</code> stopped.
            </span>
            <Link href="/settings?tab=billing" style={{ fontSize: 13.5 }}>
              Billing
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export function StackDetailScreen({ slug }: { slug: string }) {
  const { copied, copy } = useCopyKeyed();
  const stack = savedStacks.find((s) => s.slug === slug) ?? savedStacks[0];
  // One fixture stands in for every stack until the API can return a real one.
  const configJson = stackConfigJson.replace("invoice-radar", stack.name);

  function download() {
    const blob = new Blob([configJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ai-project.config.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell title="Saved stacks" marker={marker}>
      <div className={styles.page}>
        <Link href="/stacks" className={styles.back}>
          ← saved stacks
        </Link>

        <div className={styles.headDetail}>
          <div>
            <h1 className={styles.title}>{stack.name}</h1>
            <div className={styles.meta}>{stackDetailMeta}</div>
          </div>
          <div className={styles.actions}>
            <button className={styles.outlineBtn} onClick={() => copy(configJson, "json")}>
              {copied === "json" ? "copied ✓" : "copy JSON"}
            </button>
            <button className={styles.solidBtn} onClick={() => copy(stackRunCommand, "cmd")}>
              {copied === "cmd" ? "copied ✓" : "copy run command"}
            </button>
          </div>
        </div>

        <div className={styles.two}>
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.eyebrow}>Selection</span>
              <span className={styles.cardHeadNote}>8 of 16 categories set</span>
            </div>
            {proposalSelection.map((r) => (
              <div key={r.cat} className={styles.row}>
                <span className={styles.rowCat}>{r.cat}</span>
                <span className={styles.rowMod}>{r.mod}</span>
                <span
                  className={r.bucket === "usage" ? styles.rowBucketUsage : styles.rowBucket}
                >
                  {r.bucket}
                </span>
              </div>
            ))}
            <div className={styles.cardFoot}>
              <Link href="/catalogue" style={{ fontSize: 13.5 }}>
                Edit in the builder
              </Link>
              <span className={styles.cardFootNote}>
                opens the same selector as the landing page
              </span>
            </div>
          </div>

          <div className={styles.side}>
            <div className={styles.cardPadded}>
              <div className={styles.eyebrow} style={{ marginBottom: 10 }}>
                Running cost
              </div>
              <CostBuckets
                buckets={costBuckets}
                foot="Three buckets, never one total — a missing price isn't $0."
              />
            </div>

            <div className={styles.card}>
              <div className={styles.codeHead}>
                <span className={styles.eyebrow}>ai-project.config.json</span>
                <button className={styles.miniBtn} onClick={download}>
                  download
                </button>
              </div>
              <pre className={styles.pre}>{configJson}</pre>
            </div>

            <div className={styles.card}>
              <div className={styles.codeHead}>
                <span className={styles.eyebrow}>Run it</span>
              </div>
              <pre className={styles.pre}>
                <span style={{ color: "var(--term-prompt)" }}>$</span>{" "}
                <span style={{ color: "var(--term-blue)" }}>npx ai-project-bootstrap</span> --config
                ai-project.config.json
              </pre>
            </div>

            <button className={styles.deleteBtn}>Delete this stack</button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
