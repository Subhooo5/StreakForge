'use client';

// Data layer for the Generator page's GitHub lookups.
//
// Both hooks read the SAME single data route the badge itself is served from —
// `/api/streak` — so every figure the page shows (streak, longest streak,
// contributions, public repos, the repository list) is real, cached and
// rate-limited by `lib/github`'s hot path. No mock or seeded values live here.

import { useEffect, useState } from 'react';
import { isValidGithubUsername } from '../utils/username';

export type ProfileStatus =
  | 'idle'
  | 'invalid'
  | 'checking'
  | 'verified'
  | 'not_found'
  | 'unverifiable';

export interface GithubProfile {
  status: ProfileStatus;
  login: string;
  name: string;
  avatar: string;
  repos: number;
  currentStreak: number;
  longestStreak: number;
  totalContributions: number;
}

const IDLE: GithubProfile = {
  status: 'idle',
  login: '',
  name: '',
  avatar: '',
  repos: 0,
  currentStreak: 0,
  longestStreak: 0,
  totalContributions: 0,
};

const DEBOUNCE_MS = 500;

/**
 * Verifies `username` against `/api/streak?...&format=json` and returns the
 * profile plus real streak stats. Empty input stays `idle`; a malformed handle
 * short-circuits to `invalid` without spending a request.
 */
export function useGithubProfile(username: string, enabled = true): GithubProfile {
  const [state, setState] = useState<GithubProfile>(IDLE);

  useEffect(() => {
    const u = (username || '').trim();

    if (!enabled || !u) {
      setState(IDLE);
      return;
    }
    if (!isValidGithubUsername(u)) {
      setState({ ...IDLE, status: 'invalid' });
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, status: 'checking' }));

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/streak?user=${encodeURIComponent(u)}&format=json`);
        if (cancelled) return;

        if (res.status === 404) {
          setState({ ...IDLE, status: 'not_found' });
          return;
        }
        if (!res.ok) {
          setState({ ...IDLE, status: 'unverifiable' });
          return;
        }

        const d = (await res.json()) as {
          user?: string;
          profile?: { login: string; name: string; avatar: string; repos: number } | null;
          stats?: { currentStreak: number; longestStreak: number; totalContributions: number };
        };
        if (cancelled) return;

        const p = d.profile;
        const s = d.stats;
        setState({
          status: 'verified',
          login: p?.login ?? d.user ?? u,
          name: p?.name ?? p?.login ?? u,
          avatar: p?.avatar ?? '',
          repos: p?.repos ?? 0,
          currentStreak: s?.currentStreak ?? 0,
          longestStreak: s?.longestStreak ?? 0,
          totalContributions: s?.totalContributions ?? 0,
        });
      } catch {
        if (!cancelled) setState({ ...IDLE, status: 'unverifiable' });
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username, enabled]);

  return state;
}

export interface UserRepo {
  name: string;
  description: string | null;
  language: string | null;
  languageColor: string | null;
  stars: number;
  forks: number;
  updatedAt: string | null;
  url: string;
}

export interface UserRepos {
  status: 'idle' | 'loading' | 'ready' | 'error';
  repos: UserRepo[];
}

const NO_REPOS: UserRepos = { status: 'idle', repos: [] };

/**
 * Public repositories for `username`, newest-pushed first, from
 * `/api/streak?...&view=spotlight&format=json`. Powers the Repository
 * Spotlight selector and its live card.
 */
export function useUserRepos(username: string, enabled = true): UserRepos {
  const [state, setState] = useState<UserRepos>(NO_REPOS);

  useEffect(() => {
    const u = (username || '').trim();

    if (!enabled || !u || !isValidGithubUsername(u)) {
      setState(NO_REPOS);
      return;
    }

    let cancelled = false;
    setState({ status: 'loading', repos: [] });

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/streak?user=${encodeURIComponent(u)}&view=spotlight&format=json`
        );
        if (cancelled) return;
        if (!res.ok) {
          setState({ status: 'error', repos: [] });
          return;
        }
        const d = (await res.json()) as { repos?: UserRepo[] };
        if (cancelled) return;
        setState({ status: 'ready', repos: d.repos ?? [] });
      } catch {
        if (!cancelled) setState({ status: 'error', repos: [] });
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username, enabled]);

  return state;
}
