import 'server-only';
import { DistributedCache } from './cache';

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

const RATE_LIMIT_SCRIPT = `
local key    = KEYS[1]
local limit  = tonumber(ARGV[1])
local window = tonumber(ARGV[2])

local current = tonumber(redis.call('GET', key) or 0)

if current >= limit then
  local ttl = redis.call('TTL', key)
  return {0, current, ttl}
end

local newCount = redis.call('INCR', key)
if newCount == 1 then
  redis.call('EXPIRE', key, window)
end

local ttl = redis.call('TTL', key)
return {1, newCount, ttl}
`;

async function evalRateLimitScript(
  url: string,
  token: string,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<[number, number, number] | null> {
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        [
          'EVAL',
          RATE_LIMIT_SCRIPT,
          '1',
          key,
          limit.toString(),
          windowSeconds.toString(),
        ],
      ]),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const result = data[0]?.result as [number, number, number] | undefined;
    if (!Array.isArray(result) || result.length < 3) return null;

    return result;
  } catch {
    return null;
  }
}

async function getCountFromRedis(url: string, token: string, key: string): Promise<number | null> {
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([['GET', key]]),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const raw = data[0]?.result;
    return raw !== null && raw !== undefined ? parseInt(raw, 10) : 0;
  } catch {
    return null;
  }
}

export class RateLimiter {
  private cache: DistributedCache<number>;
  private limit: number;
  private windowMs: number;
  private allowlist = new Set<string>();
  private blocklist = new Set<string>();

  constructor(limit = 5, windowMs = 60000, maxSize = 10000) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.cache = new DistributedCache<number>(maxSize, windowMs);
  }

  async check(ip: string): Promise<boolean> {
    const result = await this.checkWithResult(ip);
    return result.success;
  }

  async checkWithResult(ip: string): Promise<RateLimitResult> {
    if (this.allowlist.has(ip))
      return {
        success: true,
        limit: this.limit,
        remaining: this.limit,
        reset: Date.now() + this.windowMs,
      };
    if (this.blocklist.has(ip))
      return { success: false, limit: this.limit, remaining: 0, reset: Date.now() + this.windowMs };

    const now = Date.now();
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;

    if (url && token) {
      const windowSeconds = Math.floor(this.windowMs / 1000);
      const result = await evalRateLimitScript(
        url,
        token,
        `ratelimit_class:${ip}`,
        this.limit,
        windowSeconds
      );

      if (result !== null) {
        const [allowed, count, ttl] = result;
        const resetMs = ttl > 0 ? now + ttl * 1000 : now + this.windowMs;
        return {
          success: allowed === 1,
          limit: this.limit,
          remaining: Math.max(0, this.limit - count),
          reset: resetMs,
        };
      }

      console.error('RateLimiter KV error, falling back to memory');
    }

    const count = await this.cache.incr(`ratelimit:${ip}`, this.windowMs);
    const resetAt = now + this.windowMs;

    if (count > this.limit) {
      return {
        success: false,
        limit: this.limit,
        remaining: 0,
        reset: resetAt,
      };
    }

    return {
      success: true,
      limit: this.limit,
      remaining: Math.max(0, this.limit - count),
      reset: resetAt,
    };
  }

  async reset(ip: string): Promise<void> {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;

    if (url && token) {
      try {
        await fetch(`${url}/pipeline`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([['DEL', `ratelimit_class:${ip}`]]),
        });
      } catch (error) {
        console.error('RateLimiter KV reset error:', error);
      }
    }

    await this.cache.delete(`ratelimit:${ip}`);
  }

  async remaining(ip: string): Promise<number> {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;

    if (url && token) {
      const count = await getCountFromRedis(url, token, `ratelimit_class:${ip}`);
      if (count !== null) {
        return Math.max(0, this.limit - count);
      }
      console.error('RateLimiter remaining() KV error, falling back to memory');
    }

    const cached = (await this.cache.get(`ratelimit:${ip}`)) ?? 0;

    return Math.max(0, this.limit - cached);
  }

  allow(ip: string): void {
    this.allowlist.add(ip);
    this.blocklist.delete(ip);
  }

  block(ip: string): void {
    this.blocklist.add(ip);
    this.allowlist.delete(ip);
  }

  unallow(ip: string): void {
    this.allowlist.delete(ip);
  }

  unblock(ip: string): void {
    this.blocklist.delete(ip);
  }
}

export const trackUserRateLimiter = new RateLimiter(5, 60000);

export const notifyRateLimiter = new RateLimiter(5, 60000);

const trackers = new DistributedCache<{ count: number; resetAt: number }>(2000, 60000);

// Rate limit check
export async function rateLimit(
  ip: string,
  limit: number = 60,
  windowMs: number = 60000,
  namespace: string = 'default'
): Promise<RateLimitResult> {
  if (!ip || ip.trim().length === 0) {
    throw new TypeError('Cache key cannot be empty');
  }

  const cacheKey = `ratelimit:${namespace}:${ip}`;
  const now = Date.now();
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (url && token) {
    const windowSeconds = Math.floor(windowMs / 1000);
    const result = await evalRateLimitScript(url, token, cacheKey, limit, windowSeconds);

    if (result !== null) {
      const [allowed, count, ttl] = result;
      const resetMs = ttl > 0 ? now + ttl * 1000 : now + windowMs;
      return {
        success: allowed === 1,
        limit,
        remaining: Math.max(0, limit - count),
        reset: resetMs,
      };
    }

    console.error('Rate limit KV error, falling back to memory');
  }

  const count = await trackers.incr(cacheKey, windowMs);
  const resetAt = now + windowMs;

  return {
    success: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    reset: resetAt,
  };
}

export function getRateLimitHeaders(result: RateLimitResult) {
  const retryAfter = Math.max(0, Math.ceil((result.reset - Date.now()) / 1000));

  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
    'Retry-After': retryAfter.toString(),
  };
}
