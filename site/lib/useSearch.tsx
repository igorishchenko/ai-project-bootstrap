"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { SearchOverlay } from "@/components/docs/SearchOverlay";

type SearchValue = {
  open: () => void;
  close: () => void;
};

const SearchContext = createContext<SearchValue | null>(null);

/**
 * Owns the docs search overlay for the whole site.
 *
 * The overlay and the ⌘K binding used to live inside `DocsShell`, which meant
 * search only existed on /docs. Hoisting both here lets the marketing nav and
 * the dashboard topbar open the same overlay, and keeps exactly one keydown
 * listener registered no matter how many headers are on screen.
 */
export function SearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <SearchContext.Provider value={{ open, close }}>
      {children}
      <SearchOverlay open={isOpen} onClose={close} />
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const value = useContext(SearchContext);
  if (!value) throw new Error("useSearch must be used inside <SearchProvider>");
  return value;
}
