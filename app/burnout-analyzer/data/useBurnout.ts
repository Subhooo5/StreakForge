"use client";

import { useCallback, useRef, useState } from "react";
import type { BurnoutReport } from "@/types/burnout";

/** One analysis request in flight or already resolved. */
export interface BurnoutState {
  data: BurnoutReport | null;
  loading: boolean;
  error: string | null;
}

const IDLE: BurnoutState = { data: null, loading: false, error: null };

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed with status ${res.status}`);
  }
  return (await res.json()) as T;
}

/**
 * Session-lifetime memo of resolved analyses, so re-toggling the bot filter or
 * navigating Back and Forward re-renders from memory instead of paying for a
 * second round trip. The route caches on the server for an hour as well; this
 * only removes the network hop.
 *
 * Keyed on the bot-exclusion flag too, because the two variants are different
 * analyses rather than different views of one.
 */
const reportCache = new Map<string, Promise<BurnoutReport>>();

const cacheKey = (owner: string, repo: string, excludeBots: boolean) =>
  `${owner.toLowerCase()}/${repo.toLowerCase()}|${excludeBots ? "nobots" : "all"}`;

function loadReport(owner: string, repo: string, excludeBots: boolean): Promise<BurnoutReport> {
  const key = cacheKey(owner, repo, excludeBots);
  const cached = reportCache.get(key);
  if (cached) return cached;

  const query = `owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&excludeBots=${excludeBots}`;
  const promise = getJson<BurnoutReport>(`/api/burnout?${query}`).catch((err: unknown) => {
    // A failure must not poison the cache — the next attempt should retry.
    reportCache.delete(key);
    throw err;
  });

  reportCache.set(key, promise);
  return promise;
}

export interface Burnout extends BurnoutState {
  /** Runs an analysis and stores the result. */
  run: (owner: string, repo: string, excludeBots: boolean) => Promise<void>;
  /** Re-runs against GitHub, bypassing both caches. */
  refresh: () => Promise<void>;
  /** Warms the cache without touching the rendered state. */
  prefetch: (owner: string, repo: string, excludeBots: boolean) => void;
  /** Returns to the pre-analysis state. */
  reset: () => void;
}

/**
 * Data layer for the Burnout Radar page.
 *
 * Every figure the page renders comes from `/api/burnout`, which derives it
 * from GitHub's repository statistics endpoints. There is no seeded fallback:
 * a repository with no history resolves to a report flagged `empty`, which the
 * page renders as an empty state.
 */
export function useBurnout(): Burnout {
  const [state, setState] = useState<BurnoutState>(IDLE);
  // Guards against a slow earlier request overwriting a newer one.
  const currentRef = useRef<string | null>(null);
  const lastArgsRef = useRef<{ owner: string; repo: string; excludeBots: boolean } | null>(null);

  const run = useCallback(async (ownerRaw: string, repoRaw: string, excludeBots: boolean) => {
    const owner = ownerRaw.trim();
    const repo = repoRaw.trim();
    if (!owner || !repo) {
      setState({ data: null, loading: false, error: 'Enter a repository as "owner/repo".' });
      return;
    }

    const key = cacheKey(owner, repo, excludeBots);
    currentRef.current = key;
    lastArgsRef.current = { owner, repo, excludeBots };
    setState((prev) => ({ data: prev.data, loading: true, error: null }));

    try {
      const data = await loadReport(owner, repo, excludeBots);
      if (currentRef.current !== key) return;
      setState({ data, loading: false, error: null });
    } catch (err) {
      if (currentRef.current !== key) return;
      setState({ data: null, loading: false, error: err instanceof Error ? err.message : "Analysis failed." });
    }
  }, []);

  const refresh = useCallback(async () => {
    const args = lastArgsRef.current;
    if (!args) return;

    const { owner, repo, excludeBots } = args;
    const key = cacheKey(owner, repo, excludeBots);
    currentRef.current = key;
    reportCache.delete(key);
    setState((prev) => ({ data: prev.data, loading: true, error: null }));

    const query = `owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&excludeBots=${excludeBots}&refresh=true`;
    try {
      const data = await getJson<BurnoutReport>(`/api/burnout?${query}`);
      if (currentRef.current !== key) return;
      reportCache.set(key, Promise.resolve(data));
      setState({ data, loading: false, error: null });
    } catch (err) {
      if (currentRef.current !== key) return;
      setState((prev) => ({ data: prev.data, loading: false, error: err instanceof Error ? err.message : "Refresh failed." }));
    }
  }, []);

  const prefetch = useCallback((ownerRaw: string, repoRaw: string, excludeBots: boolean) => {
    const owner = ownerRaw.trim();
    const repo = repoRaw.trim();
    if (!owner || !repo) return;
    void loadReport(owner, repo, excludeBots).catch(() => {});
  }, []);

  const reset = useCallback(() => {
    currentRef.current = null;
    lastArgsRef.current = null;
    setState(IDLE);
  }, []);

  return { ...state, run, refresh, prefetch, reset };
}

/** Splits a `owner/repo` string, tolerating a full GitHub URL or a trailing slash. */
export function parseRepoInput(raw: string): { owner: string; repo: string } | null {
  let value = raw.trim();
  if (!value) return null;

  value = value.replace(/^https?:\/\/(www\.)?github\.com\//i, "").replace(/\.git$/i, "").replace(/\/+$/, "");

  const parts = value.split("/").filter(Boolean);
  if (parts.length !== 2) return null;

  const [owner, repo] = parts;
  if (!/^[A-Za-z0-9-]{1,39}$/.test(owner)) return null;
  if (!/^[A-Za-z0-9._-]{1,100}$/.test(repo)) return null;

  return { owner, repo };
}
