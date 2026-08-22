import 'server-only';
import { randomUUID } from 'crypto';
import { brotliCompressSync, brotliDecompressSync } from 'zlib';
import logger from '@/lib/logger';

export interface LockConfig {
  lockTtlMs?: number;

  maxPollTimeMs?: number;

  enableLockExtension?: boolean;

  releaseRetries?: number;
}

type CacheItem<T> = {
  value: T;
  expiresAt: number;
};

export class TTLCache<T> {
  private store = new Map<string, CacheItem<T | Buffer>>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private readonly maxSize?: number;

  constructor(maxSize?: number, cleanupIntervalMs: number = 60000) {
    this.maxSize = maxSize === undefined ? undefined : Math.max(1, maxSize);
    const interval = Math.max(1000, cleanupIntervalMs);

    if (typeof setInterval !== 'undefined') {
      const timer = setInterval(() => this.sweep(), interval);

      const nodeTimer = timer as unknown as { unref?: () => void };
      if (nodeTimer && typeof nodeTimer.unref === 'function') {
        nodeTimer.unref();
      }

      this.cleanupInterval = timer;
    }
  }

  private sweep(): void {
    const now = Date.now();
    for (const [key, item] of this.store.entries()) {
      if (now > item.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  private compress(value: T): T | Buffer {
    if (typeof value === 'string') {
      if (value.length > 1024) {
        try {
          return brotliCompressSync(Buffer.from(value));
        } catch {
          return value;
        }
      }
    } else if (value && typeof value === 'object') {
      try {
        const str = JSON.stringify(value);
        if (str.length > 1024) {
          return brotliCompressSync(Buffer.from(str));
        }
      } catch {
        return value;
      }
    }
    return value;
  }

  private decompress(stored: T | Buffer): T {
    if (Buffer.isBuffer(stored)) {
      try {
        const decompressed = brotliDecompressSync(stored).toString();
        try {
          return JSON.parse(decompressed) as T;
        } catch {
          return decompressed as unknown as T;
        }
      } catch {
        return stored as unknown as T;
      }
    }
    return stored;
  }

  // Cache read

  get(key: string): T | null {
    if (typeof key !== 'string') {
      throw new TypeError('Cache key must be a string');
    }
    if (key.trim().length === 0) {
      return null;
    }

    const hit = this.store.get(key);
    if (!hit) return null;

    if (Date.now() > hit.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return this.decompress(hit.value);
  }

  has(key: string): boolean {
    if (typeof key !== 'string') {
      throw new TypeError('Cache key must be a string');
    }
    if (key.trim().length === 0) {
      return false;
    }

    const hit = this.store.get(key);
    if (!hit) return false;

    if (Date.now() > hit.expiresAt) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    if (typeof key !== 'string' || key.trim().length === 0) {
      return false;
    }

    return this.store.delete(key);
  }
  update(key: string, value: T): boolean {
    const hit = this.store.get(key);

    if (!hit) {
      return false;
    }

    if (Date.now() > hit.expiresAt) {
      this.store.delete(key);
      return false;
    }

    hit.value = this.compress(value);
    return true;
  }

  // Cache write

  set(key: string, value: T, ttlMs: number): void {
    if (typeof key !== 'string' || key.trim().length === 0) {
      throw new TypeError('Cache key cannot be empty');
    }
    if (!Number.isFinite(ttlMs)) {
      throw new RangeError(`ttlMs must be a finite number, got ${ttlMs}`);
    }

    if (ttlMs <= 0) {
      throw new RangeError(`ttlMs must be positive, got ${ttlMs}`);
    }

    if (key.length > 10000) {
      throw new Error('Cache key exceeds maximum allowed length to prevent memory bloat');
    }

    const maxSize = this.maxSize;
    if (maxSize !== undefined && this.store.size >= maxSize && !this.store.has(key)) {
      this.sweep();
      if (this.store.size >= maxSize) {
        const oldestKey = this.store.keys().next().value as string | undefined;
        if (oldestKey !== undefined) {
          this.store.delete(oldestKey);
        }
      }
    }

    this.store.delete(key);
    this.store.set(key, { value: this.compress(value), expiresAt: Date.now() + ttlMs });
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    this.sweep();
    return this.store.size;
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

export class DistributedCache<T> {
  private localCache: TTLCache<T>;
  private useRedis: boolean;
  private redisUrl: string = '';
  private redisToken: string = '';
  private localLocks = new Map<string, Promise<T>>();

  constructor(maxSize?: number, cleanupIntervalMs?: number) {
    this.localCache = new TTLCache<T>(maxSize, cleanupIntervalMs);
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    if (url && token) {
      this.useRedis = true;
      this.redisUrl = url.replace(/\/$/, '');
      this.redisToken = token;
    } else {
      this.useRedis = false;
    }
  }

  // Cache read: local, then shared

  async get(key: string, localTtlMs: number = 5 * 60 * 1000): Promise<T | null> {
    if (!this.useRedis) {
      return this.localCache.get(key);
    }

    const localHit = this.localCache.get(key);
    if (localHit !== null) {
      return localHit;
    }

    try {
      const res = await fetch(`${this.redisUrl}/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['GET', key]),
      });

      if (!res.ok) {
        throw new Error(`Redis HTTP error: ${res.status}`);
      }

      const data = await res.json();
      if (!data || data.result === undefined || data.result === null) {
        return null;
      }

      const parsed = JSON.parse(data.result) as T;
      this.localCache.set(key, parsed, localTtlMs);
      return parsed;
    } catch (err) {
      logger.error('Cache GET failed', {
        component: 'DistributedCache',
        key,
        error: err,
      });
      return this.localCache.get(key);
    }
  }

  // Cache write: local + shared

  async set(key: string, value: T, ttlMs: number): Promise<void> {
    this.localCache.set(key, value, ttlMs);

    if (!this.useRedis) {
      return;
    }

    try {
      const ttlSec = Math.max(1, Math.ceil(ttlMs / 1000));
      const res = await fetch(`${this.redisUrl}/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['SET', key, JSON.stringify(value), 'EX', ttlSec]),
      });

      if (!res.ok) {
        throw new Error(`Redis HTTP error: ${res.status}`);
      }
    } catch (err) {
      logger.error('Cache SET failed', {
        component: 'DistributedCache',
        key,
        error: err,
      });
    }
  }

  async delete(key: string): Promise<boolean> {
    const localDeleted = this.localCache.delete(key);
    if (!this.useRedis) {
      return localDeleted;
    }

    try {
      const res = await fetch(`${this.redisUrl}/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['DEL', key]),
      });

      if (!res.ok) {
        throw new Error(`Redis HTTP error: ${res.status}`);
      }

      const data = await res.json();
      return Boolean(data.result);
    } catch (err) {
      logger.error('Cache DELETE failed', {
        component: 'DistributedCache',
        key,
        error: err,
      });
      return localDeleted;
    }
  }

  async has(key: string): Promise<boolean> {
    if (this.localCache.has(key)) {
      return true;
    }
    if (!this.useRedis) {
      return false;
    }

    try {
      const value = await this.get(key);
      return value !== null;
    } catch {
      return false;
    }
  }

  async update(key: string, value: T): Promise<boolean> {
    if (!this.useRedis) {
      return this.localCache.update(key, value);
    }

    try {
      const res = await fetch(`${this.redisUrl}/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['SET', key, JSON.stringify(value), 'KEEPTTL', 'XX']),
      });

      if (!res.ok) {
        throw new Error(`Redis HTTP error: ${res.status}`);
      }
      const data = await res.json();
      const updated = data.result === 'OK';

      if (updated) {
        this.localCache.update(key, value);
      } else {
        this.localCache.delete(key);
      }

      return updated;
    } catch (err) {
      logger.error('Cache UPDATE failed', {
        component: 'DistributedCache',
        key,
        error: err,
      });
      return false;
    }
  }

  clear(): void {
    this.localCache.clear();
  }

  async incr(key: string, ttlMs: number): Promise<number> {
    if (!this.useRedis) {
      if (process.env.NODE_ENV === 'production') {
        logger.warn(
          'Redis not configured — rate limiting is per-instance only. ' +
            'Add KV_REST_API_URL + KV_REST_API_TOKEN for distributed rate limiting.',
          { component: 'DistributedCache', key }
        );
      }
      const current = (this.localCache.get(key) as unknown as number) || 0;
      const next = current + 1;
      if (current === 0) {
        this.localCache.set(key, next as unknown as T, ttlMs);
      } else {
        this.localCache.update(key, next as unknown as T);
      }
      return next;
    }

    try {
      const ttlSec = Math.max(1, Math.ceil(ttlMs / 1000));
      const luaScript = `local c = redis.call('INCR', KEYS[1])
if c == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return c`;

      const res = await fetch(`${this.redisUrl}/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['EVAL', luaScript, '1', key, ttlSec.toString()]),
      });

      if (!res.ok) {
        throw new Error(`Redis HTTP error: ${res.status}`);
      }

      const data = await res.json();
      const count = Number(data.result);

      this.localCache.set(key, count as unknown as T, ttlMs);
      return count;
    } catch (err) {
      logger.error(
        'Cache INCR failed — failing closed to avoid bypassing distributed rate limits',
        {
          component: 'DistributedCache',
          key,
          error: err,
        }
      );
      return Number.MAX_SAFE_INTEGER;
    }
  }

  destroy(): void {
    this.localCache.destroy();
  }

  async getOrSet(
    key: string,
    loadFn: (cached: T | null) => Promise<T>,
    ttlMs: number,
    shouldFetch?: (cached: T) => boolean,
    lockConfig?: LockConfig
  ): Promise<T> {
    const existing = this.localLocks.get(key);
    if (existing) return existing;

    const cached = await this.get(key, ttlMs);

    if (cached !== null && (!shouldFetch || !shouldFetch(cached))) {
      return cached;
    }

    const pendingLocal = this.localLocks.get(key);
    if (pendingLocal) return pendingLocal;

    const executeAndLock = async () => {
      if (!this.useRedis) {
        const data = await loadFn(cached);
        await this.set(key, data, ttlMs);
        return data;
      }

      const lockKey = `lock:${key}`;
      const lockToken = randomUUID();
      const lockTtlMs = lockConfig?.lockTtlMs ?? 10000;
      const maxPollTime = lockConfig?.maxPollTimeMs ?? 8000;
      const enableLockExtension = lockConfig?.enableLockExtension ?? true;
      const releaseRetries = lockConfig?.releaseRetries ?? 2;
      const BASE_POLL_MS = 100;
      const MAX_POLL_MS = 1600;
      const start = Date.now();
      let attempt = 0;

      const luaRelease = `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
          return redis.call("DEL", KEYS[1])
        else
          return 0
        end
      `;

      const releaseLock = async (): Promise<void> => {
        for (let r = 0; r <= releaseRetries; r++) {
          try {
            await fetch(`${this.redisUrl}/`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${this.redisToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(['EVAL', luaRelease, 1, lockKey, lockToken]),
            });
            return;
          } catch (e) {
            if (r < releaseRetries) {
              await new Promise((resolve) => setTimeout(resolve, 100));
            } else {
              console.error(
                '[DistributedCache] Lock release failed for key "%s" after %d attempts:',
                key,
                releaseRetries + 1,
                e
              );
            }
          }
        }
      };

      while (Date.now() - start < maxPollTime) {
        let acquired = false;

        try {
          const lockRes = await fetch(`${this.redisUrl}/`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.redisToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(['SET', lockKey, lockToken, 'NX', 'PX', lockTtlMs]),
          });

          if (lockRes.ok) {
            const lockData = await lockRes.json();
            acquired = lockData.result === 'OK';
          } else {
            throw new Error(`Redis lock HTTP error: ${lockRes.status}`);
          }
        } catch (err) {
          logger.error('Cache lock failed', {
            component: 'DistributedCache',
            key,
            error: err,
          });
          const fallbackData = await loadFn(cached);
          await this.set(key, fallbackData, ttlMs);
          return fallbackData;
        }

        if (acquired) {
          let extensionTimer: ReturnType<typeof setInterval> | null = null;

          if (enableLockExtension) {
            const rawInterval = Math.floor(lockTtlMs * 0.6);
            const minInterval = Math.min(1000, Math.max(100, lockTtlMs - 100));
            const extensionInterval = Math.max(minInterval, rawInterval);

            extensionTimer = setInterval(async () => {
              try {
                const luaExtend = `
                  if redis.call("GET", KEYS[1]) == ARGV[1] then
                    redis.call("PEXPIRE", KEYS[1], ARGV[2])
                  end
                `;
                await fetch(`${this.redisUrl}/`, {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${this.redisToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify([
                    'EVAL',
                    luaExtend,
                    1,
                    lockKey,
                    lockToken,
                    String(lockTtlMs),
                  ]),
                });
              } catch {
              }
            }, extensionInterval);
            if (typeof extensionTimer === 'object' && typeof extensionTimer.unref === 'function') {
              extensionTimer.unref();
            }
          }

          try {
            const freshData = await loadFn(cached);
            await this.set(key, freshData, ttlMs);
            return freshData;
          } finally {
            if (extensionTimer) clearInterval(extensionTimer);
            await releaseLock();
          }
        }

        const baseBackoff = Math.min(BASE_POLL_MS * 2 ** attempt, MAX_POLL_MS);
        const jitter = 0.5 + Math.random() * 0.5;
        const backoffMs = Math.round(baseBackoff * jitter);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        attempt++;
        const doubleCheck = await this.get(key, ttlMs);

        if (doubleCheck !== null && (!shouldFetch || !shouldFetch(doubleCheck))) {
          return doubleCheck;
        }
      }

      const finalFallback = await loadFn(cached);
      await this.set(key, finalFallback, ttlMs);
      return finalFallback;
    };

    let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

    const promise = executeAndLock().finally(() => {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      this.localLocks.delete(key);
    });

    this.localLocks.set(key, promise);

    timeoutTimer = setTimeout(() => {
      if (this.localLocks.get(key) === promise) {
        this.localLocks.delete(key);
        logger.error('Safety eviction triggered for hanging lock', {
          component: 'DistributedCache',
          key,
        });
      }
    }, 60000);

    if (timeoutTimer && typeof timeoutTimer.unref === 'function') {
      timeoutTimer.unref();
    }

    return promise;
  }
}
