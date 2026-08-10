"use client";

import { useCallback, useEffect, useState } from "react";
import { useCopy } from "@/lib/useCopy";
import { useTweenNumber } from "@/lib/useTween";
import {
  catalogue,
  computeCost,
  pickerCategories,
  resolveCommand,
  toggle,
  treeRows,
  matchedPreset,
  type Selection,
} from "@/lib/catalogue";
import section from "@/styles/section.module.css";
import styles from "./StackBuilder.module.css";

const STORAGE_KEY = "stack-selection";

function readInitialSelection(): Selection {
  if (typeof window === "undefined") return {};
  try {
    const hash = window.location.hash.replace(/^#sel=/, "");
    if (hash) return JSON.parse(decodeURIComponent(hash));
  } catch {
    // fall through to localStorage
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // no persisted selection — start empty
  }
  return {};
}

export function StackBuilder() {
  const [sel, setSel] = useState<Selection>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSel(readInitialSelection());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sel));
      const encoded = encodeURIComponent(JSON.stringify(sel));
      window.history.replaceState(null, "", Object.keys(sel).length ? `#sel=${encoded}` : " ");
    } catch {
      // persistence is best-effort
    }
  }, [sel, hydrated]);

  const preset = matchedPreset(sel);
  const pickerCats = pickerCategories(sel);
  const { rows, fileCount } = treeRows(sel);
  const cost = computeCost(sel);
  const shownTotal = useTweenNumber(cost.total);
  const { command, note } = resolveCommand(sel);
  const { copied: cmdCopied, copy: copyCommand } = useCopy(command);
  const empty = rows.every((r) => r.base);

  const handleToggle = useCallback((catId: string, modId: string, disabled: boolean) => {
    if (disabled) return;
    setSel((prev) => toggle(prev, catId, modId));
  }, []);

  return (
    <section id="builder" className={section.sectionRaised}>
      <div className={section.containerWide}>
        <div className={section.eyebrow}>Try it here</div>
        <h2 className={section.h2} style={{ maxWidth: "20ch" }}>
          Build a stack, see the repo
        </h2>
        <p className={section.lead} style={{ maxWidth: "58ch" }}>
          Same catalogue the CLI reads. Pick anything and the file tree, the exact command and
          your third-party service bill update as you go.
        </p>

        <div className={styles.presetsRow}>
          <span className={styles.presetsLabel}>Start from</span>
          {catalogue.presets.map((p) => (
            <button
              key={p.id}
              className={preset?.id === p.id ? styles.chipActive : styles.chip}
              onClick={() => setSel({ ...p.choices })}
            >
              {p.id}
            </button>
          ))}
          <button className={styles.clearChip} onClick={() => setSel({})}>
            clear
          </button>
        </div>

        <div className={styles.panels}>
          {/* Picker */}
          <div className={styles.panel}>
            <div className={styles.panelHead}>Your stack</div>
            <div className={styles.pickerScroll}>
              {pickerCats.map((cat) => (
                <div key={cat.id} className={styles.categoryRow}>
                  <div className={styles.categoryHead}>
                    <span className={styles.categoryLabel}>{cat.label}</span>
                    <span className={styles.categoryKind}>{cat.kindLabel}</span>
                  </div>
                  <div className={styles.moduleRow}>
                    {cat.modules.map((m) => (
                      <button
                        key={m.id}
                        title={m.title}
                        className={m.on ? styles.moduleBtnOn : m.disabled ? styles.moduleBtnDisabled : styles.moduleBtn}
                        onClick={() => handleToggle(cat.id, m.id, m.disabled)}
                      >
                        {m.name}
                        {m.requiredByName ? (
                          <span className={styles.moduleTag}>required by {m.requiredByName}</span>
                        ) : m.blockedByName ? (
                          <span className={styles.moduleTag}>conflict</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tree */}
          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <span>Generated files</span>
              <span>{fileCount}</span>
            </div>
            <div className={styles.treeScroll}>
              {rows.map((r, i) => (
                <div
                  key={r.path + i}
                  className={r.base ? styles.treeRow : styles.treeRowMod}
                  style={{
                    color: r.base ? "var(--muted)" : "var(--ink)",
                    opacity: empty ? 0.5 : 1,
                    animationDelay: r.base ? undefined : `${Math.min((i - 9) * 22, 240)}ms`,
                  }}
                >
                  <span>{r.path}</span>
                  <span className={styles.treeNote}>{r.note}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cost */}
          <div className={styles.panel}>
            <div className={styles.panelHead}>What your stack will bill you</div>
            <div className={styles.costBody}>
              <div className={styles.costTotal}>${shownTotal}/mo</div>
              <div className={styles.costSub}>across the paid services you selected</div>
              <div className={styles.costBlurb}>
                ai-project-bootstrap is <strong style={{ color: "var(--ink)" }}>free and MIT-licensed</strong>.
                This is what Supabase, Sentry, Stripe and the rest charge you directly — the
                generator never takes a cut and never sees a bill.
              </div>

              {cost.buckets.map((b) => (
                <div key={b.label} className={styles.bucket}>
                  <div className={styles.bucketLabel} style={{ color: `var(--${b.tone})` }}>
                    {b.label}
                  </div>
                  {b.rows.map((row) => (
                    <div key={row.name} className={styles.bucketRow}>
                      <span>{row.name}</span>
                      <span className={styles.bucketRowValue}>{row.value}</span>
                    </div>
                  ))}
                  {b.rows.length === 0 && <div className={styles.bucketEmpty}>{b.emptyText}</div>}
                </div>
              ))}

              <p className={styles.costCaveat}>
                An estimate, not a quote. Each figure was checked by hand against that vendor&apos;s
                own pricing page — hover a row for the date — and CI fails the build when any
                figure is more than six months old.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.commandBar}>
          <div className={styles.commandText}>
            <span style={{ color: "var(--term-prompt)" }}>$ </span>
            {command}
          </div>
          <div className={styles.commandActions}>
            <span className={styles.commandNote}>{note}</span>
            <button className={styles.commandCopy} onClick={copyCommand}>
              {cmdCopied ? "copied" : "copy"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
