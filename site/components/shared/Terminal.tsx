"use client";

import type { CSSProperties, ReactNode, Ref } from "react";
import { useCastReveal } from "@/lib/useCastReveal";
import styles from "./Terminal.module.css";

export type CastLine = { text: string; color?: string; marginTop?: number };

export function Caret({ color }: { color?: string }) {
  return <span className={styles.caret} style={color ? { background: color } : undefined} />;
}

export function TerminalShell({
  dotSize = 9,
  padding = "22px 26px",
  style,
  ref,
  children,
}: {
  dotSize?: number;
  padding?: string | number;
  style?: CSSProperties;
  /** Drives the scroll trigger when the shell holds a cast. */
  ref?: Ref<HTMLDivElement>;
  children: ReactNode;
}) {
  return (
    <div ref={ref} className={styles.shell} style={{ padding, ...style }}>
      <div className={styles.dots}>
        <span className={styles.dot} style={{ width: dotSize, height: dotSize }} />
        <span className={styles.dot} style={{ width: dotSize, height: dotSize }} />
        <span className={styles.dot} style={{ width: dotSize, height: dotSize }} />
      </div>
      {children}
    </div>
  );
}

/** A cast that fades its lines in when scrolled into view (no typing loop). */
export function Cast({
  lines,
  fontSize = 13,
  lineHeight = 2,
  caret,
  dotSize = 9,
  padding,
}: {
  lines: CastLine[];
  fontSize?: number;
  lineHeight?: number;
  caret?: ReactNode;
  dotSize?: number;
  padding?: string | number;
}) {
  const { ref, revealed } = useCastReveal<HTMLDivElement>(lines.length);
  return (
    <TerminalShell ref={ref} dotSize={dotSize} padding={padding}>
      <div style={{ fontSize, lineHeight }}>
        {lines.map((line, i) => (
          <div
            key={i}
            className={`${styles.line} ${i < revealed ? styles.visible : ""}`}
            style={{ color: line.color, marginTop: line.marginTop }}
          >
            {line.text || " "}
          </div>
        ))}
        {caret && revealed >= lines.length ? (
          <div className={`${styles.line} ${styles.visible}`} style={{ color: "var(--term-dim)" }}>
            {caret}
          </div>
        ) : null}
      </div>
    </TerminalShell>
  );
}
