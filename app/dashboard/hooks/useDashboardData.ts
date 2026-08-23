"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { AsyncResource, CIAnalyticsPayload, DashboardOverviewPayload, PRInsightsPayload } from "../types";
import { clearDashboardCache, readDashboardCache, writeDashboardCache } from "../utils/dashboardCache";
import type { DashboardCacheTab } from "../utils/dashboardCache";

const EMPTY = { data: null, loading: false, error: null } as const;
const PENDING = { data: null, loading: true, error: null } as const;

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

function useEndpoint<T>(path: string, username: string, enabled: boolean, nonce: number, tab: DashboardCacheTab) {
  const [state, setState] = useState<AsyncResource<T>>(EMPTY);
  const abortRef = useRef<AbortController | null>(null);
  const servedRef = useRef<string | null>(null);

  useIsomorphicLayoutEffect(() => {
    const user = username.trim();

    if (!user) {
      abortRef.current?.abort();
      servedRef.current = null;
      setState(EMPTY);
      return;
    }
    if (!enabled) return;

    const stamp = `${user.toLowerCase()}|${nonce}`;
    if (servedRef.current === stamp) return;

    if (nonce === 0) {
      const cached = readDashboardCache<T>(user, tab);
      if (cached) {
        servedRef.current = stamp;
        setState({ data: cached, loading: false, error: null });
        return;
      }
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState(PENDING);

    getJson<T>(`${path}?user=${encodeURIComponent(user)}`, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        servedRef.current = stamp;
        writeDashboardCache(user, tab, data);
        setState({ data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        servedRef.current = null;
        setState({
          data: null,
          loading: false,
          error: err instanceof Error ? err.message : "Something went wrong.",
        });
      });

    return () => controller.abort();
  }, [path, username, enabled, nonce, tab]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return state;
}

export function useDashboardOverview(username: string, nonce = 0) {
  return useEndpoint<DashboardOverviewPayload>("/api/dashboard", username, true, nonce, "overview");
}

export function useCIAnalytics(username: string, enabled: boolean, nonce = 0) {
  return useEndpoint<CIAnalyticsPayload>("/api/dashboard/ci", username, enabled, nonce, "ci");
}

export function usePRInsights(username: string, enabled: boolean, nonce = 0) {
  return useEndpoint<PRInsightsPayload>("/api/dashboard/pr", username, enabled, nonce, "pr");
}

export function useRefreshNonce(username: string): [number, () => void] {
  const [nonce, setNonce] = useState(0);
  const refresh = useCallback(() => {
    clearDashboardCache(username);
    setNonce((n) => n + 1);
  }, [username]);
  return [nonce, refresh];
}
