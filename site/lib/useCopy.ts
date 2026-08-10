"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useCopy(value: string, ms = 1600) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(() => {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), ms);
  }, [value, ms]);

  return { copied, copy };
}
