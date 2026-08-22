/**
 * One place that decides whether a fetched subject actually has contribution
 * data behind it.
 *
 * Before this existed each page made its own call — the Burnout Radar checked a
 * `empty` flag, others checked a count or simply rendered whatever arrived —
 * so a repository with no commits could produce a clean empty state on one page
 * and a blank section or a divide-by-zero chart on another. Every page now
 * routes through these predicates so the same input always resolves to the same
 * state.
 *
 * Pure and dependency-free, so both server routes and client components can use
 * it.
 */

/** The minimum shape any analysable subject exposes. */
export interface ContributionBearing {
  totalCommits?: number | null;
  totalContributors?: number | null;
  totalContributions?: number | null;
  contributors?: unknown[] | null;
  empty?: boolean | null;
}

/**
 * `true` when the subject has nothing to analyse — no commits, no contributors,
 * or an explicitly empty payload.
 *
 * A missing field is not treated as empty on its own: only a field that is
 * present and zero counts, so a payload that simply does not carry a given
 * metric is not mistaken for an empty repository.
 */
export function isEmptyRepo(data: ContributionBearing | null | undefined): boolean {
  if (!data) return true;
  if (data.empty === true) return true;

  const signals = [data.totalCommits, data.totalContributors, data.totalContributions];
  const present = signals.filter((v): v is number => typeof v === 'number');

  if (present.length > 0 && present.every((v) => v <= 0)) {
    // Contributors present alongside zero counts means the payload is partial
    // rather than empty, so only call it empty when nothing is there either.
    if (Array.isArray(data.contributors) && data.contributors.length > 0) return false;
    return true;
  }

  if (present.length === 0 && Array.isArray(data.contributors)) {
    return data.contributors.length === 0;
  }

  return false;
}

/** Convenience inverse, for guards that read better in the positive. */
export function hasContributionData(data: ContributionBearing | null | undefined): boolean {
  return !isEmptyRepo(data);
}

/** How a failed or empty lookup should be presented. */
export type EmptyStateKind = 'empty' | 'not-found' | 'private' | 'rate-limit' | 'error';

export interface EmptyStateCopy {
  kind: EmptyStateKind;
  title: string;
  body: string;
  /** `warn` for "nothing here yet", `bad` for a genuine failure. */
  tone: 'warn' | 'bad';
}

/**
 * Maps an error message onto the state a page should render.
 *
 * Upstream messages vary by route, so this matches on the substrings the
 * GitHub-facing layers actually produce rather than on exact strings.
 */
export function classifyFailure(message: string | null | undefined, subject = 'this subject'): EmptyStateCopy {
  const raw = (message ?? '').toLowerCase();

  if (!raw) {
    return {
      kind: 'empty',
      title: 'No contribution data yet',
      body: `There is nothing to analyse for ${subject} yet.`,
      tone: 'warn',
    };
  }

  if (raw.includes('not found') || raw.includes('could not resolve')) {
    return {
      kind: 'not-found',
      title: 'Not found',
      body: `We could not find ${subject} on GitHub. Check the spelling — names are case-insensitive but must otherwise match exactly.`,
      tone: 'bad',
    };
  }

  if (raw.includes('private') || raw.includes('forbidden') || raw.includes('403')) {
    return {
      kind: 'private',
      title: 'Not accessible',
      body: `${subject} is private or otherwise not visible to StreakForge, so there is no public history to analyse.`,
      tone: 'bad',
    };
  }

  if (raw.includes('rate limit') || raw.includes('quota')) {
    return {
      kind: 'rate-limit',
      title: 'Rate limited',
      body: 'GitHub is rate limiting requests right now. Give it a minute and try again — cached results are still served instantly.',
      tone: 'bad',
    };
  }

  return {
    kind: 'error',
    title: 'Analysis failed',
    body: message ?? 'Something went wrong. Please try again.',
    tone: 'bad',
  };
}
