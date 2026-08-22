import "server-only";

import { istDateKey, type CompareCounters } from "./counters";

interface LocalStore {
  comparisons: number;
  reposAnalyzed: number;
  languages: Set<string>;
  dayKey: string;
  today: number;
  pairs: Map<string, number>;
}

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

export function localHasData(): boolean {
  const s = store();
  return s.comparisons > 0;
}
