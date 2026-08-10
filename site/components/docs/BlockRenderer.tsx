import Link from "next/link";
import type { Block } from "@/content/docs/pages";
import { slug } from "@/lib/slug";
import styles from "./BlockRenderer.module.css";

export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => (
        <BlockView key={i} block={b} />
      ))}
    </>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.t) {
    case "h2":
      return (
        <h2 id={slug(block.text)} className={styles.h2}>
          {block.text}
        </h2>
      );
    case "p":
      return <p className={styles.p}>{block.text}</p>;
    case "code":
      return <pre className={styles.code}>{block.text}</pre>;
    case "list":
      return (
        <div className={styles.list}>
          {block.items.map((item, i) => (
            <div key={i} className={styles.listRow}>
              <span className={styles.listMarker}>→</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      );
    case "table":
      return (
        <div className={styles.table}>
          <div className={styles.tableHeadRow}>
            {block.cols.map((c, i) => (
              <div key={i} className={styles.tableHeadCell}>
                {c}
              </div>
            ))}
          </div>
          {block.rows.map((row, i) => (
            <div key={i} className={styles.tableRow}>
              {row.map((cell, j) => (
                <div key={j} className={styles.tableCell}>
                  {cell}
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    case "note":
      return (
        <div
          className={styles.note}
          style={{
            borderLeftColor: block.tone === "signal" ? "var(--signal)" : "var(--accent)",
            background: block.tone === "signal" ? "var(--signal-soft)" : "var(--accent-soft)",
          }}
        >
          <div className={styles.noteTitle}>{block.title}</div>
          <p className={styles.noteText}>{block.text}</p>
        </div>
      );
    case "cards":
      return (
        <div className={styles.cards}>
          {block.items.map((c, i) => (
            <Link key={i} href={`/docs/${c.go}`} className={styles.card}>
              <div className={styles.cardTitle}>{c.title}</div>
              <div className={styles.cardBody}>{c.body}</div>
            </Link>
          ))}
        </div>
      );
  }
}
