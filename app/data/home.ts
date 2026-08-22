"use client";

import { useEffect, useState } from "react";

export interface HomeStats {
  current: number;
  peak: number;
  contrib: number;
  repos: number;
  login?: string;
  name?: string;
  avatar?: string;
  loading?: boolean;
  error?: "not_found" | "fetch_failed" | null;
}

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
