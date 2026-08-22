export interface ContributionBearing {
  totalCommits?: number | null;
  totalContributors?: number | null;
  totalContributions?: number | null;
  contributors?: unknown[] | null;
  empty?: boolean | null;
}

export function isEmptyRepo(data: ContributionBearing | null | undefined): boolean {
  if (!data) return true;
  if (data.empty === true) return true;

  const signals = [data.totalCommits, data.totalContributors, data.totalContributions];
  const present = signals.filter((v): v is number => typeof v === 'number');

  if (present.length > 0 && present.every((v) => v <= 0)) {
    if (Array.isArray(data.contributors) && data.contributors.length > 0) return false;
    return true;
  }

  if (present.length === 0 && Array.isArray(data.contributors)) {
    return data.contributors.length === 0;
  }

  return false;
}

export function hasContributionData(data: ContributionBearing | null | undefined): boolean {
  return !isEmptyRepo(data);
}

export type EmptyStateKind = 'empty' | 'not-found' | 'private' | 'rate-limit' | 'error';

export interface EmptyStateCopy {
  kind: EmptyStateKind;
  title: string;
  body: string;
  tone: 'warn' | 'bad';
}

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
