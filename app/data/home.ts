"use client";

// Data layer for the Home page.
//
// `useHomeStats` fetches REAL GitHub figures from the SAME route that serves
// the badge SVG — `/api/streak?...&format=json` (the one data route; it flows
// through lib/github's cached, rate-limited hot path). It returns the SAME
// typed shape the view already consumes — zeros while empty/loading, real
// values on success, and an `error` flag for invalid usernames — so the view
// is untouched except for a minimal error affordance. Wiring lives ONLY here.

import { useEffect, useState } from "react";

export interface HomeStats {
  current: number;
  peak: number;
  contrib: number;
  repos: number;
  /** Canonical GitHub login (real casing) of the validated user. */
  login?: string;
  /** Display name (falls back to login when the profile has no name). */
  name?: string;
  /** Real GitHub avatar URL. */
  avatar?: string;
  /** True while a lookup is in flight. */
  loading?: boolean;
  /** Set when a username lookup fails; distinct from the empty (no-username) preview. */
  error?: "not_found" | "fetch_failed" | null;
}

// FNV-1a hash — still used by the view as the deterministic seed for the
// decorative monolith geometry.
export function hash(s: string): number {
  s = s || "streakforge";
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) >>> 0;
}

const EMPTY: HomeStats = { current: 0, peak: 0, contrib: 0, repos: 0, loading: false, error: null };

/**
 * Returns real streak stats for `username`. Empty username → zeros (the
 * legitimate empty-preview state). Non-empty → debounced fetch of
 * `/api/streak?...&format=json`; on 404 the returned `error` is `"not_found"`.
 */
export function useHomeStats(username: string): HomeStats {
  const [state, setState] = useState<HomeStats>(EMPTY);

  useEffect(() => {
    const u = (username || "").trim();
    if (!u) {
      setState(EMPTY);
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    // Debounce so we don't fire a GitHub lookup on every keystroke.
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/streak?user=${encodeURIComponent(u)}&format=json`);
        if (cancelled) return;
        if (res.status === 404) {
          setState({ ...EMPTY, error: "not_found" });
          return;
        }
        if (!res.ok) {
          setState({ ...EMPTY, error: "fetch_failed" });
          return;
        }
        const d = (await res.json()) as {
          user?: string;
          profile?: { login: string; name: string; avatar: string; repos: number } | null;
          stats?: { currentStreak: number; longestStreak: number; totalContributions: number };
        };
        if (cancelled) return;
        const s = d.stats;
        const p = d.profile;
        setState({
          current: s?.currentStreak ?? 0,
          peak: s?.longestStreak ?? 0,
          contrib: s?.totalContributions ?? 0,
          repos: p?.repos ?? 0,
          login: p?.login ?? d.user,
          name: p?.name,
          avatar: p?.avatar,
          loading: false,
          error: null,
        });
      } catch {
        if (!cancelled) setState({ ...EMPTY, error: "fetch_failed" });
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username]);

  return state;
}
