import { fetchUserProfile, fetchUserRepos, displayName } from "@/lib/github";
import type { GitHubRepo } from "@/lib/github";
import { getUserGitHubToken } from "@/lib/githubtoken";
import { DistributedCache } from "@/lib/cache";
import { readCounters, readPairCounts, pairKey, ZERO_COUNTERS } from "../counters";
import type { ArenaGuess, ArenaLegend, ArenaPayload, ArenaPrediction, ArenaShowdown } from "@/types/compare";

const SHOWDOWNS: { cat: string; a: string; b: string; sub: string }[] = [
  { cat: "Founding Fathers", a: "torvalds", b: "gvanrossum", sub: "Kernel vs Python" },
  { cat: "Founder Showdown", a: "rauchg", b: "biilmann", sub: "Vercel vs Netlify" },
  { cat: "Vite Ecosystem", a: "yyx990803", b: "antfu", sub: "Vue vs Nuxt/Vite" },
  { cat: "Backend Monoliths", a: "dhh", b: "taylorotwell", sub: "Ruby vs PHP" },
  { cat: "Design Wizards", a: "shadcn", b: "pacocoursey", sub: "shadcn vs paco" },
  { cat: "Framework Pioneers", a: "gaearon", b: "rich-harris", sub: "React vs Svelte" },
];

const ROSTER: { login: string; role: string }[] = [
  { login: "yyx990803", role: "Vue.js & Vite Creator" },
  { login: "rich-harris", role: "Svelte & Rollup Creator" },
  { login: "gaearon", role: "Redux & React core" },
  { login: "torvalds", role: "Linux & Git Creator" },
  { login: "rauchg", role: "Next.js / Vercel" },
  { login: "dhh", role: "Ruby on Rails Creator" },
  { login: "sindresorhus", role: "1000+ npm packages" },
];

const HOT_CARDS = 3;

const ARENA_TTL_MS = 30 * 60 * 1000;
const arenaCache = new DistributedCache<RosterEntry[]>(8);

interface RosterEntry {
  login: string;
  name: string;
  avatarUrl: string;
  bio: string;
  role: string;
  followers: number;
  publicRepos: number;
  totalStars: number;
  topRepoStars: number;
  topLanguage: string;
}

export async function buildArenaPayload(): Promise<ArenaPayload> {
  const [roster, counters, pairCounts] = await Promise.all([
    loadRoster(),
    readCounters().catch(() => ZERO_COUNTERS),
    readPairCounts(SHOWDOWNS.map((s) => [s.a, s.b] as [string, string])).catch(() => ({})),
  ]);

  return {
    showdowns: buildShowdowns(pairCounts),
    legends: roster.map(toLegend),
    guesses: roster.map(toGuess),
    predictions: buildPredictions(roster),
    counters,
  };
}

async function loadRoster(): Promise<RosterEntry[]> {
  const cacheKey = "compare:arena:roster";
  const cached = await arenaCache.get(cacheKey);
  if (cached) return cached;

  const token = await getUserGitHubToken();
  const settled = await Promise.allSettled(
    ROSTER.map(async ({ login, role }): Promise<RosterEntry> => {
      const [profile, repos] = await Promise.all([fetchUserProfile(login, { token }), fetchUserRepos(login, { token }).catch((): GitHubRepo[] => [])]);

      const owned = repos.filter((r) => !r.fork);
      const totalStars = owned.reduce((sum, r) => sum + (r.stargazers_count ?? 0), 0);
      const topRepoStars = owned.reduce((max, r) => Math.max(max, r.stargazers_count ?? 0), 0);

      return {
        login: profile.login,
        name: displayName(profile),
        avatarUrl: profile.avatar_url,
        bio: profile.bio?.trim() || role,
        role,
        followers: profile.followers,
        publicRepos: profile.public_repos,
        totalStars,
        topRepoStars,
        topLanguage: primaryLanguage(owned),
      };
    }),
  );

  const roster = settled.filter((r): r is PromiseFulfilledResult<RosterEntry> => r.status === "fulfilled").map((r) => r.value);

  if (roster.length > 0) await arenaCache.set(cacheKey, roster, ARENA_TTL_MS);
  return roster;
}

function primaryLanguage(repos: GitHubRepo[]): string {
  const counts = new Map<string, number>();
  for (const repo of repos) {
    if (!repo.language) continue;
    counts.set(repo.language, (counts.get(repo.language) ?? 0) + 1);
  }

  let best = "";
  let bestCount = 0;
  for (const [language, count] of counts) {
    if (count > bestCount) {
      best = language;
      bestCount = count;
    }
  }
  return best || "—";
}

function buildShowdowns(pairCounts: Record<string, number>): ArenaShowdown[] {
  const withCounts = SHOWDOWNS.map((s, index) => ({ ...s, battles: pairCounts[pairKey(s.a, s.b)] ?? 0, index }));
  const anyBattles = withCounts.some((s) => s.battles > 0);

  const ordered = anyBattles ? [...withCounts].sort((x, y) => y.battles - x.battles || x.index - y.index) : withCounts;

  return ordered.map(({ cat, a, b, sub, battles }, rank) => ({
    cat,
    a,
    b,
    sub,
    battles,
    hot: anyBattles ? rank < HOT_CARDS && battles > 0 : true,
  }));
}

function toLegend(entry: RosterEntry): ArenaLegend {
  return {
    login: entry.login,
    name: entry.name,
    avatarUrl: entry.avatarUrl,
    role: entry.bio,
    followers: entry.followers,
    followersLabel: abbreviate(entry.followers),
    lang: entry.topLanguage,
  };
}

function toGuess(entry: RosterEntry): ArenaGuess {
  const hints = [
    `${abbreviate(entry.followers)} followers on GitHub`,
    entry.topRepoStars > 0 ? `Most-starred project has ${abbreviate(entry.topRepoStars)} stars` : `${entry.publicRepos.toLocaleString("en-US")} public repositories`,
    entry.topLanguage === "—" ? `${abbreviate(entry.totalStars)} stars across their repositories` : `Primary language: ${entry.topLanguage}`,
  ];

  return {
    hints,
    login: entry.login,
    name: entry.name,
    avatarUrl: entry.avatarUrl,
    bio: entry.bio,
  };
}

function buildPredictions(roster: RosterEntry[]): ArenaPrediction[] {
  const predictions: ArenaPrediction[] = [];

  for (let i = 0; i + 1 < roster.length; i += 2) {
    const a = roster[i];
    const b = roster[i + 1];

    const dimensions = [
      { cat: "OPEN SOURCE KING", noun: "stars", valueA: a.totalStars, valueB: b.totalStars },
      { cat: "COMMUNITY MAGNET", noun: "followers", valueA: a.followers, valueB: b.followers },
      { cat: "PROLIFIC BUILDER", noun: "public repositories", valueA: a.publicRepos, valueB: b.publicRepos },
    ];

    const decisive = dimensions.reduce((best, d) => (gap(d.valueA, d.valueB) > gap(best.valueA, best.valueB) ? d : best), dimensions[0]);

    const leader = decisive.valueA >= decisive.valueB ? a : b;
    const challenger = leader === a ? b : a;
    const leaderValue = Math.max(decisive.valueA, decisive.valueB);
    const challengerValue = Math.min(decisive.valueA, decisive.valueB);

    const text =
      leaderValue === challengerValue
        ? `${a.login} and ${b.login} are dead level on ${decisive.noun} — this one comes down to ${a.topLanguage} against ${b.topLanguage}.`
        : `${leader.login} leads on ${decisive.noun} with ${abbreviate(leaderValue)} against ${challenger.login}'s ${abbreviate(challengerValue)}, but ${challenger.login} answers back in ${challenger.topLanguage}.`;

    predictions.push({ cat: decisive.cat, a: `@${a.login}`, b: `@${b.login}`, text });
  }

  return predictions;
}

function gap(a: number, b: number): number {
  const total = a + b;
  return total === 0 ? 0 : Math.abs(a - b) / total;
}

function abbreviate(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return n.toLocaleString("en-US");
}
