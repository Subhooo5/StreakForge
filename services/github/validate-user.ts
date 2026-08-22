import 'server-only';
import { fetchUserProfile } from '../../lib/github';
import { TTLCache } from '../../lib/cache';

const VALIDATION_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export class GitHubUserValidator {
  private static instance: GitHubUserValidator;

  private cache = new TTLCache<boolean>(5000, 60 * 60 * 1000);

  private constructor() {}

  public static getInstance(): GitHubUserValidator {
    if (!GitHubUserValidator.instance) {
      GitHubUserValidator.instance = new GitHubUserValidator();
    }
    return GitHubUserValidator.instance;
  }

  public async validateUser(username: string): Promise<boolean> {
    const sanitized = username.trim().toLowerCase();

    const cachedStatus = this.cache.get(sanitized);
    if (cachedStatus !== null) {
      return cachedStatus;
    }

    try {
      await fetchUserProfile(username, { bypassCache: false });

      this.cache.set(sanitized, true, VALIDATION_CACHE_TTL_MS);
      return true;
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : '';

      if (errMessage.includes('User not found') || errMessage.includes('not found')) {
        this.cache.set(sanitized, false, VALIDATION_CACHE_TTL_MS);
        return false;
      }

      throw err;
    }
  }

  public reset(): void {
    this.cache.clear();
  }
}

export const gitHubUserValidator = GitHubUserValidator.getInstance();
