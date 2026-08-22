import 'server-only';
import { TTLCache } from '../../lib/cache';

interface RefreshLimitRecord {
  count: number;
  windowStart: number;
}

export class RefreshRateLimiter {
  private static instance: RefreshRateLimiter;

  private limit = 3;
  private windowMs = 60 * 60 * 1000;

  private tracker = new TTLCache<RefreshLimitRecord>(100000, 60 * 60 * 1000);

  private constructor() {
    this.loadLimitFromEnv();
  }

  public static getInstance(): RefreshRateLimiter {
    if (!RefreshRateLimiter.instance) {
      RefreshRateLimiter.instance = new RefreshRateLimiter();
    }
    return RefreshRateLimiter.instance;
  }

  private loadLimitFromEnv(): void {
    const envLimit = process.env.MAX_REFRESHES_PER_HOUR;
    if (envLimit) {
      const parsed = parseInt(envLimit, 10);
      if (!isNaN(parsed) && parsed > 0) {
        this.limit = parsed;
      }
    }
  }

  public setLimit(limit: number, windowMs = 60 * 60 * 1000): void {
    this.limit = limit;
    this.windowMs = windowMs;
  }

   // Per-IP refresh rate limit
  public checkLimit(ip: string): {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  } {
    this.loadLimitFromEnv();
    const now = Date.now();
    const clientKey = ip.trim() || '__unknown__';

    let record = this.tracker.get(clientKey);

    if (!record || now - record.windowStart >= this.windowMs) {
      record = {
        count: 0,
        windowStart: now,
      };
      this.tracker.set(clientKey, record, this.windowMs);
    }

    const resetTime = record.windowStart + this.windowMs;

    if (record.count >= this.limit) {
      return {
        success: false,
        limit: this.limit,
        remaining: 0,
        reset: resetTime,
      };
    }

    record.count++;
    this.tracker.update(clientKey, record);

    return {
      success: true,
      limit: this.limit,
      remaining: this.limit - record.count,
      reset: resetTime,
    };
  }

  public reset(): void {
    this.tracker.clear();
    this.limit = 3;
    this.windowMs = 60 * 60 * 1000;
  }
}

export const refreshRateLimiter = RefreshRateLimiter.getInstance();
