import { gitHubUserValidator } from '../github/validate-user';
import { TTLCache } from '../../lib/cache';

const GITHUB_USERNAME_REGEX = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

const WRITE_COOLDOWN_MS = 5 * 60 * 1000;

export class TrackUserProtection {
  private static instance: TrackUserProtection;

  private lastWriteTimes = new TTLCache<number>(5000, 60 * 60 * 1000);

  private constructor() {}

  public static getInstance(): TrackUserProtection {
    if (!TrackUserProtection.instance) {
      TrackUserProtection.instance = new TrackUserProtection();
    }
    return TrackUserProtection.instance;
  }

  public validateFormat(username: string): boolean {
    const trimmed = username.trim();
    if (!trimmed || trimmed.length > 39) {
      return false;
    }
    return GITHUB_USERNAME_REGEX.test(trimmed);
  }

  public isWriteAllowed(username: string): boolean {
    const sanitized = username.trim().toLowerCase();
    const lastWrite = this.lastWriteTimes.get(sanitized);
    if (!lastWrite) {
      return true;
    }
    return Date.now() - lastWrite >= WRITE_COOLDOWN_MS;
  }

  public recordWrite(username: string): void {
    const sanitized = username.trim().toLowerCase();
    this.lastWriteTimes.set(sanitized, Date.now(), WRITE_COOLDOWN_MS);
  }

  public async verifyAndDeduplicate(username: string): Promise<{
    allowed: boolean;
    reason?: 'INVALID_FORMAT' | 'COOLDOWN_ACTIVE' | 'USER_NOT_FOUND';
    remainingMs?: number;
  }> {
    if (!this.validateFormat(username)) {
      return { allowed: false, reason: 'INVALID_FORMAT' };
    }

    const sanitized = username.trim().toLowerCase();

    if (!this.isWriteAllowed(sanitized)) {
      const lastWrite = this.lastWriteTimes.get(sanitized) || 0;
      const remainingMs = Math.max(0, WRITE_COOLDOWN_MS - (Date.now() - lastWrite));
      return { allowed: false, reason: 'COOLDOWN_ACTIVE', remainingMs };
    }

    const exists = await gitHubUserValidator.validateUser(username);
    if (!exists) {
      return { allowed: false, reason: 'USER_NOT_FOUND' };
    }

    return { allowed: true };
  }

  public reset(): void {
    this.lastWriteTimes.clear();
  }
}

export const trackUserProtection = TrackUserProtection.getInstance();
