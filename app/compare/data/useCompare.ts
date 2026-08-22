"use client";

// Live data layer for the Compare page.
//
// `useArena` feeds the pre-comparison battleground (trending showdowns, the
// guessing game, the AI predictions, the four counter tiles and the Walk of
// Fame). `useBattle` runs a head-to-head comparison. Both read the compare
// routes, which ride `lib/github`'s cached, rate-limited pipeline — there is
// no second fetch path and no seeded data anywhere in here.

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

// ─── arena ──────────────────────────────────────────────────────────────────

export interface ArenaState {
  data: ArenaPayload | null;
  loading: boolean;
}

/**
 * Battleground payload. `reload()` refetches — the Compare page calls it after
 * a comparison lands so the counters and the HOT tallies reflect it.
 */
export function useArena(): ArenaState & { reload: () => void } {
  const [state, setState] = useState<ArenaState>({ data: null, loading: true });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState((prev) => ({ data: prev.data, loading: true }));

    // `nonce` is carried into the URL so a reload after a completed comparison
    // cannot be answered from the browser's own cache with stale counters.
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

// ─── battle ─────────────────────────────────────────────────────────────────

export interface BattleState {
  data: CompareBattlePayload | null;
  loading: boolean;
  /** User-facing message for a failed lookup (unknown login, rate limit, …). */
  error: string | null;
}

const IDLE: BattleState = { data: null, loading: false, error: null };

export interface Battle extends BattleState {
  /** Fetch a head-to-head comparison. Resolves once the state has settled. */
  run: (userA: string, userB: string) => Promise<void>;
  /**
   * Start fetching a matchup the user has signalled intent for (hovering a
   * trending card, say) so the click lands on an already-resolved result.
   * Safe to call repeatedly — a pairing is only ever fetched once.
   */
  prefetch: (userA: string, userB: string) => void;
  reset: () => void;
}

/**
 * In-flight and resolved comparisons for this page session, keyed by pairing.
 *
 * Serves three latency wins at once: hovering a trending card resolves it
 * before the click, Forward back onto a result is instant, and re-running a
 * pairing costs nothing. Failures are evicted so a retry actually retries.
 */
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

/**
 * Badge theme for the two monoliths on the Compare **results page only**.
 *
 * Every other badge on the site — the Home preview, the Generator preview,
 * embedded badges — keeps its own theme, so this constant is deliberately
 * local to Compare. The prefetch below and the `<img>` in the view must use
 * the same value or the warmed request is thrown away.
 */
export const COMPARE_BADGE_THEME = "synthwave";

/** The badge URL the Compare results page renders for a user. */
export function compareBadgeSrc(user: string): string {
  return `/api/streak?user=${encodeURIComponent(user)}&theme=${COMPARE_BADGE_THEME}`;
}

const warmedBadges = new Set<string>();

/** Pull a user's monolith badge into the browser cache ahead of the render. */
function warmBadge(user: string): void {
  const key = user.toLowerCase();
  if (warmedBadges.has(key) || typeof Image === "undefined") return;
  warmedBadges.add(key);
  new Image().src = compareBadgeSrc(user);
}

/**
 * Runs one comparison at a time; starting a new one abandons the previous
 * result so a slow lookup can never overwrite a newer one.
 */
export function useBattle(onComplete?: () => void): Battle {
  const [state, setState] = useState<BattleState>(IDLE);
  // Identifies the comparison the UI is currently showing, so a stale response
  // can be recognised and dropped.
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
    // Swallow failures here — a speculative fetch must never surface an error.
    void loadBattle(a, b).catch(() => {});
    // The monolith badges are separate requests the results view makes; warm
    // them too, so the artwork is decoded by the time the section mounts.
    warmBadge(a);
    warmBadge(b);
  }, []);

  const reset = useCallback(() => {
    currentRef.current = null;
    setState(IDLE);
  }, []);

  return { ...state, run, prefetch, reset };
}
