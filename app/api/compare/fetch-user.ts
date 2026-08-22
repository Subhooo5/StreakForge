import "server-only";
import { fetchUserProfile, fetchUserRepos, fetchGitHubContributions, buildProfileData, buildActivityMap, computeDeveloperScore } from "@/lib/github";
import { calculateStreak } from "@/lib/calculate";
import { LANGUAGE_COLORS } from "@/lib/svg/languageColors";
import type { ContributionCalendar } from "@/types";
import type { CompareUserPayload } from "@/types/compare";

const ACTIVITY_DAYS = 371;

const MAX_LANGUAGES = 5;

const EMPTY_CALENDAR: ContributionCalendar = { totalContributions: 0, weeks: [] };

export interface FetchCompareUserOptions {
  bypassCache?: boolean;
  signal?: AbortSignal;
  token?: string;
}

export async function fetchCompareUser(username: string, options: FetchCompareUserOptions = {}): Promise<CompareUserPayload> {
  const [profileResult, reposResult, calendarResult] = await Promise.allSettled([
    fetchUserProfile(username, options),
    fetchUserRepos(username, options),
    // External GitHub fetch
    fetchGitHubContributions(username, options),
  ]);

  if (profileResult.status === "rejected") {
    throw new Error(`[GitHub API] Failed to fetch profile for user "${username}"`, { cause: profileResult.reason });
  }
  if (calendarResult.status === "rejected") {
    throw new Error(`[GitHub API] Failed to fetch contributions for user "${username}"`, { cause: calendarResult.reason });
  }

  const profile = profileResult.value;
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
    activity: buildActivityMap(allDays)
      .slice(-ACTIVITY_DAYS)
      .map(({ date, count, intensity }) => ({ date, count, intensity })),
  };
}

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
