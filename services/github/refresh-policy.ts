import 'server-only';
import { quotaMonitor } from './quota-monitor';
import { TTLCache } from '../../lib/cache';

export class RefreshPolicy {
  private static instance: RefreshPolicy;

  private cooldownMs = 30 * 1000;

  private refreshTimes = new TTLCache<number>(15000, 60 * 60 * 1000);

  private constructor() {}

  public static getInstance(): RefreshPolicy {
    if (!RefreshPolicy.instance) {
      RefreshPolicy.instance = new RefreshPolicy();
    }
    return RefreshPolicy.instance;
  }

  public setCooldown(ms: number): void {
    this.cooldownMs = Math.max(0, ms);
  }

  private getCacheKey(username: string): string {
    const sanitized = username.trim().toLowerCase();
    const key = sanitized === '' ? '__anonymous__' : sanitized;
    if (key.length > 10000) {
      let hash = 5381;
      for (let i = 0; i < key.length; i++) {
        hash = (hash * 33) ^ key.charCodeAt(i);
      }
      return `${key.slice(0, 1000)}_${(hash >>> 0).toString(16)}`;
    }
    return key;
  }

  public isRefreshAllowed(username: string): boolean {
    if (quotaMonitor.isQuotaLow()) {
      return false;
    }

    if (this.cooldownMs === 0) {
      return true;
    }

    const cacheKey = this.getCacheKey(username);
    const lastRefresh = this.refreshTimes.get(cacheKey);
    if (!lastRefresh) {
      return true;
    }

    return Date.now() - lastRefresh >= this.cooldownMs;
  }

  public tryAcquire(username: string): boolean {
    if (!this.isRefreshAllowed(username)) {
      return false;
    }

    this.recordRefresh(username);
    return true;
  }

  public recordRefresh(username: string): void {
    if (this.cooldownMs > 0) {
      const cacheKey = this.getCacheKey(username);
      this.refreshTimes.set(cacheKey, Date.now(), 60 * 60 * 1000);
    }
    quotaMonitor.incrementRefreshCount();
  }

  public getRemainingCooldown(username: string): number {
    const cacheKey = this.getCacheKey(username);
    const lastRefresh = this.refreshTimes.get(cacheKey);
    if (!lastRefresh) {
      return 0;
    }

    const elapsed = Date.now() - lastRefresh;
    return Math.max(0, this.cooldownMs - elapsed);
  }

  public reset(): void {
    this.refreshTimes.clear();
    this.cooldownMs = 30 * 1000;
  }
}

export const refreshPolicy = RefreshPolicy.getInstance();
