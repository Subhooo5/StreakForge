"use client";

import { useEffect, useRef, useState } from "react";

const FETCH_DEBOUNCE_MS = 260;

export interface BadgeSvg {
  svg: string | null;
  src: string | null;
  loading: boolean;
  error: string | null;
}

const EMPTY: BadgeSvg = { svg: null, src: null, loading: false, error: null };

function messageFor(status: number): string {
  if (status === 404) return "That GitHub user doesn't exist.";
  if (status === 429) return "GitHub rate limit reached — try again in a moment.";
  if (status === 400) return "Those settings aren't valid for the badge.";
  return `Couldn't render the badge (error ${status}).`;
}

export function useBadgeSvg(query: string, enabled: boolean): BadgeSvg {
  const [state, setState] = useState<BadgeSvg>(EMPTY);
  const abortRef = useRef<AbortController | null>(null);
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
