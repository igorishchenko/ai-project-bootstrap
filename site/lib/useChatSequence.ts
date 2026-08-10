"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/content/landing";

/**
 * Replays the chat transcript on a loop: user messages appear after 900ms,
 * assistant messages show a typing indicator for 1100ms then land and hold
 * 1500ms, and after the last message there's a 3600ms pause before reset.
 * Reduced motion renders every message at once, no typing indicator.
 *
 * Holds at zero messages until `start` flips true, so the transcript isn't
 * already mid-loop (or finished) by the time the section is scrolled to.
 * Pair it with `useReveal`, whose latch never flips back to false.
 */
export function useChatSequence(messages: ChatMessage[], start = true) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [typing, setTyping] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!start) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisibleCount(messages.length);
      return;
    }
    let n = 0;
    const advance = () => {
      if (n >= messages.length) {
        timer.current = setTimeout(() => {
          n = 0;
          setVisibleCount(0);
          setTyping(false);
          advance();
        }, 3600);
        return;
      }
      const next = messages[n];
      if (next.role === "bot") {
        setTyping(true);
        timer.current = setTimeout(() => {
          setTyping(false);
          n += 1;
          setVisibleCount(n);
          timer.current = setTimeout(advance, 1500);
        }, 1100);
      } else {
        n += 1;
        setVisibleCount(n);
        timer.current = setTimeout(advance, 900);
      }
    };
    timer.current = setTimeout(advance, 700);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, start]);

  return { visibleCount, typing };
}
