import "server-only";
import { fetchUserProfile, fetchUserRepos, fetchGitHubContributions, buildProfileData, buildActivityMap, computeDeveloperScore } from "@/lib/github";
import { calculateStreak } from "@/lib/calculate";
import { LANGUAGE_COLORS } from "@/lib/svg/languageColors";
import type { ContributionCalendar } from "@/types";
import type { CompareUserPayload } from "@/types/compare";

// Lean per-user fetch for the Compare page.
//
// Compare used to call `getFullDashboardData`, which additionally fetches
// contributed repos, popular repos, pinned repos, starred repos and the
// deployment tracker, then builds the hall of fame, achievements, insights,
// commit clock and ecosystem graph — none of which Compare renders. Two sides
// of that is a lot of GitHub round trips for data that gets thrown away.
//
// This does only the three cached calls Compare's payload actually needs, and
// derives the rest locally with the same helpers the dashboard uses, so the
// numbers stay identical to the ones the Dashboard shows.

/**
 * Trailing window sent for the activity heatmap: the full contribution year,
 * matching what github.com/<user> shows.
 *
 * The calendar the GraphQL API returns already covers a year, so this keeps
 * all of it rather than trimming — the heatmap slices it into whole
 * Sunday-first columns itself.
 */
const ACTIVITY_DAYS = 371;

/** How many languages the breakdown shows per side. */
const MAX_LANGUAGES = 5;

const EMPTY_CALENDAR: ContributionCalendar = { totalContributions: 0, weeks: [] };

export interface FetchCompareUserOptions {
  bypassCache?: boolean;
  signal?: AbortSignal;
  token?: string;
}

/**
 * Real profile, streak stats, language breakdown and recent activity for one
 * side of a comparison. Throws if the profile or the contribution calendar
 * cannot be fetched — a comparison is meaningless without either.
 */
export async function fetchCompareUser(username: string, options: FetchCompareUserOptions = {}): Promise<CompareUserPayload> {
  const [profileResult, reposResult, calendarResult] = await Promise.allSettled([
    fetchUserProfile(username, options),
    fetchUserRepos(username, options),
    fetchGitHubContributions(username, options),
  ]);

  if (profileResult.status === "rejected") {
    throw new Error(`[GitHub API] Failed to fetch profile for user "${username}"`, { cause: profileResult.reason });
  }
  if (calendarResult.status === "rejected") {
    throw new Error(`[GitHub API] Failed to fetch contributions for user "${username}"`, { cause: calendarResult.reason });
  }

  const profile = profileResult.value;
  // Repos only feed the star total, so a failure here degrades rather than fails.
  const repos = reposResult.status === "fulfilled" ? reposResult.value : [];
  const contributions = calendarResult.value;
  const calendar = contributions.calendar ?? EMPTY_CALENDAR;

  const streak = calculateStreak(calendar);
  const totalStars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
  const developerScore = computeDeveloperScore({
    repos: profile.public_repos,
    followers: profile.followers,
    stars: totalStars,
    contributions: streak.totalContributions,
    longestStreak: streak.longestStreak,
  });

  const allDays = calendar.weeks.flatMap((week) => week.contributionDays);

  return {
    profile: buildProfileData(profile, totalStars, developerScore),
    stats: {
      currentStreak: streak.currentStreak,
      peakStreak: streak.longestStreak,
      totalContributions: streak.totalContributions,
      totalPRs: contributions.totalPRs ?? 0,
      totalIssues: contributions.totalIssues ?? 0,
      totalReviews: contributions.totalReviews ?? 0,
    },
    languages: buildLanguages(contributions.repoContributions ?? []),
    // Only `date`/`count`/`intensity` survive — the payload carries no
    // lines-of-code. The view buckets this into whole Sunday-first weeks.
    activity: buildActivityMap(allDays)
      .slice(-ACTIVITY_DAYS)
      .map(({ date, count, intensity }) => ({ date, count, intensity })),
  };
}

/** Contribution-weighted language share, matching the dashboard's breakdown. */
function buildLanguages(repoContributions: { repository: { primaryLanguage?: { name: string } | null }; contributions: { totalCount: number } }[]) {
  const counts: Record<string, number> = {};
  for (const contribution of repoContributions) {
    const language = contribution.repository.primaryLanguage?.name;
    if (language) counts[language] = (counts[language] || 0) + contribution.contributions.totalCount;
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return [];

  return Object.entries(counts)
    .map(([name, count]) => ({
      name,
      percentage: Math.round((count / total) * 100),
      color: LANGUAGE_COLORS[name] ?? "#a855f7",
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, MAX_LANGUAGES);
}
