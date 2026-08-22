"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "sf-theme";

// Keeps <html>.dark in sync; prevents flash
function applyHtmlThemeClass(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function useTheme(): readonly [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    let stored: Theme = "light";
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "light" || saved === "dark") stored = saved;
    } catch {
    }
    setTheme(stored);
    applyHtmlThemeClass(stored);
  }, []);

  const toggleTheme = () =>
    setTheme((t) => {
      const next: Theme = t === "light" ? "dark" : "light";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
      }
      applyHtmlThemeClass(next);
      return next;
    });

  return [theme, toggleTheme] as const;
}
