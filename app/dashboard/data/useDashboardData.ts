"use client";

// Live data layer for the Dashboard page.
//
// Each hook fetches one of the `/api/dashboard*` routes and hands back a typed
// resource. Tab payloads are fetched lazily so opening the page only pays for
// the Overview tab. Wiring lives here, never in the view.

import { useCallback, useEffect, useRef, useState } from "react";
import type { AsyncResource, CIAnalyticsPayload, DashboardOverviewPayload, PRInsightsPayload } from "./types";

const EMPTY = { data: null, loading: false, error: null } as const;

async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

/**
 * Fetch `path?user=…` whenever `username` changes and `enabled` is true.
 * In-flight requests are aborted on change/unmount so a slow tab can never
 * overwrite a newer one.
 */
function useEndpoint<T>(path: string, username: string, enabled: boolean, nonce = 0) {
  const [state, setState] = useState<AsyncResource<T>>(EMPTY);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const user = username.trim();
    if (!enabled || !user) {
      setState(EMPTY);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((prev) => ({ data: prev.data, loading: true, error: null }));

    getJson<T>(`${path}?user=${encodeURIComponent(user)}`, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          data: null,
          loading: false,
          error: err instanceof Error ? err.message : "Something went wrong.",
        });
      });

    return () => controller.abort();
  }, [path, username, enabled, nonce]);

  return state;
}

export function useDashboardOverview(username: string, nonce = 0) {
  return useEndpoint<DashboardOverviewPayload>("/api/dashboard", username, true, nonce);
}

export function useCIAnalytics(username: string, enabled: boolean, nonce = 0) {
  return useEndpoint<CIAnalyticsPayload>("/api/dashboard/ci", username, enabled, nonce);
}

export function usePRInsights(username: string, enabled: boolean, nonce = 0) {
  return useEndpoint<PRInsightsPayload>("/api/dashboard/pr", username, enabled, nonce);
}

/** Bump to force every dashboard endpoint to refetch (the "Refresh Data" action). */
export function useRefreshNonce(): [number, () => void] {
  const [nonce, setNonce] = useState(0);
  return [nonce, useCallback(() => setNonce((n) => n + 1), [])];
}
