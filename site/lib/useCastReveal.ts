"use client";

import { useEffect, useState } from "react";
import { useReveal } from "./useReveal";

/**
 * Terminal casts fade in line by line once the shell is scrolled into view.
 * Line 0 shows immediately; the rest stagger 130ms apart from a 400ms base.
 * Reduced motion renders every line at once.
 *
 * Attach the returned ref to the terminal shell — it drives the trigger, and
 * the latch inside `useReveal` is one-way, so the cast plays through once
 * rather than restarting on every scroll past.
 */
export function useCastReveal<T extends HTMLElement>(
  lineCount: number,
  gapMs = 130,
  baseMs = 400,
) {
  const { ref, revealed: started } = useReveal<T>();
  const [revealed, setRevealed] = useState(1);

  useEffect(() => {
    if (!started) return;
    if (lineCount <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(lineCount);
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i < lineCount; i++) {
      timers.push(setTimeout(() => setRevealed((r) => Math.max(r, i + 1)), baseMs + i * gapMs));
    }
    return () => timers.forEach(clearTimeout);
  }, [started, lineCount, gapMs, baseMs]);

  return { ref, revealed };
}
