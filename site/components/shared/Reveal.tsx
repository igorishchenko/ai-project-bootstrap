"use client";

import type { ElementType, ReactNode } from "react";
import { useReveal } from "@/lib/useReveal";

export function revealDelay(index: number, base = 70, cap = 350) {
  return Math.min(index * base, cap);
}

export function Reveal({
  as: As = "div",
  delay = 0,
  className,
  children,
}: {
  as?: ElementType;
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  const { ref, revealed } = useReveal<HTMLElement>();
  return (
    <As
      ref={ref}
      className={className}
      data-reveal={revealed ? "in" : ""}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </As>
  );
}
