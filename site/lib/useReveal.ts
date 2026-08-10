"use client";

import { useEffect, useRef, useState } from "react";

const THRESHOLD_RATIO = 0.94;

/**
 * Reveal-on-scroll, backed by two independent triggers so a miss on one
 * host/browser combination doesn't strand content at opacity 0:
 * an IntersectionObserver (never unobserved) plus a manual rect sweep on
 * scroll/resize. Either one flipping `revealed` is enough — the hidden
 * state only ever comes from JS once mounted, never from CSS alone.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(true);
      return;
    }

    let done = false;
    const reveal = () => {
      if (done) return;
      done = true;
      setRevealed(true);
    };

    const sweep = () => {
      if (done) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * THRESHOLD_RATIO) reveal();
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) reveal();
      },
      { threshold: 0.01 },
    );
    observer.observe(el);

    sweep();
    window.addEventListener("scroll", sweep, { passive: true });
    window.addEventListener("resize", sweep);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", sweep);
      window.removeEventListener("resize", sweep);
    };
  }, []);

  return { ref, revealed };
}
