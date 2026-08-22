import crypto from "crypto";
import { NextResponse } from "next/server";
import { fetchUserProfile, fetchUserRepos, displayName } from "@/lib/github";
import type { GitHubRepo } from "@/lib/github";
import { getUserGitHubToken } from "@/lib/githubtoken";
import { DistributedCache } from "@/lib/cache";
import { logger, setRequestId, clearRequestId } from "@/lib/logger";
import { readCounters, readPairCounts, pairKey, ZERO_COUNTERS } from "../counters";
import type { ArenaGuess, ArenaLegend, ArenaPayload, ArenaPrediction, ArenaShowdown } from "@/types/compare";

/**
 * Live data for the Compare page's pre-comparison battleground: Trending
 * Showdowns, Guess the Developer, AI Showdown Predictions, the four counter
 * tiles, and the GitHub Legends Walk of Fame.
 *
 * Two kinds of input meet here:
 *
 *  - **Editorial curation** — *which* developers and rivalries are featured.
 *    That is a human choice and stays a constant below (the same names the
 *    page already shipped with).
 *  - **Live data** — every figure and every avatar shown for them. Names,
 *    avatars, bios, follower counts, primary languages, star totals, the
 *    prediction verdicts and the HOT/ordering of the showdown cards are all
 *    read at request time from the cached `lib/github` pipeline and the
 *    compare counters. Nothing is hardcoded or seeded.
 */

/** Curated head-to-head rivalries. Both sides are real GitHub user logins. */
const SHOWDOWNS: { cat: string; a: string; b: string; sub: string }[] = [
  { cat: "Founding Fathers", a: "torvalds", b: "gvanrossum", sub: "Kernel vs Python" },
  { cat: "Founder Showdown", a: "rauchg", b: "biilmann", sub: "Vercel vs Netlify" },
  { cat: "Vite Ecosystem", a: "yyx990803", b: "antfu", sub: "Vue vs Nuxt/Vite" },
  { cat: "Backend Monoliths", a: "dhh", b: "taylorotwell", sub: "Ruby vs PHP" },
  { cat: "Design Wizards", a: "shadcn", b: "pacocoursey", sub: "shadcn vs paco" },
  { cat: "Framework Pioneers", a: "gaearon", b: "rich-harris", sub: "React vs Svelte" },
];

/**
 * Curated roster behind the Walk of Fame, Guess the Developer and the
 * predictions. `role` is only a fallback for an empty GitHub bio.
 */
const ROSTER: { login: string; role: string }[] = [
  { login: "yyx990803", role: "Vue.js & Vite Creator" },
  { login: "rich-harris", role: "Svelte & Rollup Creator" },
  { login: "gaearon", role: "Redux & React core" },
  { login: "torvalds", role: "Linux & Git Creator" },
  { login: "rauchg", role: "Next.js / Vercel" },
  { login: "dhh", role: "Ruby on Rails Creator" },
  { login: "sindresorhus", role: "1000+ npm packages" },
];

/** How many showdown cards carry the HOT flag once battles start landing. */
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

export async function GET(request: Request) {
  const start = Date.now();
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  setRequestId(requestId);

  try {
    // Counters are read every time (they must feel live right after a battle);
    // the GitHub-backed roster is cached, since notable profiles move slowly.
    const [roster, counters, pairCounts] = await Promise.all([
      loadRoster(),
      readCounters().catch(() => ZERO_COUNTERS),
      readPairCounts(SHOWDOWNS.map((s) => [s.a, s.b] as [string, string])).catch(() => ({})),
    ]);

    const payload: ArenaPayload = {
      showdowns: buildShowdowns(pairCounts),
      legends: roster.map(toLegend),
      guesses: roster.map(toGuess),
      predictions: buildPredictions(roster),
      counters,
    };

    const body = JSON.stringify(payload);
    const etag = `W/"${crypto.createHash("sha1").update(body).digest("hex")}"`;

    if ((request.headers.get("if-none-match") ?? "").split(",").some((e) => e.trim() === etag)) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag, "X-Request-ID": requestId } });
    }

    logger.info("Compare arena request completed", { source: "compare", status: 200, durationMs: Date.now() - start });

    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/json",
        // The counters in this payload must reflect a comparison the moment it
        // completes, so the response itself is never cached. The expensive part
        // — the legends roster — is memoised server-side in `arenaCache`, so
        // this stays fast without serving stale tallies.
        "Cache-Control": "no-store, must-revalidate",
        ETag: etag,
        "X-Request-ID": requestId,
      },
    });
  } catch (error) {
    logger.error("Compare arena request failed", { source: "compare", error });
    return NextResponse.json({ error: "Something went wrong. Please try again later." }, { status: 500, headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
  } finally {
    clearRequestId();
  }
}

// ─── roster ────────────────────────────────────────────────────────────────

/**
 * Live profile + repository data for every roster member. Individual failures
 * drop that member rather than emptying the whole arena.
 */
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

/** Most frequent primary language across a developer's own repositories. */
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

// ─── section builders ──────────────────────────────────────────────────────

/**
 * Order the showdown cards by how often that pairing has actually been
 * battled, flagging the busiest as HOT.
 *
 * Before any battles are recorded there is nothing to rank, so the curated
 * order stands and every card keeps its HOT flag — the state the page shipped
 * in. The tally takes over as soon as real comparisons land.
 */
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

/**
 * One round of Guess the Developer. Every hint is a real, live figure for the
 * hidden developer, phrased so it never names them.
 */
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

/**
 * Pair adjacent roster members and judge each matchup on whichever dimension
 * separates them most, in relative terms. Both the category and the verdict
 * sentence are computed from the two developers' real figures.
 */
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

    // Widest relative gap = the dimension this matchup is really about.
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

/** Relative separation between two figures, 0 (level) to 1 (total). */
function gap(a: number, b: number): number {
  const total = a + b;
  return total === 0 ? 0 : Math.abs(a - b) / total;
}

/** 203412 → "203k", 1_450_000 → "1.5m". */
function abbreviate(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return n.toLocaleString("en-US");
}
