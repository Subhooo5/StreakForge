"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ArenaPayload, CompareBattlePayload } from "@/types/compare";

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export interface ArenaState {
  data: ArenaPayload | null;
  loading: boolean;
}

export function useArena(initial?: ArenaPayload | null): ArenaState & { reload: () => void } {
  const [state, setState] = useState<ArenaState>({ data: initial ?? null, loading: !initial });
  const [nonce, setNonce] = useState(0);
  const seeded = useRef(Boolean(initial));

  useEffect(() => {
    if (nonce === 0 && seeded.current) return;
    const controller = new AbortController();
    setState((prev) => ({ data: prev.data, loading: true }));

    getJson<ArenaPayload>(nonce === 0 ? "/api/compare/arena" : `/api/compare/arena?n=${nonce}`, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, loading: false });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState((prev) => ({ data: prev.data, loading: false }));
      });

    return () => controller.abort();
  }, [nonce]);

  return { ...state, reload: useCallback(() => setNonce((n) => n + 1), []) };
}

export interface BattleState {
  data: CompareBattlePayload | null;
  loading: boolean;
  error: string | null;
}

const IDLE: BattleState = { data: null, loading: false, error: null };

export interface Battle extends BattleState {
  run: (userA: string, userB: string) => Promise<void>;
  prefetch: (userA: string, userB: string) => void;
  reset: () => void;
}

const battleCache = new Map<string, Promise<CompareBattlePayload>>();

const cacheKey = (a: string, b: string) => `${a.toLowerCase()}|${b.toLowerCase()}`;

function loadBattle(a: string, b: string): Promise<CompareBattlePayload> {
  const key = cacheKey(a, b);
  const cached = battleCache.get(key);
  if (cached) return cached;

  const query = `user1=${encodeURIComponent(a)}&user2=${encodeURIComponent(b)}`;
  const promise = getJson<CompareBattlePayload>(`/api/compare?${query}`).catch((err: unknown) => {
    battleCache.delete(key);
    throw err;
  });

  battleCache.set(key, promise);
  return promise;
}

export const COMPARE_BADGE_THEME = "synthwave";

export function compareBadgeSrc(user: string): string {
  return `/api/streak?user=${encodeURIComponent(user)}&theme=${COMPARE_BADGE_THEME}`;
}

const warmedBadges = new Set<string>();

function warmBadge(user: string): void {
  const key = user.toLowerCase();
  if (warmedBadges.has(key) || typeof Image === "undefined") return;
  warmedBadges.add(key);
  new Image().src = compareBadgeSrc(user);
}

export function useBattle(onComplete?: () => void): Battle {
  const [state, setState] = useState<BattleState>(IDLE);
  const currentRef = useRef<string | null>(null);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  const run = useCallback(async (userA: string, userB: string) => {
    const a = userA.trim();
    const b = userB.trim();
    if (!a || !b) {
      currentRef.current = null;
      setState({ data: null, loading: false, error: "Enter two GitHub usernames to compare." });
      return;
    }

    const key = cacheKey(a, b);
    currentRef.current = key;
    setState((prev) => ({ data: prev.data, loading: true, error: null }));

    try {
      const data = await loadBattle(a, b);
      if (currentRef.current !== key) return;
      setState({ data, loading: false, error: null });
      completeRef.current?.();
    } catch (err) {
      if (currentRef.current !== key) return;
      setState({ data: null, loading: false, error: err instanceof Error ? err.message : "Something went wrong. Please try again." });
    }
  }, []);

  const prefetch = useCallback((userA: string, userB: string) => {
    const a = userA.trim();
    const b = userB.trim();
    if (!a || !b) return;
    void loadBattle(a, b).catch(() => {});
    warmBadge(a);
    warmBadge(b);
  }, []);

  const reset = useCallback(() => {
    currentRef.current = null;
    setState(IDLE);
  }, []);

  return { ...state, run, prefetch, reset };
}
