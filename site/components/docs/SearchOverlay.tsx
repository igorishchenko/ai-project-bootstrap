"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ORDER, PAGES } from "@/content/docs/pages";
import styles from "./SearchOverlay.module.css";

const INDEX = ORDER.map((id) => ({
  id,
  section: PAGES[id].group,
  title: PAGES[id].title,
  snippet: PAGES[id].lead,
}));

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? INDEX.filter((r) => `${r.title} ${r.snippet} ${r.section}`.toLowerCase().includes(q))
      : INDEX.slice(0, 7);
    return list;
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function navigate(id: string) {
    router.push(`/docs/${id}`);
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = results[activeIndex];
      if (r) navigate(r.id);
    }
  }

  if (!open) return null;

  return (
    <div className={styles.scrim} onClick={onClose}>
      <div className={styles.box} onClick={(e) => e.stopPropagation()}>
        <div className={styles.inputRow}>
          <input
            ref={inputRef}
            className={styles.input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search docs…"
          />
        </div>
        <div className={styles.results}>
          {results.length > 0 ? (
            results.map((r, i) => (
              <button
                key={r.id}
                className={i === activeIndex ? styles.resultActive : styles.result}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => navigate(r.id)}
              >
                <span className={styles.resultSection}>{r.section}</span>
                <span style={{ minWidth: 0 }}>
                  <div className={styles.resultTitle}>{r.title}</div>
                  <div className={styles.resultSnippet}>{r.snippet}</div>
                </span>
              </button>
            ))
          ) : (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>No matches for &quot;{query}&quot;</div>
              <div className={styles.emptyBody}>Try a command, a technology id, or a generated filename.</div>
            </div>
          )}
        </div>
        <div className={styles.footer}>
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
