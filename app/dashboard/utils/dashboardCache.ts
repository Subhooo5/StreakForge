export const DASHBOARD_CACHE_PREFIX = "sf-dash-cache:v1";
export const DASHBOARD_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export type DashboardCacheTab = "overview" | "ci" | "pr";

interface CacheEntry<T> {
  savedAt: number;
  payload: T;
}

const entryKey = (user: string, tab: DashboardCacheTab) => `${DASHBOARD_CACHE_PREFIX}:${user.trim().toLowerCase()}:${tab}`;

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function ownKeys(store: Storage): string[] {
  const keys: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i);
    if (key?.startsWith(`${DASHBOARD_CACHE_PREFIX}:`)) keys.push(key);
  }
  return keys;
}

function savedAtOf(store: Storage, key: string): number {
  try {
    const parsed = JSON.parse(store.getItem(key) ?? "") as CacheEntry<unknown>;
    return typeof parsed?.savedAt === "number" ? parsed.savedAt : 0;
  } catch {
    return 0;
  }
}

function evictOldest(store: Storage, exclude: string): boolean {
  const candidates = ownKeys(store).filter((key) => key !== exclude);
  if (candidates.length === 0) return false;
  let oldest = candidates[0];
  let oldestAt = savedAtOf(store, oldest);
  for (const key of candidates) {
    const at = savedAtOf(store, key);
    if (at < oldestAt) {
      oldest = key;
      oldestAt = at;
    }
  }
  store.removeItem(oldest);
  return true;
}

export function readDashboardCache<T>(user: string, tab: DashboardCacheTab): T | null {
  const store = storage();
  const trimmed = user.trim();
  if (!store || !trimmed) return null;

  const key = entryKey(trimmed, tab);
  const raw = store.getItem(key);
  if (!raw) return null;

  try {
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (typeof entry?.savedAt !== "number" || entry.payload === undefined) {
      store.removeItem(key);
      return null;
    }
    if (Date.now() - entry.savedAt >= DASHBOARD_CACHE_TTL_MS) {
      store.removeItem(key);
      return null;
    }
    return entry.payload;
  } catch {
    store.removeItem(key);
    return null;
  }
}

export function writeDashboardCache<T>(user: string, tab: DashboardCacheTab, payload: T): void {
  const store = storage();
  const trimmed = user.trim();
  if (!store || !trimmed) return;

  const key = entryKey(trimmed, tab);
  const serialized = JSON.stringify({ savedAt: Date.now(), payload } satisfies CacheEntry<T>);

  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      store.setItem(key, serialized);
      return;
    } catch {
      if (!evictOldest(store, key)) return;
    }
  }
}

export function clearDashboardCache(user: string): void {
  const store = storage();
  const trimmed = user.trim().toLowerCase();
  if (!store || !trimmed) return;

  for (const key of ownKeys(store)) {
    if (key.startsWith(`${DASHBOARD_CACHE_PREFIX}:${trimmed}:`)) store.removeItem(key);
  }
}
