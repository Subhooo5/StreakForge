"use client";

import { useCallback, useRef, useState } from "react";
import type { BurnoutReport } from "@/types/burnout";

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

const reportCache = new Map<string, Promise<BurnoutReport>>();

const cacheKey = (owner: string, repo: string, excludeBots: boolean) =>
  `${owner.toLowerCase()}/${repo.toLowerCase()}|${excludeBots ? "nobots" : "all"}`;

function loadReport(owner: string, repo: string, excludeBots: boolean): Promise<BurnoutReport> {
  const key = cacheKey(owner, repo, excludeBots);
  const cached = reportCache.get(key);
  if (cached) return cached;

  const query = `owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&excludeBots=${excludeBots}`;
  const promise = getJson<BurnoutReport>(`/api/burnout?${query}`).catch((err: unknown) => {
    reportCache.delete(key);
    throw err;
  });

  reportCache.set(key, promise);
  return promise;
}

export interface Burnout extends BurnoutState {
  run: (owner: string, repo: string, excludeBots: boolean) => Promise<void>;
  refresh: () => Promise<void>;
  prefetch: (owner: string, repo: string, excludeBots: boolean) => void;
  reset: () => void;
}

export function useBurnout(): Burnout {
  const [state, setState] = useState<BurnoutState>(IDLE);
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
