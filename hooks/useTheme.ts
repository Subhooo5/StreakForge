"use client";

// Shared client-side theme hook used by every page.
//
// The design keeps theme as a `class` on each page's root wrapper ('sf' / 'sf
// dark'). Because the pages navigate via plain <a href> (full document loads),
// React state alone cannot carry the choice across routes — so the selection is
// mirrored into localStorage and re-read on mount. SSR + the first client render
// always start from "light" (matching the markup) and the stored value is
// applied in an effect, which avoids a hydration mismatch.
//
// To prevent a light→dark flash on every navigation, the persisted theme is
// ALSO applied to <html> before first paint by the boot script in app/layout.tsx
// (it adds the `dark` class, whose tokens cascade to the whole page instantly).
// This hook keeps that <html> class in sync on mount and on every toggle, so the
// pre-paint state and React state never drift (e.g. toggling back to light must
// remove the class the boot script added). Do not reflect this via a `[theme]`
// effect — that would run with the stale default before the stored value lands
// and re-introduce a flash; sync imperatively where the value is known instead.

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "sf-theme";

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
      /* localStorage unavailable — keep default */
    }
    setTheme(stored);
    applyHtmlThemeClass(stored); // reconcile with what the boot script set
  }, []);

  const toggleTheme = () =>
    setTheme((t) => {
      const next: Theme = t === "light" ? "dark" : "light";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore persistence failure */
      }
      applyHtmlThemeClass(next);
      return next;
    });

  return [theme, toggleTheme] as const;
}
