"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * A short, most-recent-first list persisted in `localStorage`.
 *
 * Backs Home's recent searches (`sf-recent-users`) and Compare's recent
 * comparisons (`sf-recent-comparisons`). Storage is per-browser, so it scales
 * to any number of concurrent users with zero server state — the GitHub
 * lookups themselves still go through the Redis-cached, rate-limited API
 * routes.
 *
 * Entries are compared case-insensitively by their key, so re-running the same
 * search or the same matchup moves it to the front rather than duplicating it.
 *
 * @param storageKey `localStorage` key to persist under
 * @param keyOf identity of an entry, for dedupe
 * @param limit how many entries to keep
 */
export function useRecentList<T>(storageKey: string, keyOf: (entry: T) => string, limit = 8): { recent: T[]; remember: (entry: T) => void; clear: () => void } {
  const [recent, setRecent] = useState<T[]>([]);

  // Read after mount so SSR and the first client render agree.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) setRecent(parsed as T[]);
      }
    } catch {
      /* ignore */
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
          /* ignore */
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
      /* ignore */
    }
  }, [storageKey]);

  return { recent, remember, clear };
}
