"use client";

// Live badge for the Customization Studio.
//
// The preview is not a re-implementation of the badge — it *is* the badge:
// this hook fetches `/api/streak` with the studio's own query string, so the
// pixels on screen come from the same fetch → calculate → generate pipeline
// that serves the Home page and every embedded README. Holding the SVG text
// (rather than pointing an <img> straight at the route) buys three things:
// Download SVG saves the exact bytes rendered, the previous badge stays on
// screen while the next one loads instead of blanking, and a failed request
// surfaces as a message rather than as the route's error artwork.

import { useEffect, useRef, useState } from "react";

/** How long rapid changes (typing, dragging the radius) settle before fetching. */
const FETCH_DEBOUNCE_MS = 260;

export interface BadgeSvg {
  /** Raw SVG markup of the badge currently on screen, if any. */
  svg: string | null;
  /** Object URL for that markup — the `src` the preview <img> uses. */
  src: string | null;
  /** A request is in flight. The previous badge stays visible meanwhile. */
  loading: boolean;
  /** Human-readable failure, or null. */
  error: string | null;
}

const EMPTY: BadgeSvg = { svg: null, src: null, loading: false, error: null };

function messageFor(status: number): string {
  if (status === 404) return "That GitHub user doesn't exist.";
  if (status === 429) return "GitHub rate limit reached — try again in a moment.";
  if (status === 400) return "Those settings aren't valid for the badge.";
  return `Couldn't render the badge (error ${status}).`;
}

/**
 * Fetches the badge for `query`, debounced.
 *
 * @param query badge query string (`toQuery`), empty when there is no username
 * @param enabled false while the studio has no username to render
 */
export function useBadgeSvg(query: string, enabled: boolean): BadgeSvg {
  const [state, setState] = useState<BadgeSvg>(EMPTY);
  const abortRef = useRef<AbortController | null>(null);
  // Object URLs are revoked only once their replacement is on screen, so the
  // <img> never points at a URL that has already been released.
  const srcRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      abortRef.current?.abort();
      if (srcRef.current) URL.revokeObjectURL(srcRef.current);
      srcRef.current = null;
      setState(EMPTY);
      return;
    }

    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState((prev) => ({ ...prev, loading: true, error: null }));

      fetch(`/api/streak?${query}`, { signal: controller.signal, headers: { Accept: "image/svg+xml" } })
        .then(async (res) => {
          if (!res.ok) throw new Error(messageFor(res.status));
          const svg = await res.text();
          if (controller.signal.aborted) return;

          const next = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
          const previous = srcRef.current;
          srcRef.current = next;
          setState({ svg, src: next, loading: false, error: null });
          if (previous) URL.revokeObjectURL(previous);
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          setState((prev) => ({
            ...prev,
            loading: false,
            error: err instanceof Error ? err.message : "Couldn't render the badge.",
          }));
        });
    }, FETCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, enabled]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (srcRef.current) URL.revokeObjectURL(srcRef.current);
    },
    [],
  );

  return state;
}
