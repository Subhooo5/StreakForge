import "server-only";

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * LOCAL-DEV-ONLY: remove before production deploy
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * In-process fallback for the Compare page's four counter tiles, used whenever
 * the persistent store is unreachable — which is the case locally, where no
 * MongoDB is expected to be running.
 *
 * Deliberately a plain module-level object rather than a file or a database:
 * it needs no configuration, costs nothing, and disappearing on restart is the
 * documented local behaviour rather than a bug.
 *
 * Lifetime, matching the brief:
 *   - all-time totals  → count from server start, never auto-reset
 *   - comparisons today → resets on every dev server restart, and additionally
 *     rolls over at 00:00 IST so a long-running dev server still behaves like
 *     the deployed path
 *
 * To strip: delete this file, then remove the two `localCounters` branches and
 * this import from `counters.ts`. Nothing else references it.
 */

import { istDateKey, type CompareCounters } from "./counters";

interface LocalStore {
  comparisons: number;
  reposAnalyzed: number;
  languages: Set<string>;
  /** IST date the `today` tally belongs to. */
  dayKey: string;
  today: number;
  pairs: Map<string, number>;
}

/**
 * Held on `globalThis` so Next's dev-mode module reloading does not reset the
 * tallies on every edit — only an actual server restart does.
 */
const globalStore = globalThis as typeof globalThis & { __sfLocalCounters?: LocalStore };

function store(): LocalStore {
  if (!globalStore.__sfLocalCounters) {
    globalStore.__sfLocalCounters = {
      comparisons: 0,
      reposAnalyzed: 0,
      languages: new Set<string>(),
      dayKey: istDateKey(),
      today: 0,
      pairs: new Map<string, number>(),
    };
  }
  return globalStore.__sfLocalCounters;
}

/** Rolls the daily tally when the IST date has moved on. */
function rolled(s: LocalStore): LocalStore {
  const key = istDateKey();
  if (s.dayKey !== key) {
    s.dayKey = key;
    s.today = 0;
  }
  return s;
}

export function localRecordComparison(input: {
  userA: string;
  userB: string;
  reposAnalyzed: number;
  languages: string[];
  pairKey: string;
}): void {
  const s = rolled(store());
  s.comparisons += 1;
  s.today += 1;
  s.reposAnalyzed += Math.max(0, input.reposAnalyzed);
  for (const lang of input.languages) if (lang) s.languages.add(lang);
  s.pairs.set(input.pairKey, (s.pairs.get(input.pairKey) ?? 0) + 1);
}

export function localReadCounters(): CompareCounters {
  const s = rolled(store());
  return {
    // Two developers take part in every comparison.
    developersCompared: s.comparisons * 2,
    reposAnalyzed: s.reposAnalyzed,
    languagesTracked: s.languages.size,
    comparisonsToday: s.today,
  };
}

export function localReadPairCounts(keys: string[]): Record<string, number> {
  const s = store();
  const out: Record<string, number> = {};
  for (const key of keys) {
    const n = s.pairs.get(key);
    if (n) out[key] = n;
  }
  return out;
}

/** `true` once anything has been recorded locally. */
export function localHasData(): boolean {
  const s = store();
  return s.comparisons > 0;
}
