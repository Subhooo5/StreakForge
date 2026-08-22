"use client";

import { useCallback, useEffect, useState } from "react";

export function useRecentList<T>(storageKey: string, keyOf: (entry: T) => string, limit = 8): { recent: T[]; remember: (entry: T) => void; clear: () => void } {
  const [recent, setRecent] = useState<T[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) setRecent(parsed as T[]);
      }
    } catch {
    }
  }, [storageKey]);

  const remember = useCallback(
    (entry: T) => {
      const id = keyOf(entry).toLowerCase();
      if (!id) return;
      setRecent((prev) => {
        if (prev[0] && keyOf(prev[0]).toLowerCase() === id) return prev;
        const next = [entry, ...prev.filter((e) => keyOf(e).toLowerCase() !== id)].slice(0, limit);
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
        }
        return next;
      });
    },
    [storageKey, keyOf, limit],
  );

  const clear = useCallback(() => {
    setRecent([]);
    try {
      localStorage.removeItem(storageKey);
    } catch {
    }
  }, [storageKey]);

  return { recent, remember, clear };
}
