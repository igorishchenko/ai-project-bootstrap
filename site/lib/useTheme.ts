"use client";

import { useCallback, useEffect, useState } from "react";
import { getStoredTheme, setStoredTheme, type Theme } from "./theme";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      setStoredTheme(next);
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
