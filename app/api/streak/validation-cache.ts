import { streakParamsSchema } from '@/lib/validations';

export const VALIDATION_CACHE_MAX = 256;

export const validationCache = new Map<string, ReturnType<typeof streakParamsSchema.safeParse>>();

export function normalizeCacheKey(params: URLSearchParams): string {
  const entries: [string, string][] = [];
  params.forEach((value, key) => {
    entries.push([key, value]);
  });
  entries.sort(([a], [b]) => a.localeCompare(b));
  return entries.map(([k, v]) => `${k}=${v}`).join('&');
}

// Caches parsed params per query key
export function cachedValidation(
  key: string,
  parseFn: () => ReturnType<typeof streakParamsSchema.safeParse>
) {
  let cached = validationCache.get(key);
  if (cached !== undefined) {
    validationCache.delete(key);
    validationCache.set(key, cached);
    return cached;
  }
  cached = parseFn();
  if (validationCache.size >= VALIDATION_CACHE_MAX) {
    const lruKey = validationCache.keys().next().value;
    if (lruKey !== undefined) validationCache.delete(lruKey);
  }
  validationCache.set(key, cached);
  return cached;
}

export function getValidationCacheForTests() {
  return validationCache;
}
